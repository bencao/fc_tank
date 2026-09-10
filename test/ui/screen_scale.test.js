import { describe, it, expect } from 'vitest';
import { compute_scale } from '../../src/ui/screen_scale.js';

describe('compute_scale', () => {
  it('snaps to whole pixels when there is room to grow', () => {
    expect(compute_scale(1500, 1400, 600, 520)).toBe(2);
    expect(compute_scale(1400, 900, 600, 520)).toBe(1);
  });

  it('never grows past the max scale', () => {
    expect(compute_scale(9000, 9000, 600, 520, 2)).toBe(2);
    expect(compute_scale(9000, 9000, 600, 520, 3)).toBe(3);
  });

  it('is limited by the tighter of the two axes', () => {
    expect(compute_scale(1300, 700, 600, 520)).toBe(1);
  });

  it('shrinks to an exact fit when the window is too narrow', () => {
    expect(compute_scale(300, 1000, 600, 520)).toBeCloseTo(0.5);
  });

  it('lets a short window scroll rather than shrinking the picture', () => {
    expect(compute_scale(1400, 260, 600, 520)).toBe(1);
  });

  it('never shrinks below a legible floor', () => {
    expect(compute_scale(30, 30, 600, 520)).toBe(0.25);
  });
});
