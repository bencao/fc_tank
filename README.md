# FC Tank

Classic FC game "Battle City", built with web technologies

## Play the game

Go play at [The Game](https://fc-tank.bencao.it)

## Development

```bash
npm install
npm run dev
```

Enemy tanks are guided by [TypeSafe](https://typesafe.ai)'s Jev model: every
2 seconds the battle sends a snapshot to `/api/enemy-guide`, and Jev picks an
objective for each enemy (attack the base, hunt a player, or roam). Put your key
in `.env.local` (git-ignored) - and in the Vercel project's environment for
deploys:

```bash
TYPESAFE_API_KEY=...
```

Without a key the endpoint fails and the enemies fall back to their built-in AI.

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
