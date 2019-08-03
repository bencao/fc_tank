import { Animations } from "../constants.js";
import { MapUnit2D } from "../map/map_unit_2d.js";
import { Tank, UserTank, EnemyTank } from "./tanks.js";

export function getGiftClasses() {
  return [
    GunGift,
    HatGift,
    ShipGift,
    StarGift,
    LifeGift,
    ClockGift,
    ShovelGift,
    LandMineGift
  ];
}

export class Gift extends MapUnit2D {
  static initClass() {
    this.prototype.group = "gift";
  }

  accept(map_unit) {
    return true;
  }
  defend(missile, destroy_area) {
    return 0;
  }

  integration(delta_time) {
    if (this.destroyed) {
      return;
    }
    const tanks = _.select(
      this.map.units_at(this.area),
      unit => unit instanceof Tank
    );
    _.each(tanks, tank => this.apply(tank));
    if (_.size(tanks) > 0) {
      this.destroy();
      return this.map.trigger("gift_consumed", this, tanks);
    }
  }
  apply(tank) {}

  new_display() {
    return (this.display_object = new Kinetic.Sprite({
      x: this.area.x1,
      y: this.area.y1,
      image: this.map.image,
      animation: this.animation_state(),
      animations: Animations.gifts,
      frameRate: Animations.rate(this.animation_state()),
      index: 0,
      map_unit: this
    }));
  }

  animation_state() {
    return this.type();
  }
}
Gift.initClass();

export class LandMineGift extends Gift {
  apply(tank) {
    if (tank instanceof EnemyTank) {
      return _.each(this.map.user_tanks(), tank => {
        tank.destroy();
        return this.map.trigger("user_tank_destroyed", tank, null);
      });
    } else {
      return _.each(this.map.enemy_tanks(), tank => {
        tank.destroy();
        return this.map.trigger("enemy_tank_destroyed", tank, null);
      });
    }
  }
  type() {
    return "land_mine";
  }
}

export class GunGift extends Gift {
  apply(tank) {
    return tank.level_up(2);
  }
  type() {
    return "gun";
  }
}

export class ShipGift extends Gift {
  apply(tank) {
    return tank.on_ship(true);
  }
  type() {
    return "ship";
  }
}

export class StarGift extends Gift {
  apply(tank) {
    return tank.level_up(1);
  }
  type() {
    return "star";
  }
}

export class ShovelGift extends Gift {
  apply(tank) {
    if (tank instanceof UserTank) {
      this.map.home().setup_defend_terrains();
    } else {
      this.map.home().delete_defend_terrains();
    }
    // transfer back to brick after 10 seconds
    return this.attach_timeout_event(() => {
      return this.map.home().restore_defend_terrains();
    }, 10000);
  }
  type() {
    return "shovel";
  }
}

export class LifeGift extends Gift {
  apply(tank) {
    if (tank instanceof EnemyTank) {
      return _.each(this.map.enemy_tanks(), function(enemy_tank) {
        tank.hp_up(5);
        return tank.gift_up(3);
      });
    } else {
      return this.map.trigger("tank_life_up", tank);
    }
  }
  // TODO add extra user life
  type() {
    return "life";
  }
}

export class HatGift extends Gift {
  apply(tank) {
    if (tank instanceof EnemyTank) {
      return tank.hp_up(5);
    } else {
      return tank.on_guard(true);
    }
  }
  type() {
    return "hat";
  }
}

export class ClockGift extends Gift {
  apply(tank) {
    if (tank instanceof EnemyTank) {
      return _.each(this.map.user_tanks(), tank => tank.freeze());
    } else {
      return _.each(this.map.enemy_tanks(), tank => tank.freeze());
    }
  }
  type() {
    return "clock";
  }
}
