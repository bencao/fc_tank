import { describe, it, expect } from 'vitest';
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  IceTerrain,
  GrassTerrain
} from '../../src/map/terrains.js';

describe('BrickTerrain', () => {
  it('weight is inversely proportional to power', () => {
    const terrain = Object.create(BrickTerrain.prototype);
    expect(terrain.weight({ power: 1 })).toBe(40);
    expect(terrain.weight({ power: 2 })).toBe(20);
    expect(terrain.weight({ power: 4 })).toBe(10);
  });

  it('type is brick', () => {
    const terrain = Object.create(BrickTerrain.prototype);
    expect(terrain.type()).toBe('brick');
  });
});

describe('IronTerrain', () => {
  it('weight is infinity for power 1', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 1 })).toBe(65535);
  });

  it('weight is 20 for power 2', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 2 })).toBe(20);
  });

  it('weight is 10 for power >= 3', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 3 })).toBe(10);
    expect(terrain.weight({ power: 4 })).toBe(10);
  });

  it('type is iron', () => {
    const terrain = Object.create(IronTerrain.prototype);
    expect(terrain.type()).toBe('iron');
  });
});

describe('WaterTerrain', () => {
  it('weight is 4 when tank has ship', () => {
    const terrain = Object.create(WaterTerrain.prototype);
    expect(terrain.weight({ ship: true })).toBe(4);
  });

  it('weight is infinity when tank has no ship', () => {
    const terrain = Object.create(WaterTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ ship: false })).toBe(65535);
  });
});

describe('IceTerrain', () => {
  it('weight is always 4', () => {
    const terrain = Object.create(IceTerrain.prototype);
    expect(terrain.weight({})).toBe(4);
  });

  it('accepts any unit', () => {
    const terrain = Object.create(IceTerrain.prototype);
    expect(terrain.accept({})).toBe(true);
  });
});

describe('GrassTerrain', () => {
  it('weight is always 4', () => {
    const terrain = Object.create(GrassTerrain.prototype);
    expect(terrain.weight({})).toBe(4);
  });

  it('accepts any unit', () => {
    const terrain = Object.create(GrassTerrain.prototype);
    expect(terrain.accept({})).toBe(true);
  });
});
