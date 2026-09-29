// Asks Jev (through /api/enemy-guide) which objective each enemy tank should
// pursue, and hands the answers to the tanks' commanders. The commanders keep
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

export function battlefield_snapshot(map) {
  const home = map.home();
  const base = home ? { x: tile(home.area.x1), y: tile(home.area.y1) } : { x: 6, y: 12 };
  const players = map
    .user_tanks()
    .filter(tank => !tank.destroyed)
    .map(tank => ({
      id: tank.type() === "user_p1" ? "p1" : "p2",
      x: tile(tank.area.x1),
      y: tile(tank.area.y1),
      level: tank.level
    }));
  const enemies = map
    .enemy_tanks()
    .filter(tank => !tank.destroyed)
    .map(tank => {
      const at = { x: tile(tank.area.x1), y: tile(tank.area.y1) };
      const nearest_player = Math.min(...players.map(player => distance(at, player)));
      return {
        id: id_of(tank),
        type: tank.type(),
        ...at,
        hp: tank.hp,
        distance_to_base: distance(at, base),
        // No player on the field - say so with a distance larger than the map.
        distance_to_nearest_player: Number.isFinite(nearest_player) ? nearest_player : 99
      };
    });
  return { base, players, enemies };
}

export class EnemyGuide {
  static interval = 2000;

  constructor(map, { fetch = globalThis.fetch.bind(globalThis) } = {}) {
    this.map = map;
    this.fetch = fetch;
    this.in_flight = false;
    this.run = 0;
  }

  start() {
    this.stop();
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
    const tanks = new Map(this.map.enemy_tanks().map(tank => [id_of(tank), tank]));
    let guidance;
    try {
      const response = await this.fetch("/api/enemy-guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(battlefield_snapshot(this.map))
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
