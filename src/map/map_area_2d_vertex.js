import { MapArea2D } from "./map_area_2d.js";

export class MapArea2DVertex extends MapArea2D {
  constructor(x1, y1, x2, y2) {
    super(x1, y1, x2, y2);
    this.siblings = [];
  }

  init_vxy(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  add_sibling(sibling) {
    return this.siblings.push(sibling);
  }

  a_star_weight(target_vertex) {
    return (
      (Math.pow(this.vx - target_vertex.vx, 2) +
        Math.pow(this.vy - target_vertex.vy, 2)) /
      2
    );
  }
}
