// Vercel Function: POST /api/enemy-guide. Keeps the TypeSafe API key on the
// server; see server/enemy_guide.js for what is asked of Jev.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { create_guide_client, handle_guide_request } from "../server/enemy_guide.js";

let client;

export function POST(request) {
  client ??= create_guide_client(TypeSafeClient);
  return handle_guide_request(request, client);
}
