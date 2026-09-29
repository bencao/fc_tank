import { describe, it, expect, vi } from 'vitest';
import { LeaderboardClient } from '../src/leaderboard_client.js';

const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('LeaderboardClient', () => {
  it('fetches the top scores', async () => {
    const entries = [{ rank: 1, name: 'ABC', score: 900, stage: 2, difficulty: 'EASY' }];
    const fetch = vi.fn(() => reply(200, { entries }));

    expect(await new LeaderboardClient(fetch).top()).toEqual(entries);
    expect(fetch.mock.calls[0][0]).toBe('/api/leaderboard');
  });

  it('posts a finished game and hands back its rank and the board', async () => {
    const fetch = vi.fn(() => reply(201, { rank: 4, entries: [] }));
    const run = { name: 'ABC', score: 900, stage: 2, difficulty: 'EASY' };

    expect(await new LeaderboardClient(fetch).submit(run)).toEqual({ rank: 4, entries: [] });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/leaderboard');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(run);
  });

  it('fails when the server does', async () => {
    const client = new LeaderboardClient(() => reply(503, { error: 'leaderboard unavailable' }));
    await expect(client.top()).rejects.toThrow();
    await expect(client.submit({})).rejects.toThrow();
  });
});
