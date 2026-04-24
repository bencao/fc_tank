import { Animations } from "../constants.js";
import { MapUnit2D } from "./map_unit_2d.js";
import { MapArea2D } from "./map_area_2d.js";
import { Missile } from "../objects/missile.js";
import { Tank } from "../objects/tanks.js";

export class Terrain extends MapUnit2D {
  accept(map_unit) {
    return false;
  }
  new_display() {
    let animation;
    const animations = structuredClone(Animations.terrain(this.type()));
    for (animation of animations) {
      animation.x += this.area.x1 % 40;
      animation.y += this.area.y1 % 40;
      animation.width = this.area.width();
      animation.height = this.area.height();
    }
    return (this.display_object = new Kinetic.Sprite({
      x: this.area.x1,
      y: this.area.y1,
      image: this.map.image,
      index: 0,
      animation: "static",
      animations: { static: animations },
      map_unit: this
    }));
  }
}

export class BrickTerrain extends Terrain {
  type() {
    return "brick";
  }
  weight(tank) {
    return 40 / tank.power;
  }
  defend(missile, destroy_area) {
    const pieces = this.area.sub(destroy_area);
    pieces.forEach(piece => {
      this.map.add_terrain(BrickTerrain, piece);
    });
    this.destroy();
    return 1;
  }
}

export class IronTerrain extends Terrain {
  type() {
    return "iron";
  }
  weight(tank) {
    switch (tank.power) {
      case 1:
        return this.map.infinity;
      case 2:
        return 20;
      default:
        return 10;
    }
  }
  defend(missile, destroy_area) {
    if (missile.power < 2) {
      return this.max_defend_point;
    }
    const double_destroy_area = destroy_area.extend(missile.direction, 1);
    const pieces = this.area.sub(double_destroy_area);
    pieces.forEach(piece => {
      this.map.add_terrain(IronTerrain, piece);
    });
    this.destroy();
    return 2;
  }
}

export class WaterTerrain extends Terrain {
  static group = "back";
  accept(map_unit) {
    if (map_unit instanceof Tank) {
      return map_unit.ship;
    } else {
      return map_unit instanceof Missile;
    }
  }
  type() {
    return "water";
  }
  weight(tank) {
    switch (tank.ship) {
      case true:
        return 4;
      case false:
        return this.map.infinity;
    }
  }
}

export class IceTerrain extends Terrain {
  static group = "back";
  accept(map_unit) {
    return true;
  }
  type() {
    return "ice";
  }
  weight(tank) {
    return 4;
  }
}

export class GrassTerrain extends Terrain {
  static group = "front";
  accept(map_unit) {
    return true;
  }
  type() {
    return "grass";
  }
  weight(tank) {
    return 4;
  }
}

export class HomeTerrain extends Terrain {
  type() {
    return "home";
  }
  accept(map_unit) {
    if (this.destroyed && map_unit instanceof Missile) {
      return true;
    }
    return false;
  }
  weight(tank) {
    return 0;
  }
  new_display() {
    return (this.display_object = new Kinetic.Sprite({
      x: this.area.x1,
      y: this.area.y1,
      image: this.map.image,
      index: 0,
      animations: {
        origin: Animations.terrain("home_origin"),
        destroyed: Animations.terrain("home_destroyed")
      },
      animation: "origin",
      map_unit: this
    }));
  }
  defend(missile, destroy_area) {
    if (this.destroyed) {
      return this.max_defend_point;
    }
    this.destroyed = true;
    this.display_object.setAnimation("destroyed");
    this.map.trigger("home_destroyed");
    return this.max_defend_point;
  }

  defend_terrains() {
    const home_defend_area = new MapArea2D(220, 460, 300, 520);
    return this.map.units_at(home_defend_area).filter(
      unit => !(unit instanceof HomeTerrain) && !(unit instanceof Tank)
    );
  }

  delete_defend_terrains() {
    this.defend_terrains().forEach(terrain => terrain.destroy());
  }

  add_defend_terrains(terrain_cls) {
    for (let area of [
      new MapArea2D(220, 460, 260, 480),
      new MapArea2D(260, 460, 300, 480),
      new MapArea2D(220, 480, 240, 520),
      new MapArea2D(280, 480, 300, 520)
    ]) {
      if (this.map.units_at(area).length === 0) {
        this.map.add_terrain(terrain_cls, area);
      }
    }
  }

  setup_defend_terrains() {
    this.delete_defend_terrains();
    return this.add_defend_terrains(IronTerrain);
  }

  restore_defend_terrains() {
    this.delete_defend_terrains();
    return this.add_defend_terrains(BrickTerrain);
  }
}
