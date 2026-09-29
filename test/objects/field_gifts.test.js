import { describe, it, expect, vi, afterEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { HomeTerrain, BrickTerrain, IronTerrain } = await import('../../src/map/terrains.js');
const { UserP1Tank, StupidTank } = await import('../../src/objects/tanks.js');
const gifts = await import('../../src/objects/gifts.js');
const { ShovelGift } = gifts;

const wall_types = map =>
  map.home().defend_terrains().map(terrain => terrain.constructor);

// A home with its brick wall, and a shovel lying where a tank sits on it.
function field(tank_cls) {
  const map = new Map2D({ add: () => {} });
  map.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520));
  map.home().add_defend_terrains(BrickTerrain);
  const tank = map.add_tank(tank_cls, new MapArea2D(0, 0, 40, 40));
  map.random_gift(ShovelGift);
  map.gifts[0].area = new MapArea2D(0, 0, 40, 40);
  return { map, gift: map.gifts[0] };
}

afterEach(() => vi.useRealTimers());

describe('The shovel power-up', () => {
  it('turns the home wall to iron for a player, then back to brick', () => {
    vi.useFakeTimers();
    const { map, gift } = field(UserP1Tank);

    gift.integration(16);
    expect(wall_types(map).every(cls => cls === IronTerrain)).toBe(true);

    vi.advanceTimersByTime(10000);
    expect(wall_types(map).length).toBeGreaterThan(0);
    expect(wall_types(map).every(cls => cls === BrickTerrain)).toBe(true);
  });

  it('knocks the home wall down for an enemy, then puts it back', () => {
    vi.useFakeTimers();
    const { map, gift } = field(StupidTank);

    gift.integration(16);
    expect(wall_types(map)).toEqual([]);

    vi.advanceTimersByTime(10000);
    expect(wall_types(map).length).toBeGreaterThan(0);
  });
});

describe('The land mine power-up', () => {
  it('credits the kills to the player who set it off', () => {
    const { LandMineGift } = gifts;
    const map = new Map2D({ add: () => {} });
    const player = map.add_tank(UserP1Tank, new MapArea2D(0, 0, 40, 40));
    const enemy = map.add_tank(StupidTank, new MapArea2D(200, 0, 240, 40));
    const destroyed = vi.fn();
    map.bind('enemy_tank_destroyed', destroyed);

    Object.create(LandMineGift.prototype, { map: { value: map } }).apply(player);

    const [victim, killer] = destroyed.mock.calls[0];
    expect({ victim: victim === enemy, killer: killer?.type?.() ?? killer })
      .toEqual({ victim: true, killer: 'user_p1' });
  });
});

describe('Terrain sprites', () => {
  // Every terrain is one still frame. Starting its sprite only buys a timer
  // and an animation per piece of wall, and shot bricks keep making more.
  it('are drawn with the layer, not started', () => {
    const map = new Map2D({ add: () => {} });
    const brick = map.add_terrain(BrickTerrain, new MapArea2D(0, 0, 40, 40));
    const home = map.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520));

    expect([brick, home].map(t => t.display_object.start.mock.calls.length)).toEqual([0, 0]);
    expect(map.groups.middle.add).toHaveBeenCalledWith(brick.display_object);
  });
});
