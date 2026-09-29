import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BattleFieldScene } from '../../src/scenes/battle_field_scene.js';
import { DIFFICULTIES } from '../../src/difficulty.js';

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
  scene.game = { get_status: () => false, difficulty: () => DIFFICULTIES[1] };
  scene.enemy_guide = { start: vi.fn(), stop: vi.fn() };
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

describe('BattleFieldScene enemy guide', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    makeLoopHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeGuidedScene({ demo = false, level = 1 } = {}) {
    const scene = makeScene();
    scene.game = {
      get_status: key => (key === 'demo_mode' ? demo : undefined),
      difficulty: () => DIFFICULTIES[level]
    };
    return scene;
  }

  it('asks Jev for guidance on NIGHTMARE while the battle runs and stops when it pauses', () => {
    const scene = makeGuidedScene({ level: 3 });
    scene.running = true;

    scene.start_time_line();
    expect(scene.enemy_guide.start).toHaveBeenCalledWith({ enemies: true, players: false });

    scene.stop_time_line();
    expect(scene.enemy_guide.stop).toHaveBeenCalled();
  });

  it('always lets Jev steer the demo player, and the enemies too on NIGHTMARE', () => {
    for (const [level, enemies] of [[1, false], [3, true]]) {
      const scene = makeGuidedScene({ demo: true, level });
      scene.running = true;

      scene.start_time_line();
      scene.stop_time_line();

      expect(scene.enemy_guide.start).toHaveBeenCalledWith({ enemies, players: true });
    }
  });

  it('leaves EASY, NORMAL and HARD to the classic built-in AI', () => {
    for (const level of [0, 1, 2]) {
      const scene = makeGuidedScene({ level });
      scene.running = true;

      scene.start_time_line();
      scene.stop_time_line();

      expect(scene.enemy_guide.start).not.toHaveBeenCalled();
    }
  });
});

describe('BattleFieldScene enemy arrivals', () => {
  function arrive(level) {
    const scene = Object.create(BattleFieldScene.prototype);
    const tank = { commander: { shoot_on_sight: true, blunder_rate: 0 }, hp_up: vi.fn() };
    scene.game = { difficulty: () => DIFFICULTIES[level] };
    scene.map = { add_tank: () => tank };
    scene.view = { update_enemy_statuses: vi.fn() };
    scene.remain_enemy_counts = 1;
    scene.last_enemy_born_area_index = 0;
    scene.born_enemy_tank();
    return tank;
  }

  it('sends EASY enemies in blundering and without shooting on sight', () => {
    const tank = arrive(0);
    expect(tank.commander.blunder_rate).toBe(0.5);
    expect(tank.commander.shoot_on_sight).toBe(false);
    expect(tank.hp_up).not.toHaveBeenCalled();
  });

  it('sends HARD and NIGHTMARE enemies in with one extra hit point', () => {
    for (const level of [2, 3]) {
      const tank = arrive(level);
      expect(tank.commander.blunder_rate).toBe(0);
      expect(tank.commander.shoot_on_sight).toBe(true);
      expect(tank.hp_up).toHaveBeenCalledWith(1);
    }
  });
});
