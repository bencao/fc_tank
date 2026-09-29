import { Scene } from "../engine/scene.js";
import { Keyboard } from "../engine/keyboard.js";
import { FrameRecorder } from "../friends/frame_recorder.js";
import { Map2D } from "../map/map_2d.js";
import { MapArea2D } from "../map/map_area_2d.js";
import { TiledMapBuilder } from "../map/tiled_map_builder.js";
import terrainsJson from "../../data/terrains.json";
import {
  UserTank,
  UserP1Tank,
  UserP2Tank,
  EnemyTank,
  StupidTank,
  StrongTank,
  FishTank,
  FoolTank
} from "../objects/tanks.js";
import { DemoAICommander } from "../objects/commanders.js";
import { EnemyGuide } from "../ai/enemy_guide.js";

const P1_CONTROLS = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
  Z: "fire"
};

const P2_CONTROLS = {
  W: "up",
  S: "down",
  A: "left",
  D: "right",
  J: "fire"
};

export class BattleFieldScene extends Scene {
  // Longest step the physics will take in one frame, in ms.
  static max_delta_time = 100;
  // Friends play: how often the friend is sent the battle field, in ms.
  static frame_interval = 33;

  constructor(game, view) {
    super(game, view);
    this.layer = this.view.layer;
    this.map = new Map2D(this.layer);
    this.builder = new TiledMapBuilder(this.map, terrainsJson);
    this.enemy_guide = new EnemyGuide(this.map);
    this.reset_config_variables();
  }

  reset_config_variables() {
    this.remain_enemy_counts = 0;
    this.current_stage = 0;
    return (this.last_enemy_born_area_index = 0);
  }

  load_config_variables() {
    this.remain_enemy_counts = this.game.get_config("enemies_per_stage");
    this.current_stage = this.game.get_status("current_stage");
    this.last_enemy_born_area_index = 0;
    this.winner = null;
    this.remain_user_p1_lives = this.game.get_status("p1_lives");
    if (this.game.single_player_mode()) {
      this.remain_user_p2_lives = 0;
    } else {
      this.remain_user_p2_lives = this.game.get_status("p2_lives");
    }
    this.p1_level = this.game.get_status("p1_level");
    this.p1_ship = this.game.get_status("p1_ship");
    this.p2_level = this.game.get_status("p2_level");
    this.p2_ship = this.game.get_status("p2_ship");
    this.view.update_enemy_statuses(this.remain_enemy_counts);
    this.view.update_p1_lives(this.remain_user_p1_lives);
    this.view.update_p2_lives(this.remain_user_p2_lives);
    this.view.update_difficulty(this.game.difficulty().name);
    return this.view.update_stage(this.current_stage);
  }

  is_demo_mode() {
    return this.game.get_status('demo_mode');
  }

  start() {
    super.start();
    this.load_config_variables();
    this.start_map();
    this.connect_friend();
    if (!this.is_demo_mode()) {
      this.enable_user_control();
    }
    this.enable_system_control();
    this.start_time_line();
    return (this.running = true);
  }

  stop() {
    super.stop();
    this.remote_keyboard?.reset();
    clearTimeout(this.finish_timeout);
    this.stop_time_line();
    return this.map.reset();
  }

  save_user_status() {
    if (this.map.p1_tank()) {
      this.game.update_status("p1_lives", this.remain_user_p1_lives + 1);
      this.game.update_status("p1_level", this.map.p1_tank().level);
      this.game.update_status("p1_ship", this.map.p1_tank().ship);
    } else {
      this.game.update_status("p1_lives", this.remain_user_p1_lives);
    }
    if (this.map.p2_tank()) {
      this.game.update_status("p2_lives", this.remain_user_p2_lives + 1);
      this.game.update_status("p2_level", this.map.p2_tank().level);
      return this.game.update_status("p2_ship", this.map.p2_tank().ship);
    } else {
      return this.game.update_status("p2_lives", this.remain_user_p2_lives);
    }
  }

