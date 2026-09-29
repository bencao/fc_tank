import { describe, it, expect } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { UserP1Tank, StupidTank } = await import('../../src/objects/tanks.js');
const { Direction } = await import('../../src/constants.js');

// A player and an enemy face each other down a clear column and both fire.
function face_off(gap) {
  const map = new Map2D({ add: () => {} });
  const user = map.add_tank(UserP1Tank, new MapArea2D(200, 440, 240, 480));
  const enemy = map.add_tank(StupidTank, new MapArea2D(200, 400 - gap, 240, 440 - gap));
  enemy.hp = 1;
  for (const tank of [user, enemy]) {
    tank.initializing = false;
    tank.commander = { next_commands: () => [] };
  }
  user.direction = Direction.UP;
  enemy.direction = Direction.DOWN;
  user.fire();
  enemy.fire();
  return { map, user, enemy };
}

describe('Missiles meeting head-on', () => {
  it('cancel each other out, leaving both tanks standing', () => {
    // Close enough that either blast would reach past the other missile.
    for (const gap of [8, 12, 16, 20]) {
      const { map, user, enemy } = face_off(gap);

      for (let frame = 0; frame < 30; frame++) {
        for (const missile of [...map.missiles]) missile.integration(16);
      }

      expect({ gap, user: user.destroyed, enemy: enemy.destroyed, missiles: map.missiles.length })
        .toEqual({ gap, user: false, enemy: false, missiles: 0 });
    }
  });
});

describe('Reloading in the game loop', () => {
  it('lets a tank fire again once its reload time has passed', () => {
    const { map, user } = face_off(200);
    for (const missile of [...map.missiles]) missile.destroy();
    expect(user.can_fire()).toBe(false);

    user.integration(UserP1Tank.reload_time);

    expect(user.can_fire()).toBe(true);
  });
});
