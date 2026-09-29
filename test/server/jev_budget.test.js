import { describe, it, expect } from 'vitest';
import { JevBudget, create_budget, DEFAULT_DAILY_LIMIT } from '../../server/jev_budget.js';

function memoryCounter() {
  const counts = {};
  return {
    counts,
    expiries: {},
    async incr(key) { return (counts[key] = (counts[key] ?? 0) + 1); },
    async expire(key, seconds) { this.expiries[key] = seconds; }
  };
}

describe('JevBudget', () => {
  it('allows calls up to the daily limit, then refuses until midnight UTC', async () => {
    const budget = new JevBudget(memoryCounter(), { daily_limit: 2 });
    const now = new Date('2026-09-28T23:59:00Z');

    expect(await budget.spend(now)).toEqual({ allowed: true });
    expect(await budget.spend(now)).toEqual({ allowed: true });
    expect(await budget.spend(now)).toEqual({ allowed: false, retry_after_seconds: 60 });

    // A new UTC day brings a fresh budget.
    expect(await budget.spend(new Date('2026-09-29T00:00:01Z'))).toEqual({ allowed: true });
  });
});

describe('create_budget', () => {
  class FakeRedis {
    constructor(config) { this.config = config; }
  }

  it('counts in Upstash Redis when the store is connected', () => {
    const budget = create_budget({ KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 'secret' }, FakeRedis);

    expect(budget.counter).toBeInstanceOf(FakeRedis);
    expect(budget.counter.config).toEqual({ url: 'https://kv.example', token: 'secret' });
    expect(budget.daily_limit).toBe(DEFAULT_DAILY_LIMIT);
  });

  it('takes the daily limit from JEV_DAILY_CALL_BUDGET', () => {
    const budget = create_budget({ UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't', JEV_DAILY_CALL_BUDGET: '120' }, FakeRedis);

    expect(budget.daily_limit).toBe(120);
  });

  it('counts in memory when no store is connected, as in local dev', async () => {
    const budget = create_budget({ JEV_DAILY_CALL_BUDGET: '1' }, FakeRedis);

    expect(budget.counter).not.toBeInstanceOf(FakeRedis);
    expect((await budget.spend()).allowed).toBe(true);
    expect((await budget.spend()).allowed).toBe(false);
  });
});
