import { describe, it, expect } from 'vitest';
import { Missile } from '../../src/objects/missile.js';
import { Direction } from '../../src/constants.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('Missile', () => {
  it('speed is 0.2', () => {
    expect(Missile.speed).toBe(0.2);
  });

  it('type is missile', () => {
    const m = Object.create(Missile.prototype);
    expect(m.type()).toBe('missile');
  });

  it('animation_state is missile', () => {
    const m = Object.create(Missile.prototype);
    expect(m.animation_state()).toBe('missile');
  });

  it('destroy_area computes correct area for UP direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.UP;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(10);
    expect(da.y1).toBe(0);
    expect(da.x2).toBe(40);
    expect(da.y2).toBe(10);
  });

  it('destroy_area computes correct area for RIGHT direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.RIGHT;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(30);
    expect(da.y1).toBe(0);
    expect(da.x2).toBe(40);
    expect(da.y2).toBe(40);
  });

  it('destroy_area computes correct area for DOWN direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.DOWN;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(10);
    expect(da.y1).toBe(30);
    expect(da.x2).toBe(40);
    expect(da.y2).toBe(40);
  });

  it('destroy_area computes correct area for LEFT direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.LEFT;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(10);
    expect(da.y1).toBe(0);
    expect(da.x2).toBe(20);
    expect(da.y2).toBe(40);
  });
});
