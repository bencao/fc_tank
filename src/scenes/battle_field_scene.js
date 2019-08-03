import { Scene } from "../engine/scene.js";
import { Map2D } from "../map/map_2d.js";
import { MapArea2D } from "../map/map_area_2d.js";
import { TiledMapBuilder } from "../map/tiled_map_builder.js";
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

export class BattleFieldScene extends Scene {
  constructor(game, view) {
    super(game, view);
    this.layer = this.view.layer;
    this.map = new Map2D(this.layer);
    $.ajax({
      url: "data/terrains.json",
      success: json => {
        return (this.builder = new TiledMapBuilder(this.map, json));
      },
      dataType: "json",
      async: false
    });
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
    return this.view.update_stage(this.current_stage);
  }

  start() {
    super.start();
    this.load_config_variables();
    this.start_map();
    this.enable_user_control();
    this.enable_system_control();
    this.start_time_line();
    return (this.running = true);
  }

  stop() {
    super.stop();
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
    // wait until builder loaded
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

  enable_user_control() {
    const p1_control_mappings = {
      UP: "up",
      DOWN: "down",
      LEFT: "left",
      RIGHT: "right",
      Z: "fire"
    };

    const p2_control_mappings = {
      W: "up",
      S: "down",
      A: "left",
      D: "right",
      J: "fire"
    };

    _.forIn(p1_control_mappings, (virtual_command, physical_key) => {
      this.keyboard.on_key_down(physical_key, event => {
        if (this.map.p1_tank()) {
          return this.map.p1_tank().commander.on_command_start(virtual_command);
        }
      });
      return this.keyboard.on_key_up(physical_key, event => {
        if (this.map.p1_tank()) {
          return this.map.p1_tank().commander.on_command_end(virtual_command);
        }
      });
    });

    return _.forIn(p2_control_mappings, (virtual_command, physical_key) => {
      this.keyboard.on_key_down(physical_key, event => {
        if (this.map.p2_tank()) {
          return this.map.p2_tank().commander.on_command_start(virtual_command);
        }
      });
      return this.keyboard.on_key_up(physical_key, event => {
        if (this.map.p2_tank()) {
          return this.map.p2_tank().commander.on_command_end(virtual_command);
        }
      });
    });
  }

  enable_system_control() {
    return this.keyboard.on_key_down("ENTER", event => {
      if (this.running) {
        return this.pause();
      } else {
        return this.rescue();
      }
    });
  }

  pause() {
    this.running = false;
    this.stop_time_line();
    return this.disable_user_controls();
  }

  disable_user_controls() {
    this.keyboard.reset();
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

  integration(offset) {
    const delta_time = Math.round(offset - this.startedAt);

    for (let m of this.map.missiles) {
      m.integration(delta_time);
    }
    for (let g of this.map.gifts) {
      g.integration(delta_time);
    }
    for (let t of this.map.tanks) {
      t.integration(delta_time);
    }
    for (let m of this.map.missiles) {
      m.integration(delta_time);
    }

    this.frame_rate += 1;
    this.startedAt = offset;

    if (this.startedAt !== null) {
      requestAnimationFrame(this.integration.bind(this));
    }
  }

  start_time_line() {
    this.startedAt = performance.now();

    requestAnimationFrame(this.integration.bind(this));

    // show frame rate
    this.frame_timeline = setInterval(() => {
      this.view.update_frame_rate(this.frame_rate);
      return (this.frame_rate = 0);
    }, 1000);
  }

  stop_time_line() {
    this.startedAt = null;

    return clearInterval(this.frame_timeline);
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
      p1_tank.level_up(this.game.get_status("p1_level") - 1);
      p1_tank.on_ship(this.game.get_status("p1_ship"));
      return this.view.update_p1_lives(this.remain_user_p1_lives);
    }
  }

  born_p2_tank() {
    console.log("born p2 tank");
    console.log(`${this.remain_user_p2_lives}`);
    if (this.remain_user_p2_lives > 0) {
      this.remain_user_p2_lives -= 1;
      const p2_tank = this.map.add_tank(
        UserP2Tank,
        new MapArea2D(320, 480, 360, 520)
      );
      p2_tank.level_up(this.game.get_status("p2_level") - 1);
      p2_tank.on_ship(this.game.get_status("p2_ship"));
      return this.view.update_p2_lives(this.remain_user_p2_lives);
    }
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
      const randomed =
        parseInt(Math.random() * 1000) % _.size(enemy_tank_types);
      this.map.add_tank(
        enemy_tank_types[randomed],
        enemy_born_areas[this.last_enemy_born_area_index]
      );
      this.last_enemy_born_area_index =
        (this.last_enemy_born_area_index + 1) % 3;
      return this.view.update_enemy_statuses(this.remain_enemy_counts);
    }
  }

  check_user_win() {
    if (
      this.remain_enemy_counts === 0 &&
      _.size(this.map.enemy_tanks()) === 0
    ) {
      return this.user_win();
    }
  }

  check_enemy_win() {
    if (this.remain_user_p1_lives === 0 && this.remain_user_p2_lives === 0) {
      return this.enemy_win();
    }
  }

  user_win() {
    if (!_.isNull(this.winner)) {
      return;
    }
    this.winner = "user";
    // report
    return setTimeout(() => {
      this.save_user_status();
      return this.game.switch_scene("report");
    }, 3000);
  }

  enemy_win() {
    if (!_.isNull(this.winner)) {
      return;
    }
    this.winner = "enemy";
    this.disable_user_controls();
    return setTimeout(() => {
      this.game.update_status("game_over", true);
      this.sound.play("lose");
      return this.game.switch_scene("report");
    }, 3000);
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
    return _.each(tanks, tank => {
      const gift_score = this.game.get_config("score_for_gift");
      if (tank instanceof UserP1Tank) {
        return this.game.increase_p1_score(gift_score);
      } else if (tank instanceof UserP2Tank) {
        return this.game.increase_p2_score(gift_score);
      }
    });
  }

  draw_gift_points(gift, tanks) {
    return _.detect(tanks, tank => {
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
