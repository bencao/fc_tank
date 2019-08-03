import { Direction, Animations } from "../constants.js";
import { MapUnit2D } from "./map_unit_2d.js";
import { MapArea2D } from "./map_area_2d.js";
import { Commander } from "../objects/commanders.js";

export class MovableMapUnit2D extends MapUnit2D {
  static initClass() {
    this.prototype.speed = 0.08;
  }

  constructor(map, area) {
    super(map, area);
    this.delayed_commands = [];
    this.moving = false;
    this.direction = 0;
    this.commander = new Commander(this);
  }

  new_display() {
    const center = this.area.center();
    return this.display_object = new Kinetic.Sprite({
      x: center.x,
      y: center.y,
      image: this.map.image,
      animation: this.animation_state(),
      animations: Animations.movables,
      frameRate: Animations.rate(this.animation_state()),
      index: 0,
      offset: {x: this.area.width()/2, y: this.area.height()/2},
      rotationDeg: this.direction,
      map_unit: this
    });
  }

  update_display() {
    if (this.destroyed) { return; }
    this.display_object.setAnimation(this.animation_state());
    this.display_object.setFrameRate(Animations.rate(this.animation_state()));
    this.display_object.setRotationDeg(this.direction);
    const center = this.area.center();
    return this.display_object.setAbsolutePosition(center.x, center.y);
  }

  queued_delayed_commands() {
    let commands;
    [commands, this.delayed_commands] = Array.from([this.delayed_commands, []]);
    return commands;
  }
  add_delayed_command(command) { return this.delayed_commands.push(command); }

  integration(delta_time) {
    let cmd;
    if (this.destroyed) { return; }
    this.commands = _.union(this.commander.next_commands(), this.queued_delayed_commands());
    for (cmd of Array.from(this.commands)) { this.handle_turn(cmd); }
    return (() => {
      const result = [];
      for (cmd of Array.from(this.commands)) {         result.push(this.handle_move(cmd, delta_time));
      }
      return result;
    })();
  }

  handle_turn(command) {
    switch(command.type) {
      case "direction":
        return this.turn(command.params.direction);
    }
  }

  handle_move(command, delta_time) {
    switch(command.type) {
      case "start_move":
        this.moving = true;
        var max_offset = parseInt(this.speed * delta_time);
        var intent_offset = command.params.offset;
        if (intent_offset === null) {
          return this.move(max_offset);
        } else if (intent_offset > 0) {
          const real_offset = _.min([intent_offset, max_offset]);
          if (this.move(real_offset)) {
            command.params.offset -= real_offset;
            if (command.params.offset > 0) { return this.add_delayed_command(command); }
          } else {
            return this.add_delayed_command(command);
          }
        }
        break;
      case "stop_move":
        // do not move by default
        return this.moving = false;
    }
  }

  turn(direction) {
    if (_.contains([Direction.UP, Direction.DOWN], direction)) {
      if (this._adjust_x()) { this.direction = direction; }
    } else {
      if (this._adjust_y()) { this.direction = direction; }
    }
    return this.update_display();
  }

  _try_adjust(area) {
    if (this.map.area_available(this, area)) {
      this.area = area;
      return true;
    } else {
      return false;
    }
  }

  _adjust_x() {
    const offset = (this.default_height/4) -
      ((this.area.x1 + (this.default_height/4))%(this.default_height/2));
    return this._try_adjust(new MapArea2D(this.area.x1 + offset, this.area.y1,
      this.area.x2 + offset, this.area.y2));
  }

  _adjust_y() {
    const offset = (this.default_width/4) -
      ((this.area.y1 + (this.default_width/4))%(this.default_width/2));
    return this._try_adjust(new MapArea2D(this.area.x1, this.area.y1 + offset,
      this.area.x2, this.area.y2 + offset));
  }

  move(offset) {
    return _.detect(_.range(1, offset + 1).reverse(), os => this._try_move(os));
  }

  _try_move(offset) {
    const [offset_x, offset_y] = Array.from(this._offset_by_direction(offset));
    if ((offset_x === 0) && (offset_y === 0)) { return false; }
    const target_x = this.area.x1 + offset_x;
    const target_y = this.area.y1 + offset_y;
    const target_area = new MapArea2D(target_x, target_y,
      target_x + this.width(), target_y + this.height());
    if (this.map.area_available(this, target_area)) {
      this.area = target_area;
      this.update_display();
      return true;
    } else {
      return false;
    }
  }

  _offset_by_direction(offset) {
    offset = parseInt(offset);
    switch (this.direction) {
      case Direction.UP:
        return [0, - _.min([offset, this.area.y1])];
      case Direction.RIGHT:
        return [_.min([offset, this.map.max_x - this.area.x2]), 0];
      case Direction.DOWN:
        return [0, _.min([offset, this.map.max_y - this.area.y2])];
      case Direction.LEFT:
        return [- _.min([offset, this.area.x1]), 0];
    }
  }
}
MovableMapUnit2D.initClass();
