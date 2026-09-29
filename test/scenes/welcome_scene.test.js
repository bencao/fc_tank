import { describe, it, expect, vi, afterEach } from 'vitest';
import { WelcomeScene } from '../../src/scenes/welcome_scene.js';
import { DIFFICULTIES } from '../../src/difficulty.js';

function makeWelcome() {
  const handlers = {};
  const scene = Object.create(WelcomeScene.prototype);
  let level = 1;
  let players = 1;
  scene.keyboard = {
    on_key_down(keys, callback) {
      [].concat(keys).forEach(key => { handlers[key] = callback; });
    }
  };
  scene.game = {
    difficulty: () => DIFFICULTIES[level],
    harder: () => { level = Math.min(level + 1, 2); },
    easier: () => { level = Math.max(level - 1, 0); },
    single_player_mode: () => players === 1,
    update_status: (key, value) => { if (key === 'players') players = value; }
  };
  scene.view = { update_difficulty: vi.fn(), update_player_mode: vi.fn() };
  scene.enable_selection_control();
  const press = key => handlers[key]();
  return { scene, press, players: () => players };
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
});
