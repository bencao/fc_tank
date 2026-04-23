# FC Tank Modernization Design

## Overview

Modernize the FC Tank project (classic "Battle City" clone) by switching to Vercel deployment, fixing bugs, updating dependencies, removing CoffeeScript artifacts, and adding proper unit tests. The game was originally written in CoffeeScript and transpiled to ES6 modules. It uses KineticJS (canvas), lodash, jQuery, and Howler.

**Approach:** Moderate modernization (Option B) - keep KineticJS since it works, replace jQuery with native DOM APIs, replace lodash with native JS, update Howler via npm, add Vite as build tool.

**Execution order:** Approach B - safe changes first, then riskier dependency changes, then tests last.

## Section 1: Project Tooling & Deployment

### Vite as build tool
- Add `vite` and `vitest` as dev dependencies
- Create minimal `vite.config.js`
- `index.html` at project root is the Vite entry point (already has `<script type="module">`)
- Remove Grunt toolchain: `grunt`, `grunt-cli`, `grunt-coffeelint`, `grunt-contrib-qunit`
- Remove `.travis.yml` (dead CI config targeting Node 0.8/0.10)

### Vercel deployment
- Add `vercel.json` with static site config (build: `vite build`, output: `dist`)
- Update README: replace Netlify badge/link with Vercel
- Keep Dockerfile as-is (still useful for local/alternative deploys)

## Section 2: Bug Fixes

1. **`LifeGift.apply()`** - iterates with parameter `enemy_tank` but references undefined `tank` inside the loop. Fix: use the correct loop variable.

2. **`BattleFieldScene.integration()`** - missile integration loop appears twice per frame, causing missiles to move at 2x speed. Fix: remove the duplicate loop.

3. **`$.ajax` with `async: false`** in `BattleFieldScene` for loading `terrains.json`. Fix: use Vite's JSON import (`import terrains from '../data/terrains.json'`) to eliminate async loading entirely.

4. **`IronTerrain.weight()`** - returns `undefined` for tank power >= 3 (should return a finite weight since power 3 can destroy iron). Fix: add the missing case.

5. **Gift random selection** - uses `parseInt(Math.random() * 1000) % size` which introduces modulo bias. Fix: use `Math.floor(Math.random() * size)`.

6. **`Map2D.shortest_path()` reversed weight heuristic** - investigate whether the inverted key (`this.infinity - weight`) is intentional or a bug. Fix if broken.

## Section 3: CoffeeScript Cleanup & jQuery Removal

### CoffeeScript patterns
1. **`initClass()` anti-pattern** in 12+ classes - convert to ES6 static class fields
2. **`Array.from()` destructuring** - `const [a, b] = Array.from([b, a])` becomes `[a, b] = [b, a]` (~6 files)
3. **Delete `js/coffeescript-v1.6.2.min.js`** - unused runtime

### jQuery removal
jQuery is used in exactly two places:
- `engine/keyboard.js`: `$(document).bind('keyup/keydown')` -> `document.addEventListener()`
- `BattleFieldScene`: `$.ajax()` for terrains.json -> Vite JSON import

Delete `js/jquery-v1.9.1.min.js` and its `<script>` tag.

### Lodash removal
Replace ~20 lodash functions with native JS equivalents:

