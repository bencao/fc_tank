import { describe, it, expect, beforeEach } from 'vitest';
import { Commander, UserCommander, MissileCommander } from '../../src/objects/commanders.js';
import { Direction } from '../../src/constants.js';

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
