import { describe, it, expect } from 'vitest';
import { MapArea2DVertex } from '../../src/map/map_area_2d_vertex.js';

describe('MapArea2DVertex', () => {
  it('extends MapArea2D with siblings', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    expect(v.siblings).toEqual([]);
    expect(v.x1).toBe(0);
  });

  it('init_vxy sets vertex coordinates', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    v.init_vxy(3, 5);
    expect(v.vx).toBe(3);
    expect(v.vy).toBe(5);
  });

  it('add_sibling adds to siblings list', () => {
    const v1 = new MapArea2DVertex(0, 0, 40, 40);
    const v2 = new MapArea2DVertex(40, 0, 80, 40);
    v1.add_sibling(v2);
    expect(v1.siblings).toContain(v2);
  });

  it('a_star_weight calculates squared distance / 2', () => {
    const v1 = new MapArea2DVertex(0, 0, 40, 40);
    const v2 = new MapArea2DVertex(40, 40, 80, 80);
    v1.init_vxy(0, 0);
    v2.init_vxy(4, 4);
    expect(v1.a_star_weight(v2)).toBe(16);
  });

  it('a_star_weight is 0 for same vertex', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    v.init_vxy(2, 3);
    expect(v.a_star_weight(v)).toBe(0);
  });
});
