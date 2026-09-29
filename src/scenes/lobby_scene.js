import { Scene } from "../engine/scene.js";
import { FriendsSession } from "../friends/session.js";

// Friends play, host side: open a room, hand out the invitation, and start
// the game once the friend is through. See src/friends/ for the rest.

// What went wrong, as the lobby puts it - for either player.
export const TROUBLE = {
  missing: "ROOM NOT FOUND",
  full: "ROOM IS FULL",
  busy: "TOO MANY ROOMS - TRY LATER",
  unreachable: "COULDN'T CONNECT",
  offline: "CAN'T REACH THE SERVER",
  left: "YOUR FRIEND LEFT",
  host_left: "THE HOST LEFT",
  lost: "CONNECTION LOST"
};

const SCREENS = {
  opening: { status: "SETTING UP A ROOM...", code: "", message: "", hint: "SPACE: BACK" },
  waiting: { status: "INVITE A FRIEND", message: "SEND THE LINK BELOW - WAITING...", hint: "SPACE: BACK" },
  ready: { status: "FRIEND JOINED!", code: "", message: "PRESS ENTER TO START", hint: "ENTER: START   SPACE: LEAVE" },
  failed: { code: "", message: "PRESS ENTER TO TRY AGAIN", hint: "ENTER: RETRY   SPACE: BACK" }
};

export class LobbyScene extends Scene {
  start() {
    super.start();
    this.enable_lobby_control();
    if (this.game.friends?.connected) {
      return this.ready();
    }
    return this.open_room();
  }

  stop() {
    // A room still waiting for a friend is given up on.
    this.attempt?.abort();
    this.attempt = null;
    this.game.show_invite(null);
    return super.stop();
  }

  enable_lobby_control() {
    this.keyboard.on_key_down("ENTER", () => {
      if (this.state === "ready") {
        return this.start_game();
      }
      if (this.state === "failed") {
        return this.open_room();
      }
    });
    this.keyboard.on_key_down("SPACE", () => this.leave());
  }

  async open_room() {
    this.attempt?.abort();
    const attempt = (this.attempt = new AbortController());
    this.show("opening");
    let link;
    try {
      link = await this.game.connector.host({
        signal: attempt.signal,
        on_code: code => {
          if (attempt === this.attempt) { this.waiting(code); }
        }
      });
    } catch (error) {
      if (attempt === this.attempt) {
        this.failed(error.reason);
      }
      return;
    }
    if (attempt !== this.attempt) {
      return link.close();
    }
    this.attempt = null;
    this.game.start_friends(new FriendsSession(link, "host"));
    return this.ready();
  }

  waiting(code) {
    this.game.show_invite(this.game.invite_url(code));
    return this.show("waiting", { code });
  }

  ready() {
    this.game.show_invite(null);
    return this.show("ready");
  }

  failed(reason) {
    this.game.show_invite(null);
    return this.show("failed", { status: TROUBLE[reason] ?? TROUBLE.offline });
  }

  on_friend_left() {
    return this.failed("left");
  }

  start_game() {
    this.game.update_status("players", 2);
    this.game.update_status("demo_mode", false);
    this.game.update_status("stage_autostart", false);
    this.game.update_status("current_stage", this.game.get_config("initial_stage"));
    this.game.reset_run();
    return this.game.switch_scene("stage");
  }

  leave() {
    this.attempt?.abort();
    this.attempt = null;
    this.game.end_friends();
    return this.game.switch_scene("welcome");
  }

  show(state, fields = {}) {
    this.state = state;
    return this.view.show_lobby({ ...SCREENS[state], ...fields });
  }
}
