import { describe, it, expect } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();

const { Map2D } = await import('../../src/map/map_2d.js');
const { MapArea2D } = await import('../../src/map/map_area_2d.js');
const { HomeTerrain, BrickTerrain } = await import('../../src/map/terrains.js');
const { UserP1Tank, StupidTank } = await import('../../src/objects/tanks.js');
const { StarGift } = await import('../../src/objects/gifts.js');
const { Direction } = await import('../../src/constants.js');
const { FrameRecorder } = await import('../../src/friends/frame_recorder.js');

function field() {
  const map = new Map2D({ add: () => {} });
  map.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520));
  map.add_terrain(BrickTerrain, new MapArea2D(0, 200, 40, 240));
  return map;
}

// Recorded frames are sent as JSON: they must survive the trip unchanged.
const over_the_wire = frame => JSON.parse(JSON.stringify(frame));

describe('FrameRecorder', () => {
  it('sends all the terrain in the first frame, then only what changed', () => {
    const map = field();
    const recorder = new FrameRecorder(map);

    const first = over_the_wire(recorder.record());
    expect(first.terrain.add).toEqual([
      [expect.any(Number), 'home', 240, 480, 280, 520],
      [expect.any(Number), 'brick', 0, 200, 40, 240]
    ]);
    expect(first.terrain.remove).toEqual([]);

    const brick = map.terrains[1];
    const brick_id = first.terrain.add[1][0];
    map.add_terrain(BrickTerrain, new MapArea2D(0, 200, 40, 220));
    brick.destroy();

    const second = over_the_wire(recorder.record());
    expect(second.terrain.remove).toEqual([brick_id]);
    expect(second.terrain.add).toEqual([[expect.any(Number), 'brick', 0, 200, 40, 220]]);
  });

  it('sends no terrain at all when nothing changed', () => {
    const recorder = new FrameRecorder(field());
    recorder.record();

    expect(recorder.record().terrain).toBeUndefined();
  });

  // The eagle stays on the map when it falls; only its picture changes.
  it('sends a fallen home as a new piece of terrain', () => {
    const map = field();
    const recorder = new FrameRecorder(map);
    const home_id = recorder.record().terrain.add[0][0];

    map.home().destroyed = true;
    const frame = recorder.record();

    expect(frame.terrain.remove).toEqual([home_id]);
    expect(frame.terrain.add).toEqual([[expect.any(Number), 'home_destroyed', 240, 480, 280, 520]]);
  });

  it('sends every tank, missile and gift as it is drawn', () => {
    const map = field();
    const recorder = new FrameRecorder(map);
    const tank = map.add_tank(UserP1Tank, new MapArea2D(160, 400, 200, 440));
    tank.born();
    tank.direction = Direction.RIGHT;
    tank.reload_left = 0;
    tank.fire();
    map.random_gift(StarGift);
    const gift = map.gifts[0];

    const { units } = over_the_wire(recorder.record());

    const missile = map.missiles[0];
    expect(units).toEqual([
      [expect.any(Number), 't', 'user_p1_lv1_with_guard', 180, 420, Direction.RIGHT],
      [expect.any(Number), 'm', 'missile', missile.area.center().x, missile.area.center().y, Direction.RIGHT],
      [expect.any(Number), 'g', 'star', gift.area.x1, gift.area.y1, 0]
    ]);
  });

  it('keeps a unit under one id from frame to frame', () => {
    const map = field();
    const recorder = new FrameRecorder(map);
    const tank = map.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40));

    const [first] = recorder.record().units;
    tank.area = new MapArea2D(0, 10, 40, 50);
    const [second] = recorder.record().units;

    expect(second[0]).toBe(first[0]);
    expect(second[4]).toBe(30);
  });

  it('reports each explosion once, where it happened', () => {
    const map = field();
    const recorder = new FrameRecorder(map);
    const tank = map.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40));

    tank.destroy();

    expect(recorder.record().booms).toEqual([[20, 20]]);
    expect(recorder.record().booms).toBeUndefined();
  });
});
