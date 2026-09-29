import { WelcomeScene } from "./scenes/welcome_scene.js";
import { StageScene } from "./scenes/stage_scene.js";
import { BattleFieldScene } from "./scenes/battle_field_scene.js";
import { ReportScene } from "./scenes/report_scene.js";
import { NameEntryScene } from "./scenes/name_entry_scene.js";
import { HighScoresScene } from "./scenes/high_scores_scene.js";
import { WelcomeView } from "./views/welcome_view.js";
import { StageView } from "./views/stage_view.js";
import { BattleFieldView } from "./views/battle_field_view.js";
import { ReportView } from "./views/report_view.js";
import { NameEntryView } from "./views/name_entry_view.js";
import { HighScoresView } from "./views/high_scores_view.js";
import { LobbyScene } from "./scenes/lobby_scene.js";
import { LobbyView } from "./views/lobby_view.js";
import { LeaderboardClient } from "./leaderboard_client.js";
import { RoomsClient } from "./friends/rooms_client.js";
import { peer_connector } from "./friends/peer_link.js";
import { mirror_views } from "./friends/view_mirror.js";
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from "./difficulty.js";

export class Game {
  // connector: sets up friends play's link to the other browser (peer_link.js).
  constructor({ leaderboard = new LeaderboardClient(), connector = peer_connector(new RoomsClient()) } = {}) {
    this.leaderboard = leaderboard;
    this.connector = connector;
    // The FriendsSession while friends play is on (src/friends/session.js).
    this.friends = null;
    this.canvas = new Kinetic.Stage({
      container: "canvas",
      width: 600,
      height: 520
    });
    this.configs = this.init_default_config();
    this.statuses = this.init_statuses();
    this.scenes = {
      welcome: new WelcomeScene(this, new WelcomeView(this.canvas)),
      stage: new StageScene(this, new StageView(this.canvas)),
      battle_field: new BattleFieldScene(
        this,
        new BattleFieldView(this.canvas)
      ),
      report: new ReportScene(this, new ReportView(this.canvas)),
      name_entry: new NameEntryScene(this, new NameEntryView(this.canvas)),
      high_scores: new HighScoresScene(this, new HighScoresView(this.canvas)),
      lobby: new LobbyScene(this, new LobbyView(this.canvas))
    };
    this.current_scene = null;
    this.scene_change_listeners = [];
    this.difficulty_change_listeners = [];
    this.invite_listeners = [];
    this.friends_listeners = [];
    // Hosting friends play, the friend's screen follows this one: what its
    // views show and what its scenes play.
    mirror_views(this, (type, payload) => this.broadcast(type, payload));
    Object.values(this.scenes).forEach(scene => {
      scene.sound.on_play = name => this.broadcast("sound", { name });
    });
  }

  // listener(url) - the invitation link to show, or null to hide it.
  on_invite(listener) {
    return this.invite_listeners.push(listener);
  }

  show_invite(url) {
    this.invite_listeners.forEach(listener => listener(url));
  }

