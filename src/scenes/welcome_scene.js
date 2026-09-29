import { Scene } from "../engine/scene.js";

export class WelcomeScene extends Scene {
  start() {
    super.start();
    this.demo_timer = null;
    this.view.play_start_animation(() => {
      this.view.update_player_mode(this.game.single_player_mode());
      this.view.update_difficulty(this.game.difficulty().name);
      this.enable_selection_control();
      return this.start_demo_timer();
    });
    return this.view.update_scores(
      this.game.get_status('p1_score'),
      this.game.get_status('p2_score'),
      this.game.get_status('hi_score')
    );
  }

  stop() {
    this.clear_demo_timer();
    super.stop();
    return this.prepare_for_game_scene();
  }

  prepare_for_game_scene() {
    this.game.update_status('game_over', false);
    if (!this.game.get_status('demo_mode')) {
      this.game.update_status('stage_autostart', false);
      this.game.update_status('current_stage', this.game.get_config('initial_stage'));
    }
    this.game.update_status('p1_score', this.game.get_config('initial_p1_score'));
    this.game.update_status('p2_score', this.game.get_config('initial_p2_score'));
    this.game.update_status('p1_lives', this.game.get_config('initial_p1_lives'));
    this.game.update_status('p2_lives', this.game.get_config('initial_p2_lives'));
    this.game.update_status('p1_level', this.game.get_config('initial_p1_level'));
    this.game.update_status('p2_level', this.game.get_config('initial_p2_level'));
    this.game.update_status('p1_ship', this.game.get_config('initial_p1_ship'));
    return this.game.update_status('p2_ship', this.game.get_config('initial_p2_ship'));
  }

  enable_selection_control() {
    this.keyboard.on_key_down('ENTER', () => {
      this.clear_demo_timer();
      this.game.update_status('demo_mode', false);
      return this.game.switch_scene('stage');
    });

    this.keyboard.on_key_down('SPACE', () => {
      this.reset_demo_timer();
      return this.toggle_players();
    });
    this.keyboard.on_key_down('UP', () => {
      this.reset_demo_timer();
      return this.choose_players(1);
    });
    this.keyboard.on_key_down('DOWN', () => {
      this.reset_demo_timer();
      return this.choose_players(2);
    });

    this.keyboard.on_key_down('LEFT', () => {
      this.reset_demo_timer();
      this.game.easier();
      return this.view.update_difficulty(this.game.difficulty().name);
    });
    return this.keyboard.on_key_down('RIGHT', () => {
      this.reset_demo_timer();
      this.game.harder();
      return this.view.update_difficulty(this.game.difficulty().name);
    });
  }

  start_demo_timer() {
    this.clear_demo_timer();
    this.demo_timer = setTimeout(() => {
      this.game.update_status('demo_mode', true);
      const random_stage = 1 + Math.floor(Math.random() * this.game.get_config('total_stages'));
      this.game.update_status('current_stage', random_stage);
      this.game.update_status('stage_autostart', true);
      return this.game.switch_scene('stage');
    }, 5000);
  }

  reset_demo_timer() {
    this.clear_demo_timer();
    this.start_demo_timer();
  }

  clear_demo_timer() {
    if (this.demo_timer) {
      clearTimeout(this.demo_timer);
      this.demo_timer = null;
    }
  }

  toggle_players() {
    return this.choose_players(this.game.single_player_mode() ? 2 : 1);
  }

  choose_players(players) {
    this.game.update_status('players', players);
    return this.view.update_player_mode(this.game.single_player_mode());
  }
}
