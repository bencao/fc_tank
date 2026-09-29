import { describe, it, expect } from 'vitest';
import { reflect_difficulty, room_for_picture } from '../../src/ui/retro_shell.js';

function fakeGame(name) {
  const listeners = [];
  return {
    difficulty: () => ({ name }),
    on_difficulty_change: listener => listeners.push(listener),
    turn: next => listeners.forEach(listener => listener({ name: next }))
  };
}

describe('reflect_difficulty', () => {
  it('marks the page with the current difficulty straight away', () => {
    const root = { dataset: {} };
    reflect_difficulty(root, fakeGame('NIGHTMARE'));
    expect(root.dataset.difficulty).toBe('nightmare');
  });

  it('follows the dial as it turns', () => {
    const root = { dataset: {} };
    const game = fakeGame('HARD');
    reflect_difficulty(root, game);

    game.turn('NIGHTMARE');
    expect(root.dataset.difficulty).toBe('nightmare');
    game.turn('HARD');
    expect(root.dataset.difficulty).toBe('hard');
  });
});

describe('room_for_picture', () => {
  // The TV's case and bezel wrap the picture; on a phone the slot is the
  // whole width of the window, and a picture scaled to fill all of it would
  // spill past the bezel and lose its right edge - the status bar.
  it('leaves room for the set around the picture', () => {
    // iPhone 16 Pro: a 382px slot; case and bezel add 12px a side.
    expect(room_for_picture(382, { set: 406, picture: 382 })).toBe(358);
  });

  it('measures the frame the same way when the picture is already clamped', () => {
    expect(room_for_picture(382, { set: 382, picture: 358 })).toBe(358);
  });
});