  invite_url(code) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("join", code);
    return url.toString();
  }

  // listener(session) - friends play has started, or ended (null).
  on_friends_change(listener) {
    return this.friends_listeners.push(listener);
  }

  start_friends(session) {
    this.friends = session;
    session.keep_alive();
    this.friends_listeners.forEach(listener => listener(session));
    session.on_close(() => {
      if (this.friends === session) {
        this.friends_listeners.forEach(listener => listener(null));
        this.current_scene?.on_friend_left?.();
      }
    });
  }

  end_friends() {
    this.friends?.close();
    this.friends = null;
  }

  hosting_friends() {
    return Boolean(this.friends?.is_host() && this.friends.connected);
  }

  // Tells the friend, when there is one to tell.
  broadcast(type, payload) {
    if (this.hosting_friends()) {
      this.friends.send(type, payload);
    }
  }

  // Where to go when a game is done: back to the friend, or the title screen.
  home_scene() {
    return this.hosting_friends() ? "lobby" : "welcome";
  }

  on_scene_change(listener) {
    return this.scene_change_listeners.push(listener);
  }

  on_difficulty_change(listener) {
    return this.difficulty_change_listeners.push(listener);
  }

  get_config(key) {
    return this.configs[key];
  }

  update_status(key, value) {
    return (this.statuses[key] = value);
  }

  get_status(key) {
    return this.statuses[key];
  }

  init_default_config() {
    return {
      initial_players: 1,
      total_stages: 50,
      initial_stage: 1,
      initial_hi_score: 20000,
      initial_p1_score: 0,
      initial_p2_score: 0,
      initial_p1_level: 1,
      initial_p2_level: 1,
      initial_p1_ship: false,
      initial_p2_ship: false,
      initial_p1_lives: 2,
      initial_p2_lives: 2,
      score_for_stupid: 100,
      score_for_fish: 200,
      score_for_fool: 300,
      score_for_strong: 400,
      score_for_gift: 500,
      enemies_per_stage: 20
    };
  }

  init_statuses() {
    return {
      players: 1,
      current_stage: 1,
      game_over: false,
      stage_autostart: false,
      hi_score: 20000,
      p1_score: 0,
      p2_score: 0,
      p1_level: 1,
      p2_level: 1,
      p1_ship: false,
      p2_ship: false,
      p1_lives: 2,
      p2_lives: 2,
      p1_killed_enemies: [],
      p2_killed_enemies: [],
      demo_mode: false,
      // Whether the idle title screen shows a demo next, or the high scores.
      attract_demo_next: false,
      // The runs just posted to the leaderboard, for the high scores to mark.
      high_score_ranks: [],
      high_score_entries: null,
      difficulty: DEFAULT_DIFFICULTY,
      // The welcome menu's row: 1 PLAYER, 2 PLAYERS or FRIENDS PLAY.
      mode: 0
    };
  }

  // Both players start over: scores, lives and tanks as a new game has them.
  reset_run() {
    this.update_status("game_over", false);
    for (const player of ["p1", "p2"]) {
      this.update_status(`${player}_score`, this.get_config(`initial_${player}_score`));
      this.update_status(`${player}_lives`, this.get_config(`initial_${player}_lives`));
      this.update_status(`${player}_level`, this.get_config(`initial_${player}_level`));
      this.update_status(`${player}_ship`, this.get_config(`initial_${player}_ship`));
    }
  }

  kick_off() {
    return this.switch_scene("welcome");
  }

  prev_stage() {
    return (this.statuses["current_stage"] = this.mod_stage(
      this.get_status("current_stage"),
      -1
    ));
  }

  next_stage() {
    return (this.statuses["current_stage"] = this.mod_stage(
      this.get_status("current_stage"),
      1
    ));
  }

  mod_stage(current_stage, adjustment) {
    const total_stages = this.configs["total_stages"];
    if (current_stage + adjustment === 0) {
      return total_stages;
    } else {
      return (current_stage + total_stages + adjustment) % total_stages;
    }
  }

  difficulty() {
    return DIFFICULTIES[this.statuses["difficulty"]];
  }

  harder() {
    return this._turn_difficulty(1);
  }

  easier() {
    return this._turn_difficulty(-1);
  }

  _turn_difficulty(step) {
    const level = this.statuses["difficulty"] + step;
    this.statuses["difficulty"] = Math.min(Math.max(level, 0), DIFFICULTIES.length - 1);
    const difficulty = this.difficulty();
    this.difficulty_change_listeners.forEach(listener => listener(difficulty));
    return difficulty;
  }

  single_player_mode() {
    return this.statuses["players"] === 1;
  }

  increase_p1_score(score) {
    return (this.statuses["p1_score"] += score);
  }

  increase_p2_score(score) {
    return (this.statuses["p2_score"] += score);
  }

  reset() {
    Object.values(this.scenes).forEach(scene => scene.stop());
    this.current_scene = null;
    this.init_default_config();
    return this.kick_off();
  }

  switch_scene(type) {
    const target_scene = this.scenes[type];
    if (this.current_scene) {
      this.current_scene.on_stop();
    }
    // First, so the friend is on the same scene before its views change.
    this.broadcast("scene", { name: type });
    target_scene.on_start();
    this.current_scene = target_scene;
    this.scene_change_listeners.forEach(listener => listener(type));
    return this.current_scene;
  }
}
