import { MovableMapUnit2D } from "../map/movable_map_unit_2d.js";
import { UserCommander, EnemyAICommander } from "./commanders.js";
import { Missile } from "./missile.js";

export class Tank extends MovableMapUnit2D {
  constructor(map, area) {
    super(map, area);
    this.hp = 1;
    this.power = 1;
    this.level = 1;
    this.max_missile = 1;
    this.max_hp = 2;
    this.missiles = [];
    this.ship = false;
    this.guard = false;
    this.initializing = true;
    this.frozen = false;
    this.bom_on_destroy = true;
  }

  dead() {
    return this.hp <= 0;
  }

  level_up(levels) {
    this.level = _.min([this.level + levels, 3]);
    return this._level_adjust();
  }

  _level_adjust() {
    switch (this.level) {
      case 1:
        this.power = 1;
        this.max_missile = 1;
        break;
      case 2:
        this.power = 1;
        this.hp = _.max([this.hp + 1, this.max_hp]);
        this.max_missile = 2;
        break;
      case 3:
        this.power = 2;
        this.hp = _.max([this.hp + 1, this.max_hp]);
        this.max_missile = 2;
        break;
    }
    return this.update_display();
  }

  hp_up(lives) {
    return this.hp_down(-lives);
  }

  hp_down(lives) {
    this.hp -= lives;
    if (this.dead()) {
      return this.destroy();
    } else {
      this.level = _.max([1, this.level - 1]);
      return this._level_adjust();
    }
  }

  on_ship(ship) {
    this.ship = ship;
    return this.update_display();
  }

  fire() {
    if (!this.can_fire()) {
      return;
    }
    return this.missiles.push(this.map.add_missile(this));
  }

  can_fire() {
    return _.size(this.missiles) < this.max_missile;
  }

  freeze() {
    this.frozen = true;
    this.update_display();
    return this.attach_timeout_event(() => {
      this.frozen = false;
      return this.update_display();
    }, 6000);
  }

  handle_move(cmd, delta_time) {
    if (!this.frozen) {
      return super.handle_move(cmd, delta_time);
    }
  }

  handle_turn(cmd) {
    if (!this.frozen) {
      return super.handle_turn(cmd);
    }
  }

  handle_fire(cmd) {
    switch (cmd.type) {
      case "fire":
        return this.fire();
    }
  }

  integration(delta_time) {
    if (this.initializing || this.destroyed) {
      return;
    }
    super.integration(delta_time);
    return Array.from(this.commands).map(cmd => this.handle_fire(cmd));
  }

  delete_missile(missile) {
    return (this.missiles = _.without(this.missiles, missile));
  }

  after_new_display() {
    super.after_new_display();
    return this.display_object.afterFrame(4, () => {
      this.initializing = false;
      return this.update_display();
    });
  }

  destroy() {
    return super.destroy();
  }
}

export class UserTank extends Tank {
  static initClass() {
    this.prototype.speed = 0.13;
  }
  constructor(map, area) {
    super(map, area);
    this.guard = false;
  }
  on_guard(guard) {
    this.guard = guard;
    if (this.guard) {
      this.attach_timeout_event(() => this.on_guard(false), 10000);
    }
    return this.update_display();
  }
  defend(missile, destroy_area) {
    if (missile.parent instanceof UserTank) {
      if (missile.parent !== this) {
        this.freeze();
      }
      return this.max_defend_point - 1;
    }
    if (this.guard) {
      return this.max_defend_point - 1;
    }
    if (this.ship) {
      this.on_ship(false);
      return this.max_defend_point - 1;
    }
    const defend_point = _.min(this.hp, missile.power);
    this.hp_down(missile.power);
    if (this.dead()) {
      this.map.trigger("user_tank_destroyed", this, missile.parent);
    }
    return defend_point;
  }
  animation_state() {
    if (this.initializing) {
      return "tank_born";
    }
    if (this.guard) {
      return `${this.type()}_lv${this.level}_with_guard`;
    }
    if (this.frozen) {
      return `${this.type()}_lv${this.level}_frozen`;
    }
    if (this.ship) {
      return `${this.type()}_lv${this.level}_with_ship`;
    }
    return `${this.type()}_lv${this.level}`;
  }
  accept(map_unit) {
    return map_unit instanceof Missile && map_unit.parent === this;
  }

  fire() {
    super.fire();
    return this.map.trigger("user_fired");
  }

  handle_move(cmd, delta_time) {
    super.handle_move(cmd, delta_time);
    return this.map.trigger("user_moved");
  }
}
UserTank.initClass();

export class UserP1Tank extends UserTank {
  constructor(map, area) {
    super(map, area);
    this.commander = new UserCommander(this);
  }

  type() {
    return "user_p1";
  }
}

export class UserP2Tank extends UserTank {
  constructor(map, area) {
    super(map, area);
    this.commander = new UserCommander(this);
  }
  type() {
    return "user_p2";
  }
}

export class EnemyTank extends Tank {
  constructor(map, area) {
    super(map, area);
    this.max_hp = 5;
    this.hp = 1 + parseInt(Math.random() * (this.max_hp - 1));
    this.iq = 20; //parseInt(Math.random() * 60)
    this.gift_counts = parseInt((Math.random() * this.max_hp) / 2);
    this.direction = 180;
    this.commander = new EnemyAICommander(this);
  }
  hp_down(lives) {
    if (this.gift_counts > 0) {
      this.map.random_gift();
    }
    this.gift_counts -= lives;
    return super.hp_down(lives);
  }
  defend(missile, destroy_area) {
    if (missile.parent instanceof EnemyTank) {
      return this.max_defend_point - 1;
    }
    if (this.ship) {
      this.on_ship(false);
      return this.max_defend_point - 1;
    }
    const defend_point = _.min(this.hp, missile.power);
    this.hp_down(missile.power);
    if (this.dead()) {
      this.map.trigger("enemy_tank_destroyed", this, missile.parent);
    }
    return defend_point;
  }
  animation_state() {
    if (this.initializing) {
      return "tank_born";
    }
    const prefix =
      this.level === 3
        ? "enemy_lv3"
        : this.gift_counts > 0
        ? `${this.type()}_with_gift`
        : `${this.type()}_hp` + _.min([this.hp, 4]);
    return prefix + (this.ship ? "_with_ship" : "");
  }
  gift_up(gifts) {
    return (this.gift_counts += gifts);
  }
  handle_fire(cmd) {
    if (!this.frozen) {
      return super.handle_fire(cmd);
    }
  }
  accept(map_unit) {
    return (
      map_unit instanceof EnemyTank ||
      (map_unit instanceof Missile && map_unit.parent instanceof EnemyTank)
    );
  }
  handle_move(cmd, delta_time) {
    super.handle_move(cmd, delta_time);
    return this.map.trigger("enemy_moved");
  }
}

export class StupidTank extends EnemyTank {
  static initClass() {
    this.prototype.speed = 0.07;
  }
  type() {
    return "stupid";
  }
}
StupidTank.initClass();

export class FoolTank extends EnemyTank {
  static initClass() {
    this.prototype.speed = 0.07;
  }
  type() {
    return "fool";
  }
}
FoolTank.initClass();

export class FishTank extends EnemyTank {
  static initClass() {
    this.prototype.speed = 0.13;
  }
  type() {
    return "fish";
  }
}
FishTank.initClass();

export class StrongTank extends EnemyTank {
  static initClass() {
    this.prototype.speed = 0.07;
  }
  type() {
    return "strong";
  }
}
StrongTank.initClass();
