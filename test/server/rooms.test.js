import { describe, it, expect } from 'vitest';
import { Rooms, handle_room_request, memory_store, ROOM_CODE_PATTERN } from '../../server/rooms.js';

const OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n';
const ANSWER = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\n';

const request = (method, { code, body, address = '1.2.3.4' } = {}) => new Request(
  `http://localhost/api/room${code ? `?code=${code}` : ''}`,
  {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': address },
    ...(body !== undefined && { body: JSON.stringify(body) })
  }
);

describe('Rooms', () => {
  it('opens a room under a short code and hands its offer to whoever asks', async () => {
    const rooms = new Rooms(memory_store());
    const code = await rooms.open(OFFER);

    expect(code).toMatch(ROOM_CODE_PATTERN);
    expect(await rooms.read(code)).toEqual({ offer: OFFER, answer: null });
  });

  it('takes the first answer only - a room is for two', async () => {
    const rooms = new Rooms(memory_store());
    const code = await rooms.open(OFFER);

    expect(await rooms.answer(code, ANSWER)).toBe('answered');
    expect(await rooms.answer(code, 'v=0\r\nsomeone else')).toBe('full');
    expect(await rooms.read(code)).toEqual({ offer: OFFER, answer: ANSWER });
  });

  it('knows nothing of a room that was never opened', async () => {
    const rooms = new Rooms(memory_store());

    expect(await rooms.read('ZZZZZZ')).toBeNull();
    expect(await rooms.answer('ZZZZZZ', ANSWER)).toBe('missing');
  });

  it('lets rooms expire', async () => {
    const store = memory_store();
    const rooms = new Rooms(store, { ttl_seconds: 60 });
    const code = await rooms.open(OFFER);

    store.advance(61_000);

    expect(await rooms.read(code)).toBeNull();
  });

  it('draws a fresh code when the first one is taken', async () => {
    const draws = ['AAAAAA', 'AAAAAA', 'BBBBBB'];
    const rooms = new Rooms(memory_store(), { draw_code: () => draws.shift() });

    expect(await rooms.open(OFFER)).toBe('AAAAAA');
    expect(await rooms.open(OFFER)).toBe('BBBBBB');
  });
});

describe('handle_room_request', () => {
  it('opens a room on POST and answers with its code', async () => {
    const rooms = new Rooms(memory_store());
    const response = await handle_room_request(request('POST', { body: { offer: OFFER } }), rooms);

    expect(response.status).toBe(201);
    expect((await response.json()).code).toMatch(ROOM_CODE_PATTERN);
  });

  it('refuses anything that is not a session description', async () => {
    const rooms = new Rooms(memory_store());

    for (const offer of [undefined, 42, 'hello', 'v=0' + 'x'.repeat(20_000)]) {
      const response = await handle_room_request(request('POST', { body: { offer } }), rooms);
      expect(response.status).toBe(400);
    }
  });

  it('reads a room on GET, and 404s a missing one', async () => {
    const rooms = new Rooms(memory_store());
    const code = await rooms.open(OFFER);

    const found = await handle_room_request(request('GET', { code }), rooms);
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ offer: OFFER, answer: null });

    const missing = await handle_room_request(request('GET', { code: 'ZZZZZZ' }), rooms);
    expect(missing.status).toBe(404);
  });

  it('reads codes case-insensitively - people retype them', async () => {
    const rooms = new Rooms(memory_store());
    const code = await rooms.open(OFFER);

    const found = await handle_room_request(request('GET', { code: code.toLowerCase() }), rooms);
    expect(found.status).toBe(200);
  });

  it('records the answer on PUT: 204, then 409 for a second friend, 404 for no room', async () => {
    const rooms = new Rooms(memory_store());
    const code = await rooms.open(OFFER);

    expect((await handle_room_request(request('PUT', { code, body: { answer: ANSWER } }), rooms)).status).toBe(204);
    expect((await handle_room_request(request('PUT', { code, body: { answer: ANSWER } }), rooms)).status).toBe(409);
    expect((await handle_room_request(request('PUT', { code: 'ZZZZZZ', body: { answer: ANSWER } }), rooms)).status).toBe(404);
  });

  it('turns away a malformed code', async () => {
    const rooms = new Rooms(memory_store());
    const response = await handle_room_request(request('GET', { code: 'no/such' }), rooms);

    expect(response.status).toBe(400);
  });

  it('limits how many rooms one address may open in an hour', async () => {
    const rooms = new Rooms(memory_store(), { rooms_per_hour: 2 });
    const open = () => handle_room_request(request('POST', { body: { offer: OFFER } }), rooms);

    expect((await open()).status).toBe(201);
    expect((await open()).status).toBe(201);
    expect((await open()).status).toBe(429);
  });

  it('answers 405 to other methods', async () => {
    const rooms = new Rooms(memory_store());
    const response = await handle_room_request(request('DELETE', { code: 'AAAAAA' }), rooms);

    expect(response.status).toBe(405);
  });
});
