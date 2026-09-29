import { describe, it, expect, vi } from 'vitest';
import { BattleFieldScene } from '../../src/scenes/battle_field_scene.js';
import { Keyboard } from '../../src/engine/keyboard.js';
import { FriendsSession } from '../../src/friends/session.js';

const tank = () => ({ commander: { on_command_start: vi.fn(), on_command_end: vi.fn(), reset: vi.fn() } });
const key_event = (type, key) => Object.assign(new Event(type, { cancelable: true }), { key });

// A battle on the host's side. `friend` puts a guest on the other end.
function makeBattle({ friend = true } = {}) {
  const page = new EventTarget();
  const session = new FriendsSession({ send() {}, close() {} }, 'host');
  const p1 = tank();
  const p2 = tank();
  const scene = Object.create(BattleFieldScene.prototype);
  scene.keyboard = new Keyboard(page);
  scene.map = { p1_tank: () => p1, p2_tank: () => p2, bind: vi.fn() };
  scene.game = {
    friends: friend ? session : null,
    hosting_friends: () => friend,
    broadcast: vi.fn(),
    get_status: () => false
  };
  scene.connect_friend();
  scene.enable_user_control();
  scene.enable_system_control();
  return {
    scene,
    p1,
    p2,
    host_key: (key, down = true) => page.dispatchEvent(key_event(down ? 'keydown' : 'keyup', key)),
    friend_key: (key, down = true) => session.remote_key(key, down)
  };
}

describe('BattleFieldScene hosting friends play', () => {
  it("drives P2 with the friend's keys - arrows or WASD, whichever they like", () => {
    const { p1, p2, friend_key } = makeBattle();

    friend_key('ArrowUp');
    friend_key('d');
    friend_key('z', false);

    expect(p2.commander.on_command_start.mock.calls).toEqual([['up'], ['right']]);
    expect(p2.commander.on_command_end).toHaveBeenCalledWith('fire');
    expect(p1.commander.on_command_start).not.toHaveBeenCalled();
  });

  it("drives P1 with either set of the host's own keys", () => {
    const { p1, p2, host_key } = makeBattle();

    host_key('ArrowLeft');
    host_key('w');
    host_key('j');

    expect(p1.commander.on_command_start.mock.calls).toEqual([['left'], ['up'], ['fire']]);
    expect(p2.commander.on_command_start).not.toHaveBeenCalled();
  });

  it('lets the friend pause the game too', () => {
    const { scene, friend_key } = makeBattle();
    scene.running = true;
    scene.pause = vi.fn();

    friend_key('Enter');

    expect(scene.pause).toHaveBeenCalled();
  });

  it('keeps the classic split keyboard when both players share one', () => {
    const { p1, p2, host_key } = makeBattle({ friend: false });

    host_key('ArrowUp');
    host_key('w');

    expect(p1.commander.on_command_start.mock.calls).toEqual([['up']]);
    expect(p2.commander.on_command_start.mock.calls).toEqual([['up']]);
  });

  it('sends the friend a frame about thirty times a second', () => {
    const { scene } = makeBattle();
    scene.recorder = { record: () => ({ units: [] }) };

    scene.send_frame(1000);
    scene.send_frame(1016);
    scene.send_frame(1034);

    expect(scene.game.broadcast).toHaveBeenCalledTimes(2);
    expect(scene.game.broadcast).toHaveBeenCalledWith('frame', { units: [] });
  });

  it('sends no frames without a friend', () => {
    const { scene } = makeBattle({ friend: false });

    scene.send_frame(1000);

    expect(scene.game.broadcast).not.toHaveBeenCalled();
  });
});
