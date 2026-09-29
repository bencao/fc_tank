// Vercel Function: friends play signaling - POST opens a room, GET reads it,
// PUT answers it; see server/rooms.js.
import { Redis } from "@upstash/redis";
import { create_rooms, handle_room_request } from "../server/rooms.js";

let rooms;

function handle(request) {
  rooms ??= create_rooms(process.env, Redis);
  return handle_room_request(request, rooms);
}

export { handle as GET, handle as POST, handle as PUT };
