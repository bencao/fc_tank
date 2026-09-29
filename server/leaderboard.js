// The global leaderboard: every finished game's score, best first, in one
// Redis sorted set shared by all server instances (Upstash Redis in
// production). Each run is its own member - a JSON string carrying a random id
// plus the initials, stage and difficulty - scored by its points.
//
// Scores are reported by the browser, so they can't be proven; the endpoint
// only keeps well-formed runs and limits how often one address may post.

import { DIFFICULTIES } from "../src/difficulty.js";

export const TOP_ENTRIES = 10;
// Runs kept in all; anything below them is dropped as it arrives.
export const KEPT_ENTRIES = 100;
export const DEFAULT_SUBMISSIONS_PER_HOUR = 20;

const HOUR_SECONDS = 60 * 60;
const MAX_SCORE = 9_999_900;
const MAX_STAGE = 50;
const DIFFICULTY_NAMES = new Set(DIFFICULTIES.map(difficulty => difficulty.name));

export class Leaderboard {
  // store: anything with Redis-style zadd, zrange, zrevrank, zremrangebyrank,
  // incr and expire.
  constructor(store, { key = "leaderboard", submissions_per_hour = DEFAULT_SUBMISSIONS_PER_HOUR } = {}) {
    this.store = store;
    this.key = key;
    this.submissions_per_hour = submissions_per_hour;
  }

  async top(count = TOP_ENTRIES) {
    const flat = await this.store.zrange(this.key, 0, count - 1, { rev: true, withScores: true });
    const entries = [];
    for (let i = 0; i < flat.length; i += 2) {
      const { name, stage, difficulty } = JSON.parse(flat[i]);
      entries.push({ rank: entries.length + 1, name, score: Number(flat[i + 1]), stage, difficulty });
    }
    return entries;
  }

  // Records a run; answers with its rank (1 is best), or null when it didn't
  // make the kept list, plus the top of the board as it now stands.
  async submit({ name, score, stage, difficulty }) {
    const member = JSON.stringify({ id: crypto.randomUUID(), name, stage, difficulty });
    await this.store.zadd(this.key, { score, member });
    await this.store.zremrangebyrank(this.key, 0, -(KEPT_ENTRIES + 1));
    const index = await this.store.zrevrank(this.key, member);
    return { rank: index == null ? null : index + 1, entries: await this.top() };
  }

  // Counts one submission from `address` this hour; false once it is over
  // the hourly allowance.
  async admit(address, now = new Date()) {
    const key = `${this.key}:submits:${address}:${now.toISOString().slice(0, 13)}`;
    const count = await this.store.incr(key);
    if (count === 1) {
      await this.store.expire(key, HOUR_SECONDS);
    }
    return count <= this.submissions_per_hour;
  }
}

// Rebuilds a posted run field by field, so nothing else rides along.
export function parse_entry(body) {
  const name = body?.name;
  if (typeof name !== "string" || !/^[A-Z]{3}$/.test(name)) throw new Error("expected three initials");
  const score = body.score;
  // Every kill and power-up is worth a whole number of hundreds.
  if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE || score % 100 !== 0) {
    throw new Error("expected a score");
  }
  const stage = body.stage;
  if (!Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) throw new Error("expected a stage");
  const difficulty = body.difficulty;
  if (!DIFFICULTY_NAMES.has(difficulty)) throw new Error("expected a difficulty");
  return { name, score, stage, difficulty };
}

// GET lists the top scores; POST records a finished game.
export async function handle_leaderboard_request(request, leaderboard) {
  if (request.method === "GET") {
    try {
      return Response.json({ entries: await leaderboard.top() }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      console.error("leaderboard: store unavailable", error);
      return Response.json({ error: "leaderboard unavailable" }, { status: 503 });
    }
  }
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405, headers: { allow: "GET, POST" } });
  }

  let entry;
  try {
    entry = parse_entry(await request.json());
  } catch {
    return Response.json({ error: "expected initials, score, stage and difficulty" }, { status: 400 });
  }
  try {
    if (!(await leaderboard.admit(client_address(request)))) {
      return Response.json({ error: "too many scores from here - try again later" }, { status: 429 });
    }
    return Response.json(await leaderboard.submit(entry), { status: 201 });
  } catch (error) {
    console.error("leaderboard: store unavailable", error);
    return Response.json({ error: "leaderboard unavailable" }, { status: 503 });
  }
}

// Vercel puts the caller's address first in x-forwarded-for.
function client_address(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// Builds the leaderboard from the environment. The Upstash integration sets
// either the KV_* or the UPSTASH_REDIS_* names; without either (local dev)
// scores live in this process only. LEADERBOARD_KEY picks another board, so
// local testing against the real store needn't touch the real scores.
export function create_leaderboard(env, Redis) {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  // Members are JSON strings; left on, Upstash would parse them on the way out.
  const store = url && token ? new Redis({ url, token, automaticDeserialization: false }) : memory_store();
  return new Leaderboard(store, { key: env.LEADERBOARD_KEY || "leaderboard" });
}

// Just enough of Redis, in memory, for the leaderboard - same answers,
// including scores coming back as strings.
export function memory_store() {
  const sets = new Map();
  const counts = new Map();
  const ranked = key => [...(sets.get(key) ?? new Map())]
    .sort(([a, x], [b, y]) => x - y || (a < b ? -1 : a > b ? 1 : 0));
  // Redis ranges: negative indexes count from the end, and are inclusive.
  const range = (all, start, stop) => {
    const from = Math.max(start < 0 ? all.length + start : start, 0);
    const to = stop < 0 ? all.length + stop : stop;
    return to < from ? [] : all.slice(from, to + 1);
  };

  return {
    async zadd(key, { score, member }) {
      if (!sets.has(key)) sets.set(key, new Map());
      sets.get(key).set(member, score);
      return 1;
    },
    async zcard(key) {
      return sets.get(key)?.size ?? 0;
    },
    async zrange(key, start, stop, { rev = false, withScores = false } = {}) {
      const all = ranked(key);
      if (rev) all.reverse();
      return range(all, start, stop).flatMap(([member, score]) => (withScores ? [member, String(score)] : [member]));
    },
    async zrevrank(key, member) {
      const at = ranked(key).reverse().findIndex(([m]) => m === member);
      return at === -1 ? null : at;
    },
    async zremrangebyrank(key, start, stop) {
      const doomed = range(ranked(key), start, stop);
      doomed.forEach(([member]) => sets.get(key).delete(member));
      return doomed.length;
    },
    async incr(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key);
    },
    // Old hours are simply never asked about again.
    async expire() {}
  };
}
