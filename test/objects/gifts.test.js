import { describe, it, expect, vi } from 'vitest';
import { getGiftClasses, GunGift, StarGift, ShipGift, HatGift, ClockGift, LifeGift, LandMineGift, ShovelGift } from '../../src/objects/gifts.js';

describe('getGiftClasses', () => {
  it('returns 8 gift types', () => {
    expect(getGiftClasses()).toHaveLength(8);
  });

  it('includes all gift types', () => {
    const classes = getGiftClasses();
    expect(classes).toContain(GunGift);
    expect(classes).toContain(HatGift);
    expect(classes).toContain(ShipGift);
    expect(classes).toContain(StarGift);
    expect(classes).toContain(LifeGift);
    expect(classes).toContain(ClockGift);
    expect(classes).toContain(ShovelGift);
    expect(classes).toContain(LandMineGift);
  });
});

describe('Gift types', () => {
  it('GunGift type is gun', () => {
    const g = Object.create(GunGift.prototype);
    expect(g.type()).toBe('gun');
  });

  it('StarGift type is star', () => {
    const g = Object.create(StarGift.prototype);
    expect(g.type()).toBe('star');
  });

  it('ShipGift type is ship', () => {
    const g = Object.create(ShipGift.prototype);
    expect(g.type()).toBe('ship');
  });

  it('HatGift type is hat', () => {
    const g = Object.create(HatGift.prototype);
    expect(g.type()).toBe('hat');
  });

  it('ClockGift type is clock', () => {
    const g = Object.create(ClockGift.prototype);
    expect(g.type()).toBe('clock');
  });

  it('LifeGift type is life', () => {
    const g = Object.create(LifeGift.prototype);
    expect(g.type()).toBe('life');
  });

  it('LandMineGift type is land_mine', () => {
    const g = Object.create(LandMineGift.prototype);
    expect(g.type()).toBe('land_mine');
  });

  it('ShovelGift type is shovel', () => {
    const g = Object.create(ShovelGift.prototype);
    expect(g.type()).toBe('shovel');
  });
});

describe('GunGift.apply', () => {
  it('levels up tank by 2', () => {
    const g = Object.create(GunGift.prototype);
    const tank = { level_up: vi.fn() };
    g.apply(tank);
    expect(tank.level_up).toHaveBeenCalledWith(2);
  });
});

describe('StarGift.apply', () => {
  it('levels up tank by 1', () => {
    const g = Object.create(StarGift.prototype);
    const tank = { level_up: vi.fn() };
    g.apply(tank);
    expect(tank.level_up).toHaveBeenCalledWith(1);
  });
});

describe('ShipGift.apply', () => {
  it('enables ship on tank', () => {
    const g = Object.create(ShipGift.prototype);
    const tank = { on_ship: vi.fn() };
    g.apply(tank);
    expect(tank.on_ship).toHaveBeenCalledWith(true);
  });
});
