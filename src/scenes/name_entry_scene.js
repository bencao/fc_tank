import { Scene } from "../engine/scene.js";
import { Initials } from "./initials.js";

// After a game over, each player who scored enters their initials for the
// global leaderboard, P1 then P2; the run is posted and the high scores shown.
// Either player's keys work - it's one player's turn at a time. SPACE opts
// the player out: nothing of theirs goes on the board.
//
// Friends play is one run for the team: each friend enters their initials in
// their own browser at the same time, and the host posts "ABC&XYZ" on the
// team's score. A friend who has gone leaves the host's initials alone.

// A player who walks away still gets their initials on the board.
const IDLE_MS = 30_000;
// How long the host waits for the friend's initials once its own are in -
// the friend has the same IDLE_MS to walk away in, and then some.
const FRIEND_WAIT_MS = IDLE_MS + 5_000;
const INITIALS = /^[A-Z]{3}$/;

export class NameEntryScene extends Scene {
  start() {
    super.start();
    this.ranks = [];
    this.entries = null;
    this.saving = false;
    this.team = this.game.hosting_friends?.() ? this.join_team() : null;
    this.turns = this.team ? [this.team.turn] : this.players_who_scored();
    this.enable_entry_control();
    return this.next_turn();
  }

  // The friend enters their initials alongside; this is the team's one turn.
  join_team() {
    const score = this.game.get_status("p1_score") + this.game.get_status("p2_score");
    const team = { turn: { label: "TEAM 1P", score }, mine: null, mate: null, gone: false, posted: false };
    // A null name is the friend opting out: the run goes on without them.
    team.off = this.game.friends.on("initials", ({ name }) => {
      if (name === null) {
        team.gone = true;
        this.post_team();
      } else if (typeof name === "string" && INITIALS.test(name)) {
        team.mate = name;
        this.post_team();
      }
    });
    this.game.broadcast("name_entry", { score });
    return team;
  }

  on_friend_left() {
    if (this.team) {
      this.team.gone = true;
      return this.post_team();
    }
  }

  stop() {
    clearTimeout(this.idle_timer);
    this.team?.off();
    // A save still under way when the scene is left must not move it on.
    this.turns = null;
    return super.stop();
  }

  players_who_scored() {
    const players = [{ label: "I-PLAYER", score: this.game.get_status("p1_score") }];
    if (!this.game.single_player_mode()) {
      players.push({ label: "II-PLAYER", score: this.game.get_status("p2_score") });
    }
    return players.filter(player => player.score > 0);
  }

  next_turn() {
    const player = this.turns.shift();
    if (!player) {
      this.game.update_status("high_score_ranks", this.ranks);
      this.game.update_status("high_score_entries", this.entries);
      return this.game.switch_scene("high_scores");
    }
    this.player = player;
    this.initials = new Initials();
    this.saving = false;
    this.view.show_player(player.label, player.score);
    this.show_initials();
  }

  enable_entry_control() {
    const edit = change => () => {
      if (this.saving) { return; }
      change();
      this.show_initials();
    };
    this.keyboard.on_key_down(["UP", "W"], edit(() => this.initials.up()));
    this.keyboard.on_key_down(["DOWN", "S"], edit(() => this.initials.down()));
    this.keyboard.on_key_down(["LEFT", "A"], edit(() => this.initials.left()));
    this.keyboard.on_key_down(["RIGHT", "D"], edit(() => this.initials.right()));
    this.keyboard.on_key_down(["Z", "J"], () => {
      if (this.saving) { return; }
      if (this.initials.fire()) { return this.save(); }
      this.show_initials();
    });
    this.keyboard.on_key_down("ENTER", () => this.save());
    this.keyboard.on_key_down("SPACE", () => this.skip());
  }

  show_initials() {
    this.view.show_initials(this.initials.text(), this.initials.cursor);
    this.restart_idle_timer();
  }

  restart_idle_timer() {
    clearTimeout(this.idle_timer);
    this.idle_timer = setTimeout(() => this.save(), IDLE_MS);
  }

  save() {
    if (this.saving) { return; }
    this.saving = true;
    clearTimeout(this.idle_timer);
    if (this.team) {
      this.team.mine = this.initials.text();
      return this.post_team();
    }
    return this.post(this.initials.text());
  }

  // A player who would rather stay off the board.
  skip() {
    if (this.saving) { return; }
    this.saving = true;
    clearTimeout(this.idle_timer);
    if (this.team) {
      this.team.skipped = true;
      return this.post_team();
    }
    return this.next_turn();
  }

  // Posts the team's run once both sets of initials are in - or one alone,
  // once the friend is gone or has kept it waiting too long, or the other
  // opted out.
  post_team() {
    const team = this.team;
    if (!team || !(team.mine || team.skipped) || team.posted) { return; }
    if (team.mate == null && !team.gone) {
      clearTimeout(this.idle_timer);
      this.idle_timer = setTimeout(() => {
        team.gone = true;
        this.post_team();
      }, FRIEND_WAIT_MS);
      return this.view.show_waiting();
    }
    team.posted = true;
    clearTimeout(this.idle_timer);
    const names = [team.skipped ? null : team.mine, team.mate].filter(Boolean);
    return names.length > 0 ? this.post(names.join("&")) : this.next_turn();
  }

  async post(name) {
    this.view.show_saving();
    const turns = this.turns;
    try {
      const { rank, entries } = await this.game.leaderboard.submit({
        name,
        score: this.player.score,
        stage: this.game.get_status("current_stage"),
        difficulty: this.game.difficulty().name
      });
      if (rank != null) { this.ranks.push(rank); }
      this.entries = entries;
    } catch {
      // Offline: the game carries on without the board.
    }
    if (turns === this.turns) {
      return this.next_turn();
    }
  }
}
