# FC Tank

Classic FC game "Battle City", built with web technologies

## Play the game

Go play at [The Game](https://fc-tank.bencao.it)

## Development

```bash
npm install
npm run dev
```

Turn the difficulty dial on the start screen with LEFT / RIGHT (UP / DOWN or
SPACE picks 1P / 2P / FRIENDS PLAY):

- **EASY / NORMAL** - the classic built-in AI, with enemies that often (EASY)
  or sometimes (NORMAL) sit idle or head the wrong way
- **HARD** - the classic AI without blunders; enemies shoot on sight (after a
  300ms reaction) and take one extra hit, and you start in the level-2 tank
- **NIGHTMARE** - enemies guided by [TypeSafe](https://typesafe.ai)'s Jev
  model: every 2 seconds the battle sends a snapshot to `/api/enemy-guide`,
  and Jev picks each enemy's objective - grab a power-up, hunt a player,
  attack the base, or roam - with HARD's other rules on top

At every level, player tanks move, shoot and reload 1.2x faster than the
enemies - enough to win a one-on-one, not to take on several at once. Hide in
grass (a tank at least three quarters covered) and the enemies lose track of
you: they can't see you to shoot or hunt you, and Jev isn't told where you are. The
levels live in `src/difficulty.js`.

Leave the start screen idle and a demo plays, with Jev steering the AI player
tank - grab the power-up, hunt an enemy, or fall back to guard the base.

NIGHTMARE and the demo need a TypeSafe API key. Put it in `.env.local` (git-ignored) - and
in the Vercel project's environment for deploys:

```bash
TYPESAFE_API_KEY=...
```

Without a key the endpoint fails and the tanks fall back to their built-in AI.

Jev calls are capped at 5,000 per UTC day (set `JEV_DAILY_CALL_BUDGET` to
change it), counted in the Upstash Redis store connected to the Vercel project
(`KV_REST_API_URL` / `KV_REST_API_TOKEN`). Once the day's budget is spent the
endpoint answers `429`, and every tank goes back to its built-in AI until
midnight UTC. Without a store (local dev) calls are counted per process.

## Friends play

Pick **FRIENDS PLAY** on the start screen to play two-player co-op with a
friend in another browser. The game opens a room and shows an invitation link
(`/?join=CODE`) under the TV, copied for you. When your friend opens it, you
are connected peer to peer (WebRTC), and ENTER starts the game. Both of you
play on the 1P keys, arrows and Z. You run the battle; your friend's screen
mirrors yours, and their keys drive the 2P tank.

After a game over each friend enters their initials on their own screen, and
the run goes on the leaderboard as one team entry, `ABC&XYZ`, with your
combined score.

The two browsers find each other through `/api/room`. It keeps each room's
connection offer and answer for 30 minutes in the same Upstash Redis store as
the leaderboard (in memory without one). There is no TURN relay, so two
players behind strict NATs may not be able to connect. The design is in
`docs/superpowers/specs/2026-09-29-friends-play-design.html`.

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Credits

The arcade shell uses [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
by CodeMan38, self-hosted from `public/fonts/` under the SIL Open Font License
(see `public/fonts/OFL.txt`).

## Contribute

Dear guys, you're highly welcome to contribute to this project~

### A brief introduction of how this game was developed

Please check the [Blog Post](https://medium.com/@benb88/game-develop-in-html5-canvas-and-coffeescript-b68f7e5c0e86) for a story behind the scene.