  start_map() {
    this.map.bind(
      "map_ready",
      function() {
        return this.sound.play("start_stage");
      },
      this
    );
    this.map.bind("map_ready", this.born_p1_tank, this);
    if (!this.game.single_player_mode()) {
      this.map.bind("map_ready", this.born_p2_tank, this);
    }
    this.map.bind("map_ready", this.born_enemy_tank, this);
    this.map.bind("map_ready", this.born_enemy_tank, this);
    this.map.bind("map_ready", this.born_enemy_tank, this);

    this.map.bind("user_tank_destroyed", this.check_enemy_win, this);
    this.map.bind("user_tank_destroyed", this.born_user_tanks, this);
    this.map.bind(
      "user_tank_destroyed",
      function() {
        return this.sound.play("gift_bomb");
      },
      this
    );

    this.map.bind("enemy_tank_destroyed", this.born_enemy_tank, this);
    this.map.bind(
      "enemy_tank_destroyed",
      this.increase_enemy_kills_by_user,
      this
    );
    this.map.bind(
      "enemy_tank_destroyed",
      this.increase_kill_score_by_user,
      this
    );
    this.map.bind("enemy_tank_destroyed", this.draw_tank_points, this);
    this.map.bind("enemy_tank_destroyed", this.check_user_win, this);
    this.map.bind(
      "enemy_tank_destroyed",
      function() {
        return this.sound.play("gift_bomb");
      },
      this
    );

    this.map.bind("gift_consumed", this.draw_gift_points, this);
    this.map.bind("gift_consumed", this.increase_gift_score_by_user, this);
    this.map.bind(
      "gift_consumed",
      function() {
        return this.sound.play("gift");
      },
      this
    );

    this.map.bind("home_destroyed", this.enemy_win, this);
    this.map.bind(
      "home_destroyed",
      function() {
        return this.sound.play("gift_bomb");
      },
      this
    );

    this.map.bind("tank_life_up", this.add_extra_life, this);
    this.map.bind(
      "tank_life_up",
      function() {
        return this.sound.play("gift_life");
      },
      this
    );

    this.map.bind(
      "user_fired",
      function() {
        return this.sound.play("fire");
      },
      this
    );

    this.map.bind(
      "user_moved",
      function() {
        return this.sound.play("user_move");
      },
      this
    );

    this.map.bind(
      "enemy_moved",
      function() {
        return this.sound.play("enemy_move");
      },
      this
    );

    this.builder.setup_stage(this.current_stage);
    return this.map.trigger("map_ready");
  }

  // Friends play, hosting: the friend's keys arrive on a keyboard of their
  // own, and the battle goes out to them frame by frame.
  connect_friend() {
    if (!this.game.hosting_friends?.()) {
      this.remote_keyboard = null;
      this.recorder = null;
      return;
    }
    this.remote_keyboard = new Keyboard(this.game.friends.remote_keys);
    this.recorder = new FrameRecorder(this.map);
    this.last_frame_sent = -Infinity;
  }

  // Sharing a keyboard, P1 has the arrows and P2 has WASD. Each at a keyboard
  // of their own - friends play - either set drives that player's tank.
  enable_user_control() {
    const p1_tank = () => this.map.p1_tank();
    const p2_tank = () => this.map.p2_tank();
    if (this.remote_keyboard) {
      const either = { ...P1_CONTROLS, ...P2_CONTROLS };
      this.bind_controls(this.keyboard, either, p1_tank);
      return this.bind_controls(this.remote_keyboard, either, p2_tank);
    }
    this.bind_controls(this.keyboard, P1_CONTROLS, p1_tank);
    return this.bind_controls(this.keyboard, P2_CONTROLS, p2_tank);
  }

  bind_controls(keyboard, mappings, tank) {
    Object.entries(mappings).forEach(([physical_key, virtual_command]) => {
      keyboard.on_key_down(physical_key, event => {
        if (tank()) {
          return tank().commander.on_command_start(virtual_command);
        }
      });
      keyboard.on_key_up(physical_key, event => {
        if (tank()) {
          return tank().commander.on_command_end(virtual_command);
        }
      });
    });
  }

  enable_system_control() {
    if (this.is_demo_mode()) {
      return this.keyboard.on_key_down("ENTER", event => {
        return this.exit_demo();
      });
    }
    const toggle_pause = event => {
      if (this.running) {
        return this.pause();
      } else {
        return this.rescue();
      }
    };
    this.remote_keyboard?.on_key_down("ENTER", toggle_pause);
    return this.keyboard.on_key_down("ENTER", toggle_pause);
  }

  exit_demo() {
    this.game.update_status('demo_mode', false);
    return this.game.switch_scene('welcome');
  }

  pause() {
    this.running = false;
    this.stop_time_line();
    return this.disable_user_controls();
  }

  disable_user_controls() {
    this.keyboard.reset();
    this.remote_keyboard?.reset();
    if (this.map.p1_tank()) {
      this.map.p1_tank().commander.reset();
    }
    if (this.map.p2_tank()) {
      this.map.p2_tank().commander.reset();
    }
    return this.enable_system_control();
  }

