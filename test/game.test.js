import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock KineticJS and DOM before importing Game
function mockKineticObj() {
  const obj = {
    add: vi.fn(), hide: vi.fn(), show: vi.fn(), draw: vi.fn(),
    move: vi.fn(), start: vi.fn(), stop: vi.fn(), destroy: vi.fn(),
    setAbsolutePosition: vi.fn(), setText: vi.fn(), play: vi.fn(),
    clone: vi.fn(mockKineticObj),
  };
  return obj;
}
globalThis.Kinetic = {
  Stage: vi.fn(mockKineticObj),
  Layer: vi.fn(mockKineticObj),
  Group: vi.fn(mockKineticObj),
  Sprite: vi.fn(mockKineticObj),
  Text: vi.fn(mockKineticObj),
  Rect: vi.fn(mockKineticObj),
  Tween: vi.fn(mockKineticObj),
  Path: vi.fn(mockKineticObj),
  Easings: { Linear: 'linear' }
};

if (!globalThis.document) {
  globalThis.document = {};
}
globalThis.document.addEventListener = vi.fn();
globalThis.document.removeEventListener = vi.fn();
globalThis.document.getElementById = vi.fn((id) => {
  if (id === 'tank_sprite') return {};
  return null;
});

const { Game } = await import('../src/game.js');
const { FriendsSession } = await import('../src/friends/session.js');
const { link_pair, flush } = await import('./helpers/link_pair.js');

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game();
  });

  it('initializes with default config', () => {
    expect(game.get_config('initial_players')).toBe(1);
    expect(game.get_config('total_stages')).toBe(50);
    expect(game.get_config('enemies_per_stage')).toBe(20);
  });

  it('initializes with default statuses', () => {
    expect(game.get_status('players')).toBe(1);
    expect(game.get_status('current_stage')).toBe(1);
    expect(game.get_status('game_over')).toBe(false);
  });

  it('updates status', () => {
    game.update_status('players', 2);
    expect(game.get_status('players')).toBe(2);
  });

  it('next_stage cycles forward', () => {
    game.next_stage();
    expect(game.get_status('current_stage')).toBe(2);
  });

  it('prev_stage cycles backward', () => {
    game.prev_stage();
    expect(game.get_status('current_stage')).toBe(50);
  });

  it('mod_stage wraps around forward', () => {
    expect(game.mod_stage(50, 1)).toBe(1);
  });

  it('mod_stage wraps around backward', () => {
    expect(game.mod_stage(1, -1)).toBe(50);
  });

  it('single_player_mode returns true when players is 1', () => {
    expect(game.single_player_mode()).toBe(true);
  });

  it('single_player_mode returns false when players is 2', () => {
    game.update_status('players', 2);
    expect(game.single_player_mode()).toBe(false);
  });

  it('increase_p1_score adds to p1 score', () => {
    game.increase_p1_score(100);
    expect(game.get_status('p1_score')).toBe(100);
    game.increase_p1_score(200);
    expect(game.get_status('p1_score')).toBe(300);
  });

  it('increase_p2_score adds to p2 score', () => {
    game.increase_p2_score(500);
    expect(game.get_status('p2_score')).toBe(500);
  });
});

describe('Game difficulty', () => {
  it('starts on NORMAL and turns up or down one step at a time, stopping at either end', () => {
    const game = new Game();
    expect(game.difficulty().name).toBe('NORMAL');

    game.harder();
    expect(game.difficulty().name).toBe('HARD');
    game.harder();
    expect(game.difficulty().name).toBe('NIGHTMARE');
    game.harder();
    expect(game.difficulty().name).toBe('NIGHTMARE');

    game.easier();
    game.easier();
    game.easier();
    expect(game.difficulty().name).toBe('EASY');
    game.easier();
    expect(game.difficulty().name).toBe('EASY');
  });

  it('tells listeners the new difficulty whenever it turns', () => {
    const game = new Game();
    const seen = [];
    game.on_difficulty_change(difficulty => seen.push(difficulty.name));

    game.harder();
    game.harder();
    game.easier();

    expect(seen).toEqual(['HARD', 'NIGHTMARE', 'HARD']);
  });
});

