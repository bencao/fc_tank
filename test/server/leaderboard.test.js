import { describe, it, expect } from 'vitest';
import {
  Leaderboard,
  parse_entry,
  handle_leaderboard_request,
  create_leaderboard,
  memory_store,
  KEPT_ENTRIES
} from '../../server/leaderboard.js';

const entry = (name, score, extra = {}) => ({ name, score, stage: 3, difficulty: 'NORMAL', ...extra });

describe('Leaderboard', () => {
  it('is empty before anyone has played', async () => {
    expect(await new Leaderboard(memory_store()).top()).toEqual([]);
  });

  it('ranks scores best first and says where a new one landed', async () => {
    const board = new Leaderboard(memory_store());
    await board.submit(entry('AAA', 1200));
    await board.submit(entry('BBB', 5400, { stage: 7, difficulty: 'HARD' }));

    const result = await board.submit(entry('CCC', 3000));

    expect(result.rank).toBe(2);
    expect(result.entries).toEqual([
      { rank: 1, name: 'BBB', score: 5400, stage: 7, difficulty: 'HARD' },
      { rank: 2, name: 'CCC', score: 3000, stage: 3, difficulty: 'NORMAL' },
      { rank: 3, name: 'AAA', score: 1200, stage: 3, difficulty: 'NORMAL' }
    ]);
  });

  it('keeps every run, even the same initials with the same score', async () => {
    const board = new Leaderboard(memory_store());
    await board.submit(entry('AAA', 1200));
    await board.submit(entry('AAA', 1200));

    expect(await board.top()).toHaveLength(2);
  });

  it('lists only the top ten', async () => {
    const board = new Leaderboard(memory_store());
    for (let i = 1; i <= 12; i++) await board.submit(entry('AAA', i * 100));

    const top = await board.top();
    expect(top).toHaveLength(10);
    expect(top[0].score).toBe(1200);
    expect(top[9].score).toBe(300);
  });

  it(`keeps only the best ${KEPT_ENTRIES} runs, so a run below them has no rank`, async () => {
    const board = new Leaderboard(memory_store());
    for (let i = 1; i <= KEPT_ENTRIES; i++) await board.submit(entry('AAA', 1000 + i * 100));

    const result = await board.submit(entry('ZZZ', 100));

    expect(result.rank).toBeNull();
    expect(await board.store.zcard(board.key)).toBe(KEPT_ENTRIES);
  });
});

describe('parse_entry', () => {
  it('accepts three initials, a score, the stage and the difficulty', () => {
    expect(parse_entry({ name: 'ABC', score: 4500, stage: 12, difficulty: 'NIGHTMARE' }))
      .toEqual({ name: 'ABC', score: 4500, stage: 12, difficulty: 'NIGHTMARE' });
  });

  // Friends play posts one run for the team: both players' initials.
  it('accepts a team - two sets of initials joined by &', () => {
    expect(parse_entry({ name: 'ABC&XYZ', score: 9000, stage: 3, difficulty: 'HARD' }).name).toBe('ABC&XYZ');
  });

  // Anything can POST to the endpoint; only a well-formed run is kept, rebuilt
  // field by field so nothing else rides along.
  it.each([
    ['lowercase initials', { name: 'abc' }],
    ['too many initials', { name: 'ABCD' }],
    ['non-letter initials', { name: '<b>' }],
    ['half a team', { name: 'ABC&' }],
    ['a short teammate', { name: 'ABC&XY' }],
    ['a team of three', { name: 'ABC&XYZ&QQQ' }],
    ['a zero score', { score: 0 }],
    ['a score no kill can give', { score: 150 }],
    ['an absurd score', { score: 100_000_000 }],
    ['a fractional score', { score: 100.5 }],
    ['a stage off the map', { stage: 51 }],
    ['an unknown difficulty', { difficulty: 'GOD' }]
  ])('rejects %s', (_, override) => {
    expect(() => parse_entry({ name: 'ABC', score: 4500, stage: 12, difficulty: 'HARD', ...override })).toThrow();
  });

  it('drops anything else sent along', () => {
    expect(parse_entry({ name: 'ABC', score: 100, stage: 1, difficulty: 'EASY', admin: true }))
      .not.toHaveProperty('admin');
  });
});

describe('handle_leaderboard_request', () => {
  const post = (body, ip = '203.0.113.9') => new Request('http://localhost/api/leaderboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.1` },
    body: JSON.stringify(body)
  });
  const get = () => new Request('http://localhost/api/leaderboard');

  it('lists the top scores', async () => {
    const board = new Leaderboard(memory_store());
    await board.submit(entry('AAA', 1200));

    const response = await handle_leaderboard_request(get(), board);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entries: [{ rank: 1, name: 'AAA', score: 1200, stage: 3, difficulty: 'NORMAL' }] });
  });

  it('records a run and answers with its rank', async () => {
    const board = new Leaderboard(memory_store());

    const response = await handle_leaderboard_request(post(entry('ABC', 800)), board);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.rank).toBe(1);
    expect(body.entries[0].name).toBe('ABC');
  });

  it('turns away a malformed run', async () => {
    const response = await handle_leaderboard_request(post({ name: 'x' }), new Leaderboard(memory_store()));
    expect(response.status).toBe(400);
  });

  it('turns away a flood of runs from one address', async () => {
    const board = new Leaderboard(memory_store(), { submissions_per_hour: 2 });

    expect((await handle_leaderboard_request(post(entry('ABC', 100)), board)).status).toBe(201);
    expect((await handle_leaderboard_request(post(entry('ABC', 100)), board)).status).toBe(201);
    const refused = await handle_leaderboard_request(post(entry('ABC', 100)), board);

    expect(refused.status).toBe(429);
    // Another player is unaffected.
    expect((await handle_leaderboard_request(post(entry('ABC', 100), '198.51.100.4'), board)).status).toBe(201);
  });

  it('answers 503 when the store is down', async () => {
    const broken = new Proxy({}, { get: () => async () => { throw new Error('down'); } });
    const board = new Leaderboard(broken);

    expect((await handle_leaderboard_request(get(), board)).status).toBe(503);
    expect((await handle_leaderboard_request(post(entry('ABC', 100)), board)).status).toBe(503);
  });

  it('allows only GET and POST', async () => {
    const response = await handle_leaderboard_request(
      new Request('http://localhost/api/leaderboard', { method: 'DELETE' }),
      new Leaderboard(memory_store())
    );
    expect(response.status).toBe(405);
  });
});

describe('create_leaderboard', () => {
  class FakeRedis {
    constructor(config) { this.config = config; }
  }

  // Entries are stored as JSON; Upstash would otherwise parse them on the way
  // out and hand back objects where strings are expected.
  it('keeps scores in Upstash Redis when the store is connected, members as plain strings', () => {
    const board = create_leaderboard({ KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'secret' }, FakeRedis);

    expect(board.store).toBeInstanceOf(FakeRedis);
    expect(board.store.config).toEqual({ url: 'https://kv.example', token: 'secret', automaticDeserialization: false });
    expect(board.key).toBe('leaderboard');
  });

  it('takes the key from LEADERBOARD_KEY, so local testing can stay off the real board', () => {
    const board = create_leaderboard({ UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't', LEADERBOARD_KEY: 'leaderboard:dev' }, FakeRedis);
    expect(board.key).toBe('leaderboard:dev');
  });

  it('keeps scores in memory when no store is connected, as in local dev', () => {
    const board = create_leaderboard({}, FakeRedis);
    expect(board.store).not.toBeInstanceOf(FakeRedis);
  });
});
