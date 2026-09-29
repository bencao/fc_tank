// Jev guides the enemy side: every few seconds the game sends a snapshot of the
// battlefield and Jev picks an objective for each enemy tank. The tanks' own
// pathfinding still does the driving - Jev only decides where they are headed.

export const OBJECTIVES = {
  attack_base: "Drive toward the player's base (the eagle) and shoot it; destroying it wins the game for the enemy side",
  hunt_player: "Chase the nearest player tank and try to shoot it",
  roam: "Head somewhere else on the map to flank, spread out, or stay unpredictable"
};

const RULES =
  "Battle City. Enemy tanks win by destroying the player's base or all player tanks. " +
  "The map is a 13x13 tile grid; x grows rightward, y grows downward, the base sits at the bottom centre. " +
  "Distances are in tiles.";

export function build_guide_request(snapshot) {
  const state = { rules: RULES, ...snapshot };
  const questions = {};
  snapshot.enemies.forEach((enemy, i) => {
    questions[enemy.id] = {
      type: "choice",
      instructions:
        `Which objective should enemy tank \`enemies[${i}]\` pursue for the next few seconds ` +
        "so that the enemy side is most likely to win?",
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

  return {
    base: { x: tile(body?.base?.x), y: tile(body?.base?.y) },
    players: tanks(body?.players, { x: tile, y: tile, level: tile }),
    enemies: tanks(body?.enemies, {
      type: word,
      x: tile,
      y: tile,
      hp: tile,
      distance_to_base: tile,
      distance_to_nearest_player: tile
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
