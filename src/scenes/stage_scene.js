import { Scene } from "../engine/scene.js";

export class StageScene extends Scene {
  start() {
    this.current_stage = this.game.get_status('current_stage');
    this.view.update_stage(this.current_stage);
    if (this.game.get_status('stage_autostart')) {
      setTimeout((() => this.game.switch_scene('battle_field')), 1500);
    } else {
      this.enable_stage_control();
    }
    return super.start();
  }

  stop() {
    this.prepare_for_game_scene();
    return super.stop();
  }

  prepare_for_game_scene() {
    this.game.update_status('p1_killed_enemies', []);
    return this.game.update_status('p2_killed_enemies', []);
  }

  enable_stage_control() {
    this.keyboard.on_key_down(["UP", "LEFT"], event => {
      this.current_stage = this.game.prev_stage();
      return this.view.update_stage(this.current_stage);
    });
    this.keyboard.on_key_down(["DOWN", "RIGHT"], event => {
      this.current_stage = this.game.next_stage();
      return this.view.update_stage(this.current_stage);
    });
    return this.keyboard.on_key_down("ENTER", event => {
      return this.game.switch_scene('battle_field');
    });
  }
}

