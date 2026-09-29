import { describe, it, expect } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { GrassTerrain } = await import('../../src/map/terrains.js');
const { UserP1Tank, StupidTank } = await import('../../src/objects/tanks.js');

// An enemy that shoots on sight, straight above a player, for two seconds.
function shots_at_player({ in_grass }) {
  const map = new Map2D({ add: () => {} });
  map.random_gift = () => null;
  if (in_grass) {
    for (const [x, y] of [[240, 440], [260, 440], [240, 460], [260, 460]]) {
      map.add_terrain(GrassTerrain, new MapArea2D(x, y, x + 20, y + 20));
    }
  }
  const user = map.add_tank(UserP1Tank, new MapArea2D(240, 440, 280, 480));
  const enemy = map.add_tank(StupidTank, new MapArea2D(240, 0, 280, 40));
  user.initializing = false;
  enemy.initializing = false;
  user.commander = { next_commands: () => [] };
  let now = 0;
  enemy.commander.now = () => now;
  let shots = 0;
  for (let frame = 0; frame < 120; frame++, now += 16) {
    const had = enemy.missiles.length;
    enemy.integration(16);
    if (enemy.missiles.length > had) shots++;
    for (const missile of [...map.missiles]) missile.integration(16);
  }
  return { shots, turned_to_player: enemy.direction === 180 };
}

describe('A player hiding in grass', () => {
  it('is not shot at by an enemy lined up with it, while one in the open is', () => {
    const orig = Math.random;
    Math.random = () => 0.5; // no random potshots, no blunders
    try {
      expect(shots_at_player({ in_grass: false }).shots).toBeGreaterThan(0);
      expect(shots_at_player({ in_grass: true }).shots).toBe(0);
    } finally {
      Math.random = orig;
    }
  });
});
