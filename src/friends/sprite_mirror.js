import { Animations } from "../constants.js";
import { MapArea2D } from "../map/map_area_2d.js";
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  IceTerrain,
  GrassTerrain,
  HomeTerrain
} from "../map/terrains.js";

// Friends play, guest side: draws the frames FrameRecorder (frame_recorder.js)
// records on the host. Terrain goes onto the guest's own Map2D, drawn by the
// same Terrain classes the host uses; tanks, missiles and gifts are bare
// sprites - the guest only has to show them, never simulate them.

const TERRAIN_CLASSES = Object.fromEntries(
  [BrickTerrain, IronTerrain, WaterTerrain, IceTerrain, GrassTerrain, HomeTerrain]
    .map(cls => [cls.prototype.type(), cls])
);

const animations_for = kind => (kind === "g" ? Animations.gifts : Animations.movables);

// Half a tank and half a missile: they're placed by their centre.
const HALF_SIZE = { t: 20, m: 10 };

export class SpriteMirror {
  constructor(map, layer) {
    this.map = map;
    this.layer = layer;
    this.terrains = new Map();
    this.units = new Map();
  }

  apply({ units = [], terrain, booms = [] }) {
    if (terrain) {
      this.apply_terrain(terrain);
    }
    this.apply_units(units);
    booms.forEach(([x, y]) => this.explode(x, y));
    return this.layer.batchDraw();
  }

  apply_terrain({ add = [], remove = [] }) {
    remove.forEach(id => {
      this.terrains.get(id)?.destroy();
      this.terrains.delete(id);
    });
    add.forEach(([id, type, x1, y1, x2, y2]) => {
      const fallen = type === "home_destroyed";
      const cls = TERRAIN_CLASSES[fallen ? "home" : type];
      if (!cls) {
        return;
      }
      const terrain = this.map.add_terrain(cls, new MapArea2D(x1, y1, x2, y2));
      if (fallen) {
        terrain.display_object.setAnimation("destroyed");
      }
      this.terrains.set(id, terrain);
    });
  }

  apply_units(units) {
    const seen = new Set();
    units.forEach(([id, kind, animation, x, y, rotation]) => {
      if (!Object.hasOwn(animations_for(kind), animation)) {
        return;
      }
      seen.add(id);
      const known = this.units.get(id);
      if (known) {
        return this.move(known, animation, x, y, rotation);
      }
      this.units.set(id, { animation, sprite: this.new_sprite(kind, animation, x, y, rotation) });
    });
    for (const [id, unit] of this.units) {
      if (!seen.has(id)) {
        unit.sprite.destroy();
        this.units.delete(id);
      }
    }
  }

  // Kinetic rewinds a sprite whenever its animation is set, so only on a
  // change - as MovableMapUnit2D.update_display does.
  move(unit, animation, x, y, rotation) {
    if (animation !== unit.animation) {
      unit.animation = animation;
      unit.sprite.setAnimation(animation);
      unit.sprite.setFrameRate(Animations.rate(animation));
    }
    unit.sprite.setRotationDeg(rotation);
    unit.sprite.setAbsolutePosition(x, y);
  }

  new_sprite(kind, animation, x, y, rotation) {
    const gift = kind === "g";
    const half = HALF_SIZE[kind];
    const sprite = new Kinetic.Sprite({
      x,
      y,
      image: this.map.image,
      animation,
      animations: animations_for(kind),
      frameRate: Animations.rate(animation),
      index: 0,
      ...(half && { offset: { x: half, y: half } }),
      rotationDeg: rotation
    });
    this.map.groups[gift ? "gift" : "middle"].add(sprite);
    sprite.start();
    return sprite;
  }

  // As MapUnit2D.destroy_display blows a unit up.
  explode(x, y) {
    const sprite = new Kinetic.Sprite({
      x,
      y,
      image: this.map.image,
      animation: "bom",
      animations: Animations.movables,
      frameRate: Animations.rate("bom"),
      index: 0,
      offset: { x: 20, y: 20 }
    });
    this.map.groups.middle.add(sprite);
    sprite.start();
    sprite.afterFrame(3, () => {
      sprite.stop();
      sprite.destroy();
    });
  }

  clear() {
    this.units.forEach(unit => unit.sprite.destroy());
    this.units.clear();
    this.terrains.clear();
    this.map.reset();
  }
}
