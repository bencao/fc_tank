// Vercel Function: GET /api/leaderboard lists the top scores, POST records a
// finished game; see server/leaderboard.js.
import { Redis } from "@upstash/redis";
import { create_leaderboard, handle_leaderboard_request } from "../server/leaderboard.js";

let leaderboard;

function handle(request) {
  leaderboard ??= create_leaderboard(process.env, Redis);
  return handle_leaderboard_request(request, leaderboard);
}

export { handle as GET, handle as POST };
