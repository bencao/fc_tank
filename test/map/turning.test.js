import { describe, it, expect } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { BrickTerrain } = await import('../../src/map/terrains.js');
const { UserP1Tank } = await import('../../src/objects/tanks.js');
const { Direction } = await import('../../src/constants.js');

function userTank(map, area, direction) {
  const tank = map.add_tank(UserP1Tank, area);
  tank.initializing = false;
  tank.direction = direction;
  return tank;
}

describe('Turning off the half-tile lattice', () => {
  // A shot takes a quarter tile off a brick, so walls end up on 10px lines the
  // tank lattice doesn't know about. Driving up against one leaves the tank
  // 10px off the lattice, with the nearest lattice spot inside the wall.
  it('turns onto the other nearby lattice spot when the nearest one is blocked', () => {
    const map = new Map2D({ add: () => {} });
    map.add_terrain(BrickTerrain, new MapArea2D(150, 200, 160, 240));
    const tank = userTank(map, new MapArea2D(110, 200, 150, 240), Direction.RIGHT);

    tank.turn(Direction.UP);

    expect(tank.direction).toBe(Direction.UP);
    expect(tank.area.x1).toBe(100);
  });
});
