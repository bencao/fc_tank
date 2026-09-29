import { describe, it, expect } from 'vitest';
import { Initials } from '../../src/scenes/initials.js';

describe('Initials', () => {
  it('starts as AAA with the first letter selected', () => {
    const initials = new Initials();
    expect(initials.text()).toBe('AAA');
    expect(initials.cursor).toBe(0);
  });

  it('rolls the selected letter up and down, wrapping round the alphabet', () => {
    const initials = new Initials();
    initials.up();
    expect(initials.text()).toBe('BAA');
    initials.down();
    initials.down();
    expect(initials.text()).toBe('ZAA');
  });

  it('moves between letters without running off either end', () => {
    const initials = new Initials();
    initials.left();
    expect(initials.cursor).toBe(0);
    initials.right();
    initials.right();
    initials.right();
    expect(initials.cursor).toBe(2);
    initials.up();
    expect(initials.text()).toBe('AAB');
  });

  // Like the arcade: fire locks in a letter and moves on; the last one
  // finishes the entry.
  it('fire moves to the next letter, and says done on the last', () => {
    const initials = new Initials();
    expect(initials.fire()).toBe(false);
    expect(initials.fire()).toBe(false);
    expect(initials.cursor).toBe(2);
    expect(initials.fire()).toBe(true);
  });
});
