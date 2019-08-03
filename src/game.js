import { WelcomeScene } from "./scenes/welcome_scene.js";
import { StageScene } from "./scenes/stage_scene.js";
import { BattleFieldScene } from "./scenes/battle_field_scene.js";
import { ReportScene } from "./scenes/report_scene.js";
import { WelcomeView } from "./views/welcome_view.js";
import { StageView } from "./views/stage_view.js";
import { BattleFieldView } from "./views/battle_field_view.js";
import { ReportView } from "./views/report_view.js";

export class Game {
  constructor() {
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
      report: new ReportScene(this, new ReportView(this.canvas))
    };
    this.current_scene = null;
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
      p2_killed_enemies: []
    };
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
    _.each(this.scenes, scene => scene.stop());
    this.current_scene = null;
    this.init_default_config();
    return this.kick_off();
  }

  switch_scene(type) {
    const target_scene = this.scenes[type];
    if (!_.isEmpty(this.current_scene)) {
      this.current_scene.on_stop();
    }
    target_scene.on_start();
    return (this.current_scene = target_scene);
  }
}
