import { Tank } from "../objects/tanks.js";

// Friends play, host side: what the battle field looks like right now, small
// enough to send many times a second. The guest draws it with SpriteMirror
// (sprite_mirror.js).
//
// A frame is { units, terrain?, booms? }:
//   units   [[id, kind, animation, x, y, rotation]] - every tank ("t"),
//           missile ("m") and gift ("g"), in full every frame. Tanks and
//           missiles are placed by their centre, gifts by their corner, as
//           their sprites are.
//   terrain { add: [[id, type, x1, y1, x2, y2]], remove: [id] } - only what
//           changed since the last frame; the first frame carries it all.
//           Left out when nothing changed.
//   booms   [[x, y]] - explosions since the last frame. Left out when none.
export class FrameRecorder {
  constructor(map) {
    this.map = map;
    this.ids = new WeakMap();
    this.next_id = 1;
    // Terrain as the guest last heard of it: signature -> id.
    this.sent_terrain = new Map();
    this.booms = [];
    map.bind("unit_exploded", unit => {
      const center = unit.area.center();
      this.booms.push([center.x, center.y]);
    }, this);
  }

  record() {
    const frame = { units: this.units() };
    const terrain = this.terrain_changes();
    if (terrain) {
      frame.terrain = terrain;
    }
    if (this.booms.length > 0) {
      frame.booms = this.booms;
      this.booms = [];
    }
    return frame;
  }

  units() {
    const movables = [...this.map.tanks, ...this.map.missiles].map(unit => {
      const center = unit.area.center();
      const kind = unit instanceof Tank ? "t" : "m";
      return [this.id_of(unit), kind, unit.animation_state(), center.x, center.y, unit.direction];
    });
    const gifts = this.map.gifts.map(gift =>
      [this.id_of(gift), "g", gift.animation_state(), gift.area.x1, gift.area.y1, 0]
    );
    return [...movables, ...gifts];
  }

  // A piece of terrain is known by where it is and what it looks like, so a
  // home that falls goes out as a new piece in place of the old one.
  terrain_changes() {
    const current = new Map();
    for (const terrain of this.map.terrains) {
      const { x1, y1, x2, y2 } = terrain.area;
      const type = terrain.type() === "home" && terrain.destroyed ? "home_destroyed" : terrain.type();
      current.set(`${this.id_of(terrain)}:${type}`, [type, x1, y1, x2, y2]);
    }
    const remove = [];
    for (const [signature, id] of this.sent_terrain) {
      if (!current.has(signature)) {
        remove.push(id);
        this.sent_terrain.delete(signature);
      }
    }
    const add = [];
    for (const [signature, piece] of current) {
      if (!this.sent_terrain.has(signature)) {
        const id = this.next_id++;
        this.sent_terrain.set(signature, id);
        add.push([id, ...piece]);
      }
    }
    return add.length > 0 || remove.length > 0 ? { add, remove } : null;
  }

  id_of(unit) {
    if (!this.ids.has(unit)) {
      this.ids.set(unit, this.next_id++);
    }
    return this.ids.get(unit);
  }
}
