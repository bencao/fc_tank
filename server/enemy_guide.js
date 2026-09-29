// Jev guides the enemy side: every few seconds the game sends a snapshot of the
// battlefield and Jev picks an objective for each enemy tank. The tanks' own
// pathfinding still does the driving - Jev only decides where they are headed.

export const OBJECTIVES = {
  get_power_up: "Drive to the power-up on the map and pick it up before a player tank does",
  hunt_player: "Chase the nearest player tank and shoot it",
  attack_base: "Drive toward the player's base (the eagle) and shoot it",
  roam: "Head somewhere else on the map to flank, spread out, or stay unpredictable"
};

// What each power-up does if an enemy tank picks it up (see src/objects/gifts.js).
// Kept here so the browser only ever names a power-up, never describes it.
const POWER_UP_EFFECTS = {
  gun: "Upgrades the enemy tank's gun two levels",
  star: "Upgrades the enemy tank's gun one level",
  hat: "Gives the enemy tank 5 more hit points",
  ship: "Lets the enemy tank drive over water",
  life: "Gives every enemy tank 5 more hit points",
  clock: "Freezes every player tank for a while",
  shovel: "Tears down the walls around the player's base for a while",
  land_mine: "Destroys every player tank at once"
};

// How the enemy side should weigh the objectives, most important first.
const ENEMY_PRIORITIES = [
  "Grab any power-up on the map before a player tank can; the nearest enemy tanks should go for it",
  "Attack the player tanks: chase them down and shoot them",
  "Attack the player's base only when the player tanks are out of reach"
];

const RULES =
  "Battle City. Enemy tanks win by destroying the player's base or all player tanks. " +
  "The map is a 13x13 tile grid; x grows rightward, y grows downward, the base sits at the bottom centre. " +
  "Distances are in tiles.";

export function build_guide_request(snapshot) {
  const state = {
    rules: RULES,
    enemy_priorities: ENEMY_PRIORITIES,
    ...snapshot,
    power_ups: snapshot.power_ups.map(power_up => ({ ...power_up, effect: POWER_UP_EFFECTS[power_up.type] }))
  };
  const questions = {};
  snapshot.enemies.forEach((enemy, i) => {
    questions[enemy.id] = {
      type: "choice",
      instructions:
        `Which objective should enemy tank \`enemies[${i}]\` pursue for the next few seconds ` +
        "so that the enemy side follows `enemy_priorities` and is most likely to win?",
      criteria: OBJECTIVES
    };
  });
  return { state, questions };
}

export async function guide_enemies(client, snapshot) {
  if (snapshot.enemies.length === 0) {
    return {};
  }
  const response = await client.systemOne(build_guide_request(snapshot));
  const guidance = {};
  for (const [id, answer] of Object.entries(response.answers)) {
    guidance[id] = { objective: answer.choice, confidence: answer.confidence };
  }
  return guidance;
}

// Anything can POST to the endpoint, so only a battlefield-shaped body with a
// bounded number of tanks is passed on - rebuilt field by field, so stray text
// never reaches the model.
const MAX_TANKS = 20;

export function parse_snapshot(body) {
  const tile = value => {
    if (!Number.isFinite(value)) throw new Error("expected a number");
    return value;
  };
  const power_up_type = value => {
    if (!Object.hasOwn(POWER_UP_EFFECTS, value)) throw new Error("expected a known power-up");
    return value;
  };
  const tanks = (list, fields) => {
    if (!Array.isArray(list) || list.length > MAX_TANKS) throw new Error("expected a short list of tanks");
    return list.map(tank => {
      if (typeof tank?.id !== "string" || tank.id.length > 8) throw new Error("expected a tank id");
      const parsed = { id: tank.id };
      for (const [field, parse] of Object.entries(fields)) parsed[field] = parse(tank[field]);
      return parsed;
    });
  };
  const word = value => {
    if (typeof value !== "string" || !/^[a-z0-9_]{1,16}$/.test(value)) throw new Error("expected a word");
    return value;
  };

  const power_ups = list => {
    if (!Array.isArray(list) || list.length > MAX_TANKS) throw new Error("expected a short list of power-ups");
    return list.map(power_up => ({ type: power_up_type(power_up?.type), x: tile(power_up.x), y: tile(power_up.y) }));
  };

  return {
    base: { x: tile(body?.base?.x), y: tile(body?.base?.y) },
    players: tanks(body?.players, { x: tile, y: tile, level: tile }),
    power_ups: power_ups(body?.power_ups),
    enemies: tanks(body?.enemies, {
      type: word,
      x: tile,
      y: tile,
      hp: tile,
      distance_to_base: tile,
      distance_to_nearest_player: tile,
      distance_to_power_up: tile
    })
  };
}

export async function handle_guide_request(request, client) {
  let snapshot;
  try {
    snapshot = parse_snapshot(await request.json());
  } catch {
    return Response.json({ error: "expected a battlefield snapshot" }, { status: 400 });
  }
  try {
    return Response.json({ guidance: await guide_enemies(client, snapshot) });
  } catch (error) {
    console.error("enemy guide: Jev call failed", error);
    return Response.json({ error: "guidance unavailable" }, { status: 502 });
  }
}

// Guidance is asked for again every couple of seconds, so a slow or failed
// call is better dropped than retried - the next tick asks afresh.
export function create_guide_client(TypeSafeClient) {
  return new TypeSafeClient({ timeout: 1500, retry: { maxRetries: 0 } });
}
