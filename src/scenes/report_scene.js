import { Scene } from "../engine/scene.js";

export class ReportScene extends Scene {
  start() {
    super.start();
    this.view.update_p1_scores(
      this.game.get_status("p1_score"),
      this.calculate_numbers("p1")
    );
    if (!this.game.single_player_mode()) {
      this.view.show_p2_scores();
      this.view.update_p2_scores(
        this.game.get_status("p2_score"),
        this.calculate_numbers("p2")
      );
    }
    this.game.update_status(
      "hi_score",
      Math.max(
        this.game.get_status("hi_score"),
        this.game.get_status("p1_score"),
        this.game.get_status("p2_score"),
        this.game.get_config("initial_hi_score")
      )
    );

    this.view.update_hi_score(this.game.get_status("hi_score"));
    this.next_timer = setTimeout(() => {
      if (this.game.get_status("game_over")) {
        return this.game.switch_scene(this.anyone_scored() ? "name_entry" : this.game.home_scene());
      } else {
        this.game.next_stage();
        this.game.update_status("stage_autostart", true);
        return this.game.switch_scene("stage");
      }
    }, 5000);
  }

  stop() {
    clearTimeout(this.next_timer);
    return super.stop();
  }

  // Whoever scored gets to put their initials on the leaderboard.
  anyone_scored() {
    return this.game.get_status("p1_score") > 0 ||
      (!this.game.single_player_mode() && this.game.get_status("p2_score") > 0);
  }

  calculate_numbers(user) {
    const numbers = {
      stupid: 0,
      stupid_pts: 0,
      fish: 0,
      fish_pts: 0,
      fool: 0,
      fool_pts: 0,
      strong: 0,
      strong_pts: 0,
      total: 0,
      total_pts: 0
    };
    this.game.get_status(user + "_killed_enemies").forEach(type => {
      numbers[type] += 1;
      numbers[`${type}_pts`] += this.game.get_config(`score_for_${type}`);
      numbers["total"] += 1;
      numbers["total_pts"] += this.game.get_config(`score_for_${type}`);
    });
    return numbers;
  }
}
