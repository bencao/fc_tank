import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReportScene } from '../../src/scenes/report_scene.js';

function makeReport(given = {}, { home = 'welcome' } = {}) {
  const statuses = {
    players: 1, p1_score: 0, p2_score: 0, hi_score: 20000, game_over: true,
    p1_killed_enemies: [], p2_killed_enemies: [], ...given
  };
  const scene = Object.create(ReportScene.prototype);
  scene.game = {
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    get_config: key => ({ initial_hi_score: 20000 })[key] ?? 100,
    single_player_mode: () => statuses.players === 1,
    next_stage: vi.fn(),
    home_scene: () => home,
    switch_scene: vi.fn()
  };
  scene.view = {
    update_p1_scores: vi.fn(), update_p2_scores: vi.fn(), show_p2_scores: vi.fn(), update_hi_score: vi.fn()
  };
  return { scene, statuses };
}

describe('ReportScene after a game over', () => {
  afterEach(() => vi.useRealTimers());

  it('asks for initials when a player scored', () => {
    vi.useFakeTimers();
    const { scene } = makeReport({ p1_score: 1200 });
    scene.start();
    vi.advanceTimersByTime(5000);

    expect(scene.game.switch_scene).toHaveBeenCalledWith('name_entry');
  });

  it('asks for initials when only 2P scored', () => {
    vi.useFakeTimers();
    const { scene } = makeReport({ players: 2, p2_score: 400 });
    scene.start();
    vi.advanceTimersByTime(5000);

    expect(scene.game.switch_scene).toHaveBeenCalledWith('name_entry');
  });

  it('goes straight back to the title when nobody scored', () => {
    vi.useFakeTimers();
    const { scene } = makeReport();
    scene.start();
    vi.advanceTimersByTime(5000);

    expect(scene.game.switch_scene).toHaveBeenCalledWith('welcome');
  });

  it('goes back to the friends lobby when nobody scored in friends play', () => {
    vi.useFakeTimers();
    const { scene } = makeReport({ players: 2 }, { home: 'lobby' });
    scene.start();
    vi.advanceTimersByTime(5000);

    expect(scene.game.switch_scene).toHaveBeenCalledWith('lobby');
  });

  // The HI score may already be the board's best, well above this game.
  it('never lowers the HI score', () => {
    vi.useFakeTimers();
    const { scene, statuses } = makeReport({ hi_score: 90000, p1_score: 1200 });
    scene.start();

    expect(statuses.hi_score).toBe(90000);
  });
});

describe('ReportScene when stopped early', () => {
  afterEach(() => vi.useRealTimers());

  // The set switched off during the report stays off.
  it('moves on to nothing once stopped', () => {
    vi.useFakeTimers();
    const { scene } = makeReport({ p1_score: 1200 });
    scene.start();
    scene.stop();
    vi.advanceTimersByTime(5000);

    expect(scene.game.switch_scene).not.toHaveBeenCalled();
  });
});
