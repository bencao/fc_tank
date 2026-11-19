import { Scene } from "../engine/scene.js";
import { Keyboard } from "../engine/keyboard.js";
import { Initials } from "../scenes/initials.js";
import { TROUBLE } from "../scenes/lobby_scene.js";
import { FriendsSession, forward_keys } from "./session.js";
import { SpriteMirror } from "./sprite_mirror.js";
import { apply_view_call } from "./view_mirror.js";

// Friends play, the friend's side. The host runs the game; this browser shows
// what the host's does - same scenes, same views - and sends back the keys
// pressed here. It only thinks for itself in the lobby and when entering its
// initials for the team's run.

// The host's scenes the guest follows; the rest (the title screen) it never
// needs to show.
const FOLLOWED_SCENES = new Set(["lobby", "stage", "battle_field", "report", "name_entry", "high_scores"]);

// Turns `game` into the guest of room `code`: swaps its scenes for mirrors
// and joins. page/win are where keys come from and focus goes (injectable for
// tests); go_to_title leaves friends play for a fresh title screen; touch
// says whether this is a touch screen (see virtual_gamepad.js).
export function become_guest(game, code, {
  page = document,
  win = window,
  go_to_title = () => window.location.assign(window.location.pathname),
  touch = () => document.documentElement.dataset.input === "touch"
} = {}) {
  const scenes = game.scenes;
  const guest_scenes = {
    lobby: new GuestLobbyScene(game, scenes.lobby.view, { code, page, win, go_to_title, touch }),
    stage: new MirrorScene(game, scenes.stage.view),
    battle_field: new MirrorBattleFieldScene(game, scenes.battle_field.view, scenes.battle_field.map),
    report: new MirrorScene(game, scenes.report.view),
    name_entry: new GuestNameEntryScene(game, scenes.name_entry.view),
    high_scores: new MirrorScene(game, scenes.high_scores.view)
  };
  Object.values(guest_scenes).forEach(scene => { scene.keyboard = new Keyboard(page); });
  game.scenes = { ...scenes, ...guest_scenes };
  return game.switch_scene("lobby");
}

// Everything the host sends, put where it belongs.
function follow_host(game, session, { page, win }) {
  session.on("scene", ({ name }) => {
    if (FOLLOWED_SCENES.has(name)) {
      game.switch_scene(name);
    }
  });
  session.on("view", call => apply_view_call(game, call));
  session.on("frame", frame => game.scenes.battle_field.receive_frame(frame));
  session.on("sound", ({ name }) => {
    const sound = game.scenes.lobby.sound;
    if (sound.supported_events().includes(name)) {
      sound.play(name);
    }
  });
  session.on("name_entry", ({ score }) => game.scenes.name_entry.begin(score));
  const detach = forward_keys(session, page, win);
  session.on_close(detach);
}

// Gone, or just no longer heard from (see FriendsSession.keep_alive).
const departure = game => (game.friends?.lost ? "lost" : "host_left");

function host_left(game) {
  game.scenes.lobby.trouble = departure(game);
  return game.switch_scene("lobby");
}

class GuestLobbyScene extends Scene {
  constructor(game, view, { code, page, win, go_to_title, touch }) {
    super(game, view);
    this.touch = touch;
    this.code = code;
    this.page = page;
    this.win = win;
    this.go_to_title = go_to_title;
    this.trouble = null;
  }

  start() {
    super.start();
    this.enable_lobby_control();
    if (this.trouble) {
      return this.failed(this.trouble);
    }
    if (this.game.friends?.connected) {
      return this.connected();
    }
    return this.join();
  }

  enable_lobby_control() {
    this.keyboard.on_key_down("ENTER", () => {
      if (this.trouble) {
        return this.go_to_title();
      }
    });
  }

  async join() {
    this.view.show_lobby({ status: "JOINING ROOM", code: this.code, message: "CONNECTING..." });
    let link;
    try {
      link = await this.game.connector.join(this.code);
    } catch (error) {
      return this.failed(error.reason);
    }
    const session = new FriendsSession(link, "guest");
    this.game.start_friends(session);
    follow_host(this.game, session, { page: this.page, win: this.win });
    return this.connected();
  }

  // A phone plays no sound before its first touch (see keep_audio_awake), and
  // the stage's opening music comes before any touch the game itself asks for.
  connected() {
    return this.view.show_lobby({
      status: "CONNECTED!",
      code: this.code,
      message: "WAITING FOR THE HOST TO START",
      hint: this.touch() ? "YOU ARE 2P - TAP THE SCREEN FOR SOUND" : "YOU ARE 2P - ARROWS TO MOVE, Z TO FIRE"
    });
  }

  failed(reason) {
    this.trouble = reason ?? "offline";
    return this.view.show_lobby({
      status: TROUBLE[this.trouble] ?? TROUBLE.offline,
      code: "",
      message: "PRESS ENTER FOR THE TITLE SCREEN"
    });
  }

  on_friend_left() {
    return this.failed(departure(this.game));
  }
}

// A scene that only shows what the host's is showing.
class MirrorScene extends Scene {
  on_friend_left() {
    return host_left(this.game);
  }
}

class MirrorBattleFieldScene extends MirrorScene {
  constructor(game, view, map) {
    super(game, view);
    this.map = map;
    this.mirror = new SpriteMirror(map, view.layer);
  }

  start() {
    return this.mirror.clear();
  }

  stop() {
    return this.mirror.clear();
  }

  receive_frame(frame) {
    if (this.game.current_scene === this) {
      return this.mirror.apply(frame);
    }
  }
}

// The friend's half of the team's initials (see NameEntryScene on the host).
class GuestNameEntryScene extends MirrorScene {
  start() {
    this.initials = null;
    this.sent = false;
  }

  stop() {
    clearTimeout(this.idle_timer);
  }

  begin(score) {
    if (this.game.current_scene !== this || this.initials) {
      return;
    }
    this.initials = new Initials();
    this.view.show_player("TEAM 2P", score);
    this.enable_entry_control();
    return this.show_initials();
  }

  enable_entry_control() {
    const edit = change => () => {
      if (this.sent) { return; }
      change();
      this.show_initials();
    };
    this.keyboard.on_key_down(["UP", "W"], edit(() => this.initials.up()));
    this.keyboard.on_key_down(["DOWN", "S"], edit(() => this.initials.down()));
    this.keyboard.on_key_down(["LEFT", "A"], edit(() => this.initials.left()));
    this.keyboard.on_key_down(["RIGHT", "D"], edit(() => this.initials.right()));
    this.keyboard.on_key_down(["Z", "J"], () => {
      if (this.sent) { return; }
      if (this.initials.fire()) { return this.save(); }
      this.show_initials();
    });
    this.keyboard.on_key_down("ENTER", () => this.save());
    this.keyboard.on_key_down("SPACE", () => this.save(null));
  }

  show_initials() {
    this.view.show_initials(this.initials.text(), this.initials.cursor);
    // Walk away and the initials go in as they stand, as on the host.
    clearTimeout(this.idle_timer);
    this.idle_timer = setTimeout(() => this.save(), 30_000);
  }

  // name: null opts out of the board.
  save(name = this.initials?.text()) {
    if (this.sent || !this.initials) { return; }
    this.sent = true;
    clearTimeout(this.idle_timer);
    this.game.friends?.send("initials", { name });
    return this.view.show_waiting();
  }
}
