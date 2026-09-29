import { Scene } from "../engine/scene.js";

// The menu, top to bottom: 1 PLAYER, 2 PLAYERS, FRIENDS PLAY - two players,
// each in their own browser (see src/friends/).
export const MODES = { SINGLE: 0, DOUBLE: 1, FRIENDS: 2 };
const MODE_COUNT = 3;

export class WelcomeScene extends Scene {
  start() {
    super.start();
    this.demo_timer = null;
    this.view.play_start_animation(() => {
      this.view.update_player_mode(this.mode());
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
    if (!this.game.get_status('demo_mode')) {
      this.game.update_status('stage_autostart', false);
      this.game.update_status('current_stage', this.game.get_config('initial_stage'));
    }
    return this.game.reset_run();
  }

  enable_selection_control() {
    this.keyboard.on_key_down('ENTER', () => {
      this.clear_demo_timer();
      this.game.update_status('demo_mode', false);
      return this.game.switch_scene(this.mode() === MODES.FRIENDS ? 'lobby' : 'stage');
    });

    this.keyboard.on_key_down('SPACE', () => {
      this.reset_demo_timer();
      return this.choose_mode((this.mode() + 1) % MODE_COUNT);
    });
    this.keyboard.on_key_down('UP', () => {
      this.reset_demo_timer();
      return this.choose_mode(this.mode() - 1);
    });
    this.keyboard.on_key_down('DOWN', () => {
      this.reset_demo_timer();
      return this.choose_mode(this.mode() + 1);
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

  // Left idle, the title screen shows the leaderboard and a demo in turn,
  // like an arcade's attract mode.
  start_demo_timer() {
    this.clear_demo_timer();
    this.demo_timer = setTimeout(() => {
      const demo_next = this.game.get_status('attract_demo_next');
      this.game.update_status('attract_demo_next', !demo_next);
      if (!demo_next) {
        return this.game.switch_scene('high_scores');
      }
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

  mode() {
    return this.game.get_status('mode') ?? MODES.SINGLE;
  }

  choose_mode(mode) {
    mode = Math.min(Math.max(mode, 0), MODE_COUNT - 1);
    this.game.update_status('mode', mode);
    this.game.update_status('players', mode === MODES.SINGLE ? 1 : 2);
    return this.view.update_player_mode(mode);
  }
}
