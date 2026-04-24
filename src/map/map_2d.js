import { BinomialHeap, BinomialHeapNode } from "../engine/data_structures.js";
import { MapArea2DVertex } from "./map_area_2d_vertex.js";
import { Missile } from "../objects/missile.js";
import { Terrain } from "./terrains.js";
import { Gift, getGiftClasses } from "../objects/gifts.js";
import { Tank, UserTank, EnemyTank } from "../objects/tanks.js";

export class Map2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.max_x = 520;
    this.max_y = 520;
    this.default_width = 40;
    this.default_height = 40;
    this.infinity = 65535;
    this.map_units = [];
    this.terrains = [];
    this.tanks = [];
    this.missiles = [];
    this.gifts = [];
    this.groups = {
      gift: new Kinetic.Group(),
      front: new Kinetic.Group(),
      middle: new Kinetic.Group(),
      back: new Kinetic.Group()
    };
    this.canvas.add(this.groups["back"]);
    this.canvas.add(this.groups["middle"]);
    this.canvas.add(this.groups["front"]);
    this.canvas.add(this.groups["gift"]);

    this.image = document.getElementById("tank_sprite");

    this.vertexes_columns = (4 * this.max_x) / this.default_width - 3;
    this.vertexes_rows = (4 * this.max_y) / this.default_height - 3;
    this.vertexes = this.init_vertexes();
    this.home_vertex = this.vertexes[24][48];

    this.bindings = {};
  }

  reset() {
    this.bindings = {};
    this.map_units.forEach(unit => unit.destroy());
  }

  add_terrain(terrain_cls, area) {
    const terrain = new terrain_cls(this, area);
    terrain.new_display();
    terrain.after_new_display();
    this.terrains.push(terrain);
    this.map_units.push(terrain);
    return terrain;
  }

  add_tank(tank_cls, area) {
    const tank = new tank_cls(this, area);
    tank.new_display();
    tank.after_new_display();
    this.tanks.push(tank);
    this.map_units.push(tank);
    return tank;
  }

  add_missile(parent) {
    const missile = new Missile(this, parent);
    missile.new_display();
    missile.after_new_display();
    this.missiles.push(missile);
    this.map_units.push(missile);
    return missile;
  }

  random_gift() {
    this.gifts.forEach(gift => gift.destroy());

    const gift_classes = getGiftClasses();
    const vx = Math.floor(Math.random() * this.vertexes_rows);
    const vy = Math.floor(Math.random() * this.vertexes_columns);
    const gift_choice = Math.floor(Math.random() * gift_classes.length);
    const gift = new gift_classes[gift_choice](
      this,
      this.vertexes[vx][vy].clone()
    );
    gift.new_display();
    gift.after_new_display();
    this.gifts.push(gift);
    this.map_units.push(gift);
    return gift;
  }

  delete_map_unit(map_unit) {
    if (map_unit instanceof Terrain) {
      this.terrains = this.terrains.filter(t => t !== map_unit);
    } else if (map_unit instanceof Missile) {
      this.missiles = this.missiles.filter(m => m !== map_unit);
    } else if (map_unit instanceof Tank) {
      this.tanks = this.tanks.filter(t => t !== map_unit);
    } else if (map_unit instanceof Gift) {
      this.gifts = this.gifts.filter(g => g !== map_unit);
    }
    this.map_units = this.map_units.filter(u => u !== map_unit);
  }

  p1_tank() {
    return this.tanks.find(tank => tank.type() === "user_p1");
  }
  p2_tank() {
    return this.tanks.find(tank => tank.type() === "user_p2");
  }
  home() {
    return this.terrains.find(terrain => terrain.type() === "home");
  }
  user_tanks() {
    return this.tanks.filter(tank => tank instanceof UserTank);
  }
  enemy_tanks() {
    return this.tanks.filter(tank => tank instanceof EnemyTank);
  }

  units_at(area) {
    return this.map_units.filter(map_unit => map_unit.area.collide(area));
  }
  out_of_bound(area) {
    return (
      area.x1 < 0 || area.x2 > this.max_x || area.y1 < 0 || area.y2 > this.max_y
    );
  }
  area_available(unit, area) {
    return this.map_units.every(map_unit => {
      return (
        map_unit === unit ||
        map_unit.accept(unit) ||
        !map_unit.area.collide(area)
      );
    });
  }

  init_vertexes() {
    const vertexes = [];
    let x1 = 0, x2 = this.default_width;
    while (x2 <= this.max_x) {
      const column_vertexes = [];
      let y1 = 0, y2 = this.default_height;
      while (y2 <= this.max_y) {
        column_vertexes.push(new MapArea2DVertex(x1, y1, x2, y2));
        y1 += this.default_height / 4;
        y2 += this.default_height / 4;
      }
      vertexes.push(column_vertexes);
      x1 += this.default_width / 4;
      x2 += this.default_width / 4;
    }
    for (let x = 0; x < this.vertexes_columns; x++) {
      for (let y = 0; y < this.vertexes_rows; y++) {
        for (let sib of [
          { x, y: y - 1 },
          { x: x + 1, y },
          { x, y: y + 1 },
          { x: x - 1, y }
        ]) {
          vertexes[x][y].init_vxy(x, y);
          if (
            0 <= sib.x &&
            sib.x < this.vertexes_columns &&
            (0 <= sib.y && sib.y < this.vertexes_rows)
          ) {
            vertexes[x][y].add_sibling(vertexes[sib.x][sib.y]);
          }
        }
      }
    }
    return vertexes;
  }

  vertexes_at(area) {
    const vx = parseInt((area.x1 * 4) / this.default_width);
    const vy = parseInt((area.y1 * 4) / this.default_height);
    return this.vertexes[vx][vy];
  }

  random_vertex() {
    let vx = Math.floor(Math.random() * this.vertexes_rows);
    if (vx % 2 === 1) {
      vx = vx - 1;
    }
    let vy = Math.floor(Math.random() * this.vertexes_columns);
    if (vy % 2 === 1) {
      vy = vy - 1;
    }
    return this.vertexes[vx][vy];
  }

  weight(tank, from, to) {
    const sub_areas = to.sub(from);
    const sub_area = sub_areas[0];
    const terrain_units = this.units_at(sub_area).filter(
      unit => unit instanceof Terrain
    );
    if (terrain_units.length === 0) {
      return 1;
    }
    const weights = terrain_units.map(terrain_unit => terrain_unit.weight(tank));
    const max_weight = Math.max(...weights);
    return (
      (max_weight / (this.default_width * this.default_height)) *
      sub_area.width() *
      sub_area.height()
    );
  }

  shortest_path(tank, start_vertex, end_vertex) {
    const [d, pi] = this.intialize_single_source(end_vertex);
    d[start_vertex.vx][start_vertex.vy].key = 0;
    const heap = new BinomialHeap();
    for (let x = 0; x < this.vertexes_columns; x++) {
      for (let y = 0; y < this.vertexes_rows; y++) {
        heap.insert(d[x][y]);
      }
    }
    while (!heap.is_empty()) {
      const u = heap.extract_min().satellite;
      for (let v of u.siblings) {
        this.relax(heap, d, pi, u, v, this.weight(tank, u, v), end_vertex);
      }
      if (u === end_vertex) {
        break;
      }
    }
    return this.calculate_shortest_path_from_pi(pi, start_vertex, end_vertex);
  }

  intialize_single_source(target_vertex) {
    const d = [];
    const pi = [];
    for (let x = 0; x < this.vertexes_columns; x++) {
      const column_ds = [];
      const column_pi = [];
      for (let y = 0; y < this.vertexes_rows; y++) {
        const node = new BinomialHeapNode(
          this.vertexes[x][y],
          this.infinity - this.vertexes[x][y].a_star_weight(target_vertex)
        );
        column_ds.push(node);
        column_pi.push(null);
      }
      d.push(column_ds);
      pi.push(column_pi);
    }
    return [d, pi];
  }

  relax(heap, d, pi, u, v, w, target_vertex) {
    if (v.vx % 2 === 1 && u.vx % 2 === 1) {
      return;
    }
    if (v.vy % 2 === 1 && u.vy % 2 === 1) {
      return;
    }
    const aw = v.a_star_weight(target_vertex) - u.a_star_weight(target_vertex);
    if (d[v.vx][v.vy].key > d[u.vx][u.vy].key + w + aw) {
      heap.decrease_key(d[v.vx][v.vy], d[u.vx][u.vy].key + w + aw);
      return (pi[v.vx][v.vy] = u);
    }
  }

  calculate_shortest_path_from_pi(pi, start_vertex, end_vertex) {
    const reverse_paths = [];
    let v = end_vertex;
    while (pi[v.vx][v.vy] !== null) {
      reverse_paths.push(v);
      v = pi[v.vx][v.vy];
    }
    reverse_paths.push(start_vertex);
    return reverse_paths.reverse();
  }

  bind(event, callback, scope) {
    if (scope == null) {
      scope = this;
    }
    if (!this.bindings[event] || this.bindings[event].length === 0) {
      this.bindings[event] = [];
    }
    return this.bindings[event].push({ scope: scope, callback: callback });
  }

  trigger(event, ...params) {
    if (!this.bindings[event] || this.bindings[event].length === 0) {
      return;
    }
    return this.bindings[event].map(handler =>
      handler.callback.apply(handler.scope, params)
    );
  }
}
