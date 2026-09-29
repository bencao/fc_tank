import { describe, it, expect, vi, afterEach } from 'vitest';
import { HighScoresScene } from '../../src/scenes/high_scores_scene.js';

const row = (rank, score) => ({ rank, name: 'ABC', score, stage: 4, difficulty: 'NORMAL' });

function makeScene({ statuses: given = {}, top } = {}) {
  const handlers = {};
  const statuses = { hi_score: 20000, high_score_ranks: [], high_score_entries: null, ...given };
  const scene = Object.create(HighScoresScene.prototype);
  scene.keyboard = {
    on_key_down(keys, callback) { [].concat(keys).forEach(key => { handlers[key] = callback; }); },
    reset() {}
  };
  scene.game = {
    leaderboard: { top: vi.fn(top ?? (async () => [row(1, 30000), row(2, 900)])) },
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    switch_scene: vi.fn()
  };
  scene.view = { show_loading: vi.fn(), show_entries: vi.fn(), show_offline: vi.fn() };
  const press = key => handlers[key]?.();
  return { scene, press, statuses };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('HighScoresScene', () => {
  afterEach(() => vi.useRealTimers());

  it('fetches and shows the top scores', async () => {
    const { scene } = makeScene();
    scene.start();
    expect(scene.view.show_loading).toHaveBeenCalled();
    await settle();

    expect(scene.view.show_entries).toHaveBeenCalledWith([row(1, 30000), row(2, 900)], [], null);
  });

  it('shows the board just posted to, marking the new runs, without fetching again', () => {
    const entries = [row(1, 30000), row(2, 900)];
    const { scene, statuses } = makeScene({ statuses: { high_score_ranks: [2], high_score_entries: entries } });
    scene.start();

    expect(scene.game.leaderboard.top).not.toHaveBeenCalled();
    expect(scene.view.show_entries).toHaveBeenCalledWith(entries, [2], null);
    // Shown once; a later visit is a plain look at the board.
    expect(statuses.high_score_ranks).toEqual([]);
    expect(statuses.high_score_entries).toBeNull();
  });

  it('names the rank of a new run too far down to be listed', () => {
    const { scene } = makeScene({ statuses: { high_score_ranks: [37], high_score_entries: [row(1, 30000)] } });
    scene.start();

    expect(scene.view.show_entries).toHaveBeenCalledWith([row(1, 30000)], [37], 37);
  });

  it('raises the HI score to the best on the board', async () => {
    const { scene, statuses } = makeScene();
    scene.start();
    await settle();

    expect(statuses.hi_score).toBe(30000);
  });

  it('says so when the board is unreachable', async () => {
    const { scene } = makeScene({ top: async () => { throw new Error('offline'); } });
    scene.start();
    await settle();

    expect(scene.view.show_offline).toHaveBeenCalled();
  });

  it('goes back to the title after a while, or at once on enter', async () => {
    vi.useFakeTimers();
    const first = makeScene();
    first.scene.start();
    await vi.advanceTimersByTimeAsync(8000);
    expect(first.scene.game.switch_scene).toHaveBeenCalledWith('welcome');

    const second = makeScene();
    second.scene.start();
    second.press('ENTER');
    expect(second.scene.game.switch_scene).toHaveBeenCalledWith('welcome');
  });

  it('ignores a fetch that lands after the scene has been left', async () => {
    let answer;
    const { scene } = makeScene({ top: () => new Promise(resolve => { answer = resolve; }) });
    scene.start();
    scene.stop();
    answer([row(1, 30000)]);
    await settle();

    expect(scene.view.show_entries).not.toHaveBeenCalled();
  });
});
