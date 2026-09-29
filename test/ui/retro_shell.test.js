import { describe, it, expect } from 'vitest';
import { reflect_difficulty } from '../../src/ui/retro_shell.js';

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
