import { describe, it, expect, vi, afterEach } from 'vitest';
import { NameEntryScene } from '../../src/scenes/name_entry_scene.js';
import { FriendsSession } from '../../src/friends/session.js';

function makeScene({ players = 1, p1_score = 1200, p2_score = 0, submit, friend = false } = {}) {
  const handlers = {};
  const statuses = { players, p1_score, p2_score, current_stage: 7 };
  const scene = Object.create(NameEntryScene.prototype);
  scene.keyboard = {
    on_key_down(keys, callback) { [].concat(keys).forEach(key => { handlers[key] = callback; }); },
    reset() {}
  };
  scene.game = {
    leaderboard: { submit: vi.fn(submit ?? (async run => ({ rank: 3, entries: [{ rank: 1, ...run }] }))) },
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    single_player_mode: () => statuses.players === 1,
    difficulty: () => ({ name: 'HARD' }),
    switch_scene: vi.fn(),
    hosting_friends: () => friend && session.connected,
    broadcast: vi.fn()
  };
  const session = new FriendsSession({ send() {}, close() {} }, 'host');
  scene.game.friends = friend ? session : null;
  scene.view = { show_player: vi.fn(), show_initials: vi.fn(), show_saving: vi.fn(), show_waiting: vi.fn() };
  const press = key => handlers[key]?.();
  // The friend's initials, as they arrive from their browser.
  const friend_enters = name => session.receive(JSON.stringify({ t: 'initials', name }));
  return { scene, press, statuses, handlers, session, friend_enters };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('NameEntryScene', () => {
  afterEach(() => vi.useRealTimers());

  it('asks the player for initials, showing their score', () => {
    const { scene } = makeScene();
    scene.start();

    expect(scene.view.show_player).toHaveBeenCalledWith('I-PLAYER', 1200);
    expect(scene.view.show_initials).toHaveBeenLastCalledWith('AAA', 0);
  });

  it('edits the initials with the arrow keys', () => {
    const { scene, press } = makeScene();
    scene.start();

    press('UP');
    press('RIGHT');
    press('DOWN');

    expect(scene.view.show_initials).toHaveBeenLastCalledWith('BZA', 1);
  });

  it('posts the run once the initials are in, then shows the high scores', async () => {
    const { scene, press, statuses } = makeScene();
    scene.start();
    press('UP');
    press('ENTER');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith({ name: 'BAA', score: 1200, stage: 7, difficulty: 'HARD' });
    expect(statuses.high_score_ranks).toEqual([3]);
    expect(statuses.high_score_entries).toEqual([{ rank: 1, name: 'BAA', score: 1200, stage: 7, difficulty: 'HARD' }]);
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  it('posts only once, however often enter is pressed while it saves', async () => {
    const { scene, press } = makeScene();
    scene.start();
    press('ENTER');
    press('ENTER');
    press('Z');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledTimes(1);
  });

  it('locks in a letter at a time with fire, finishing on the last', async () => {
    const { scene, press } = makeScene();
    scene.start();
    press('Z');
    press('J');
    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
    press('Z');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledTimes(1);
  });

  it('takes both players in turn in a 2P game', async () => {
    const { scene, press, statuses } = makeScene({ players: 2, p1_score: 1200, p2_score: 800 });
    scene.start();
    press('ENTER');
    await settle();

    expect(scene.view.show_player).toHaveBeenLastCalledWith('II-PLAYER', 800);
    expect(scene.game.switch_scene).not.toHaveBeenCalled();

    press('ENTER');
    await settle();
    expect(scene.game.leaderboard.submit).toHaveBeenCalledTimes(2);
    expect(scene.game.leaderboard.submit.mock.calls[1][0].score).toBe(800);
    expect(statuses.high_score_ranks).toEqual([3, 3]);
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  it('skips a player who scored nothing', () => {
    const { scene } = makeScene({ players: 2, p1_score: 0, p2_score: 800 });
    scene.start();

    expect(scene.view.show_player).toHaveBeenCalledTimes(1);
    expect(scene.view.show_player).toHaveBeenCalledWith('II-PLAYER', 800);
  });

  it('carries on to the high scores when the board is unreachable', async () => {
    const { scene, press, statuses } = makeScene({ submit: async () => { throw new Error('offline'); } });
    scene.start();
    press('ENTER');
    await settle();

    expect(statuses.high_score_ranks).toEqual([]);
    expect(statuses.high_score_entries).toBeNull();
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  it('skips the board when the player opts out, going on to the high scores', async () => {
    const { scene, press, statuses } = makeScene();
    scene.start();
    press('SPACE');
    await settle();

    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
    expect(statuses.high_score_ranks).toEqual([]);
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  // Like the arcade, a walk-away still gets their initials on the board.
  it('enters the initials as they stand after a long wait', async () => {
    vi.useFakeTimers();
    const { scene } = makeScene();
    scene.start();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'AAA' }));
  });

  it('forgets its wait when stopped', async () => {
    vi.useFakeTimers();
    const { scene } = makeScene();
    scene.start();
    scene.stop();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
  });
});

describe('NameEntryScene in friends play', () => {
  afterEach(() => vi.useRealTimers());

  const friends = () => makeScene({ players: 2, p1_score: 1200, p2_score: 800, friend: true });

  it('takes one turn for the team, on the team score, and asks the friend for theirs', () => {
    const { scene } = friends();
    scene.start();

    expect(scene.view.show_player).toHaveBeenCalledTimes(1);
    expect(scene.view.show_player).toHaveBeenCalledWith('TEAM 1P', 2000);
    expect(scene.game.broadcast).toHaveBeenCalledWith('name_entry', { score: 2000 });
  });

  it('waits for the friend, then posts both sets of initials as one run', async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    press('UP');
    press('ENTER');
    await settle();
    expect(scene.view.show_waiting).toHaveBeenCalled();
    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();

    friend_enters('XYZ');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith({ name: 'BAA&XYZ', score: 2000, stage: 7, difficulty: 'HARD' });
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  it('posts straight away when the friend was quicker', async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    friend_enters('XYZ');

    press('ENTER');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'AAA&XYZ' }));
  });

  it('pays no mind to initials that are not initials', async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    friend_enters('<script>');
    friend_enters('abc');

    press('ENTER');
    await settle();

    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
  });

  it("posts the host's initials alone once the friend has gone", async () => {
    const { scene, press } = friends();
    scene.start();
    press('ENTER');

    scene.on_friend_left();
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'AAA', score: 2000 }));
  });

  it("posts the friend's initials alone when the host opts out", async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    press('SPACE');
    await settle();
    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();

    friend_enters('XYZ');
    await settle();

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'XYZ', score: 2000 }));
  });

  it("posts the host's initials alone, without waiting, when the friend opts out", async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    friend_enters(null);

    press('ENTER');
    await settle();

    expect(scene.view.show_waiting).not.toHaveBeenCalled();
    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'AAA', score: 2000 }));
  });

  it('posts nothing when both opt out', async () => {
    const { scene, press, friend_enters } = friends();
    scene.start();
    friend_enters(null);
    press('SPACE');
    await settle();

    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
    expect(scene.game.switch_scene).toHaveBeenCalledWith('high_scores');
  });

  it('stops waiting on a friend who never answers', async () => {
    vi.useFakeTimers();
    const { scene, press } = friends();
    scene.start();
    press('ENTER');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(40_000);

    expect(scene.game.leaderboard.submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'AAA' }));
  });
});

describe('NameEntryScene when stopped mid-wait', () => {
  afterEach(() => vi.useRealTimers());

  it('forgets its wait when stopped', async () => {
    vi.useFakeTimers();
    const { scene } = makeScene();
    scene.start();
    scene.stop();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(scene.game.leaderboard.submit).not.toHaveBeenCalled();
  });
});
