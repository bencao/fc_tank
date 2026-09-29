import { describe, it, expect, beforeEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { IronTerrain, BrickTerrain, GrassTerrain } = await import('../../src/map/terrains.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { ClockGift, LandMineGift, StarGift } = await import('../../src/objects/gifts.js');

describe('Map2D.random_vertex', () => {
  it('picks somewhere the tank could actually be', () => {
    const map = new Map2D({ add: () => {} });
    const level_1_tank = { power: 1, ship: false };
    // Iron everywhere except one clearing.
    for (let x = 0; x < 520; x += 40) {
      for (let y = 0; y < 520; y += 40) {
        if (x === 200 && y === 200) { continue; }
        map.add_terrain(IronTerrain, new MapArea2D(x, y, x + 40, y + 40));
      }
    }

    const vertex = map.random_vertex(level_1_tank);

    expect(vertex.x1).toBe(200);
    expect(vertex.y1).toBe(200);
  });

  it('still answers when it is asked without a tank', () => {
    const map = new Map2D({ add: () => {} });

    expect(map.random_vertex()).toBeDefined();
  });
});

describe('Map2D.random_gift', () => {
  it('drops the gift where a tank can drive over it', () => {
    const map = new Map2D({ add: () => {} });
    for (let x = 0; x < 520; x += 40) {
      for (let y = 0; y < 520; y += 40) {
        if (x === 200 && y === 200) { continue; }
        map.add_terrain(IronTerrain, new MapArea2D(x, y, x + 40, y + 40));
      }
    }

    const gift = map.random_gift();

    expect(gift.area.x1).toBe(200);
    expect(gift.area.y1).toBe(200);
  });
});

describe('Map2D.shortest_path', () => {
  let map;
  const level_1_tank = { power: 1, ship: false };

  beforeEach(() => {
    map = new Map2D({ add: () => {} });
  });

  // Seals the map in two across its full width.
  function buildIronWall(terrain_cls) {
    for (let x = 0; x < 520; x += 40) {
      map.add_terrain(terrain_cls, new MapArea2D(x, 200, x + 40, 240));
    }
  }

  it('does not route a tank through iron it cannot break', () => {
    buildIronWall(IronTerrain);
    const start = map.vertexes_at(new MapArea2D(200, 320, 240, 360));
    const goal = map.vertexes_at(new MapArea2D(200, 40, 240, 80));

    // The far side is walled off by iron a level 1 tank cannot shoot through,
    // so there is no route - not a route that drives into the wall.
    expect(map.shortest_path(level_1_tank, start, goal)).toEqual([]);
  });

  it('routes through brick, which a tank can shoot its way past', () => {
    buildIronWall(BrickTerrain);
    const start = map.vertexes_at(new MapArea2D(200, 320, 240, 360));
    const goal = map.vertexes_at(new MapArea2D(200, 40, 240, 80));

    const path = map.shortest_path(level_1_tank, start, goal);

    expect(path.length).toBeGreaterThan(0);
  });

  it('reports no route rather than a path that goes nowhere', () => {
    // Walled in on every side.
    for (let x = 160; x <= 280; x += 40) {
      map.add_terrain(IronTerrain, new MapArea2D(x, 160, x + 40, 200));
      map.add_terrain(IronTerrain, new MapArea2D(x, 280, x + 40, 320));
    }
    for (let y = 200; y < 280; y += 40) {
      map.add_terrain(IronTerrain, new MapArea2D(160, y, 200, y + 40));
      map.add_terrain(IronTerrain, new MapArea2D(280, y, 320, y + 40));
    }
    const start = map.vertexes_at(new MapArea2D(200, 200, 240, 240));
    const goal = map.vertexes_at(new MapArea2D(0, 0, 40, 40));

    expect(map.shortest_path(level_1_tank, start, goal)).toEqual([]);
  });

  it('leaves the tank out of its own route, so the first step is a real move', () => {
    const start = map.vertexes_at(new MapArea2D(200, 320, 240, 360));
    const goal = map.vertexes_at(new MapArea2D(200, 200, 240, 240));

    const path = map.shortest_path(level_1_tank, start, goal);

    expect(path[0].equals(start)).toBe(false);
    expect(path[path.length - 1].equals(goal)).toBe(true);
  });

  it('has nothing to do when the goal is where the tank already is', () => {
    const here = map.vertexes_at(new MapArea2D(200, 320, 240, 360));

    expect(map.shortest_path(level_1_tank, here, here)).toEqual([]);
  });
});

describe('Map2D.random_gift placement', () => {
  // Rows above and below the middle row of the map, on an open map.
  function sides(gift_class, drops = 3000) {
    const map = new Map2D({ add: () => {} });
    let top = 0, bottom = 0;
    for (let i = 0; i < drops; i++) {
      const gift = map.random_gift(gift_class);
      if (gift.area.y1 < 240) top++;
      if (gift.area.y1 > 240) bottom++;
    }
    return bottom / top;
  }

  it("drops clocks and land mines on the player's half 1.2 times as often", () => {
    expect(sides(ClockGift)).toBeGreaterThan(1.08);
    expect(sides(ClockGift)).toBeLessThan(1.32);
    expect(sides(LandMineGift)).toBeGreaterThan(1.08);
    expect(sides(LandMineGift)).toBeLessThan(1.32);
  });

  it('spreads other power-ups evenly', () => {
    expect(sides(StarGift)).toBeGreaterThan(0.88);
    expect(sides(StarGift)).toBeLessThan(1.12);
  });
});

describe('Map2D.hidden_in_grass', () => {
  function tank_under_grass(grass_tiles) {
    const map = new Map2D({ add: () => {} });
    for (const [x, y] of grass_tiles) map.add_terrain(GrassTerrain, new MapArea2D(x, y, x + 20, y + 20));
    return { map, tank: { area: new MapArea2D(200, 200, 240, 240) } };
  }

  it('hides a tank that is at least three quarters under grass', () => {
    const { map, tank } = tank_under_grass([[200, 200], [220, 200], [200, 220]]);
    expect(map.hidden_in_grass(tank)).toBe(true);
  });

  it('does not hide a tank that is only half under grass', () => {
    const { map, tank } = tank_under_grass([[200, 200], [220, 200]]);
    expect(map.hidden_in_grass(tank)).toBe(false);
  });

  it('leaves hidden players out of the ones enemies can see', () => {
    const { map } = tank_under_grass([[200, 200], [220, 200], [200, 220], [220, 220]]);
    const hiding = { area: new MapArea2D(200, 200, 240, 240), destroyed: false };
    const exposed = { area: new MapArea2D(0, 0, 40, 40), destroyed: false };
    map.user_tanks = () => [hiding, exposed];

    expect(map.visible_user_tanks()).toEqual([exposed]);
  });
});
