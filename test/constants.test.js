import { describe, it, expect } from 'vitest';
import { Direction, Animations } from '../src/constants.js';

describe('Direction', () => {
  it('has correct values', () => {
    expect(Direction.UP).toBe(0);
    expect(Direction.DOWN).toBe(180);
    expect(Direction.LEFT).toBe(270);
    expect(Direction.RIGHT).toBe(90);
  });

  it('all() returns all four directions', () => {
    const all = Direction.all();
    expect(all).toHaveLength(4);
    expect(all).toContain(0);
    expect(all).toContain(180);
    expect(all).toContain(270);
    expect(all).toContain(90);
  });
});

describe('Animations', () => {
  it('has movables data', () => {
    expect(Animations.movables).toBeDefined();
    expect(Animations.movables.missile).toBeDefined();
    expect(Animations.movables.bom).toHaveLength(4);
  });

  it('movable() returns animation data', () => {
    const missile = Animations.movable('missile');
    expect(missile).toBeDefined();
    expect(missile[0]).toHaveProperty('x');
    expect(missile[0]).toHaveProperty('y');
  });

  it('rate() returns frame rate', () => {
    expect(Animations.rate('bom')).toBe(12);
    expect(Animations.rate('missile')).toBe(1);
  });

  it('terrain() returns terrain animation data', () => {
    const brick = Animations.terrain('brick');
    expect(brick).toBeDefined();
    expect(brick[0]).toHaveProperty('x');
  });

  it('has gifts data', () => {
    expect(Animations.gifts).toBeDefined();
    expect(Animations.gifts.land_mine).toBeDefined();
  });
});