| lodash | native |
|--------|--------|
| `_.each(arr, fn)` | `arr.forEach(fn)` |
| `_.select(arr, fn)` | `arr.filter(fn)` |
| `_.detect(arr, fn)` | `arr.find(fn)` |
| `_.contains(arr, v)` | `arr.includes(v)` |
| `_.isEmpty(x)` | `!x` or `x.length === 0` or `Object.keys(x).length === 0` |
| `_.max/_.min(arr)` | `Math.max/min(...arr)` |
| `_.range(n)` | `Array.from({length: n}, (_, i) => i)` |
| `_.compact(arr)` | `arr.filter(Boolean)` |
| `_.without(arr, v)` | `arr.filter(x => x !== v)` |
| `_.size(obj)` | `Object.keys(obj).length` or `.length` |
| `_.first(arr)` | `arr[0]` |
| `_.cloneDeep(obj)` | `structuredClone(obj)` |
| `_.has(obj, k)` | `k in obj` |
| `_.isArray(x)` | `Array.isArray(x)` |
| `_.isNull(x)` | `x === null` |
| `_.union(a, b)` | `[...new Set([...a, ...b])]` |
| `_.uniq(arr)` | `[...new Set(arr)]` |
| `_.forIn(obj, fn)` | `Object.entries(obj).forEach(([k,v]) => fn(v,k))` |

Delete `js/lodash-v1.2.1.min.js` and its `<script>` tag.

## Section 4: Dependency Updates & Module System

### Howler.js
- Remove checked-in `js/howler-v1.1.5.min.js`
- Install `howler` via npm (v2.2.x)
- Update `engine/sound.js` to `import { Howl } from 'howler'`

### KineticJS
- Keep as-is (abandoned, no npm package, replacing with Konva is out of scope)
- Move `js/kinetic-v4.5.1.min.js` to `vendor/kinetic.min.js`
- Load as side-effect global (KineticJS sets `window.Kinetic`)

### Module system cleanup
- Remove all vendor `<script>` tags from `index.html` except the single `<script type="module">` entry point
- Vite handles bundling through the import graph
- `terrains.json` imported via Vite's JSON support (`import terrains from '../data/terrains.json'`)

### Files to delete
- `js/coffeescript-v1.6.2.min.js`
- `js/jquery-v1.9.1.min.js`
- `js/lodash-v1.2.1.min.js`
- `js/howler-v1.1.5.min.js`
- `js/kinetic-v4.5.1.min.js` (moved to `vendor/`)
- `demos/` directory (stale demo files)
- `test/index.html`, `test/lib/` (replaced by Vitest)

## Section 5: Tests

### Framework
Vitest - integrates natively with Vite, supports ES modules, fast.

### Test strategy
Unit tests for core game logic that doesn't depend on KineticJS rendering. The rendering layer (views, KineticJS sprites) is tightly coupled to the canvas and not worth mocking.

### What to test

1. **`Game`** - config/status management, stage cycling, score tracking, scene switching
2. **`Direction`** - enum values, `all()`
3. **`MapArea2D`** - collision detection, area math (intersect, collide, sub, extend, equals, center, clone)
4. **`MapArea2DVertex`** - vertex initialization, sibling management, A* weight
5. **`BinomialHeap`** - insert, extract_min, decrease_key, union, merge
6. **`Terrain` classes** - defend(), accept(), weight() per tank power
7. **`Tank` classes** - dead(), level_up(), hp_down(), fire() conditions, freeze(), animation state
8. **`Missile`** - attack() energy/defend logic, destroy_area()
9. **`Gift` classes** - apply() effects (especially fixed LifeGift)
10. **`Commander` classes** - command generation, direction_changed(), AI vertex/offset logic
11. **`TiledMapBuilder`** - typeToClass() mapping, stage setup from JSON

### What NOT to test
- Views (KineticJS rendering)
- Sound (Howler playback)
- Keyboard (DOM events)
- Full game loop integration

### Test structure
```
test/
  game.test.js
  constants.test.js
  engine/
    data_structures.test.js
  map/
    map_area_2d.test.js
    map_area_2d_vertex.test.js
    terrains.test.js
    tiled_map_builder.test.js
  objects/
    tanks.test.js
    missile.test.js
    gifts.test.js
    commanders.test.js
```

### npm scripts
- `npm test` -> `vitest run`
- `npm run test:watch` -> `vitest`
- `npm run dev` -> `vite`
- `npm run build` -> `vite build`
- `npm run preview` -> `vite preview`
