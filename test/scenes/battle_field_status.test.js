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
