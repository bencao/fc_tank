import { describe, it, expect } from 'vitest';
import { compute_scale, scanline_pitch, room_haze } from '../../src/ui/screen_scale.js';

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

  it('once already shrunk for width, shrinks further to fit a short screen', () => {
    // A landscape phone: the pad takes the sides, so height is the limit.
    expect(compute_scale(390, 260, 600, 520)).toBeCloseTo(0.5);
  });

  it('lets a short window scroll rather than shrinking the picture', () => {
    expect(compute_scale(1400, 260, 600, 520)).toBe(1);
  });

  it('never shrinks below a legible floor', () => {
    expect(compute_scale(30, 30, 600, 520)).toBe(0.25);
  });
});

describe('scanline_pitch', () => {
  const in_device_px = ({ pitch, line }, dpr) => ({ pitch: pitch * dpr, line: line * dpr });

  it('keeps the usual 3px lines on a desktop picture at life size or bigger', () => {
    expect(scanline_pitch(1, 1)).toEqual({ pitch: 3, line: 1 });
    expect(scanline_pitch(2, 2)).toEqual({ pitch: 3, line: 1 });
  });

  // A phone's odd pixel ratio puts CSS lines between device pixels, so every
  // line comes out a different thickness - banding, not scanlines.
  it('lands every line on whole device pixels on a phone', () => {
    const lines = in_device_px(scanline_pitch(0.645, 2.625), 2.625);

    expect(Number.isInteger(Math.round(lines.pitch * 1e6) / 1e6)).toBe(true);
    expect(Number.isInteger(Math.round(lines.line * 1e6) / 1e6)).toBe(true);
  });

  it('draws finer lines over a picture shrunk to fit a phone', () => {
    expect(scanline_pitch(0.645, 2.625).pitch).toBeLessThan(scanline_pitch(1, 2.625).pitch);
  });

  it('never runs the lines together', () => {
    const lines = in_device_px(scanline_pitch(0.25, 1), 1);
    expect(lines.pitch - lines.line).toBeGreaterThanOrEqual(1);
  });
});

describe('room_haze', () => {
  it('matches the picture\'s lines at life size and up, so the two coincide', () => {
    expect(room_haze(1, 2)).toEqual(scanline_pitch(1, 2));
    expect(room_haze(2, 1)).toEqual(scanline_pitch(2, 1));
  });

  // Finer lines on a shrunk picture would beat against the haze drawn over
  // them, and shimmer as the page scrolls under the fixed haze.
  it('goes away when the picture is shrunk to fit a phone', () => {
    expect(room_haze(0.645, 2.625).line).toBe(0);
  });
});
