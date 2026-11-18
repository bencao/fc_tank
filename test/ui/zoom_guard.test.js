import { describe, it, expect } from 'vitest';
import { install_zoom_guard, DOUBLE_TAP_MS } from '../../src/ui/zoom_guard.js';

const CONTROLS = '.gamepad';

function page() {
  const doc = new EventTarget();
  let time = 1000;
  install_zoom_guard(doc, { controls: CONTROLS, now: () => time });
  const fire = (type, { target, ...fields } = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, fields);
    if (target) { Object.defineProperty(event, 'target', { value: target }); }
    doc.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return { fire, wait: ms => { time += ms; } };
}

// Stand-ins for elements: `closest` answers for the selectors the guard asks about.
function element({ on_pad = false, text = false } = {}) {
  const el = {
    clicks: 0,
    click() { el.clicks += 1; },
    closest: selector => (selector === CONTROLS && on_pad) || (selector.includes('input') && text) ? {} : null,
  };
  return el;
}
const pad = element({ on_pad: true });
const page_text = element();
const text_field = element({ text: true });

const touch = (id, target) => ({ identifier: id, target });
const down = (fire, ...touches) => fire('touchstart', { changedTouches: touches, touches });

describe('install_zoom_guard: pinch', () => {
  it('cancels a pinch that starts on the pad (two thumbs drifting apart)', () => {
    const { fire } = page();
    down(fire, touch(1, pad), touch(2, pad));
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(true);
    expect(fire('gesturestart')).toBe(true);
    expect(fire('gesturechange')).toBe(true);
  });

  it('cancels a pinch when only one of the fingers is on the pad', () => {
    const { fire } = page();
    down(fire, touch(1, pad), touch(2, page_text));
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(true);
  });

  it('lets a pinch elsewhere on the page zoom', () => {
    const { fire } = page();
    down(fire, touch(1, page_text), touch(2, page_text));
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(false);
    expect(fire('gesturestart')).toBe(false);
  });

  it('forgets the pad once those fingers lift', () => {
    const { fire } = page();
    down(fire, touch(1, pad));
    fire('touchend', { target: pad, changedTouches: [touch(1, pad)], touches: [] });
    down(fire, touch(2, page_text), touch(3, page_text));
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(false);
  });

  it('leaves a one-finger scroll alone, even from the pad', () => {
    const { fire } = page();
    down(fire, touch(1, pad));
    expect(fire('touchmove', { touches: [{}] })).toBe(false);
  });
});

describe('install_zoom_guard: double tap', () => {
  const tap = (fire, target) => fire('touchend', { target, changedTouches: [touch(9, target)], touches: [] });

  it('lets a lone tap through and cancels a quick second one, on the pad or off it', () => {
    for (const target of [pad, element()]) {
      const { fire, wait } = page();
      expect(tap(fire, target)).toBe(false);
      wait(DOUBLE_TAP_MS - 50);
      expect(tap(fire, target)).toBe(true);
      wait(DOUBLE_TAP_MS + 50);
      expect(tap(fire, target)).toBe(false);
    }
  });

  it('still clicks a button on the cancelled second tap, so quick taps are not lost', () => {
    const { fire, wait } = page();
    const button = element();
    tap(fire, button);
    wait(100);
    tap(fire, button);
    expect(button.clicks).toBe(1);
  });

  it('does not click the pad, which works off pointer events', () => {
    const { fire, wait } = page();
    const fire_button = element({ on_pad: true });
    tap(fire, fire_button);
    wait(100);
    tap(fire, fire_button);
    expect(fire_button.clicks).toBe(0);
  });

  it('keeps double taps in text fields', () => {
    const { fire, wait } = page();
    tap(fire, text_field);
    wait(100);
    expect(tap(fire, text_field)).toBe(false);
  });
});

describe('install_zoom_guard: uninstall', () => {
  it('returns a function that removes every listener', () => {
    const doc = new EventTarget();
    const remove = install_zoom_guard(doc, { controls: CONTROLS, now: () => 1000 });
    remove();
    const event = new Event('gesturestart', { cancelable: true });
    const pinch = new Event('touchstart', { cancelable: true });
    Object.assign(pinch, { changedTouches: [touch(1, pad)], touches: [] });
    doc.dispatchEvent(pinch);
    doc.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
