import { describe, it, expect, vi, afterEach } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';
import { link_pair, flush } from '../helpers/link_pair.js';

stubKinetic();

const { Game } = await import('../../src/game.js');
const { FriendsSession } = await import('../../src/friends/session.js');
const { RoomError } = await import('../../src/friends/rooms_client.js');
const { become_guest } = await import('../../src/friends/guest.js');

const key_event = (type, key) => Object.assign(new Event(type), { key, repeat: false });
const lobby_screen = game => game.scenes.lobby.view.show_lobby.mock.calls.at(-1)[0];

// A guest who opened the invitation for room K7QX2M. join() settles the way
// the test says: with a link to a host, or with a RoomError.
async function joining({ fails, touch = false } = {}) {
  const [host_link, guest_link] = link_pair();
  const connector = {
    join: vi.fn(async () => {
      if (fails) { throw new RoomError(fails); }
      return guest_link;
    })
  };
  const game = new Game({ connector, leaderboard: {} });
  vi.spyOn(game.scenes.lobby.view, 'show_lobby');
  const page = new EventTarget();
  const go_to_title = vi.fn();
  become_guest(game, 'K7QX2M', { page, win: new EventTarget(), go_to_title, touch: () => touch });
  await flush();
  const host = new FriendsSession(host_link, 'host');
  return { game, host, host_link, page, go_to_title, connector };
}

describe('A friends play guest', () => {
  it('joins the room from the invitation and waits for the host', async () => {
    const { game, connector } = await joining();

    expect(connector.join).toHaveBeenCalledWith('K7QX2M');
    expect(game.current_scene).toBe(game.scenes.lobby);
    expect(game.friends.is_host()).toBe(false);
    expect(lobby_screen(game).status).toMatch(/CONNECTED/);
  });

  it('says why it could not join, and goes to the title on ENTER', async () => {
    const { game, go_to_title, page } = await joining({ fails: 'full' });
    expect(lobby_screen(game).status).toBe('ROOM IS FULL');

    page.dispatchEvent(key_event('keydown', 'Enter'));

    expect(go_to_title).toHaveBeenCalled();
  });

  it("follows the host's scenes and what their views show", async () => {
    const { game, host } = await joining();
    const setText = vi.spyOn(game.scenes.stage.view.stage_label, 'setText');

    host.send('scene', { name: 'stage' });
    host.send('view', { view: 'stage', method: 'update_stage', args: [4] });
    await flush();

    expect(game.current_scene).toBe(game.scenes.stage);
    expect(setText).toHaveBeenLastCalledWith('STAGE 4');
  });

  it('ignores a scene it has no mirror for', async () => {
    const { game, host } = await joining();

    host.send('scene', { name: 'welcome' });
    await flush();

    expect(game.current_scene).toBe(game.scenes.lobby);
  });

  it("draws the host's battle field", async () => {
    const { game, host } = await joining();

    host.send('scene', { name: 'battle_field' });
    host.send('frame', { units: [], terrain: { add: [[1, 'brick', 0, 200, 40, 240]], remove: [] } });
    await flush();

    expect(game.scenes.battle_field.map.terrains).toHaveLength(1);
  });

  it('clears the field when the battle is over', async () => {
    const { game, host } = await joining();
    host.send('scene', { name: 'battle_field' });
    host.send('frame', { units: [], terrain: { add: [[1, 'brick', 0, 200, 40, 240]], remove: [] } });
    await flush();

    host.send('scene', { name: 'report' });
    await flush();

    expect(game.scenes.battle_field.map.terrains).toHaveLength(0);
  });

  it("plays the host's sounds, and only real ones", async () => {
    const { game, host } = await joining();
    const play = vi.spyOn(game.scenes.lobby.sound, 'play').mockImplementation(() => {});

    host.send('sound', { name: 'fire' });
    host.send('sound', { name: 'constructor' });
    await flush();

    expect(play.mock.calls).toEqual([['fire']]);
  });

  it('sends the host the keys pressed on its page', async () => {
    const { host, page } = await joining();
    const heard = [];
    host.remote_keys.addEventListener('keydown', event => heard.push(event.key));

    page.dispatchEvent(key_event('keydown', 'ArrowUp'));
    await flush();

    expect(heard).toEqual(['ArrowUp']);
  });

  it('enters its own initials for the team and sends them to the host', async () => {
    const { game, host } = await joining();
    const initials = vi.fn();
    host.on('initials', initials);
    const show_player = vi.spyOn(game.scenes.name_entry.view, 'show_player');

    host.send('scene', { name: 'name_entry' });
    host.send('name_entry', { score: 2000 });
    await flush();
    expect(show_player).toHaveBeenCalledWith('TEAM 2P', 2000);

    const name_entry = game.scenes.name_entry;
    name_entry.initials.up();
    name_entry.save();
    await flush();

    expect(initials).toHaveBeenCalledWith({ name: 'BAA' });
  });

  it('says so when the host leaves, wherever it was', async () => {
    const { game, host, host_link } = await joining();
    host.send('scene', { name: 'battle_field' });
    await flush();

    host_link.close();
    await flush();

    expect(game.current_scene).toBe(game.scenes.lobby);
    expect(lobby_screen(game).status).toBe('THE HOST LEFT');
  });

  // A phone won't play a sound before its first touch, and a friend who just
  // opened the link has touched nothing - stage 1's music would go missing.
  it('asks a friend on a touch screen for a tap before the game starts', async () => {
    const { game } = await joining({ touch: true });

    expect(lobby_screen(game).status).toBe('CONNECTED!');
    expect(lobby_screen(game).hint).toMatch(/TAP .*SOUND/);
  });

  // An iPhone that locked mid-game comes back to a link that died quietly: the
  // screen must not sit on the last frame, and nobody actually walked out.
  describe('when the host goes quiet', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('says the connection was lost instead of freezing', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      const { game, host, host_link } = await joining();
      host.send('scene', { name: 'battle_field' });
      await flush();
      host_link.on_message = null;
      host_link.send = () => {};

      await vi.advanceTimersByTimeAsync(12000);

      expect(game.current_scene).toBe(game.scenes.lobby);
      expect(lobby_screen(game).status).toBe('CONNECTION LOST');
    });
  });
});
