import { describe, it, expect, vi } from 'vitest';
import { BattleFieldScene } from '../../src/scenes/battle_field_scene.js';
import { DIFFICULTIES } from '../../src/difficulty.js';

describe('BattleFieldScene status bar', () => {
  it('shows the difficulty the battle is being fought at', () => {
    const scene = Object.create(BattleFieldScene.prototype);
    scene.view = {
      update_enemy_statuses: vi.fn(), update_p1_lives: vi.fn(), update_p2_lives: vi.fn(),
      update_stage: vi.fn(), update_difficulty: vi.fn()
    };
    scene.game = {
      get_config: () => 20,
      get_status: () => 1,
      single_player_mode: () => true,
      difficulty: () => DIFFICULTIES[3]
    };

    scene.load_config_variables();

    expect(scene.view.update_difficulty).toHaveBeenCalledWith('NIGHTMARE');
  });
});

describe('BattleFieldScene game over', () => {
  const scene_with = user_tanks_left => {
    const scene = Object.create(BattleFieldScene.prototype);
    scene.map = { user_tanks: () => user_tanks_left };
    scene.enemy_win = vi.fn();
    scene.remain_user_p1_lives = 0;
    scene.remain_user_p2_lives = 0;
    return scene;
  };

  it('waits while the other player still has a tank on the field', () => {
    const scene = scene_with([{ type: () => 'user_p2' }]);

    scene.check_enemy_win();

    expect(scene.enemy_win).not.toHaveBeenCalled();
  });

  it('comes once no player has a tank or a life left', () => {
    const scene = scene_with([]);

    scene.check_enemy_win();

    expect(scene.enemy_win).toHaveBeenCalled();
  });
});

describe('BattleFieldScene leaving a finished battle', () => {
  // The battle ends, and the scene moves on 3s later. If the player has
  // already moved on by then - out of the demo and into a game of their own -
  // that late switch must not drag them back out of it.
  it('forgets the pending switch once the scene is stopped', () => {
    vi.useFakeTimers();
    const scene = Object.create(BattleFieldScene.prototype);
    scene.winner = null;
    scene.game = { get_status: () => true, update_status: vi.fn(), switch_scene: vi.fn() };
    scene.enemy_guide = { stop: vi.fn() };
    scene.map = { reset: vi.fn() };

    scene.user_win();
    scene.stop();
    vi.advanceTimersByTime(3000);

    expect(scene.game.switch_scene).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
