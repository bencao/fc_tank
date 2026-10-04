import { describe, it, expect } from 'vitest';
import { install_zoom_guard, DOUBLE_TAP_MS } from '../../src/ui/zoom_guard.js';

function page() {
  const doc = new EventTarget();
  let time = 1000;
  install_zoom_guard(doc, () => time);
  const fire = (type, { target, ...fields } = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, fields);
    if (target) { Object.defineProperty(event, 'target', { value: target }); }
    doc.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return { fire, wait: ms => { time += ms; } };
}

const button = { closest: () => null };
const text_field = { closest: selector => (selector.includes('input') ? {} : null) };

describe('install_zoom_guard', () => {
  it("cancels Safari's pinch gestures", () => {
    const { fire } = page();
    expect(fire('gesturestart')).toBe(true);
    expect(fire('gesturechange')).toBe(true);
  });

  it('cancels a two-finger move but leaves a one-finger scroll alone', () => {
    const { fire } = page();
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(true);
    expect(fire('touchmove', { touches: [{}] })).toBe(false);
  });

  it('lets a lone tap through and cancels a quick second one', () => {
    const { fire, wait } = page();
    expect(fire('touchend', { target: button })).toBe(false);
    wait(DOUBLE_TAP_MS - 50);
    expect(fire('touchend', { target: button })).toBe(true);
    wait(DOUBLE_TAP_MS + 50);
    expect(fire('touchend', { target: button })).toBe(false);
  });

  it('keeps double taps in text fields', () => {
    const { fire, wait } = page();
    fire('touchend', { target: text_field });
    wait(100);
    expect(fire('touchend', { target: text_field })).toBe(false);
  });
});
