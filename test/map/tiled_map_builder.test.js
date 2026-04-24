import { describe, it, expect } from 'vitest';
import { typeToClass } from '../../src/map/tiled_map_builder.js';
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
} from '../../src/map/terrains.js';

describe('typeToClass', () => {
  it('maps BrickTerrain', () => {
    expect(typeToClass('BrickTerrain')).toBe(BrickTerrain);
  });

  it('maps IronTerrain', () => {
    expect(typeToClass('IronTerrain')).toBe(IronTerrain);
  });

  it('maps WaterTerrain', () => {
    expect(typeToClass('WaterTerrain')).toBe(WaterTerrain);
  });

  it('maps GrassTerrain', () => {
    expect(typeToClass('GrassTerrain')).toBe(GrassTerrain);
  });

  it('maps HomeTerrain', () => {
    expect(typeToClass('HomeTerrain')).toBe(HomeTerrain);
  });

  it('maps IceTerrain', () => {
    expect(typeToClass('IceTerrain')).toBe(IceTerrain);
  });

  it('defaults to BrickTerrain for unknown type', () => {
    expect(typeToClass('UnknownTerrain')).toBe(BrickTerrain);
  });
});
