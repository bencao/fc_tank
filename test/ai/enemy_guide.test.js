import { describe, it, expect, vi, afterEach } from 'vitest';
import { battlefield_snapshot, EnemyGuide } from '../../src/ai/enemy_guide.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';

function makeMap() {
  const enemy = (type, x, y, hp) => ({
    type: () => type, area: new MapArea2D(x, y, x + 40, y + 40), hp, destroyed: false,
    commander: { follow(objective) { this.objective = objective; } }
  });
  const enemies = [enemy('fish', 0, 0, 2), enemy('strong', 240, 400, 4)];
  const players = [{
    type: () => 'user_p1', area: new MapArea2D(160, 480, 200, 520), level: 2, destroyed: false,
    commander: { follow(objective) { this.objective = objective; } }
  }];
  const gifts = [{ type: () => 'star', area: new MapArea2D(120, 240, 160, 280), destroyed: false }];
  return {
    enemies,
    players,
    gifts,
    home: () => ({ area: new MapArea2D(240, 480, 280, 520) }),
    hidden_in_grass: () => false,
    enemy_tanks: () => enemies,
    user_tanks: () => players
  };
}

describe('battlefield_snapshot', () => {
  it('describes the base and every tank in tiles, with distances worked out', () => {
    const map = makeMap();

    const snapshot = battlefield_snapshot(map);

    expect(snapshot.base).toEqual({ x: 6, y: 12 });
    expect(snapshot.players).toEqual([
      { id: 'p1', x: 4, y: 12, level: 2, distance_to_nearest_enemy: 4, distance_to_power_up: 7 }
    ]);
    expect(snapshot.power_ups).toEqual([{ type: 'star', x: 3, y: 6 }]);
    expect(snapshot.enemies).toHaveLength(2);
    expect(snapshot.enemies[1]).toMatchObject({
      type: 'strong', x: 6, y: 10, hp: 4, distance_to_base: 2, distance_to_nearest_player: 4, distance_to_power_up: 7
    });
    // Ids stay the same from one snapshot to the next.
    expect(battlefield_snapshot(map).enemies.map(e => e.id)).toEqual(snapshot.enemies.map(e => e.id));
  });
});

describe('battlefield_snapshot with a player hiding in grass', () => {
  it('tells Jev the player is hiding, but not where', () => {
    const map = makeMap();
    map.hidden_in_grass = tank => tank === map.players[0];

    const snapshot = battlefield_snapshot(map);

    expect(snapshot.players).toEqual([
      { id: 'p1', hidden_in_grass: true, level: 2, distance_to_nearest_enemy: 4, distance_to_power_up: 7 }
    ]);
    expect(snapshot.enemies.map(e => e.distance_to_nearest_player)).toEqual([99, 99]);
  });
});

describe('EnemyGuide', () => {
  const respond = body => async () => new Response(JSON.stringify(body));

  it('asks for guidance and passes each objective to its tank', async () => {
    const map = makeMap();
    const [fish, strong] = battlefield_snapshot(map).enemies.map(e => e.id);
    const posts = [];
    const fetch = async (url, init) => {
      posts.push({ url, body: JSON.parse(init.body) });
      return respond({ guidance: {
        [fish]: { objective: 'roam', confidence: 0.6 },
        [strong]: { objective: 'attack_base', confidence: 0.9 }
      } })();
    };

    await new EnemyGuide(map, { fetch }).tick();

    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe('/api/enemy-guide');
    expect(posts[0].body.enemies).toHaveLength(2);
    expect(map.enemies.map(t => t.commander.objective)).toEqual(['roam', 'attack_base']);
  });

  it('says who it wants guided, and steers the demo player tank with its answer', async () => {
    const map = makeMap();
    const posts = [];
    const fetch = async (url, init) => {
      posts.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ guidance: { p1: { objective: 'defend_base', confidence: 0.8 } } }));
    };

    const guide = new EnemyGuide(map, { fetch });
    guide.guided = { enemies: false, players: true };
    await guide.tick();

    expect(posts[0].guide).toEqual({ enemies: false, players: true });
    expect(map.players[0].commander.objective).toBe('defend_base');
  });

  it('leaves the tanks to their own devices when guidance is unavailable', async () => {
    const map = makeMap();
    const offline = async () => { throw new TypeError('network down'); };
    const bad_gateway = async () => new Response('{"error":"guidance unavailable"}', { status: 502 });

    await new EnemyGuide(map, { fetch: offline }).tick();
    await new EnemyGuide(map, { fetch: bad_gateway }).tick();

    expect(map.enemies.map(t => t.commander.objective)).toEqual([undefined, undefined]);
  });

  describe('on a schedule', () => {
    afterEach(() => vi.useRealTimers());

    it('asks every 2 seconds, never overlaps, and ignores answers that arrive after stopping', async () => {
      vi.useFakeTimers();
      const map = makeMap();
      const [fish] = battlefield_snapshot(map).enemies.map(e => e.id);
      const pending = [];
      const fetch = () => new Promise(resolve => pending.push(resolve));
      const guide = new EnemyGuide(map, { fetch });

      guide.start();
      await vi.advanceTimersByTimeAsync(1999);
      expect(pending).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(pending).toHaveLength(1);

      // Still waiting on the first answer - the next tick does not pile on.
      await vi.advanceTimersByTimeAsync(2000);
      expect(pending).toHaveLength(1);

      guide.stop();
      pending[0](new Response(JSON.stringify({ guidance: { [fish]: { objective: 'roam', confidence: 1 } } })));
      await vi.advanceTimersByTimeAsync(4000);

      expect(pending).toHaveLength(1);
      expect(map.enemies[0].commander.objective).toBeUndefined();
    });
  });

  describe('when the Jev call budget is spent', () => {
    afterEach(() => vi.useRealTimers());

    it('drops every Jev objective and stops asking until the budget resets', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-28T23:00:00Z'));
      const map = makeMap();
      map.enemies[0].commander.follow('attack_base');
      map.players[0].commander.follow('hunt_enemy');
      let asked = 0;
      const fetch = async () => {
        asked += 1;
        return new Response('{"error":"Jev call budget spent for today"}', {
          status: 429, headers: { 'retry-after': '3600' }
        });
      };
      const guide = new EnemyGuide(map, { fetch });
      guide.guided = { enemies: true, players: true };

      await guide.tick();
      expect(map.enemies[0].commander.objective).toBeNull();
      expect(map.players[0].commander.objective).toBeNull();

      await guide.tick();
      expect(asked).toBe(1);

      vi.setSystemTime(new Date('2026-09-29T00:00:01Z'));
      await guide.tick();
      expect(asked).toBe(2);
    });
  });
});
