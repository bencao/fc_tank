import { describe, it, expect } from 'vitest';
import { MovableMapUnit2D } from '../../src/map/movable_map_unit_2d.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';
import { Direction } from '../../src/constants.js';

function makeMap({ blocked = false } = {}) {
  return {
    default_width: 40,
    default_height: 40,
    max_x: 520,
    max_y: 520,
    area_available: () => !blocked
  };
}

function makeUnit(map, { speed = 0.08, direction = Direction.RIGHT } = {}) {
  const unit = new MovableMapUnit2D(map, new MapArea2D(0, 0, 40, 40));
  Object.defineProperty(unit, 'speed', { value: speed });
  unit.direction = direction;
  unit.display_object = {
    setAnimation() {}, setFrameRate() {}, setRotationDeg() {}, setAbsolutePosition() {}
  };
  unit.animation_state = () => 'user_p1_lv1';
  // Hold the movement key down forever.
  unit.commander = { next_commands: () => [{ type: 'start_move', params: { offset: null } }] };
  return unit;
}

function travel(unit, { frames, delta }) {
  const start = unit.area.x1;
  for (let i = 0; i < frames; i++) { unit.integration(delta); }
  return unit.area.x1 - start;
}

describe('MovableMapUnit2D collision sweep', () => {
  // A missile is 20px long and a shot brick leaves 10px pieces behind, so one
  // long frame - the first after the tab comes back, say - is enough for a
  // landing-spot-only check to miss a wall completely.
  it('stops at a thin wall instead of stepping straight over it', () => {
    const wall = new MapArea2D(30, 0, 40, 20);
    const map = makeMap();
    map.area_available = (unit, area) => !area.collide(wall);
    const missile = makeUnit(map, { speed: 0.4 });
    missile.area = new MapArea2D(0, 0, 20, 20);

    const moved = missile.move(40);

    expect(moved).toBe(10);
    expect(missile.area.x1).toBe(10);
  });

  it('travels the whole way when nothing is in between', () => {
    const unit = makeUnit(makeMap(), { speed: 0.4 });

    expect(unit.move(30)).toBe(30);
    expect(unit.area.x1).toBe(30);
  });
});

describe('MovableMapUnit2D teardown', () => {
  it('shuts its commander down so timers do not outlive the unit', () => {
    const map = makeMap();
    map.delete_map_unit = () => {};
    const unit = makeUnit(map);
    let shut_down = false;
    unit.commander = { next_commands: () => [], destroy: () => { shut_down = true; } };
    unit.destroy_display = () => {};

    unit.destroy();

    expect(shut_down).toBe(true);
  });

  it('destroys cleanly when the commander has nothing to shut down', () => {
    const map = makeMap();
    map.delete_map_unit = () => {};
    const unit = makeUnit(map);
    unit.destroy_display = () => {};

    expect(() => unit.destroy()).not.toThrow();
  });
});

describe('MovableMapUnit2D blocked moves', () => {
  function wedgedUnit() {
    const unit = makeUnit(makeMap({ blocked: true }));
    unit.commander = { next_commands: () => [] };
    unit.add_delayed_command({ type: 'start_move', params: { offset: 40 } });
    return unit;
  }

  it('keeps retrying a move that is briefly in the way', () => {
    const unit = wedgedUnit();

    unit.integration(16);

    expect(unit.delayed_commands).toHaveLength(1);
  });

  it('abandons a move it has been unable to make for a while', () => {
    // While an unfinished move is queued the commander will not steer
    // anywhere else, so a move that can never finish wedges the unit forever.
    const unit = wedgedUnit();

    for (let i = 0; i < 40; i++) { unit.integration(16); }

    expect(unit.delayed_commands).toEqual([]);
  });

  it('forgets earlier obstruction once the unit gets going again', () => {
    const map = makeMap();
    let blocked = true;
    map.area_available = () => !blocked;
    const unit = makeUnit(map);
    unit.commander = { next_commands: () => [] };
    unit.add_delayed_command({ type: 'start_move', params: { offset: 400 } });

    for (let i = 0; i < 10; i++) { unit.integration(16); }
    blocked = false;
    unit.integration(16);
    blocked = true;
    for (let i = 0; i < 10; i++) { unit.integration(16); }

    expect(unit.delayed_commands).toHaveLength(1);
  });
});

describe('MovableMapUnit2D movement', () => {
  it('covers the same ground whether frames are long or short', () => {
    const at_60hz = travel(makeUnit(makeMap()), { frames: 10, delta: 16 });
    const at_165hz = travel(makeUnit(makeMap()), { frames: 27, delta: 6 });

    // 0.08 px/ms over ~160ms is ~12px, not the 10px that per-frame
    // truncation leaves behind.
    expect(at_60hz).toBe(12);
    expect(at_165hz).toBe(12);
  });

  it('still moves on a display too fast for a whole pixel per frame', () => {
    // 0.08 px/ms over a 6ms frame is under a pixel; the leftovers must carry
    // over rather than being thrown away every frame.
    const travelled = travel(makeUnit(makeMap()), { frames: 20, delta: 6 });

    expect(travelled).toBe(9);
  });

  it('spends one frame of travel even when several move commands arrive', () => {
    const map = makeMap();
    const unit = makeUnit(map);
    unit.commander = {
      next_commands: () => [{ type: 'start_move', params: { offset: null } }]
    };
    // A queued command left over from the previous frame, as happens when a
    // move is still in progress.
    unit.add_delayed_command({ type: 'start_move', params: { offset: 40 } });

    unit.integration(50);

    expect(unit.area.x1).toBe(4);
  });
});
