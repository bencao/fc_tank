import { describe, it, expect } from 'vitest';
import { UserTank, EnemyTank } from '../../src/objects/tanks.js';
import { Missile } from '../../src/objects/missile.js';
import { Direction } from '../../src/constants.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('Missile', () => {
  it('speed is 0.4', () => {
    expect(Missile.speed).toBe(0.4);
  });

  it('flies 1.2x as fast when a player tank fired it', () => {
    const fired_by = parent => Object.assign(Object.create(Missile.prototype), { parent });

    expect(fired_by(Object.create(UserTank.prototype)).speed).toBeCloseTo(0.48);
    expect(fired_by(Object.create(EnemyTank.prototype)).speed).toBe(0.4);
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

describe('Missile flight', () => {
  function makeMissile({ blocked }) {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.UP;
    m.area = new MapArea2D(20, 100, 40, 120);
    m.default_width = 40;
    m.default_height = 40;
    m.destroyed = false;
    m.energy = 1;
    m.power = 1;
    m.attacks = 0;
    m.attack = function() { this.attacks += 1; };
    m.update_display = () => {};
    m.map = {
      default_width: 40,
      default_height: 40,
      max_x: 520,
      max_y: 520,
      area_available: () => !blocked
    };
    return m;
  }

  it('does not detonate on a frame that asked for no travel', () => {
    // A frame can be short enough to be worth less than a whole pixel. That is
    // not the same as hitting something.
    const m = makeMissile({ blocked: false });

    expect(m.move(0)).toBe(0);
    expect(m.attacks).toBe(0);
  });

  it('detonates when it is asked to travel and cannot', () => {
    const m = makeMissile({ blocked: true });

    expect(m.move(6)).toBe(0);
    expect(m.attacks).toBe(1);
  });
});
