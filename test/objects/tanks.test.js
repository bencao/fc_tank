import { describe, it, expect } from 'vitest';
import { Tank, UserTank, StupidTank, FoolTank, FishTank, StrongTank } from '../../src/objects/tanks.js';

describe('Tank (base)', () => {
  function makeTank() {
    const t = Object.create(Tank.prototype);
    t.hp = 1;
    t.power = 1;
    t.level = 1;
    t.max_missile = 1;
    t.max_hp = 2;
    t.missiles = [];
    t.ship = false;
    t.guard = false;
    t.initializing = false;
    t.frozen = false;
    return t;
  }

  it('dead() returns true when hp <= 0', () => {
    const t = makeTank();
    t.hp = 0;
    expect(t.dead()).toBe(true);
  });

  it('dead() returns false when hp > 0', () => {
    const t = makeTank();
    expect(t.dead()).toBe(false);
  });

  it('level_up caps at 3', () => {
    const t = makeTank();
    t.update_display = () => {};
    t.level_up(5);
    expect(t.level).toBe(3);
  });

  it('level_up adjusts power and max_missile', () => {
    const t = makeTank();
    t.update_display = () => {};

    t.level_up(1); // level 2
    expect(t.level).toBe(2);
    expect(t.power).toBe(1);
    expect(t.max_missile).toBe(2);

    t.level_up(1); // level 3
    expect(t.level).toBe(3);
    expect(t.power).toBe(2);
    expect(t.max_missile).toBe(2);
  });

  it('can_fire returns true when missiles < max_missile', () => {
    const t = makeTank();
    expect(t.can_fire()).toBe(true);
  });

  it('can_fire returns false when missiles >= max_missile', () => {
    const t = makeTank();
    t.missiles = [{}];
    expect(t.can_fire()).toBe(false);
  });

  it('delete_missile removes from list', () => {
    const t = makeTank();
    const m1 = { id: 1 };
    const m2 = { id: 2 };
    t.missiles = [m1, m2];
    t.delete_missile(m1);
    expect(t.missiles).toEqual([m2]);
  });
});

describe('Tank speeds', () => {
  it('UserTank speed is 0.13', () => {
    expect(UserTank.speed).toBe(0.13);
  });

  it('StupidTank speed is 0.07', () => {
    expect(StupidTank.speed).toBe(0.07);
  });

  it('FoolTank speed is 0.07', () => {
    expect(FoolTank.speed).toBe(0.07);
  });

  it('FishTank speed is 0.13', () => {
    expect(FishTank.speed).toBe(0.13);
  });

  it('StrongTank speed is 0.07', () => {
    expect(StrongTank.speed).toBe(0.07);
  });
});

describe('Tank types', () => {
  it('StupidTank type is stupid', () => {
    const t = Object.create(StupidTank.prototype);
    expect(t.type()).toBe('stupid');
  });

  it('FoolTank type is fool', () => {
    const t = Object.create(FoolTank.prototype);
    expect(t.type()).toBe('fool');
  });

  it('FishTank type is fish', () => {
    const t = Object.create(FishTank.prototype);
    expect(t.type()).toBe('fish');
  });

  it('StrongTank type is strong', () => {
    const t = Object.create(StrongTank.prototype);
    expect(t.type()).toBe('strong');
  });
});
