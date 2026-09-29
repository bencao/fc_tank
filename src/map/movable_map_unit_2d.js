import { Direction, Animations } from "../constants.js";
import { MapUnit2D } from "./map_unit_2d.js";
import { MapArea2D } from "./map_area_2d.js";
import { Commander } from "../objects/commanders.js";

export class MovableMapUnit2D extends MapUnit2D {
  static speed = 0.08;

  // How long a move may sit blocked before it is abandoned, in ms. While an
  // unfinished move is queued a commander will not steer anywhere else, so a
  // move that can never finish would wedge the unit against the wall forever.
  static blocked_grace_time = 250;

  get speed() { return this.constructor.speed; }

  constructor(map, area) {
    super(map, area);
    this.delayed_commands = [];
    this.move_remainder = 0;
    this.frame_offset = 0;
    this.moving = false;
    this.direction = 0;
    this.commander = new Commander(this);
  }

  new_display() {
    const center = this.area.center();
    this.displayed_animation = this.animation_state();
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

  // Kinetic rewinds a sprite to its first frame whenever its animation is set,
  // even to the one already playing - so set it only when it changes, or a
  // moving tank never gets past frame one and a guarded one never blinks.
  update_display() {
    if (this.destroyed) { return; }
    const state = this.animation_state();
    if (state !== this.displayed_animation) {
      this.displayed_animation = state;
      this.display_object.setAnimation(state);
      this.display_object.setFrameRate(Animations.rate(state));
    }
    this.display_object.setRotationDeg(this.direction);
    const center = this.area.center();
    return this.display_object.setAbsolutePosition(center.x, center.y);
  }

  // A commander can be holding timers of its own; they must not keep firing
  // against a unit that is gone.
  destroy() {
    if (typeof this.commander.destroy === "function") {
      this.commander.destroy();
    }
    return super.destroy();
  }

  queued_delayed_commands() {
    const commands = this.delayed_commands;
    this.delayed_commands = [];
    return commands;
  }
  add_delayed_command(command) { return this.delayed_commands.push(command); }

  integration(delta_time) {
    let cmd;
    if (this.destroyed) { return; }
    this.commands = [...this.commander.next_commands(), ...this.queued_delayed_commands()];
    this.frame_offset = this._frame_offset(delta_time);
    for (cmd of this.commands) { this.handle_turn(cmd); }
    for (cmd of this.commands) { this.handle_move(cmd, delta_time); }
  }

  // How far this unit may travel during this frame. Distance is carried in
  // whole pixels, so the sub-pixel leftovers are kept for the next frame -
  // otherwise a fast display, where a frame is worth less than one pixel,
  // would truncate every frame to zero and the unit would never move at all.
  // The budget is shared by every move command in the frame, so a queued move
  // arriving alongside a fresh one cannot buy a second frame of travel.
  _frame_offset(delta_time) {
    const distance = (this.speed * delta_time) + this.move_remainder;
    const whole = Math.floor(distance);
    this.move_remainder = distance - whole;
    return whole;
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
        var max_offset = this.frame_offset;
        var intent_offset = command.params.offset;
        if (intent_offset === null) {
          return this._spend(this.move(max_offset));
        } else if (intent_offset > 0) {
          const real_offset = Math.min(intent_offset, max_offset);
          const moved = this.move(real_offset);
          this._spend(moved);
          if (moved > 0) {
            command.params.blocked_time = 0;
            command.params.offset -= moved;
            if (command.params.offset > 0) { return this.add_delayed_command(command); }
          } else {
            command.params.blocked_time = (command.params.blocked_time ?? 0) + delta_time;
            if (command.params.blocked_time < this.constructor.blocked_grace_time) {
              return this.add_delayed_command(command);
            }
          }
        }
        break;
      case "stop_move":
        return this.moving = false;
    }
  }

  turn(direction) {
    if ([Direction.UP, Direction.DOWN].includes(direction)) {
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
    return this._lattice_offsets(this.area.x1, this.default_width/2).some(offset =>
      this._try_adjust(new MapArea2D(this.area.x1 + offset, this.area.y1,
        this.area.x2 + offset, this.area.y2)));
  }

  _adjust_y() {
    return this._lattice_offsets(this.area.y1, this.default_height/2).some(offset =>
      this._try_adjust(new MapArea2D(this.area.x1, this.area.y1 + offset,
        this.area.x2, this.area.y2 + offset)));
  }

  // Ways onto the half-tile lattice, nearest first. Shots chip walls back to
  // lines off the lattice, so the nearest spot can be inside a wall while the
  // one on the other side is open - refusing the turn then leaves the tank
  // wedged somewhere that looks clear.
  _lattice_offsets(position, cell) {
    const below = -(((position % cell) + cell) % cell);
    if (below === 0) { return [0]; }
    const above = below + cell;
    return -below < above ? [below, above] : [above, below];
  }

  _spend(offset) {
    this.frame_offset = Math.max(0, this.frame_offset - offset);
    return offset;
  }

  // Returns how far the unit actually travelled - 0 when it is blocked.
  // Walks a pixel at a time so nothing is ever stepped over: checking only the
  // landing spot lets a fast missile pass clean through a wall thinner than
  // its stride. The sprite only needs to follow once, to where it ends up.
  move(offset) {
    let moved = 0;
    while (moved < offset) {
      const step = this._try_move(1);
      if (step === 0) { break; }
      moved += step;
    }
    if (moved > 0) { this.update_display(); }
    return moved;
  }

  _try_move(offset) {
    const [offset_x, offset_y] = this._offset_by_direction(offset);
    if ((offset_x === 0) && (offset_y === 0)) { return 0; }
    const target_x = this.area.x1 + offset_x;
    const target_y = this.area.y1 + offset_y;
    const target_area = new MapArea2D(target_x, target_y,
      target_x + this.width(), target_y + this.height());
    if (this.map.area_available(this, target_area)) {
      this.area = target_area;
      return Math.abs(offset_x + offset_y);
    } else {
      return 0;
    }
  }

  _offset_by_direction(offset) {
    offset = parseInt(offset);
    switch (this.direction) {
      case Direction.UP:
        return [0, -Math.min(offset, this.area.y1)];
      case Direction.RIGHT:
        return [Math.min(offset, this.map.max_x - this.area.x2), 0];
      case Direction.DOWN:
        return [0, Math.min(offset, this.map.max_y - this.area.y2)];
      case Direction.LEFT:
        return [-Math.min(offset, this.area.x1), 0];
    }
  }
}
