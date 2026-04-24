import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock KineticJS and DOM before importing Game
function mockKineticObj() {
  const obj = {
    add: vi.fn(), hide: vi.fn(), show: vi.fn(), draw: vi.fn(),
    move: vi.fn(), start: vi.fn(), stop: vi.fn(), destroy: vi.fn(),
    setAbsolutePosition: vi.fn(), setText: vi.fn(), play: vi.fn(),
    clone: vi.fn(() => mockKineticObj()),
  };
  return obj;
}
globalThis.Kinetic = {
  Stage: vi.fn(() => mockKineticObj()),
  Layer: vi.fn(() => mockKineticObj()),
  Group: vi.fn(() => mockKineticObj()),
  Sprite: vi.fn(() => mockKineticObj()),
  Text: vi.fn(() => mockKineticObj()),
  Rect: vi.fn(() => mockKineticObj()),
  Tween: vi.fn(() => mockKineticObj()),
  Path: vi.fn(() => mockKineticObj()),
  Easings: { Linear: 'linear' }
};

if (!globalThis.document) {
  globalThis.document = {};
}
globalThis.document.getElementById = vi.fn((id) => {
  if (id === 'tank_sprite') return {};
  return null;
});

const { Game } = await import('../src/game.js');

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game();
  });

  it('initializes with default config', () => {
    expect(game.get_config('initial_players')).toBe(1);
    expect(game.get_config('total_stages')).toBe(50);
    expect(game.get_config('enemies_per_stage')).toBe(20);
  });

  it('initializes with default statuses', () => {
    expect(game.get_status('players')).toBe(1);
    expect(game.get_status('current_stage')).toBe(1);
    expect(game.get_status('game_over')).toBe(false);
  });

  it('updates status', () => {
    game.update_status('players', 2);
    expect(game.get_status('players')).toBe(2);
  });

  it('next_stage cycles forward', () => {
    game.next_stage();
    expect(game.get_status('current_stage')).toBe(2);
  });

  it('prev_stage cycles backward', () => {
    game.prev_stage();
    expect(game.get_status('current_stage')).toBe(50);
  });

  it('mod_stage wraps around forward', () => {
    expect(game.mod_stage(50, 1)).toBe(1);
  });

  it('mod_stage wraps around backward', () => {
    expect(game.mod_stage(1, -1)).toBe(50);
  });

  it('single_player_mode returns true when players is 1', () => {
    expect(game.single_player_mode()).toBe(true);
  });

  it('single_player_mode returns false when players is 2', () => {
    game.update_status('players', 2);
    expect(game.single_player_mode()).toBe(false);
  });

  it('increase_p1_score adds to p1 score', () => {
    game.increase_p1_score(100);
    expect(game.get_status('p1_score')).toBe(100);
    game.increase_p1_score(200);
    expect(game.get_status('p1_score')).toBe(300);
  });

  it('increase_p2_score adds to p2 score', () => {
    game.increase_p2_score(500);
    expect(game.get_status('p2_score')).toBe(500);
  });
});
