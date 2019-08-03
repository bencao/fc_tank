import { Scene } from "../engine/scene.js";

export class ReportScene extends Scene {
  start() {
    super.start();
    this.view.update_p1_scores(this.game.get_status('p1_score'), this.calculate_p1_numbers());
    if (!this.game.single_player_mode()) {
      this.view.show_p2_scores();
      this.view.update_p2_scores(this.game.get_status('p2_score'), this.calculate_p2_numbers());
    }
    this.game.update_status('hi_score', _.max([
      this.game.get_status('p1_score'),
      this.game.get_status('p2_score'),
      this.game.get_config('initial_hi_score')
    ]));
    this.view.update_hi_score(this.game.get_status('hi_score'));
    return setTimeout(() => {
      if (this.game.get_status('game_over')) {
        return this.game.switch_scene('welcome');
      } else {
        this.game.next_stage();
        this.game.update_status('stage_autostart', true);
        return this.game.switch_scene('stage');
      }
    }
    , 5000);
  }

  stop() {
    return super.stop();
  }

  calculate_p1_numbers() {
    const p1_numbers = {
      stupid: 0, stupid_pts: 0,
      fish  : 0, fish_pts  : 0,
      fool  : 0, fool_pts  : 0,
      strong: 0, strong_pts: 0,
      total : 0, total_pts : 0
    };
    _.each(this.game.get_status('p1_killed_enemies'), type => {
      p1_numbers[type] += 1;
      p1_numbers[`${type}_pts`] += this.game.get_config(`score_for_${type}`);
      p1_numbers['total'] += 1;
      return p1_numbers['total_pts'] += this.game.get_config(`score_for_${type}`);
    });
    return p1_numbers;
  }

  calculate_p2_numbers() {
    const p2_numbers = {
      stupid: 0, stupid_pts: 0,
      fish  : 0, fish_pts  : 0,
      fool  : 0, fool_pts  : 0,
      strong: 0, strong_pts: 0,
      total : 0, total_pts : 0
    };

    _.each(this.game.get_status('p2_killed_enemies'), function(type) {
      p2_numbers[type] += 1;
      p2_numbers[`${type}_pts`] += this.game.get_config(`score_for_${type}`);
      p2_numbers['total'] += 1;
      return p2_numbers['total_pts'] += this.game.get_config(`score_for_${type}`);
    });
    return p2_numbers;
  }
}
