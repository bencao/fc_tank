import { Direction } from "../constants.js";

export class Commander {
  constructor(map_unit) {
    this.map_unit = map_unit;
    this.direction = this.map_unit.direction;
    this.commands = [];
    this.direction_action_map = {
      up: Direction.UP,
      down: Direction.DOWN,
      left: Direction.LEFT,
      right: Direction.RIGHT
    };
  }

  // calculate next commands
  next() {}

  next_commands() {
    this.commands = [];
    this.next();
    return _.uniq(this.commands, function(command) {
      if (command["type"] === "direction") {
        return command["params"]["direction"];
      }
      return command["type"];
    });
  }

  direction_changed(action) {
    const new_direction = this.direction_action_map[action];
    return this.map_unit.direction !== new_direction;
  }

  turn(action) {
    const new_direction = this.direction_action_map[action];
    return this.commands.push(this._direction_command(new_direction));
  }

  start_move(offset = null) {
    return this.commands.push(this._start_move_command(offset));
  }

  stop_move() {
    return this.commands.push(this._stop_move_command());
  }

  fire() {
    return this.commands.push(this._fire_command());
  }

  // private methods
  _direction_command(direction) {
    return {
      type: "direction",
      params: { direction }
    };
  }

  _start_move_command(offset = null) {
    return {
      type: "start_move",
      params: { offset }
    };
  }

  _stop_move_command() {
    return { type: "stop_move" };
  }

  _fire_command() {
    return { type: "fire" };
  }
}

export class UserCommander extends Commander {
  constructor(map_unit) {
    super(map_unit);
    this.reset();
  }

  reset() {
    this.reset_on_going_commands();
    return this.reset_command_queue();
  }

  reset_on_going_commands() {
    return (this.command_on_going = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    });
  }

  reset_command_queue() {
    return (this.command_queue = {
      up: [],
      down: [],
      left: [],
      right: [],
      fire: []
    });
  }

  is_on_going(command) {
    return this.command_on_going[command];
  }

  set_on_going(command, bool) {
    return (this.command_on_going[command] = bool);
  }

  next() {
    this.handle_finished_commands();
    return this.handle_on_going_commands();
  }

  handle_finished_commands() {
    for (let command in this.command_queue) {
      const sequences = this.command_queue[command];
      if (_.isEmpty(sequences)) {
        continue;
      }
      switch (command) {
        case "fire":
          this.fire();
          break;
        case "up":
        case "down":
        case "left":
        case "right":
          if (this.direction_changed(command)) {
            this.turn(command);
            break;
          }
          var has_start_command = _.contains(sequences, "start");
          var has_end_command = _.contains(sequences, "end");
          if (has_start_command) {
            this.start_move();
          }
          if (!has_start_command && has_end_command) {
            this.stop_move();
          }
          break;
      }
    }
    return this.reset_command_queue();
  }

  handle_on_going_commands() {
    for (let command of ["up", "down", "left", "right"]) {
      if (this.is_on_going(command)) {
        this.turn(command);
        this.start_move();
      }
    }
    if (this.is_on_going("fire")) {
      return this.fire();
    }
  }

  on_command_start(command) {
    this.set_on_going(command, true);
    return this.command_queue[command].push("start");
  }

  on_command_end(command) {
    this.set_on_going(command, false);
    return this.command_queue[command].push("end");
  }
}

export class EnemyAICommander extends Commander {
  constructor(map_unit) {
    super(map_unit);
    this.map = this.map_unit.map;
    this.reset_path();
    this.last_area = null;
  }

  next() {
    // move towards home
    if (_.size(this.path) === 0) {
      const end_vertex =
        Math.random() * 100 <= this.map_unit.iq
          ? this.map.home_vertex
          : this.map.random_vertex();
      this.path = this.map.shortest_path(
        this.map_unit,
        this.current_vertex(),
        end_vertex
      );
      this.next_move();
      setTimeout(() => this.reset_path(), 2000 + Math.random() * 2000);
    } else {
      if (this.current_vertex().equals(this.target_vertex)) {
        this.next_move();
      }
    }

    // more chance to fire if can't move
    if (
      this.map_unit.can_fire() &&
      this.last_area &&
      this.last_area.equals(this.map_unit.area)
    ) {
      if (Math.random() < 0.08) {
        this.fire();
      }
    } else {
      if (Math.random() < 0.01) {
        this.fire();
      }
    }
    // # fire if user or home in front of me
    // targets = _.compact([@map.p1_tank(), @map.p2_tank(), @map.home()])
    // for target in targets
    //   @fire() if @in_attack_range(target.area)

    return (this.last_area = this.map_unit.area);
  }

  next_move() {
    if (_.size(this.map_unit.delayed_commands) > 0) {
      return;
    }
    if (_.size(this.path) === 0) {
      return;
    }
    this.target_vertex = this.path.shift();
    const [direction, offset] = Array.from(
      this.offset_of(this.current_vertex(), this.target_vertex)
    );
    this.turn(direction);
    return this.start_move(offset);
  }

  reset_path() {
    return (this.path = []);
  }

  offset_of(current_vertex, target_vertex) {
    if (target_vertex.y1 < current_vertex.y1) {
      return ["up", current_vertex.y1 - target_vertex.y1];
    }
    if (target_vertex.y1 > current_vertex.y1) {
      return ["down", target_vertex.y1 - current_vertex.y1];
    }
    if (target_vertex.x1 < current_vertex.x1) {
      return ["left", current_vertex.x1 - target_vertex.x1];
    }
    if (target_vertex.x1 > current_vertex.x1) {
      return ["right", target_vertex.x1 - current_vertex.x1];
    }
    return ["down", 0];
  }

  current_vertex() {
    return this.map.vertexes_at(this.map_unit.area);
  }

  in_attack_range(area) {
    return (
      this.map_unit.area.x1 === area.x1 || this.map_unit.area.y1 === area.y1
    );
  }
}

export class MissileCommander extends Commander {
  next() {
    return this.start_move();
  }
}