describe('Game scene change listeners', () => {
  it('notifies listeners with the name of the scene it switched to', () => {
    const game = new Game();
    const seen = [];
    game.on_scene_change(name => seen.push(name));

    game.switch_scene('stage');
    game.switch_scene('report');

    expect(seen).toEqual(['stage', 'report']);
  });

  it('supports more than one listener', () => {
    const game = new Game();
    const first = vi.fn();
    const second = vi.fn();
    game.on_scene_change(first);
    game.on_scene_change(second);

    game.switch_scene('report');

    expect(first).toHaveBeenCalledWith('report');
    expect(second).toHaveBeenCalledWith('report');
  });
});

describe('Game hosting friends play', () => {
  function hosting() {
    const game = new Game();
    const [host_link, guest_link] = link_pair();
    const received = [];
    guest_link.on_message = text => received.push(JSON.parse(text));
    game.start_friends(new FriendsSession(host_link, 'host'));
    return { game, received, guest_link };
  }

  it('tells the friend which scene it is on, before the scene draws anything', async () => {
    const { game, received } = hosting();

    game.switch_scene('stage');
    await flush();

    expect(received[0]).toEqual({ t: 'scene', name: 'stage' });
    expect(received).toContainEqual({ t: 'view', view: 'stage', method: 'update_stage', args: [1] });
  });

  it('passes on every sound its scenes play', async () => {
    const { game, received } = hosting();

    game.scenes.report.sound.on_play('lose');
    await flush();

    expect(received).toEqual([{ t: 'sound', name: 'lose' }]);
  });

  it('comes home to the lobby while the friend is here, and to the title once they go', async () => {
    const { game, guest_link } = hosting();
    expect(game.home_scene()).toBe('lobby');

    guest_link.close();
    await flush();

    expect(game.hosting_friends()).toBe(false);
    expect(game.home_scene()).toBe('welcome');
  });

  it('lets the scene on screen know when the friend leaves', async () => {
    const { game, guest_link } = hosting();
    game.switch_scene('report');
    game.scenes.report.on_friend_left = vi.fn();

    guest_link.close();
    await flush();

    expect(game.scenes.report.on_friend_left).toHaveBeenCalled();
  });

  // Paused, the battle sends nothing; the friend must still hear from us or
  // it would take the quiet for a lost link.
  it('keeps telling the friend it is still here', async () => {
    vi.useFakeTimers();
    try {
      const { game, received } = hosting();

      await vi.advanceTimersByTimeAsync(3000);

      expect(received.filter(message => message.t === 'ping').length).toBeGreaterThanOrEqual(2);
      game.end_friends();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells listeners when friends play starts and ends', async () => {
    const game = new Game();
    const seen = [];
    game.on_friends_change(session => seen.push(session?.role ?? null));
    const [host_link, guest_link] = link_pair();

    game.start_friends(new FriendsSession(host_link, 'host'));
    guest_link.close();
    await flush();

    expect(seen).toEqual(['host', null]);
  });

  it('sends nothing without a friend', () => {
    const game = new Game();

    expect(() => game.switch_scene('stage')).not.toThrow();
    expect(game.home_scene()).toBe('welcome');
  });
});

describe('Game.reset_run', () => {
  it('starts both players over for a new game', () => {
    const game = new Game();
    game.update_status('p1_score', 500);
    game.update_status('p2_lives', 0);
    game.update_status('p2_level', 3);
    game.update_status('game_over', true);

    game.reset_run();

    expect(game.get_status('p1_score')).toBe(0);
    expect(game.get_status('p2_lives')).toBe(2);
    expect(game.get_status('p2_level')).toBe(1);
    expect(game.get_status('game_over')).toBe(false);
  });
});

describe('Game.power_off', () => {
  it('stops the scene on screen and leaves nothing running', () => {
    const game = new Game();
    game.switch_scene('stage');
    const stop = vi.spyOn(game.scenes.stage, 'on_stop');

    game.power_off();

    expect(stop).toHaveBeenCalled();
    expect(game.current_scene).toBeNull();
  });

  it('hangs up on a friend', async () => {
    const game = new Game();
    const [host_link, guest_link] = link_pair();
    const closed = vi.fn();
    guest_link.on_close = closed;
    game.start_friends(new FriendsSession(host_link, 'host'));

    game.power_off();
    await flush();

    expect(game.friends).toBeNull();
    expect(closed).toHaveBeenCalled();
  });
});
