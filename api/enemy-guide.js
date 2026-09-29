// Vercel Function: POST /api/enemy-guide. Keeps the TypeSafe API key on the
// server and charges every Jev call to a daily budget; see
// server/enemy_guide.js and server/jev_budget.js.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { Redis } from "@upstash/redis";
import { create_guide_client, handle_guide_request } from "../server/enemy_guide.js";
import { create_budget } from "../server/jev_budget.js";

let client;
let budget;

export function POST(request) {
  client ??= create_guide_client(TypeSafeClient);
  budget ??= create_budget(process.env, Redis);
  return handle_guide_request(request, client, budget);
}
