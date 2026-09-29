import { describe, it, expect, vi, afterEach } from 'vitest';
import { WelcomeScene } from '../../src/scenes/welcome_scene.js';
import { DIFFICULTIES } from '../../src/difficulty.js';

function makeWelcome() {
  const handlers = {};
  const scene = Object.create(WelcomeScene.prototype);
  let level = 1;
  const statuses = { players: 1, mode: 0 };
  scene.keyboard = {
    on_key_down(keys, callback) {
      [].concat(keys).forEach(key => { handlers[key] = callback; });
    }
  };
  scene.game = {
    difficulty: () => DIFFICULTIES[level],
    harder: () => { level = Math.min(level + 1, 2); },
    easier: () => { level = Math.max(level - 1, 0); },
    single_player_mode: () => statuses.players === 1,
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    switch_scene: vi.fn()
  };
  scene.view = { update_difficulty: vi.fn(), update_player_mode: vi.fn() };
  scene.enable_selection_control();
  const press = key => handlers[key]();
  return { scene, press, players: () => statuses.players, mode: () => statuses.mode };
}

describe('WelcomeScene selection controls', () => {
  afterEach(() => vi.useRealTimers());

  it('turns the difficulty dial with left and right', () => {
    vi.useFakeTimers();
    const { scene, press } = makeWelcome();

    press('RIGHT');
    expect(scene.view.update_difficulty).toHaveBeenLastCalledWith('HARD');
    press('LEFT');
    press('LEFT');
    expect(scene.view.update_difficulty).toHaveBeenLastCalledWith('EASY');
  });

  it('switches between 1P and 2P with up, down and select', () => {
    vi.useFakeTimers();
    const { press, players } = makeWelcome();

    press('DOWN');
    expect(players()).toBe(2);
    press('UP');
    expect(players()).toBe(1);
    press('SPACE');
    expect(players()).toBe(2);
  });

  // Third on the menu: two players, each in their own browser.
  it('offers friends play under 2 players, as a two-player game', () => {
    vi.useFakeTimers();
    const { scene, press, players, mode } = makeWelcome();

    press('DOWN');
    press('DOWN');
    expect(mode()).toBe(2);
    expect(players()).toBe(2);
    expect(scene.view.update_player_mode).toHaveBeenLastCalledWith(2);

    press('DOWN');
    expect(mode()).toBe(2);
  });

  it('cycles 1P, 2P, friends play with select', () => {
    vi.useFakeTimers();
    const { press, mode, players } = makeWelcome();

    press('SPACE');
    press('SPACE');
    expect(mode()).toBe(2);
    press('SPACE');
    expect(mode()).toBe(0);
    expect(players()).toBe(1);
  });

  it('opens the friends lobby on start when friends play is picked', () => {
    vi.useFakeTimers();
    const { scene, press } = makeWelcome();

    press('SPACE');
    press('SPACE');
    press('ENTER');

    expect(scene.game.switch_scene).toHaveBeenCalledWith('lobby');
  });

  it('starts an ordinary game otherwise', () => {
    vi.useFakeTimers();
    const { scene, press } = makeWelcome();

    press('ENTER');

    expect(scene.game.switch_scene).toHaveBeenCalledWith('stage');
  });
});

describe('WelcomeScene when left idle', () => {
  afterEach(() => vi.useRealTimers());

  function makeIdleWelcome() {
    const statuses = {};
    const scene = Object.create(WelcomeScene.prototype);
    scene.game = {
      get_status: key => statuses[key],
      update_status: (key, value) => { statuses[key] = value; },
      get_config: () => 50,
      switch_scene: vi.fn()
    };
    return { scene, statuses };
  }

  // Like the arcade's attract mode: the leaderboard, then a demo, in turn.
  it('shows the high scores and the demo in turn', () => {
    vi.useFakeTimers();
    const { scene, statuses } = makeIdleWelcome();

    scene.start_demo_timer();
    vi.advanceTimersByTime(5000);
    expect(scene.game.switch_scene).toHaveBeenLastCalledWith('high_scores');
    expect(statuses.demo_mode).toBeFalsy();

    scene.start_demo_timer();
    vi.advanceTimersByTime(5000);
    expect(scene.game.switch_scene).toHaveBeenLastCalledWith('stage');
    expect(statuses.demo_mode).toBe(true);

    scene.start_demo_timer();
    vi.advanceTimersByTime(5000);
    expect(scene.game.switch_scene).toHaveBeenLastCalledWith('high_scores');
  });
});

describe('WelcomeScene stopped before its opening animation ends', () => {
  afterEach(() => vi.useRealTimers());

  // The set switched off mid-animation must stay dark: no menu keys, no demo.
  it('neither takes keys nor starts the attract loop', async () => {
    vi.useFakeTimers();
    const { scene } = makeWelcome();
    let finish_animation;
    scene.keyboard = { on_key_down: vi.fn(), reset() {} };
    scene.view = {
      ...scene.view,
      play_start_animation: done => { finish_animation = done; },
      update_scores: vi.fn()
    };
    scene.game.reset_run = vi.fn();
    scene.game.get_config = () => 1;
    scene.start();
    scene.stop();

    finish_animation();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(scene.keyboard.on_key_down).not.toHaveBeenCalled();
    expect(scene.game.switch_scene).not.toHaveBeenCalled();
  });
});
