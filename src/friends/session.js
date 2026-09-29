import { map_key } from "../engine/keyboard.js";

// Friends play: two browsers, one game. The host runs the battle; the guest is
// a remote keyboard and a mirror of the host's screen. A FriendsSession is the
// conversation between them - typed messages over a link (a WebRTC data
// channel in the browser, see peer_link.js; an in-memory pair in tests).
//
// A link is { send(text), close(), on_message, on_close }.
//
// Messages are JSON objects { t: type, ...payload }:
//   guest -> host   key        { key, down }       a key the friend pressed
//                   initials   { name }            the friend's leaderboard initials (null: opted out)
//   host -> guest   scene      { name }            the host changed scene
//                   view       { view, method, args }   see view_mirror.js
//                   frame      { units, terrain, booms } see frame_recorder.js
//                   sound      { name }
//                   name_entry { score }           time for the friend's initials
//   both ways       ping       {}                  still here (see keep_alive)
export class FriendsSession {
  constructor(link, role) {
    this.link = link;
    this.role = role;
    this.connected = true;
    this.handlers = new Map();
    this.close_handlers = [];
    // The friend's keys, as key events a Keyboard can listen to.
    this.remote_keys = new EventTarget();
    this.held_keys = new Set();
    this.last_heard = Date.now();

    this.on("key", ({ key, down }) => this.remote_key(key, down));
    link.on_message = text => this.receive(text);
    link.on_close = () => this.closed();
  }

  is_host() {
    return this.role === "host";
  }

  // Answers a function that unsubscribes the handler.
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type).delete(handler);
  }

  on_close(handler) {
    this.close_handlers.push(handler);
  }

  send(type, payload = {}) {
    if (!this.connected) {
      return;
    }
    try {
      this.link.send(JSON.stringify({ ...payload, t: type }));
    } catch {
      // The link went down under us; on_close is on its way.
    }
  }

  send_key(key, down) {
    return this.send("key", { key, down });
  }

  close() {
    this.link.close();
    this.closed();
  }

  // A link can die without saying so - an iPhone that locks or leaves Safari
  // takes its end away quietly - and the friend's screen would then sit on
  // its last frame for good. So each side says it is still here every `every`
  // ms, even while the game is paused and nothing else is sent, and gives the
  // other up once it has heard nothing for `lost_after` ms.
  keep_alive({ every = 1000, lost_after = 10000 } = {}) {
    let last_tick = Date.now();
    this.last_heard = last_tick;
    this.keep_alive_timer = setInterval(() => {
      const now = Date.now();
      // The page itself was put away and its timers stopped with it: silence
      // over that time says nothing about the link, so listen afresh.
      if (now - last_tick > 2 * every) {
        this.last_heard = now;
      }
      last_tick = now;
      if (now - this.last_heard > lost_after) {
        this.lost = true;
        return this.close();
      }
      this.send("ping");
    }, every);
  }

  receive(text) {
    this.last_heard = Date.now();
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof message?.t !== "string") {
      return;
    }
    const { t, ...payload } = message;
    this.handlers.get(t)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`friends play: couldn't handle "${t}"`, error);
      }
    });
  }

  remote_key(key, down) {
    if (typeof key !== "string") {
      return;
    }
    if (down) {
      this.held_keys.add(key);
    } else {
      this.held_keys.delete(key);
    }
    this.remote_keys.dispatchEvent(key_event(down ? "keydown" : "keyup", key));
  }

  closed() {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    clearInterval(this.keep_alive_timer);
    // A friend who drops mid-move would otherwise leave their tank driving.
    [...this.held_keys].forEach(key => this.remote_key(key, false));
    this.close_handlers.forEach(handler => handler());
  }
}

function key_event(type, key) {
  return Object.assign(new Event(type, { cancelable: true }), { key });
}

// The guest's side of the keyboard: sends the host every game key pressed on
// `page`, and lets them all go when `win` loses focus. Answers a detach
// function.
export function forward_keys(session, page = document, win = window) {
  const held = new Set();
  const down = event => {
    if (!map_key(event.key) || event.repeat) {
      return;
    }
    held.add(event.key);
    session.send_key(event.key, true);
  };
  const up = event => {
    if (!map_key(event.key)) {
      return;
    }
    held.delete(event.key);
    session.send_key(event.key, false);
  };
  const blur = () => {
    [...held].forEach(key => session.send_key(key, false));
    held.clear();
  };
  page.addEventListener("keydown", down);
  page.addEventListener("keyup", up);
  win.addEventListener("blur", blur);
  return () => {
    page.removeEventListener("keydown", down);
    page.removeEventListener("keyup", up);
    win.removeEventListener("blur", blur);
  };
}
