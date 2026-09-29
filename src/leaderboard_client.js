// Talks to /api/leaderboard (see server/leaderboard.js). Callers treat any
// failure as "offline" - the game plays on without the board.

const TIMEOUT_MS = 5000;

// How many runs the board lists - as server/leaderboard.js answers.
export const TOP_ENTRIES = 10;

export class LeaderboardClient {
  constructor(fetch_impl = (...args) => fetch(...args)) {
    this.fetch = fetch_impl;
  }

  async top() {
    return (await this.request({ method: "GET" })).entries;
  }

  // run: { name, score, stage, difficulty }. Answers { rank, entries }.
  submit(run) {
    return this.request({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(run)
    });
  }

  async request(options) {
    const response = await this.fetch("/api/leaderboard", { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`leaderboard answered ${response.status}`);
    }
    return response.json();
  }
}
