import { describe, it, expect, vi } from 'vitest';
import { install_power_switch } from '../../src/ui/power_switch.js';

function fakeButton() {
  const handlers = {};
  return {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) { handlers[type] = handler; },
    click() { handlers.click?.({ preventDefault() {} }); }
  };
}

describe('install_power_switch', () => {
  it('shows the set switched on', () => {
    const root = { dataset: {} };
    const button = fakeButton();
    install_power_switch(root, button, { off: vi.fn(), on: vi.fn() });

    expect(root.dataset.power).toBe('on');
    expect(button.attributes['aria-pressed']).toBe('true');
  });

  it('switches the set off, then back on - a reset', () => {
    const root = { dataset: {} };
    const button = fakeButton();
    const off = vi.fn();
    const on = vi.fn();
    install_power_switch(root, button, { off, on });

    button.click();
    expect(off).toHaveBeenCalledTimes(1);
    expect(on).not.toHaveBeenCalled();
    expect(root.dataset.power).toBe('off');
    expect(button.attributes['aria-pressed']).toBe('false');

    button.click();
    expect(on).toHaveBeenCalledTimes(1);
    expect(root.dataset.power).toBe('on');
  });
});
