import { describe, it, expect } from 'vitest';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('MapArea2D', () => {
  it('stores coordinates', () => {
    const area = new MapArea2D(10, 20, 30, 40);
    expect(area.x1).toBe(10);
    expect(area.y1).toBe(20);
    expect(area.x2).toBe(30);
    expect(area.y2).toBe(40);
  });

  it('calculates width and height', () => {
    const area = new MapArea2D(10, 20, 50, 60);
    expect(area.width()).toBe(40);
    expect(area.height()).toBe(40);
  });

  it('calculates center', () => {
    const area = new MapArea2D(0, 0, 40, 40);
    const center = area.center();
    expect(center.x).toBe(20);
    expect(center.y).toBe(20);
  });

  it('detects collision', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(20, 20, 60, 60);
    expect(a.collide(b)).toBe(true);
  });

  it('detects non-collision', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(40, 40, 80, 80);
    expect(a.collide(b)).toBe(false);
  });

  it('detects non-collision when adjacent', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(40, 0, 80, 40);
    expect(a.collide(b)).toBe(false);
  });

  it('calculates intersection', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(20, 20, 60, 60);
    const inter = a.intersect(b);
    expect(inter.x1).toBe(20);
    expect(inter.y1).toBe(20);
    expect(inter.x2).toBe(40);
    expect(inter.y2).toBe(40);
  });

  it('subtracts area correctly', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 20, 40);
    const result = a.sub(b);
    expect(result.length).toBe(1);
    expect(result[0].x1).toBe(20);
    expect(result[0].y1).toBe(0);
    expect(result[0].x2).toBe(40);
    expect(result[0].y2).toBe(40);
  });

  it('sub returns empty for identical areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const result = a.sub(a);
    expect(result.length).toBe(0);
  });

  it('sub returns multiple pieces for center cut', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(10, 10, 30, 30);
    const result = a.sub(b);
    expect(result.length).toBe(4);
  });

  it('valid returns true for valid area', () => {
    expect(new MapArea2D(0, 0, 40, 40).valid()).toBe(true);
  });

  it('valid returns false for zero-width area', () => {
    expect(new MapArea2D(10, 0, 10, 40).valid()).toBe(false);
  });

  it('equals returns true for identical areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 40, 40);
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 40, 80);
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for non-MapArea2D', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    expect(a.equals({ x1: 0, y1: 0, x2: 40, y2: 40 })).toBe(false);
  });

  it('clone creates an independent copy', () => {
    const a = new MapArea2D(10, 20, 30, 40);
    const b = a.clone();
    expect(a.equals(b)).toBe(true);
    b.x1 = 99;
    expect(a.x1).toBe(10);
  });

  it('extend up increases y1', () => {
    const a = new MapArea2D(0, 20, 40, 60);
    const extended = a.extend(0, 1); // Direction.UP = 0
    expect(extended.y1).toBe(-20);
    expect(extended.y2).toBe(60);
  });

  it('extend right increases x2', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const extended = a.extend(90, 1); // Direction.RIGHT = 90
    expect(extended.x2).toBe(80);
  });

  it('to_s returns formatted string', () => {
    const a = new MapArea2D(10, 20, 30, 40);
    expect(a.to_s()).toBe('[10, 20, 30, 40]');
  });
});
