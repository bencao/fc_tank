import { describe, it, expect, beforeEach } from 'vitest';
import { Commander, UserCommander, MissileCommander, EnemyAICommander } from '../../src/objects/commanders.js';
import { Direction } from '../../src/constants.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('Commander', () => {
  it('creates direction command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.turn('down');
    expect(cmd.commands.length).toBe(1);
    expect(cmd.commands[0].type).toBe('direction');
    expect(cmd.commands[0].params.direction).toBe(Direction.DOWN);
  });

  it('creates start_move command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.start_move(10);
    expect(cmd.commands[0].type).toBe('start_move');
    expect(cmd.commands[0].params.offset).toBe(10);
  });

  it('creates stop_move command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.stop_move();
    expect(cmd.commands[0].type).toBe('stop_move');
  });

  it('creates fire command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.fire();
    expect(cmd.commands[0].type).toBe('fire');
  });

  it('direction_changed detects when direction differs', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    expect(cmd.direction_changed('down')).toBe(true);
    expect(cmd.direction_changed('up')).toBe(false);
  });

  it('next_commands deduplicates by type', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.next = () => {
      cmd.fire();
      cmd.fire();
      cmd.start_move();
    };
    const commands = cmd.next_commands();
    expect(commands.length).toBe(2);
  });
});

describe('UserCommander', () => {
  let cmd;

  beforeEach(() => {
    const map_unit = { direction: Direction.UP };
    cmd = new UserCommander(map_unit);
  });

  it('tracks on-going commands', () => {
    cmd.on_command_start('fire');
    expect(cmd.is_on_going('fire')).toBe(true);

    cmd.on_command_end('fire');
    expect(cmd.is_on_going('fire')).toBe(false);
  });

  it('reset clears all state', () => {
    cmd.on_command_start('up');
    cmd.reset();
    expect(cmd.is_on_going('up')).toBe(false);
  });

  it('generates fire command from on-going', () => {
    cmd.on_command_start('fire');
    const commands = cmd.next_commands();
    const has_fire = commands.some(c => c.type === 'fire');
    expect(has_fire).toBe(true);
  });

  it('generates move commands from on-going direction', () => {
    cmd.on_command_start('right');
    const commands = cmd.next_commands();
    const has_direction = commands.some(c => c.type === 'direction');
    const has_move = commands.some(c => c.type === 'start_move');
    expect(has_direction).toBe(true);
    expect(has_move).toBe(true);
  });
});

describe('MissileCommander', () => {
  it('always generates start_move', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new MissileCommander(map_unit);
    const commands = cmd.next_commands();
    expect(commands.some(c => c.type === 'start_move')).toBe(true);
  });
});

describe('EnemyAICommander', () => {
  function makeCommander({ paths = [] } = {}) {
    const here = Object.assign(new MapArea2D(200, 200, 240, 240), { vx: 20, vy: 20 });
    const map = {
      home_vertex: Object.assign(new MapArea2D(240, 480, 280, 520), { vx: 24, vy: 48 }),
      random_vertex: () => map.home_vertex,
      vertexes_at: () => here,
      path_requests: 0,
      shortest_path() {
        map.path_requests += 1;
        return paths.length > 0 ? paths.shift() : [];
      }
    };
    const tank = {
      map,
      area: new MapArea2D(200, 200, 240, 240),
      direction: 180,
      iq: 0,
      delayed_commands: [],
      can_fire: () => false
    };
    const commander = new EnemyAICommander(tank);
    return { commander, map, tank };
  }

  function tick(commander, times) {
    for (let i = 0; i < times; i++) { commander.next_commands(); }
  }

  it('does not ask for a new route on every single frame', () => {
    // Asking is a full search of the map; at 60 frames a second with several
    // enemies on the map that alone would eat the frame budget.
    const { commander, map } = makeCommander();

    tick(commander, 60);

    expect(map.path_requests).toBeLessThanOrEqual(4);
  });

  it('re-routes when it has been sitting still against an obstacle', () => {
    // A route it can follow, so nothing but being wedged would make it ask
    // for another one.
    const route = [
      Object.assign(new MapArea2D(200, 160, 240, 200), { vx: 20, vy: 16 }),
      Object.assign(new MapArea2D(200, 120, 240, 160), { vx: 20, vy: 12 }),
      Object.assign(new MapArea2D(200, 80, 240, 120), { vx: 20, vy: 8 })
    ];
    const { commander, map } = makeCommander({ paths: [route] });
    tick(commander, 1);
    expect(map.path_requests).toBe(1);

    // The tank never moves - its area stays exactly where it was.
    tick(commander, EnemyAICommander.stuck_threshold + 2);

    expect(map.path_requests).toBeGreaterThan(1);
  });
});

