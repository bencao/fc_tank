import { RoomError } from "./rooms_client.js";

// The browser end of friends play's link: a WebRTC data channel between the
// two players, set up through a room on /api/room. Candidates are gathered in
// full before the offer or answer is posted, so each side posts exactly once.
//
// No TURN relay: two players behind strict NATs can't reach each other, and
// are told so ("unreachable"). A relay would only need adding here.
export const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
];

// How long gathering may take before going with the candidates found so far.
const GATHER_MS = 3000;
// How long the channel may take to open once both sides have spoken.
const CONNECT_MS = 20000;
const ANSWER_POLL_MS = 1000;

// Host: opens a room and waits for a friend. on_code(code) is called as soon
// as the room exists, to show the invitation; resolves with the link once the
// friend is connected. Aborting `signal` gives up waiting.
export async function host_room({ rooms, on_code, signal }) {
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  try {
    const channel = connection.createDataChannel("game", { ordered: true });
    await connection.setLocalDescription(await connection.createOffer());
    await gathered(connection);
    const code = await rooms.open(connection.localDescription.sdp);
    on_code(code);
    const answer = await wait_for_answer(rooms, code, signal);
    await connection.setRemoteDescription({ type: "answer", sdp: answer });
    await opened(channel, connection);
    return channel_link(connection, channel);
  } catch (error) {
    connection.close();
    throw error;
  }
}

// Guest: joins the room `code`; resolves with the link once connected.
export async function join_room({ rooms, code }) {
  const room = await rooms.read(code);
  if (room.answer) {
    throw new RoomError("full");
  }
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  try {
    const arriving = new Promise(resolve => {
      connection.addEventListener("datachannel", event => resolve(event.channel), { once: true });
    });
    await connection.setRemoteDescription({ type: "offer", sdp: room.offer });
    await connection.setLocalDescription(await connection.createAnswer());
    await gathered(connection);
    await rooms.answer(code, connection.localDescription.sdp);
    const channel = await within(arriving, CONNECT_MS, connection);
    await opened(channel, connection);
    return channel_link(connection, channel);
  } catch (error) {
    connection.close();
    throw error;
  }
}

async function wait_for_answer(rooms, code, signal) {
  for (;;) {
    if (signal?.aborted) {
      throw new RoomError("cancelled");
    }
    const { answer } = await rooms.read(code);
    if (answer) {
      return answer;
    }
    await pause(ANSWER_POLL_MS, signal);
  }
}

function pause(ms, signal) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

function gathered(connection) {
  if (connection.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (connection.iceGatheringState === "complete") { done(); }
    };
    const timer = setTimeout(done, GATHER_MS);
    connection.addEventListener("icegatheringstatechange", check);
  });
}

function opened(channel, connection) {
  if (channel.readyState === "open") {
    return Promise.resolve();
  }
  return within(new Promise(resolve => {
    channel.addEventListener("open", resolve, { once: true });
  }), CONNECT_MS, connection);
}

// Settles with `promise`, or fails "unreachable" once `ms` pass or the
// connection gives up first.
function within(promise, ms, connection) {
  return new Promise((resolve, reject) => {
    const fail = () => {
      cleanup();
      reject(new RoomError("unreachable"));
    };
    const watch = () => {
      if (connection.connectionState === "failed") { fail(); }
    };
    const timer = setTimeout(fail, ms);
    const cleanup = () => {
      clearTimeout(timer);
      connection.removeEventListener("connectionstatechange", watch);
    };
    connection.addEventListener("connectionstatechange", watch);
    promise.then(value => { cleanup(); resolve(value); });
  });
}

// The data channel as the plain link a FriendsSession talks over.
function channel_link(connection, channel) {
  const link = {
    on_message: null,
    on_close: null,
    send: text => channel.send(text),
    close() {
      channel.close();
      connection.close();
    }
  };
  let closed = false;
  const close = () => {
    if (closed) { return; }
    closed = true;
    link.on_close?.();
  };
  channel.addEventListener("message", event => link.on_message?.(event.data));
  channel.addEventListener("close", close);
  connection.addEventListener("connectionstatechange", () => {
    if (["failed", "closed"].includes(connection.connectionState)) { close(); }
  });
  return link;
}

// What the lobby needs to set up a link, with the network behind it.
export function peer_connector(rooms) {
  return {
    host: ({ on_code, signal }) => host_room({ rooms, on_code, signal }),
    join: code => join_room({ rooms, code })
  };
}
