import { Animations } from "../constants.js";

export class MapUnit2D {
  static initClass() {
    this.prototype.group = 'middle';
    this.prototype.max_defend_point = 9;
  }

  constructor(map, area) {
    this.map = map;
    this.area = area;
    this.default_width = this.map.default_width;
    this.default_height = this.map.default_height;
    this.bom_on_destroy = false;
    this.destroyed = false;
    this.attached_timeout_handlers = [];
  }

  after_new_display() {
    this.map.groups[this.group].add(this.display_object);
    return this.display_object.start();
  }

  destroy_display() {
    if (this.bom_on_destroy) {
      this.display_object.setOffset(20, 20);
      this.display_object.setAnimations(Animations.movables);
      this.display_object.setAnimation('bom');
      this.display_object.setFrameRate(Animations.rate('bom'));
      this.display_object.start();
      return this.display_object.afterFrame(3, () => {
        this.display_object.stop();
        return this.display_object.destroy();
      });
    } else {
      this.display_object.stop();
      return this.display_object.destroy();
    }
  }

  width() { return this.area.x2 - this.area.x1; }
  height() { return this.area.y2 - this.area.y1; }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
    }
    this.destroy_display();
    this.detach_timeout_events();
    return this.map.delete_map_unit(this);
  }

  defend(missile, destroy_area) { return 0; }
  accept(map_unit) { return true; }

  attach_timeout_event(func, delay) {
    const handle = setTimeout(func, delay);
    return this.attached_timeout_handlers.push(handle);
  }

  detach_timeout_events() {
    return _.each(this.attached_timeout_handlers, handle => clearTimeout(handle));
  }
}
MapUnit2D.initClass();
