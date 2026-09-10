import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BattleFieldScene } from '../../src/scenes/battle_field_scene.js';

// Drives the scene's requestAnimationFrame loop by hand so we can count how
// many independent loops are alive at once.
function makeLoopHarness() {
  const pending = [];
  globalThis.requestAnimationFrame = cb => pending.push(cb);
  globalThis.performance = globalThis.performance ?? { now: () => 0 };
  return {
    // Run one frame: everything currently scheduled fires once.
    frame(timestamp) {
      const due = pending.splice(0, pending.length);
      due.forEach(cb => cb(timestamp));
      return due.length;
    },
    get scheduled() { return pending.length; }
  };
}

function makeScene() {
  const scene = Object.create(BattleFieldScene.prototype);
  scene.map = { missiles: [], gifts: [], tanks: [] };
  scene.view = { update_frame_rate: vi.fn() };
  scene.frame_rate = 0;
  return scene;
}

describe('BattleFieldScene time line', () => {
  let harness;

  beforeEach(() => {
    // Only fake the interval timers - the rAF stub below is ours.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    harness = makeLoopHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs exactly one loop while a battle is on', () => {
    const scene = makeScene();
    scene.running = true;
    scene.start_time_line();

    expect(harness.frame(16)).toBe(1);
    expect(harness.frame(32)).toBe(1);

    scene.stop_time_line();
  });

  it('does not leave a loop running after the time line stops', () => {
    const scene = makeScene();
    scene.running = true;
    scene.start_time_line();
    harness.frame(16);

    scene.stop_time_line();
    harness.frame(32);

    expect(harness.scheduled).toBe(0);
  });

  it('caps the step a single frame may take after a long stall', () => {
    const scene = makeScene();
    const seen = [];
    scene.map.tanks = [{ integration: delta => seen.push(delta) }];
    scene.running = true;
    scene.start_time_line();

    // The tab was backgrounded for 12 seconds; one frame must not move the
    // world by 12 seconds' worth of travel.
    harness.frame(12000);

    expect(seen).toEqual([BattleFieldScene.max_delta_time]);
    scene.stop_time_line();
  });

  it('does not accumulate loops across stages', () => {
    const scene = makeScene();
    scene.running = true;
    scene.start_time_line();
    harness.frame(16);
    scene.stop_time_line();
    harness.frame(32);

    scene.running = true;
    scene.start_time_line();

    expect(harness.frame(48)).toBe(1);
    expect(harness.frame(64)).toBe(1);

    scene.stop_time_line();
  });
});