describe('EnemyAICommander with nowhere to go', () => {
  it('keeps rolling rather than standing still', () => {
    const here = Object.assign(new MapArea2D(200, 200, 240, 240), { vx: 20, vy: 20 });
    const map = {
      home_vertex: here,
      random_vertex: () => here,
      vertexes_at: () => here,
      shortest_path: () => []
    };
    const tank = {
      map, area: new MapArea2D(200, 200, 240, 240), direction: 180, iq: 0,
      delayed_commands: [], can_fire: () => false
    };
    const commander = new EnemyAICommander(tank);

    // Several frames after the route search came back with nothing.
    const issued = [];
    for (let i = 0; i < 5; i++) {
      issued.push(commander.next_commands().map(c => c.type));
    }

    expect(issued.every(frame => frame.includes('start_move'))).toBe(true);
  });
});

describe('EnemyAICommander route backoff', () => {
  it('waits longer before trying again when there is no way through', () => {
    const here = Object.assign(new MapArea2D(200, 200, 240, 240), { vx: 20, vy: 20 });
    const map = {
      home_vertex: here,
      random_vertex: () => here,
      vertexes_at: () => here,
      path_requests: 0,
      shortest_path() { map.path_requests += 1; return []; }
    };
    const tank = {
      map, area: new MapArea2D(200, 200, 240, 240), direction: 180, iq: 0,
      delayed_commands: [], can_fire: () => false
    };
    const commander = new EnemyAICommander(tank);

    for (let i = 0; i < 120; i++) { commander.next_commands(); }

    // A search of a walled-off map is the most expensive one there is; a tank
    // that cannot get anywhere must not keep paying for it.
    expect(map.path_requests).toBeLessThanOrEqual(2);
  });
});

describe('EnemyAICommander following Jev guidance', () => {
  function makeGuided() {
    const here = Object.assign(new MapArea2D(200, 200, 240, 240), { vx: 20, vy: 20 });
    const home = Object.assign(new MapArea2D(240, 480, 280, 520), { vx: 24, vy: 48 });
    const near_player = Object.assign(new MapArea2D(160, 240, 200, 280), { vx: 16, vy: 24 });
    const far_player = Object.assign(new MapArea2D(480, 480, 520, 520), { vx: 48, vy: 48 });
    const roam_spot = Object.assign(new MapArea2D(0, 0, 40, 40), { vx: 0, vy: 0 });
    const map = {
      home_vertex: home,
      random_vertex: () => roam_spot,
      vertexes_at: area => (area.x1 === 200 && area.y1 === 200 ? here : area.x1 === 160 ? near_player : far_player),
      user_tanks: () => [{ area: new MapArea2D(480, 480, 520, 520) }, { area: new MapArea2D(160, 240, 200, 280) }],
      goals: [],
      shortest_path(tank, start, end) { map.goals.push(end); return []; }
    };
    const tank = {
      map, area: new MapArea2D(200, 200, 240, 240), direction: 180, iq: 100,
      delayed_commands: [], can_fire: () => false
    };
    return { commander: new EnemyAICommander(tank), map, tank, home, near_player, roam_spot };
  }

  it('heads for the nearest player tank when told to hunt', () => {
    const { commander, map, near_player } = makeGuided();

    commander.follow('hunt_player');
    commander.next_commands();

    expect(map.goals).toEqual([near_player]);
  });

  it('heads somewhere else on the map when told to roam', () => {
    const { commander, map, roam_spot } = makeGuided();

    commander.follow('roam');
    commander.next_commands();

    expect(map.goals).toEqual([roam_spot]);
  });

  it('heads for the base when told to attack it, whatever its own iq', () => {
    const { commander, map, tank, home } = makeGuided();
    tank.iq = 0;

    commander.follow('attack_base');
    commander.next_commands();

    expect(map.goals).toEqual([home]);
  });

  it('drops its route when the objective changes, but not when it is repeated', () => {
    const { commander } = makeGuided();
    const route = () => [Object.assign(new MapArea2D(200, 160, 240, 200), { vx: 20, vy: 16 })];

    commander.follow('attack_base');
    commander.path = route();
    commander.follow('attack_base');
    expect(commander.path).toHaveLength(1);

    commander.follow('hunt_player');
    expect(commander.path).toHaveLength(0);
  });
});
