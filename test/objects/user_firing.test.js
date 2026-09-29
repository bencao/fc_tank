import { describe, it, expect, vi } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { UserP1Tank } = await import('../../src/objects/tanks.js');
const { Direction } = await import('../../src/constants.js');

// A player tank in the open, facing up, driven by a list of commands per frame.
function player() {
  const map = new Map2D({ add: () => {} });
  const tank = map.add_tank(UserP1Tank, new MapArea2D(240, 240, 280, 280));
  tank.initializing = false;
  tank.direction = Direction.UP;
  tank.commands_next = [];
  tank.commander = { next_commands: () => tank.commands_next.splice(0) };
  return { map, tank };
}

describe('A player firing', () => {
  it('only sounds a shot when a missile actually leaves the barrel', () => {
    const { map, tank } = player();
    const fired = vi.fn();
    map.bind('user_fired', fired);

    tank.fire();
    tank.fire(); // missile still in flight

    expect(fired).toHaveBeenCalledTimes(1);
  });

  // Tapping fire a moment before the gun is ready is how people actually
  // play; swallowing that tap makes the gun feel like it jams.
  it('fires a tap made just before the gun is ready as soon as it is', () => {
    const { tank } = player();
    tank.fire();
    tank.missiles[0].destroy(); // hit something close by
    tank.integration(100);

    tank.commands_next = [{ type: 'fire' }];
    tank.integration(16); // tapped with the reload not yet over
    expect(tank.missiles.length).toBe(0);

    for (let frame = 0; frame < 10; frame++) tank.integration(16);

    expect(tank.missiles.length).toBe(1);
  });

  it('does not rev the engine for a tank standing still and firing', () => {
    const { map, tank } = player();
    const moved = vi.fn();
    map.bind('user_moved', moved);

    tank.commands_next = [{ type: 'fire' }];
    tank.integration(16);

    expect(moved).not.toHaveBeenCalled();
  });

  it('forgets a tap made long before the gun is ready', () => {
    const { tank } = player();
    tank.fire(); // in flight for a good while

    tank.commands_next = [{ type: 'fire' }];
    tank.integration(16);
    for (let frame = 0; frame < 30; frame++) tank.integration(16);
    tank.missiles[0].destroy();
    for (let frame = 0; frame < 30; frame++) tank.integration(16);

    expect(tank.missiles.length).toBe(0);
  });
});
