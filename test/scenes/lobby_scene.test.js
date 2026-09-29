import { describe, it, expect, vi } from 'vitest';
import { LobbyScene } from '../../src/scenes/lobby_scene.js';
import { RoomError } from '../../src/friends/rooms_client.js';
import { link_pair, flush } from '../helpers/link_pair.js';

// A connector whose room the test opens, fills and fails by hand.
function fake_connector() {
  const attempts = [];
  return {
    attempts,
    host: vi.fn(options => new Promise((resolve, reject) => {
      attempts.push({ ...options, resolve, reject });
    })),
    last: () => attempts.at(-1)
  };
}

function makeLobby({ friends = null } = {}) {
  const handlers = {};
  const statuses = { players: 1, current_stage: 9 };
  const connector = fake_connector();
  const scene = Object.create(LobbyScene.prototype);
  scene.keyboard = {
    on_key_down(keys, callback) { [].concat(keys).forEach(key => { handlers[key] = callback; }); },
    reset() {}
  };
  scene.view = { show_lobby: vi.fn(), show: vi.fn(), hide: vi.fn() };
  const game = scene.game = {
    connector,
    friends,
    get_status: key => statuses[key],
    update_status: (key, value) => { statuses[key] = value; },
    get_config: key => ({ initial_stage: 1 })[key],
    reset_run: vi.fn(),
    switch_scene: vi.fn(),
    show_invite: vi.fn(),
    invite_url: code => `https://fc.test/?join=${code}`,
    start_friends: vi.fn(session => { game.friends = session; }),
    end_friends: vi.fn(() => { game.friends?.close(); game.friends = null; })
  };
  const press = key => handlers[key]?.();
  return { scene, game, connector, press, statuses };
}

const last_screen = scene => scene.view.show_lobby.mock.calls.at(-1)[0];

describe('LobbyScene', () => {
  it('opens a room, then shows its code and the invitation link', async () => {
    const { scene, game, connector } = makeLobby();
    scene.start();
    expect(last_screen(scene).status).toMatch(/SETTING UP/);

    connector.last().on_code('K7QX2M');

    expect(last_screen(scene).code).toBe('K7QX2M');
    expect(game.show_invite).toHaveBeenLastCalledWith('https://fc.test/?join=K7QX2M');
  });

  it('greets the friend once they are through, and puts the invitation away', async () => {
    const { scene, game, connector } = makeLobby();
    scene.start();
    connector.last().on_code('K7QX2M');

    const [host_end] = link_pair();
    connector.last().resolve(host_end);
    await flush();

    expect(game.start_friends).toHaveBeenCalled();
    expect(game.friends.is_host()).toBe(true);
    expect(last_screen(scene).status).toMatch(/FRIEND JOINED/);
    expect(game.show_invite).toHaveBeenLastCalledWith(null);
  });

  it('waits for the friend before ENTER starts anything', () => {
    const { scene, game, press } = makeLobby();
    scene.start();

    press('ENTER');

    expect(game.switch_scene).not.toHaveBeenCalled();
  });

  it('starts a fresh two-player game from stage one on ENTER', async () => {
    const { scene, game, connector, press, statuses } = makeLobby();
    scene.start();
    connector.last().resolve(link_pair()[0]);
    await flush();

    press('ENTER');

    expect(statuses.players).toBe(2);
    expect(statuses.current_stage).toBe(1);
    expect(game.reset_run).toHaveBeenCalled();
    expect(game.switch_scene).toHaveBeenCalledWith('stage');
  });

  it('backs out to the title screen on SPACE, giving up on the room', () => {
    const { scene, game, connector, press } = makeLobby();
    scene.start();

    press('SPACE');

    expect(connector.last().signal.aborted).toBe(true);
    expect(game.switch_scene).toHaveBeenCalledWith('welcome');
  });

  it('says what went wrong, and tries again on ENTER', async () => {
    const { scene, connector, press } = makeLobby();
    scene.start();

    connector.last().reject(new RoomError('unreachable'));
    await flush();
    expect(last_screen(scene).status).toMatch(/COULDN'T CONNECT/);

    press('ENTER');
    expect(connector.host).toHaveBeenCalledTimes(2);
  });

  it('pays no mind to a room it already gave up on', async () => {
    const { scene, game, connector } = makeLobby();
    scene.start();
    const abandoned = connector.last();
    scene.stop();

    const [host_end] = link_pair();
    abandoned.resolve(host_end);
    await flush();

    expect(game.start_friends).not.toHaveBeenCalled();
    expect(host_end.open).toBe(false);
  });

  it('goes straight to "press start" when coming back with the friend still here', () => {
    const [host_end] = link_pair();
    const { scene, connector } = makeLobby({ friends: { connected: true, close() {} } });
    void host_end;

    scene.start();

    expect(connector.host).not.toHaveBeenCalled();
    expect(last_screen(scene).status).toMatch(/FRIEND JOINED/);
  });

  it('says so when the friend leaves, and opens a new room on ENTER', async () => {
    const { scene, connector, press } = makeLobby();
    scene.start();
    connector.last().resolve(link_pair()[0]);
    await flush();

    scene.on_friend_left();
    expect(last_screen(scene).status).toMatch(/LEFT/);

    press('ENTER');
    expect(connector.host).toHaveBeenCalledTimes(2);
  });

  it('lets the friend go when the host leaves on SPACE', async () => {
    const { scene, game, connector, press } = makeLobby();
    scene.start();
    connector.last().resolve(link_pair()[0]);
    await flush();

    press('SPACE');

    expect(game.end_friends).toHaveBeenCalled();
    expect(game.switch_scene).toHaveBeenCalledWith('welcome');
  });
});
