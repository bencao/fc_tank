import { Scene } from "../engine/scene.js";
import { TOP_ENTRIES } from "../leaderboard_client.js";

// The global top ten. Shown after initials are entered - with the new runs
// marked - and between demos while the title screen sits idle.

const SHOW_MS = 8000;

export class HighScoresScene extends Scene {
  start() {
    super.start();
    const ranks = this.game.get_status("high_score_ranks") ?? [];
    const posted = this.game.get_status("high_score_entries");
    // Shown once; a later visit is a plain look at the board.
    this.game.update_status("high_score_ranks", []);
    this.game.update_status("high_score_entries", null);

    this.keyboard.on_key_down("ENTER", () => this.game.switch_scene("welcome"));
    this.leave_timer = setTimeout(() => this.game.switch_scene("welcome"), SHOW_MS);

    if (posted) {
      return this.show(posted, ranks);
    }
    this.view.show_loading();
    const visit = (this.visit = {});
    return this.game.leaderboard.top().then(
      entries => { if (visit === this.visit) { this.show(entries, ranks); } },
      () => { if (visit === this.visit) { this.view.show_offline(); } }
    );
  }

  stop() {
    clearTimeout(this.leave_timer);
    this.visit = null;
    return super.stop();
  }

  show(entries, ranks) {
    // A new run too far down to be listed still gets its place named.
    const unlisted = ranks.find(rank => rank > TOP_ENTRIES) ?? null;
    this.view.show_entries(entries, ranks, unlisted);
    if (entries.length > 0) {
      this.game.update_status("hi_score", Math.max(this.game.get_status("hi_score"), entries[0].score));
    }
  }
}
