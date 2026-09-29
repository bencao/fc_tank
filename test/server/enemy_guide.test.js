import { describe, it, expect } from 'vitest';
import { build_guide_request, guide_enemies, parse_snapshot, handle_guide_request } from '../../server/enemy_guide.js';

const snapshot = {
  base: { x: 6, y: 12 },
  players: [{ id: 'p1', x: 4, y: 12, level: 1 }],
  enemies: [
    { id: 'e1', type: 'fish', x: 0, y: 0, hp: 2, distance_to_base: 18, distance_to_nearest_player: 16 },
    { id: 'e2', type: 'strong', x: 6, y: 3, hp: 4, distance_to_base: 9, distance_to_nearest_player: 11 }
  ]
};

describe('build_guide_request', () => {
  it('asks one objective choice per enemy tank, keyed by its id', () => {
    const { questions } = build_guide_request(snapshot);

    expect(Object.keys(questions)).toEqual(['e1', 'e2']);
    expect(questions.e2.type).toBe('choice');
    expect(Object.keys(questions.e2.criteria)).toEqual(['attack_base', 'hunt_player', 'roam']);
    expect(JSON.stringify(questions.e2.instructions)).toContain('`enemies[1]`');
  });
});

describe('guide_enemies', () => {
  it('returns the objective Jev picked for each tank, with its confidence', async () => {
    const requests = [];
    const client = {
      systemOne: async request => {
        requests.push(request);
        return {
          answers: {
            e1: { type: 'choice', choice: 'hunt_player', confidence: 0.7, probabilities: {} },
            e2: { type: 'choice', choice: 'attack_base', confidence: 0.9, probabilities: {} }
          }
        };
      }
    };

    const guidance = await guide_enemies(client, snapshot);

    expect(requests).toHaveLength(1);
    expect(guidance).toEqual({
      e1: { objective: 'hunt_player', confidence: 0.7 },
      e2: { objective: 'attack_base', confidence: 0.9 }
    });
  });

  it('does not call Jev when there are no enemies to guide', async () => {
    const client = { systemOne: async () => { throw new Error('should not be called'); } };
    expect(await guide_enemies(client, { ...snapshot, enemies: [] })).toEqual({});
  });
});

describe('parse_snapshot', () => {
  it('accepts a well-formed battlefield snapshot', () => {
    expect(parse_snapshot(snapshot)).toEqual(snapshot);
  });

  it('rejects bodies that are not a battlefield snapshot', () => {
    expect(() => parse_snapshot(null)).toThrow();
    expect(() => parse_snapshot({ ...snapshot, enemies: 'lots' })).toThrow();
    expect(() => parse_snapshot({ ...snapshot, enemies: [{ id: 'e1', x: 'far' }] })).toThrow();
    const horde = Array.from({ length: 50 }, (_, i) => ({ ...snapshot.enemies[0], id: `e${i}` }));
    expect(() => parse_snapshot({ ...snapshot, enemies: horde })).toThrow();
  });
});

describe('handle_guide_request', () => {
  const post = body => new Request('http://localhost/api/enemy-guide', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const client = {
    systemOne: async () => ({
      answers: {
        e1: { choice: 'roam', confidence: 0.6 },
        e2: { choice: 'attack_base', confidence: 0.8 }
      }
    })
  };

  it('answers a snapshot with guidance as JSON', async () => {
    const response = await handle_guide_request(post(snapshot), client);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      guidance: {
        e1: { objective: 'roam', confidence: 0.6 },
        e2: { objective: 'attack_base', confidence: 0.8 }
      }
    });
  });

  it('refuses a body that is not a snapshot', async () => {
    const response = await handle_guide_request(post('not json'), client);
    expect(response.status).toBe(400);
  });

  it('reports a failed Jev call as a bad gateway', async () => {
    const failing = { systemOne: async () => { throw new Error('down'); } };
    const response = await handle_guide_request(post(snapshot), failing);
    expect(response.status).toBe(502);
  });
});
