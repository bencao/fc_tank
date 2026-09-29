// Talks to /api/room (see server/rooms.js), where two browsers swap the WebRTC
// offer and answer that let them talk directly.

const TIMEOUT_MS = 8000;

// Why a room couldn't be used: "missing" (no such room, or it expired),
// "full" (a friend already joined), "busy" (too many rooms opened from here),
// "unreachable" (the browsers couldn't reach each other) or "offline".
export class RoomError extends Error {
  constructor(reason) {
    super(`room ${reason}`);
    this.reason = reason;
  }
}

const REASONS = { 404: "missing", 409: "full", 429: "busy" };

export class RoomsClient {
  constructor(fetch_impl = (...args) => fetch(...args)) {
    this.fetch = fetch_impl;
  }

  // Answers the new room's code.
  async open(offer) {
    return (await this.request("/api/room", { method: "POST", body: { offer } })).code;
  }

  // Answers { offer, answer } - answer null until a friend joins.
  read(code) {
    return this.request(`/api/room?code=${encodeURIComponent(code)}`, { method: "GET" });
  }

  async answer(code, answer) {
    await this.request(`/api/room?code=${encodeURIComponent(code)}`, { method: "PUT", body: { answer } });
  }

  async request(url, { method, body }) {
    let response;
    try {
      response = await this.fetch(url, {
        method,
        ...(body && { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch {
      throw new RoomError("offline");
    }
    if (!response.ok) {
      throw new RoomError(REASONS[response.status] ?? "offline");
    }
    return response.status === 204 ? null : response.json();
  }
}
