import { Direction } from "../constants.js";

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

export class MapArea2D {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  intersect(area) {
    return new MapArea2D(_.max([area.x1, this.x1]), _.max([area.y1, this.y1]),
      _.min([area.x2, this.x2]), _.min([area.y2, this.y2]));
  }
  sub(area) {
    const intersection = this.intersect(area);
    return _.select([
      new MapArea2D(this.x1, this.y1, this.x2, intersection.y1),
      new MapArea2D(this.x1, intersection.y2, this.x2, this.y2),
      new MapArea2D(this.x1, intersection.y1, intersection.x1, intersection.y2),
      new MapArea2D(intersection.x2, intersection.y1, this.x2, intersection.y2)
    ], candidate_area => candidate_area.valid());
  }
  collide(area) {
    return !((this.x2 <= area.x1) || (this.y2 <= area.y1) || (this.x1 >= area.x2) || (this.y1 >= area.y2));
  }
  extend(direction, ratio) {
    switch (direction) {
      case Direction.UP:
        return new MapArea2D(this.x1, this.y1 - (ratio * this.height()), this.x2, this.y2);
      case Direction.RIGHT:
        return new MapArea2D(this.x1, this.y1, this.x2 + (ratio * this.width()), this.y2);
      case Direction.DOWN:
        return new MapArea2D(this.x1, this.y1, this.x2, this.y2 + (ratio * this.height()));
      case Direction.LEFT:
        return new MapArea2D(this.x1 - (ratio * this.width()), this.y1, this.x2, this.y2);
    }
  }
  equals(area) {
    if (!(area instanceof MapArea2D)) { return false; }
    return (area.x1 === this.x1) && (area.x2 === this.x2) && (area.y1 === this.y1) && (area.y2 === this.y2);
  }
  valid() { return (this.x2 > this.x1) && (this.y2 > this.y1); }
  center() { return new Point((this.x1 + this.x2)/2, (this.y1 + this.y2)/2); }
  clone() { return new MapArea2D(this.x1, this.y1, this.x2, this.y2); }
  width() { return this.x2 - this.x1; }
  height() { return this.y2 - this.y1; }
  to_s() { return `[${this.x1}, ${this.y1}, ${this.x2}, ${this.y2}]`; }
}