  rescue() {
    this.running = true;
    this.start_time_line();
    return this.enable_user_control();
  }

  integration(offset, loop_id) {
    // A loop from an earlier stage must die rather than run alongside this one.
    if (!this.running || loop_id !== this.loop_id) return;

    // A backgrounded tab serves no frames, so the first one back can carry a
    // delta of many seconds. Cap it: better a skipped moment than tanks and
    // missiles teleporting across the map in a single step. A frame's stamp
    // is when it began, which can be just before the time line started - and
    // time must not run backwards.
    const delta_time = Math.max(0, Math.min(
      Math.round(offset - this.startedAt),
      BattleFieldScene.max_delta_time
    ));

    for (let m of this.map.missiles) {
      m.integration(delta_time);
    }
    for (let g of this.map.gifts) {
      g.integration(delta_time);
    }
    for (let t of this.map.tanks) {
      t.integration(delta_time);
    }

    this.frame_rate += 1;
    this.startedAt = offset;
    this.send_frame(offset);

    requestAnimationFrame(next => this.integration(next, loop_id));
  }

  // At most one frame per frame_interval: plenty to watch, and it keeps the
  // link from filling up.
  send_frame(now) {
    if (!this.recorder || now - this.last_frame_sent < BattleFieldScene.frame_interval) {
      return;
    }
    this.last_frame_sent = now;
    return this.game.broadcast("frame", this.recorder.record());
  }

  start_time_line() {
    this.startedAt = performance.now();

    const loop_id = this.next_loop_id();
    requestAnimationFrame(offset => this.integration(offset, loop_id));

    // Jev picks objectives every couple of seconds: for the enemies on
    // NIGHTMARE, and always for the AI-driven player tank in the demo.
    const guided = {
      enemies: this.game.difficulty().jev_guide,
      players: Boolean(this.is_demo_mode())
    };
    if (guided.enemies || guided.players) {
      this.enemy_guide.start(guided);
    }

    // show frame rate
    this.frame_timeline = setInterval(() => {
      this.view.update_frame_rate(this.frame_rate);
      return (this.frame_rate = 0);
    }, 1000);
  }

  stop_time_line() {
    this.running = false;
    this.startedAt = null;
    this.next_loop_id();
    this.enemy_guide.stop();

    return clearInterval(this.frame_timeline);
  }

  next_loop_id() {
    return (this.loop_id = (this.loop_id ?? 0) + 1);
  }

  add_extra_life(tank) {
    if (tank instanceof UserP1Tank) {
      this.remain_user_p1_lives += 1;
      return this.view.update_p1_lives(this.remain_user_p1_lives);
    } else {
      this.remain_user_p2_lives += 1;
      return this.view.update_p2_lives(this.remain_user_p2_lives);
    }
  }

  born_user_tanks(tank, killed_by_tank) {
    if (tank instanceof UserP1Tank) {
      this.p1_level = this.game.get_config("initial_p1_level");
      this.p1_ship = this.game.get_config("initial_p1_ship");
      return this.born_p1_tank();
    } else {
      this.p2_level = this.game.get_config("initial_p2_level");
      this.p2_ship = this.game.get_config("initial_p2_ship");
      return this.born_p2_tank();
    }
  }

  born_p1_tank() {
    if (this.remain_user_p1_lives > 0) {
      this.remain_user_p1_lives -= 1;
      const p1_tank = this.map.add_tank(
        UserP1Tank,
        new MapArea2D(160, 480, 200, 520)
      );
      p1_tank.level_up(this.arrival_level("p1_level") - 1);
      p1_tank.on_ship(this.game.get_status("p1_ship"));
      if (this.is_demo_mode()) {
        p1_tank.commander = new DemoAICommander(p1_tank);
      }
      return this.view.update_p1_lives(this.remain_user_p1_lives);
    }
  }

  born_p2_tank() {
    if (this.remain_user_p2_lives > 0) {
      this.remain_user_p2_lives -= 1;
      const p2_tank = this.map.add_tank(
        UserP2Tank,
        new MapArea2D(320, 480, 360, 520)
      );
      p2_tank.level_up(this.arrival_level("p2_level") - 1);
      p2_tank.on_ship(this.game.get_status("p2_ship"));
      if (this.is_demo_mode()) {
        p2_tank.commander = new DemoAICommander(p2_tank);
      }
      return this.view.update_p2_lives(this.remain_user_p2_lives);
    }
  }

  // A player tank arrives at the level it had, or the difficulty's minimum.
  arrival_level(status_key) {
    return Math.max(this.game.get_status(status_key), this.game.difficulty().player_level);
  }

