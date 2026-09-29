// Asks Jev (through /api/enemy-guide) which objective each enemy tank - and, in
// the demo, the AI-driven player tank - should pursue, and hands the answers
// to the tanks' commanders. The commanders keep
// doing the driving; this only tells them where to head.

const TILE = 40;

// Stable, short ids so answers can be matched back to tanks. A WeakMap keeps
// the tanks themselves free of guide bookkeeping.
const tank_ids = new WeakMap();
let next_tank_id = 1;

function id_of(tank) {
  if (!tank_ids.has(tank)) {
    tank_ids.set(tank, `e${next_tank_id++}`);
  }
  return tank_ids.get(tank);
}

const tile = value => value / TILE;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function battlefield_snapshot(map, guide = { enemies: true, players: false }) {
  const home = map.home();
  const base = home ? { x: tile(home.area.x1), y: tile(home.area.y1) } : { x: 6, y: 12 };
  const power_ups = map.gifts
    .filter(gift => !gift.destroyed)
    .map(gift => ({ type: gift.type(), x: tile(gift.area.x1), y: tile(gift.area.y1) }));
  const nearest = (from, targets) => {
    const closest = Math.min(...targets.map(target => distance(from, target)));
    // Nothing there - say so with a distance larger than the map.
    return Number.isFinite(closest) ? closest : 99;
  };
  const on_field = tanks => tanks.filter(tank => !tank.destroyed);
  const tile_of = tank => ({ x: tile(tank.area.x1), y: tile(tank.area.y1) });
  const players = on_field(map.user_tanks()).map(tank => {
    const at = tile_of(tank);
    return {
      id: player_id(tank),
      ...at,
      level: tank.level,
      distance_to_nearest_enemy: nearest(at, on_field(map.enemy_tanks()).map(tile_of)),
      distance_to_power_up: nearest(at, power_ups)
    };
  });
  const enemies = on_field(map.enemy_tanks()).map(tank => {
    const at = tile_of(tank);
    return {
      id: id_of(tank),
      type: tank.type(),
      ...at,
      hp: tank.hp,
      distance_to_base: distance(at, base),
      distance_to_nearest_player: nearest(at, players),
      distance_to_power_up: nearest(at, power_ups)
    };
  });
  return { guide, base, players, power_ups, enemies };
}

const player_id = tank => (tank.type() === "user_p1" ? "p1" : "p2");

export class EnemyGuide {
  static interval = 2000;

  constructor(map, { fetch = globalThis.fetch.bind(globalThis) } = {}) {
    this.map = map;
    this.fetch = fetch;
    // Which side(s) Jev steers; set by start().
    this.guided = { enemies: true, players: false };
    this.in_flight = false;
    this.run = 0;
  }

  start(guided = { enemies: true, players: false }) {
    this.stop();
    this.guided = guided;
    const run = this.run;
    this.timer = setInterval(() => {
      // One question at a time: a late answer is already about a battlefield
      // that has moved on, and a second one would only race it.
      if (this.in_flight) return;
      this.in_flight = true;
      this.tick(run).finally(() => {
        if (run === this.run) this.in_flight = false;
      });
    }, this.constructor.interval);
  }

  // Answers still on their way when the scene pauses or ends are dropped.
  stop() {
    clearInterval(this.timer);
    this.run += 1;
    this.in_flight = false;
  }

  async tick(run = this.run) {
    const tanks = new Map([
      ...this.map.enemy_tanks().map(tank => [id_of(tank), tank]),
      ...this.map.user_tanks().map(tank => [player_id(tank), tank])
    ]);
    let guidance;
    try {
      const response = await this.fetch("/api/enemy-guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(battlefield_snapshot(this.map, this.guided))
      });
      if (!response.ok) {
        return;
      }
      ({ guidance } = await response.json());
    } catch {
      // Offline or no guide deployed: the tanks' own iq keeps them going.
      return;
    }
    if (run !== this.run) {
      return;
    }
    for (const [id, { objective }] of Object.entries(guidance)) {
      tanks.get(id)?.commander.follow(objective);
    }
  }
}
