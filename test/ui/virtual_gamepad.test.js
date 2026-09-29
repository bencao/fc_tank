import { describe, it, expect } from 'vitest';
import { direction_at, GamepadKeys } from '../../src/ui/virtual_gamepad.js';

describe('direction_at', () => {
  it('picks the arm of the d-pad the thumb is furthest along', () => {
    expect(direction_at(0, -30)).toBe('UP');
    expect(direction_at(4, 30)).toBe('DOWN');
    expect(direction_at(-30, 10)).toBe('LEFT');
    expect(direction_at(30, -10)).toBe('RIGHT');
  });

  it('presses nothing while the thumb rests on the centre', () => {
    expect(direction_at(3, -4, 8)).toBe(null);
    expect(direction_at(0, 0)).toBe(null);
  });
});

describe('GamepadKeys', () => {
  function recorder() {
    const sent = [];
    return { sent, keys: new GamepadKeys((type, key) => sent.push(`${type}:${key}`)) };
  }

  it('lets go of the old arrow key when the thumb slides to another arm', () => {
    const { sent, keys } = recorder();
    keys.steer('UP');
    keys.steer('UP');
    keys.steer('LEFT');
    keys.steer(null);
    expect(sent).toEqual([
      'keydown:ArrowUp',
      'keyup:ArrowUp', 'keydown:ArrowLeft',
      'keyup:ArrowLeft'
    ]);
  });

  it('presses and releases a button as one key', () => {
    const { sent, keys } = recorder();
    keys.press('START');
    keys.release('START');
    expect(sent).toEqual(['keydown:Enter', 'keyup:Enter']);
  });

  it('keeps firing until both fire buttons are let go', () => {
    const { sent, keys } = recorder();
    keys.press('A');
    keys.press('B');
    keys.release('A');
    expect(sent).toEqual(['keydown:z']);
    keys.release('B');
    expect(sent).toEqual(['keydown:z', 'keyup:z']);
  });
});
