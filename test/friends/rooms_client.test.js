import { describe, it, expect, vi } from 'vitest';
import { RoomsClient, RoomError } from '../../src/friends/rooms_client.js';

const respond = (status, body) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('RoomsClient', () => {
  it('opens a room with the offer and answers its code', async () => {
    const fetch = respond(201, { code: 'K7QX2M' });
    const rooms = new RoomsClient(fetch);

    expect(await rooms.open('v=0 offer')).toBe('K7QX2M');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/room');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ offer: 'v=0 offer' });
  });

  it('reads a room by its code', async () => {
    const fetch = respond(200, { offer: 'v=0 offer', answer: null });
    const rooms = new RoomsClient(fetch);

    expect(await rooms.read('K7QX2M')).toEqual({ offer: 'v=0 offer', answer: null });
    expect(fetch.mock.calls[0][0]).toBe('/api/room?code=K7QX2M');
  });

  it('leaves the answer in the room', async () => {
    const fetch = respond(204);
    const rooms = new RoomsClient(fetch);

    await rooms.answer('K7QX2M', 'v=0 answer');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/room?code=K7QX2M');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ answer: 'v=0 answer' });
  });

  it.each([
    [404, 'missing'],
    [409, 'full'],
    [429, 'busy'],
    [503, 'offline']
  ])('names what went wrong when the server answers %i', async (status, reason) => {
    const rooms = new RoomsClient(respond(status, { error: 'nope' }));

    const error = await rooms.read('K7QX2M').catch(e => e);

    expect(error).toBeInstanceOf(RoomError);
    expect(error.reason).toBe(reason);
  });

  it('calls a failed request "offline"', async () => {
    const rooms = new RoomsClient(vi.fn(async () => { throw new TypeError('fetch failed'); }));

    const error = await rooms.open('v=0').catch(e => e);

    expect(error.reason).toBe('offline');
  });
});