  born_enemy_tank() {
    if (this.remain_enemy_counts > 0) {
      this.remain_enemy_counts -= 1;
      const enemy_born_areas = [
        new MapArea2D(0, 0, 40, 40),
        new MapArea2D(240, 0, 280, 40),
        new MapArea2D(480, 0, 520, 40)
      ];
      const enemy_tank_types = [StupidTank, FishTank, FoolTank, StrongTank];
      const randomed = Math.floor(Math.random() * enemy_tank_types.length);
      const tank = this.map.add_tank(
        enemy_tank_types[randomed],
        enemy_born_areas[this.last_enemy_born_area_index]
      );
      const difficulty = this.game.difficulty();
      tank.commander.shoot_on_sight = difficulty.shoot_on_sight;
      tank.commander.blunder_rate = difficulty.blunder_rate;
      if (difficulty.extra_enemy_hp > 0) {
        tank.hp_up(difficulty.extra_enemy_hp);
      }
      this.last_enemy_born_area_index =
        (this.last_enemy_born_area_index + 1) % 3;
      return this.view.update_enemy_statuses(this.remain_enemy_counts);
    }
  }

  check_user_win() {
    if (
      this.remain_enemy_counts === 0 &&
      this.map.enemy_tanks().length === 0
    ) {
      return this.user_win();
    }
  }

  // Lives count only the tanks held in reserve - in a two-player game the
  // other player can be out of lives and still fighting with their last tank.
  check_enemy_win() {
    if (
      this.remain_user_p1_lives === 0 &&
      this.remain_user_p2_lives === 0 &&
      this.map.user_tanks().length === 0
    ) {
      return this.enemy_win();
    }
  }

  user_win() {
    if (this.winner !== null) {
      return;
    }
    this.winner = "user";
    if (this.is_demo_mode()) {
      return this.finish_after(() => {
        this.game.update_status('demo_mode', false);
        return this.game.switch_scene("welcome");
      }, 3000);
    }
    return this.finish_after(() => {
      this.save_user_status();
      return this.game.switch_scene("report");
    }, 3000);
  }

  enemy_win() {
    if (this.winner !== null) {
      return;
    }
    this.winner = "enemy";
    if (this.is_demo_mode()) {
      return this.finish_after(() => {
        this.game.update_status('demo_mode', false);
        return this.game.switch_scene("welcome");
      }, 3000);
    }
    this.disable_user_controls();
    return this.finish_after(() => {
      this.game.update_status("game_over", true);
      this.sound.play("lose");
      return this.game.switch_scene("report");
    }, 3000);
  }

  // The battle is decided; move on after a moment. Kept so that stopping the
  // scene - the player leaving the demo, say - can call it off.
  finish_after(next) {
    clearTimeout(this.finish_timeout);
    this.finish_timeout = setTimeout(next, 3000);
    return this.finish_timeout;
  }

  increase_kill_score_by_user(tank, killed_by_tank) {
    const tank_score = this.game.get_config(`score_for_${tank.type()}`);
    if (killed_by_tank instanceof UserP1Tank) {
      return this.game.increase_p1_score(tank_score);
    } else {
      return this.game.increase_p2_score(tank_score);
    }
  }

  increase_enemy_kills_by_user(tank, killed_by_tank) {
    if (killed_by_tank instanceof UserP1Tank) {
      const p1_kills = this.game.get_status("p1_killed_enemies");
      return p1_kills.push(tank.type());
    } else {
      const p2_kills = this.game.get_status("p2_killed_enemies");
      return p2_kills.push(tank.type());
    }
  }

  draw_tank_points(tank, killed_by_tank) {
    if (tank instanceof EnemyTank) {
      return this.view.draw_point_label(
        tank,
        this.game.get_config(`score_for_${tank.type()}`)
      );
    }
  }

  increase_gift_score_by_user(gift, tanks) {
    tanks.forEach(tank => {
      const gift_score = this.game.get_config("score_for_gift");
      if (tank instanceof UserP1Tank) {
        this.game.increase_p1_score(gift_score);
      } else if (tank instanceof UserP2Tank) {
        this.game.increase_p2_score(gift_score);
      }
    });
  }

  draw_gift_points(gift, tanks) {
    return tanks.find(tank => {
      if (tank instanceof UserTank) {
        this.view.draw_point_label(
          tank,
          this.game.get_config("score_for_gift")
        );
        return true;
      } else {
        return false;
      }
    });
  }
}
