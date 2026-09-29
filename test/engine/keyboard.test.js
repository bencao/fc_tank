import { describe, it, expect, vi } from 'vitest';
import { Keyboard, map_key } from '../../src/engine/keyboard.js';

const key_event = (type, key) => Object.assign(new Event(type, { cancelable: true }), { key });

describe('Keyboard', () => {
  // Friends play: the host hears its friend's keys from the network, not
  // from its own document.
  it('listens to whatever source it is given', () => {
    const source = new EventTarget();
    const keyboard = new Keyboard(source);
    const up = vi.fn();
    const down = vi.fn();
    keyboard.on_key_down('UP', down);
    keyboard.on_key_up('UP', up);

    source.dispatchEvent(key_event('keydown', 'ArrowUp'));
    source.dispatchEvent(key_event('keyup', 'ArrowUp'));

    expect(down).toHaveBeenCalledTimes(1);
    expect(up).toHaveBeenCalledTimes(1);
  });

  it('stops listening once reset', () => {
    const source = new EventTarget();
    const keyboard = new Keyboard(source);
    const down = vi.fn();
    keyboard.on_key_down('Z', down);

    keyboard.reset();
    source.dispatchEvent(key_event('keydown', 'z'));

    expect(down).not.toHaveBeenCalled();
  });
});

describe('map_key', () => {
  it('names the keys the game understands, and only those', () => {
    expect(map_key('ArrowLeft')).toBe('LEFT');
    expect(map_key('Enter')).toBe('ENTER');
    expect(map_key('j')).toBe('J');
    expect(map_key('q')).toBeUndefined();
    expect(map_key('Tab')).toBeUndefined();
  });
});
