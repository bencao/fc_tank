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

// Picks which power-up drops next, weighted by each class's `weight`.
export function pickGiftClass(random = Math.random) {
  const classes = getGiftClasses();
  const total = classes.reduce((sum, cls) => sum + cls.weight, 0);
  let roll = random() * total;
  for (const cls of classes) {
    roll -= cls.weight;
    if (roll < 0) return cls;
  }
  return classes[classes.length - 1];
}

export class Gift extends MapUnit2D {
  static group = "gift";
  // Relative chance of this power-up dropping.
  static weight = 1;
  // Whether it hits the whole of the other side at once.
  static game_changer = false;

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
    const tanks = this.map.units_at(this.area).filter(
      unit => unit instanceof Tank
    );
    tanks.forEach(tank => this.apply(tank));
    if (tanks.length > 0) {
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

// Clearing or freezing a whole side is worth far more to the enemies, who
// field many tanks, than to the player's one - so these drop half as often.
export class LandMineGift extends Gift {
  static weight = 0.5;
  static game_changer = true;

  // The tank that set it off gets the kills - with no killer named, the
  // scene would score every one of them to P2, even in a one-player game.
  apply(tank) {
    if (tank instanceof EnemyTank) {
      this.map.user_tanks().forEach(t => {
        t.destroy();
        this.map.trigger("user_tank_destroyed", t, tank);
      });
    } else {
      this.map.enemy_tanks().forEach(t => {
        t.destroy();
        this.map.trigger("enemy_tank_destroyed", t, tank);
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
  // The wall comes back on the home's clock, not the gift's: the gift is
  // destroyed the moment it is picked up, and would take its timer with it.
  apply(tank) {
    const home = this.map.home();
    if (tank instanceof UserTank) {
      home.setup_defend_terrains();
    } else {
      home.delete_defend_terrains();
    }
    return home.restore_defend_terrains_after(10000);
  }
  type() {
    return "shovel";
  }
}

export class LifeGift extends Gift {
  apply(tank) {
    if (tank instanceof EnemyTank) {
      this.map.enemy_tanks().forEach(enemy_tank => {
        enemy_tank.hp_up(5);
        enemy_tank.gift_up(3);
      });
    } else {
      this.map.trigger("tank_life_up", tank);
    }
  }
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
  static weight = 0.5;
  static game_changer = true;

  apply(tank) {
    if (tank instanceof EnemyTank) {
      this.map.user_tanks().forEach(t => t.freeze());
    } else {
      this.map.enemy_tanks().forEach(t => t.freeze());
    }
  }
  type() {
    return "clock";
  }
}
