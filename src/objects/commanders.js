import { Direction } from "../constants.js";
import { MapArea2D } from "../map/map_area_2d.js";

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
    const seen = new Set();
    return this.commands.filter(command => {
      const key = command.type === "direction"
        ? command.params.direction
        : command.type;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
      if (sequences.length === 0) {
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
          var has_start_command = sequences.includes("start");
          var has_end_command = sequences.includes("end");
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

// Shared plumbing for the commanders that steer by route: how often they may
// search the map, how they notice they are wedged, and how they walk a route.
class PathfindingCommander extends Commander {
  // Frames without moving before we assume the route is blocked.
  static stuck_threshold = 30;
  // Frames between route searches. A search scans the whole map, so asking on
  // every frame - which is what an empty route used to do - starves the frame
  // budget on its own.
  static repath_cooldown = 20;
  // Searching a map with no way through is the most expensive search there is,
  // because it has to look everywhere before giving up. Wait longer after one.
  static failed_repath_cooldown = 90;

  constructor(map_unit) {
    super(map_unit);
    this.map = this.map_unit.map;
    this.reset_path();
    this.last_area = null;
    this.stuck_ticks = 0;
    this.ticks_since_path = this.constructor.repath_cooldown;
    this._repath_delay = null;
  }

  // Returns true when the route has just been abandoned because the tank has
  // not shifted for a while - wedged against something the route missed.
  note_progress() {
    this.ticks_since_path += 1;
    const moved = !(this.last_area && this.last_area.equals(this.map_unit.area));
    this.stuck_ticks = moved ? 0 : this.stuck_ticks + 1;
    if (this.stuck_ticks < this.constructor.stuck_threshold) {
      return false;
    }
    this.reset_path();
    this.stuck_ticks = 0;
    this.wander_action = null;
    return true;
  }

  // No route to follow - keep rolling instead of standing in the open. When we
  // run into something the stuck check clears the heading and we pick another.
  wander() {
    if (this.wander_action == null) {
      const actions = Object.keys(this.direction_action_map);
      this.wander_action = actions[Math.floor(Math.random() * actions.length)];
    }
    this.turn(this.wander_action);
    return this.start_move();
  }

  may_plan_route() {
    return this.ticks_since_path >= this.repath_delay;
  }

  get repath_delay() {
    return this._repath_delay ?? this.constructor.repath_cooldown;
  }

  plan_route(end_vertex) {
    this.ticks_since_path = 0;
    this.path = this.map.shortest_path(
      this.map_unit,
      this.current_vertex(),
      end_vertex
    );
    this._repath_delay =
      this.path.length === 0
        ? this.constructor.failed_repath_cooldown
        : this.constructor.repath_cooldown;
    return this.next_move();
  }

  advance_along_route() {
    if (this.target_vertex && this.current_vertex().equals(this.target_vertex)) {
      this.next_move();
    }
  }

  // One change-of-mind timer per tank, not one per route ever planned.
  arm_repath_timer(delay) {
    clearTimeout(this.repath_timer);
    this.repath_timer = setTimeout(() => this.reset_path(), delay);
  }

  next_move() {
    if (this.map_unit.delayed_commands.length > 0) {
      return;
    }
    if (this.path.length === 0) {
      return;
    }
    this.target_vertex = this.path.shift();
    const [direction, offset] = this.offset_of(this.current_vertex(), this.target_vertex);
    this.turn(direction);
    return this.start_move(offset);
  }

  reset_path() {
    this.path = [];
    this.target_vertex = null;
  }

  destroy() {
    clearTimeout(this.repath_timer);
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
}

export class EnemyAICommander extends PathfindingCommander {
  next() {
    this.note_progress();

    // move towards home
    if (this.path.length === 0) {
      if (this.may_plan_route()) {
        this.plan_route(this.goal_vertex());
        this.arm_repath_timer(2000 + Math.random() * 2000);
      }
      if (this.path.length === 0) {
        this.wander();
      }
    } else {
      this.advance_along_route();
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

    return (this.last_area = this.map_unit.area);
  }

  // Objective chosen by Jev (see src/ai/enemy_guide.js). Until guidance
  // arrives - or if it never does - the tank's own iq decides.
  follow(objective) {
    if (objective === this.objective) {
      return;
    }
    this.objective = objective;
    this.reset_path();
  }

  goal_vertex() {
    if (this.objective === "attack_base") {
      return this.map.home_vertex;
    }
    if (this.objective === "hunt_player") {
      const prey = this._nearest_user_tank();
      if (prey) {
        return this.map.vertexes_at(prey.area);
      }
    }
    if (this.objective === "roam") {
      return this.map.random_vertex(this.map_unit);
    }
    return Math.random() * 100 <= this.map_unit.iq
      ? this.map.home_vertex
      : this.map.random_vertex(this.map_unit);
  }

  _nearest_user_tank() {
    const my = this.map_unit.area;
    const distance = tank => Math.abs(my.x1 - tank.area.x1) + Math.abs(my.y1 - tank.area.y1);
    return this.map
      .user_tanks()
      .reduce((nearest, tank) => (!nearest || distance(tank) < distance(nearest) ? tank : nearest), null);
  }

  in_attack_range(area) {
    return (
      this.map_unit.area.x1 === area.x1 || this.map_unit.area.y1 === area.y1
    );
  }
}

export class DemoAICommander extends PathfindingCommander {
  next() {
    const enemies = this.map.enemy_tanks().filter(t => !t.destroyed && !t.initializing);
    if (enemies.length === 0) {
      return;
    }

    const wedged = this.note_progress();

    // Priority 1: if aligned with an enemy AND we have a clear shot, face it
    // and fire. Skipped while wedged so we always fall through to pathfinding.
    const aligned = wedged ? null : this._find_aligned_enemy(enemies);
    if (aligned) {
      this.turn(this._direction_toward(aligned));
      if (this.map_unit.can_fire()) {
        this.fire();
      }
      this.start_move();
      this.last_area = this.map_unit.area;
      return;
    }

    // Priority 2: pathfind toward nearest enemy
    if (this.path.length === 0) {
      const nearest = this._find_nearest_enemy(enemies);
      if (nearest && this.may_plan_route()) {
        this.plan_route(this.map.vertexes_at(nearest.area));
        this.arm_repath_timer(1000 + Math.random() * 1000);
      }
      if (this.path.length === 0) {
        this.wander();
      }
    } else {
      this.advance_along_route();
    }

    // Fire if stuck
    if (
      this.map_unit.can_fire() &&
      this.last_area &&
      this.last_area.equals(this.map_unit.area)
    ) {
      if (Math.random() < 0.08) {
        this.fire();
      }
    }

    this.last_area = this.map_unit.area;
  }

  _find_aligned_enemy(enemies) {
    for (const enemy of enemies) {
      const same_col = this.map_unit.area.x1 === enemy.area.x1;
      const same_row = this.map_unit.area.y1 === enemy.area.y1;
      if ((same_col || same_row) && this._has_clear_shot(enemy)) {
        return enemy;
      }
    }
    return null;
  }

  _has_clear_shot(enemy) {
    const me = this.map_unit.area;
    const them = enemy.area;
    let gap;
    if (me.x1 === them.x1) {
      const top = Math.min(me.y2, them.y2);
      const bottom = Math.max(me.y1, them.y1);
      if (top >= bottom) {
        return true;
      }
      gap = new MapArea2D(me.x1, top, me.x2, bottom);
    } else {
      const left = Math.min(me.x2, them.x2);
      const right = Math.max(me.x1, them.x1);
      if (left >= right) {
        return true;
      }
      gap = new MapArea2D(left, me.y1, right, me.y2);
    }
    return !this.map.units_at(gap).some(unit => this._blocks_shot(unit));
  }

  _blocks_shot(unit) {
    if (typeof unit.type !== "function") {
      return false;
    }
    const type = unit.type();
    if (type === "iron") {
      return this.map_unit.power < 2;
    }
    if (type === "home") {
      return !unit.destroyed;
    }
    return false;
  }

  _direction_toward(enemy) {
    const my = this.map_unit.area;
    const their = enemy.area;
    if (my.x1 === their.x1) {
      return their.y1 < my.y1 ? "up" : "down";
    } else {
      return their.x1 < my.x1 ? "left" : "right";
    }
  }

  _find_nearest_enemy(enemies) {
    let nearest = null;
    let min_dist = Infinity;
    const my = this.map_unit.area;
    for (const enemy of enemies) {
      const dist = Math.abs(my.x1 - enemy.area.x1) + Math.abs(my.y1 - enemy.area.y1);
      if (dist < min_dist) {
        min_dist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

}

export class MissileCommander extends Commander {
  next() {
    return this.start_move();
  }
}
