import { describe, it, expect, vi, afterEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { UserP1Tank } = await import('../../src/objects/tanks.js');

// The born animation hands control over through afterFrame; play it out.
function finish_born_animation(tank) {
  const [, on_born] = tank.display_object.afterFrame.mock.calls.at(-1);
  on_born();
}

function newborn() {
  const map = new Map2D({ add: () => {} });
  return map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520));
}

describe('A player tank arriving on the field', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('is guarded for 4 seconds once it can move, and from the moment it appears', () => {
    vi.useFakeTimers();
    const tank = newborn();
    expect(tank.guard).toBe(true);

    finish_born_animation(tank);
    vi.advanceTimersByTime(3999);
    expect(tank.guard).toBe(true);

    vi.advanceTimersByTime(1);
    expect(tank.guard).toBe(false);
  });

  it('keeps a hat picked up while arriving for the hat\'s full 10 seconds', () => {
    vi.useFakeTimers();
    const tank = newborn();
    finish_born_animation(tank);

    vi.advanceTimersByTime(1000);
    tank.on_guard(true);
    vi.advanceTimersByTime(9999);
    expect(tank.guard).toBe(true);

    vi.advanceTimersByTime(1);
    expect(tank.guard).toBe(false);
  });
});
