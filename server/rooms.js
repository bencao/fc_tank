// Friends play signaling: how two browsers find each other before they talk
// directly. The host opens a room with its WebRTC offer and gets a short code
// for the invitation link; the friend reads the offer and leaves an answer.
// After that the game runs peer to peer and never touches this again.
//
// Each room is two Redis keys that expire on their own: room:<code> holds the
// offer, room:<code>:answer the answer. The answer is written with NX, so the
// first friend through the door gets the seat and anyone after is told the
// room is full.

// No 0/O, 1/I/L: codes get read aloud and retyped.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
export const ROOM_CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export const DEFAULT_TTL_SECONDS = 30 * 60;
export const DEFAULT_ROOMS_PER_HOUR = 30;
// A session description with every candidate gathered is a few KB.
const MAX_SDP_LENGTH = 16_000;
const HOUR_SECONDS = 60 * 60;

export function draw_room_code(random = Math.random) {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class Rooms {
  // store: anything with Redis-style get, set (with ex/nx), incr and expire.
  constructor(store, {
    key = "room",
    ttl_seconds = DEFAULT_TTL_SECONDS,
    rooms_per_hour = DEFAULT_ROOMS_PER_HOUR,
    draw_code = draw_room_code
  } = {}) {
    this.store = store;
    this.key = key;
    this.ttl_seconds = ttl_seconds;
    this.rooms_per_hour = rooms_per_hour;
    this.draw_code = draw_code;
  }

  // Answers the new room's code.
  async open(offer) {
    for (;;) {
      const code = this.draw_code();
      if (await this.store.set(this.room_key(code), offer, { ex: this.ttl_seconds, nx: true })) {
        return code;
      }
    }
  }

  // { offer, answer } - answer null until a friend joins - or null when
  // there is no such room.
  async read(code) {
    const offer = await this.store.get(this.room_key(code));
    if (offer == null) {
      return null;
    }
    return { offer, answer: (await this.store.get(this.answer_key(code))) ?? null };
  }

  // "answered", "full" when a friend already took the seat, or "missing".
  async answer(code, answer) {
    if ((await this.store.get(this.room_key(code))) == null) {
      return "missing";
    }
    const taken = await this.store.set(this.answer_key(code), answer, { ex: this.ttl_seconds, nx: true });
    return taken ? "answered" : "full";
  }

  // Counts one room opened from `address` this hour; false once it is over
  // the hourly allowance.
  async admit(address, now = new Date()) {
    const key = `${this.key}:opens:${address}:${now.toISOString().slice(0, 13)}`;
    const count = await this.store.incr(key);
    if (count === 1) {
      await this.store.expire(key, HOUR_SECONDS);
    }
    return count <= this.rooms_per_hour;
  }

  room_key(code) {
    return `${this.key}:${code}`;
  }

  answer_key(code) {
    return `${this.key}:${code}:answer`;
  }
}

function parse_sdp(value) {
  if (typeof value !== "string" || !value.startsWith("v=0") || value.length > MAX_SDP_LENGTH) {
    throw new Error("expected a session description");
  }
  return value;
}

function parse_code(url) {
  const code = new URL(url).searchParams.get("code")?.toUpperCase();
  return code && ROOM_CODE_PATTERN.test(code) ? code : null;
}

const NO_STORE = { "cache-control": "no-store" };

// POST opens a room with {offer}; GET ?code= reads it; PUT ?code= answers it.
export async function handle_room_request(request, rooms) {
  try {
    switch (request.method) {
      case "POST":
        return await open_room(request, rooms);
      case "GET":
        return await read_room(request, rooms);
      case "PUT":
        return await answer_room(request, rooms);
      default:
        return Response.json({ error: "method not allowed" }, { status: 405, headers: { allow: "GET, POST, PUT" } });
    }
  } catch (error) {
    console.error("rooms: store unavailable", error);
    return Response.json({ error: "rooms unavailable" }, { status: 503 });
  }
}

async function open_room(request, rooms) {
  let offer;
  try {
    offer = parse_sdp((await request.json())?.offer);
  } catch {
    return Response.json({ error: "expected an offer" }, { status: 400 });
  }
  if (!(await rooms.admit(client_address(request)))) {
    return Response.json({ error: "too many rooms from here - try again later" }, { status: 429 });
  }
  return Response.json({ code: await rooms.open(offer) }, { status: 201, headers: NO_STORE });
}

async function read_room(request, rooms) {
  const code = parse_code(request.url);
  if (!code) {
    return Response.json({ error: "expected a room code" }, { status: 400 });
  }
  const room = await rooms.read(code);
  if (!room) {
    return Response.json({ error: "no such room" }, { status: 404, headers: NO_STORE });
  }
  return Response.json(room, { headers: NO_STORE });
}

async function answer_room(request, rooms) {
  const code = parse_code(request.url);
  if (!code) {
    return Response.json({ error: "expected a room code" }, { status: 400 });
  }
  let answer;
  try {
    answer = parse_sdp((await request.json())?.answer);
  } catch {
    return Response.json({ error: "expected an answer" }, { status: 400 });
  }
  switch (await rooms.answer(code, answer)) {
    case "answered":
      return new Response(null, { status: 204 });
    case "full":
      return Response.json({ error: "room is full" }, { status: 409 });
    default:
      return Response.json({ error: "no such room" }, { status: 404 });
  }
}

// Vercel puts the caller's address first in x-forwarded-for.
function client_address(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// Same store as the leaderboard: the Upstash integration's KV_* or
// UPSTASH_REDIS_* names, or - in local dev without either - this process.
export function create_rooms(env, Redis) {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  // Offers are SDP text; left on, Upstash would try to parse them as JSON.
  const store = url && token ? new Redis({ url, token, automaticDeserialization: false }) : memory_store();
  return new Rooms(store);
}

// Just enough of Redis, in memory, for the rooms - including keys expiring.
// advance(ms) moves its clock on, for tests.
export function memory_store(now = Date.now()) {
  const values = new Map();
  const alive = key => {
    const entry = values.get(key);
    if (entry && entry.expires_at != null && entry.expires_at <= now) {
      values.delete(key);
      return null;
    }
    return entry ?? null;
  };

  return {
    async get(key) {
      return alive(key)?.value ?? null;
    },
    async set(key, value, { ex, nx = false } = {}) {
      if (nx && alive(key)) {
        return null;
      }
      values.set(key, { value, expires_at: ex == null ? null : now + ex * 1000 });
      return "OK";
    },
    async incr(key) {
      const entry = alive(key);
      const value = Number(entry?.value ?? 0) + 1;
      values.set(key, { value, expires_at: entry?.expires_at ?? null });
      return value;
    },
    async expire(key, seconds) {
      const entry = alive(key);
      if (entry) {
        entry.expires_at = now + seconds * 1000;
      }
      return entry ? 1 : 0;
    },
    advance(ms) {
      now += ms;
    }
  };
}
