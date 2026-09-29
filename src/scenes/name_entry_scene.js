import { Scene } from "../engine/scene.js";
import { Initials } from "./initials.js";

// After a game over, each player who scored enters their initials for the
// global leaderboard, P1 then P2; the run is posted and the high scores shown.
// Either player's keys work - it's one player's turn at a time.

// A player who walks away still gets their initials on the board.
const IDLE_MS = 30_000;

export class NameEntryScene extends Scene {
  start() {
    super.start();
    this.ranks = [];
    this.entries = null;
    this.saving = false;
    this.turns = this.players_who_scored();
    this.enable_entry_control();
    return this.next_turn();
  }

  stop() {
    clearTimeout(this.idle_timer);
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
  }

  show_initials() {
    this.view.show_initials(this.initials.text(), this.initials.cursor);
    this.restart_idle_timer();
  }

  restart_idle_timer() {
    clearTimeout(this.idle_timer);
    this.idle_timer = setTimeout(() => this.save(), IDLE_MS);
  }

  async save() {
    if (this.saving) { return; }
    this.saving = true;
    clearTimeout(this.idle_timer);
    this.view.show_saving();
    const turns = this.turns;
    try {
      const { rank, entries } = await this.game.leaderboard.submit({
        name: this.initials.text(),
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
