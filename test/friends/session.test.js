import { describe, it, expect, vi } from 'vitest';
import { FriendsSession, forward_keys } from '../../src/friends/session.js';
import { link_pair, flush } from '../helpers/link_pair.js';

function pair() {
  const [host_link, guest_link] = link_pair();
  return {
    host: new FriendsSession(host_link, 'host'),
    guest: new FriendsSession(guest_link, 'guest'),
    host_link,
    guest_link
  };
}

const key_event = (type, key, extra = {}) => Object.assign(new Event(type), { key, repeat: false, ...extra });

describe('FriendsSession', () => {
  it('delivers each message to the handlers for its type', async () => {
    const { host, guest } = pair();
    const scene = vi.fn();
    const sound = vi.fn();
    guest.on('scene', scene);
    guest.on('sound', sound);

    host.send('scene', { name: 'stage' });
    await flush();

    expect(scene).toHaveBeenCalledWith({ name: 'stage' });
    expect(sound).not.toHaveBeenCalled();
  });

  it('stops delivering to a handler once it unsubscribes', async () => {
    const { host, guest } = pair();
    const scene = vi.fn();
    const off = guest.on('scene', scene);

    off();
    host.send('scene', { name: 'stage' });
    await flush();

    expect(scene).not.toHaveBeenCalled();
  });

  it('shrugs off a message it cannot read', async () => {
    const { host_link, guest } = pair();
    const scene = vi.fn();
    guest.on('scene', scene);

    host_link.send('not json');
    host_link.send(JSON.stringify({ no: 'type' }));
    await flush();

    expect(scene).not.toHaveBeenCalled();
  });

  // One bad message must not take the others down with it.
  it('keeps delivering when a handler throws', async () => {
    const { host, guest } = pair();
    const later = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    guest.on('view', () => { throw new Error('bad call'); });
    guest.on('scene', later);

    host.send('view', { view: 'stage' });
    host.send('scene', { name: 'stage' });
    await flush();

    expect(later).toHaveBeenCalled();
    error.mockRestore();
  });

  it("turns the guest's keys into key events on the host", async () => {
    const { host, guest } = pair();
    const seen = [];
    host.remote_keys.addEventListener('keydown', event => seen.push(['down', event.key]));
    host.remote_keys.addEventListener('keyup', event => seen.push(['up', event.key]));

    guest.send_key('ArrowUp', true);
    guest.send_key('ArrowUp', false);
    await flush();

    expect(seen).toEqual([['down', 'ArrowUp'], ['up', 'ArrowUp']]);
  });

  it('says when the friend is gone, and lets go of the keys they were holding', async () => {
    const { host, guest, guest_link } = pair();
    const closed = vi.fn();
    const released = [];
    host.on_close(closed);
    host.remote_keys.addEventListener('keyup', event => released.push(event.key));
    guest.send_key('z', true);
    await flush();

    guest_link.close();
    await flush();

    expect(closed).toHaveBeenCalled();
    expect(host.connected).toBe(false);
    expect(released).toEqual(['z']);
  });

  it('drops what is sent once the link is down, rather than throwing', async () => {
    const { host, host_link } = pair();
    host_link.close();
    await flush();

    expect(() => host.send('scene', { name: 'stage' })).not.toThrow();
  });
});

describe('forward_keys', () => {
  function setup() {
    const session = { send_key: vi.fn() };
    const page = new EventTarget();
    const win = new EventTarget();
    const detach = forward_keys(session, page, win);
    return { session, page, win, detach };
  }

  it('forwards the keys the game understands', () => {
    const { session, page } = setup();

    page.dispatchEvent(key_event('keydown', 'ArrowLeft'));
    page.dispatchEvent(key_event('keyup', 'ArrowLeft'));
    page.dispatchEvent(key_event('keydown', 'q'));

    expect(session.send_key.mock.calls).toEqual([['ArrowLeft', true], ['ArrowLeft', false]]);
  });

  // A held key repeats; the host only needs to hear it went down.
  it('leaves out auto-repeats', () => {
    const { session, page } = setup();

    page.dispatchEvent(key_event('keydown', 'z'));
    page.dispatchEvent(key_event('keydown', 'z', { repeat: true }));

    expect(session.send_key).toHaveBeenCalledTimes(1);
  });

  // Tabbing away swallows the keyup: without this the tank drives on forever.
  it('lets go of every held key when the window loses focus', () => {
    const { session, page, win } = setup();
    page.dispatchEvent(key_event('keydown', 'ArrowUp'));
    page.dispatchEvent(key_event('keydown', 'z'));

    win.dispatchEvent(new Event('blur'));

    expect(session.send_key.mock.calls.slice(2)).toEqual([['ArrowUp', false], ['z', false]]);
  });

  it('stops forwarding once detached', () => {
    const { session, page, detach } = setup();

    detach();
    page.dispatchEvent(key_event('keydown', 'ArrowLeft'));

    expect(session.send_key).not.toHaveBeenCalled();
  });
});
