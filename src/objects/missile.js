import { Direction } from "../constants.js";
import { MovableMapUnit2D } from "../map/movable_map_unit_2d.js";
import { MapArea2D } from "../map/map_area_2d.js";
import { MissileCommander } from "./commanders.js";

function bornArea(map, parent) {
  switch (parent.direction) {
    case Direction.UP:
      return new MapArea2D(
        parent.area.x1 + map.default_width / 4,
        parent.area.y1,
        parent.area.x2 - map.default_width / 4,
        parent.area.y1 + map.default_height / 2
      );
    case Direction.DOWN:
      return new MapArea2D(
        parent.area.x1 + map.default_width / 4,
        parent.area.y2 - map.default_height / 2,
        parent.area.x2 - map.default_width / 4,
        parent.area.y2
      );
    case Direction.LEFT:
      return new MapArea2D(
        parent.area.x1,
        parent.area.y1 + map.default_height / 4,
        parent.area.x1 + map.default_width / 2,
        parent.area.y2 - map.default_height / 4
      );
    case Direction.RIGHT:
      return new MapArea2D(
        parent.area.x2 - map.default_width / 2,
        parent.area.y1 + map.default_height / 4,
        parent.area.x2,
        parent.area.y2 - map.default_height / 4
      );
  }
}

export class Missile extends MovableMapUnit2D {
  static initClass() {
    this.prototype.speed = 0.2;
  }
  constructor(map, parent) {
    super(map, bornArea(map, parent));
    this.parent = parent;
    this.power = this.parent.power;
    this.energy = this.power;
    this.direction = this.parent.direction;
    this.exploded = false;
    this.commander = new MissileCommander(this);
  }

  type() {
    return "missile";
  }
  explode() {
    return (this.exploded = true);
  }

  destroy() {
    super.destroy();
    return this.parent.delete_missile(this);
  }

  animation_state() {
    return "missile";
  }

  move(offset) {
    const can_move = super.move(offset);
    if (!can_move) {
      this.attack();
    }
    return can_move;
  }
  attack() {
    // if collide with other object, then explode
    const destroy_area = this.destroy_area();

    if (this.map.out_of_bound(destroy_area)) {
      this.bom_on_destroy = true;
      this.energy -= this.max_defend_point;
    } else {
      const hit_map_units = this.map.units_at(destroy_area);
      _.each(hit_map_units, unit => {
        const defend_point = unit.defend(this, destroy_area);
        this.bom_on_destroy = defend_point === this.max_defend_point;
        return (this.energy -= defend_point);
      });
    }
    if (this.energy <= 0) {
      return this.destroy();
    }
  }
  destroy_area() {
    switch (this.direction) {
      case Direction.UP:
        return new MapArea2D(
          this.area.x1 - this.default_width / 4,
          this.area.y1 - this.default_height / 4,
          this.area.x2 + this.default_width / 4,
          this.area.y1
        );
      case Direction.RIGHT:
        return new MapArea2D(
          this.area.x2,
          this.area.y1 - this.default_height / 4,
          this.area.x2 + this.default_width / 4,
          this.area.y2 + this.default_height / 4
        );
      case Direction.DOWN:
        return new MapArea2D(
          this.area.x1 - this.default_width / 4,
          this.area.y2,
          this.area.x2 + this.default_width / 4,
          this.area.y2 + this.default_height / 4
        );
      case Direction.LEFT:
        return new MapArea2D(
          this.area.x1 - this.default_width / 4,
          this.area.y1 - this.default_height / 4,
          this.area.x1,
          this.area.y2 + this.default_height / 4
        );
    }
  }
  defend(missile, destroy_area) {
    this.destroy();
    return this.max_defend_point - 1;
  }
  accept(map_unit) {
    return (
      map_unit === this.parent ||
      (map_unit instanceof Missile && map_unit.parent === this.parent)
    );
  }
}
Missile.initClass();
