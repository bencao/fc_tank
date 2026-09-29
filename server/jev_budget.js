// Caps how many Jev calls fc-tank makes per UTC day. Every call is counted in
// a store shared by all server instances (Upstash Redis in production); once
// the day's budget is spent, Jev is unavailable until midnight UTC and the
// game falls back to its built-in AI.

export const DEFAULT_DAILY_LIMIT = 5000;
const DAY_SECONDS = 24 * 60 * 60;

export class JevBudget {
  // counter: anything with Redis-style incr(key) and expire(key, seconds).
  constructor(counter, { daily_limit = DEFAULT_DAILY_LIMIT } = {}) {
    this.counter = counter;
    this.daily_limit = daily_limit;
  }

  // Counts one call against today's budget. Calls past the limit are counted
  // too - it is only ever compared against the limit.
  async spend(now = new Date()) {
    const key = `jev:calls:${now.toISOString().slice(0, 10)}`;
    const calls = await this.counter.incr(key);
    if (calls === 1) {
      // Keep a day's count a little past its day, then let it go.
      await this.counter.expire(key, 2 * DAY_SECONDS);
    }
    if (calls <= this.daily_limit) {
      return { allowed: true };
    }
    return { allowed: false, retry_after_seconds: seconds_until_utc_midnight(now) };
  }
}

function seconds_until_utc_midnight(now) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((midnight - now.getTime()) / 1000);
}

// Builds the budget from the environment. The Upstash integration sets either
// the KV_* or the UPSTASH_REDIS_* names; without either (local dev) calls are
// counted in this process only.
export function create_budget(env, Redis) {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  const counter = url && token ? new Redis({ url, token }) : memory_counter();
  const limit = Number.parseInt(env.JEV_DAILY_CALL_BUDGET, 10);
  return new JevBudget(counter, { daily_limit: Number.isFinite(limit) ? limit : DEFAULT_DAILY_LIMIT });
}

function memory_counter() {
  const counts = new Map();
  return {
    async incr(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key);
    },
    // Old days are simply never asked about again.
    async expire() {}
  };
}
