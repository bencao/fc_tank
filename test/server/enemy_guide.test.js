import { describe, it, expect } from 'vitest';
import { build_guide_request, guide_enemies, parse_snapshot, handle_guide_request } from '../../server/enemy_guide.js';

const snapshot = {
  guide: { enemies: true, players: false },
  base: { x: 6, y: 12 },
  players: [{ id: 'p1', x: 4, y: 12, level: 1, distance_to_nearest_enemy: 11, distance_to_power_up: 7 }],
  power_ups: [{ type: 'star', x: 3, y: 6 }],
  enemies: [
    { id: 'e1', type: 'fish', x: 0, y: 0, hp: 2, distance_to_base: 18, distance_to_nearest_player: 16, distance_to_power_up: 9 },
    { id: 'e2', type: 'strong', x: 6, y: 3, hp: 4, distance_to_base: 9, distance_to_nearest_player: 11, distance_to_power_up: 6 }
  ]
};

describe('build_guide_request', () => {
  it('asks one objective choice per enemy tank, keyed by its id', () => {
    const { questions } = build_guide_request(snapshot);

    expect(Object.keys(questions)).toEqual(['e1', 'e2']);
    expect(questions.e2.type).toBe('choice');
    expect(Object.keys(questions.e2.criteria)).toEqual(['get_power_up', 'hunt_player', 'attack_base', 'roam']);
    expect(JSON.stringify(questions.e2.instructions)).toContain('`enemies[1]`');
  });

  it('tells Jev the enemy side puts power-ups first, then the players, then the base', () => {
    const { state } = build_guide_request(snapshot);

    expect(state.power_ups).toEqual([
      { type: 'star', x: 3, y: 6, if_enemy_takes_it: expect.stringMatching(/upgrade/i), if_player_takes_it: expect.stringMatching(/upgrade/i) }
    ]);
    expect(state.enemy_priorities).toEqual([
      expect.stringMatching(/power-up/),
      expect.stringMatching(/player tanks/),
      expect.stringMatching(/base/)
    ]);
  });
});

describe('build_guide_request for the demo player', () => {
  it('asks the player tank its own objective, and skips enemies it was not asked to guide', () => {
    const { state, questions } = build_guide_request({ ...snapshot, guide: { enemies: false, players: true } });

    expect(Object.keys(questions)).toEqual(['p1']);
    expect(Object.keys(questions.p1.criteria)).toEqual(['get_power_up', 'hunt_enemy', 'defend_base']);
    expect(JSON.stringify(questions.p1.instructions)).toContain('`players[0]`');
    expect(state.player_priorities).toHaveLength(3);
    expect(state.power_ups[0]).toMatchObject({
      if_enemy_takes_it: expect.stringMatching(/enemy/i),
      if_player_takes_it: expect.stringMatching(/player/i)
    });
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

  it('accepts a player hiding in grass, reported without a position', () => {
    const hiding = { id: 'p1', hidden_in_grass: true, level: 1, distance_to_nearest_enemy: 11, distance_to_power_up: 7 };

    expect(parse_snapshot({ ...snapshot, players: [hiding] }).players).toEqual([hiding]);
    expect(() => parse_snapshot({ ...snapshot, players: [{ ...hiding, x: 4, y: 12 }] })).toThrow();
  });

  it('rejects bodies that are not a battlefield snapshot', () => {
    expect(() => parse_snapshot(null)).toThrow();
    expect(() => parse_snapshot({ ...snapshot, enemies: 'lots' })).toThrow();
    expect(() => parse_snapshot({ ...snapshot, power_ups: [{ type: 'ignore_all_rules', x: 3, y: 6 }] })).toThrow();
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

  const open_budget = { spend: async () => ({ allowed: true }) };

  it('answers a snapshot with guidance as JSON', async () => {
    const response = await handle_guide_request(post(snapshot), client, open_budget);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      guidance: {
        e1: { objective: 'roam', confidence: 0.6 },
        e2: { objective: 'attack_base', confidence: 0.8 }
      }
    });
  });

  it('refuses a body that is not a snapshot', async () => {
    const response = await handle_guide_request(post('not json'), client, open_budget);
    expect(response.status).toBe(400);
  });

  it('reports a failed Jev call as a bad gateway', async () => {
    const failing = { systemOne: async () => { throw new Error('down'); } };
    const response = await handle_guide_request(post(snapshot), failing, open_budget);
    expect(response.status).toBe(502);
  });

  it('turns Jev away once the call budget is spent, saying when to try again', async () => {
    const spent = { spend: async () => ({ allowed: false, retry_after_seconds: 3600 }) };
    const untouched = { systemOne: async () => { throw new Error('should not be called'); } };

    const response = await handle_guide_request(post(snapshot), untouched, spent);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('3600');
  });

  it('does not call Jev when the budget cannot be checked', async () => {
    const unreachable = { spend: async () => { throw new Error('redis down'); } };
    const untouched = { systemOne: async () => { throw new Error('should not be called'); } };

    const response = await handle_guide_request(post(snapshot), untouched, unreachable);

    expect(response.status).toBe(503);
  });

  it('charges nothing when there is nobody to guide', async () => {
    let charged = 0;
    const counting = { spend: async () => { charged += 1; return { allowed: true }; } };

    await handle_guide_request(post({ ...snapshot, enemies: [] }), client, counting);

    expect(charged).toBe(0);
  });
});
