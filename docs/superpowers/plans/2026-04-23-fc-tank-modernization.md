# FC Tank Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the FC Tank game project with Vite build tooling, Vercel deployment, bug fixes, dependency removal (jQuery/lodash/CoffeeScript), Howler update, and Vitest unit tests.

**Architecture:** Keep KineticJS as a vendor global. Replace jQuery (2 usage sites) and lodash (~60 usage sites) with native JS. Use Vite to bundle ES modules and serve dev. Use Vitest for unit tests that cover game logic without touching the canvas rendering layer.

**Tech Stack:** Vite, Vitest, Howler.js v2 (npm), KineticJS v4.5.1 (vendor global)

---

## File Map

### New files
- `vite.config.js` — Vite configuration
- `vercel.json` — Vercel deployment config
- `vendor/kinetic.min.js` — moved from `js/kinetic-v4.5.1.min.js`
- `public/data/sound/*.mp3` — moved from `data/sound/` (Vite publicDir for runtime assets)
- `public/favicon.ico` — moved from root (Vite publicDir)
- `test/game.test.js`
- `test/constants.test.js`
- `test/engine/data_structures.test.js`
- `test/map/map_area_2d.test.js`
- `test/map/map_area_2d_vertex.test.js`
- `test/map/terrains.test.js`
- `test/map/tiled_map_builder.test.js`
- `test/objects/tanks.test.js`
- `test/objects/missile.test.js`
- `test/objects/gifts.test.js`
- `test/objects/commanders.test.js`

### Files to delete
- `js/coffeescript-v1.6.2.min.js`
- `js/jquery-v1.9.1.min.js`
- `js/lodash-v1.2.1.min.js`
- `js/howler-v1.1.5.min.js`
- `js/kinetic-v4.5.1.min.js` (moved to vendor/)
- `.travis.yml`
- `demos/lib/kinetic-v4.4.1.min.js`
- `demos/lib/ocanvas-v2.3.1.min.js`
- `demos/test_kineticjs.html`
- `demos/test_ocanvas.html`
- `test/index.html`
- `test/lib/qunit-v1.11.0.css`
- `test/lib/qunit-v1.11.0.js`
- `data/sound/` (moved to public/data/sound/)
- `favicon.ico` (moved to public/)

### Files to modify
- `package.json` — replace all dependencies and scripts
- `index.html` — remove vendor script tags, add vendor/kinetic import
- `README.md` — update deployment links and test instructions
- `.gitignore` — add `dist/`, `node_modules/`
- `src/bootstrap.js` — import vendor/kinetic
- `src/engine/keyboard.js` — replace jQuery and lodash
- `src/engine/sound.js` — replace lodash, import Howler from npm
- `src/engine/scene.js` — no changes needed
- `src/engine/view.js` — no changes needed
- `src/engine/data_structures.js` — replace Array.from() patterns
- `src/game.js` — replace lodash
- `src/constants.js` — replace initClass patterns
- `src/map/map_area_2d.js` — replace lodash
- `src/map/map_area_2d_vertex.js` — no changes needed
- `src/map/map_unit_2d.js` — replace initClass and lodash
- `src/map/movable_map_unit_2d.js` — replace initClass, lodash, Array.from
- `src/map/map_2d.js` — replace lodash, Array.from
- `src/map/terrains.js` — replace initClass, lodash, Array.from, fix IronTerrain.weight()
- `src/map/tiled_map_builder.js` — replace lodash, Array.from
- `src/objects/tanks.js` — replace initClass, lodash, Array.from
- `src/objects/missile.js` — replace initClass, lodash
- `src/objects/gifts.js` — replace initClass, lodash, fix LifeGift bug
- `src/objects/commanders.js` — replace lodash, Array.from
- `src/scenes/battle_field_scene.js` — replace lodash, jQuery ajax, fix duplicate missile integration, fix random selection
- `src/scenes/report_scene.js` — replace lodash
- `src/views/welcome_view.js` — replace lodash, Array.from
- `src/views/battle_field_view.js` — replace lodash

---

## Task 1: Set Up Vite and Project Tooling

**Files:**
- Create: `vite.config.js`
- Create: `vercel.json`
- Create: `vendor/kinetic.min.js` (moved from js/)
- Modify: `package.json`
- Modify: `index.html`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `src/bootstrap.js`
- Delete: `js/coffeescript-v1.6.2.min.js`, `js/jquery-v1.9.1.min.js`, `js/lodash-v1.2.1.min.js`, `js/howler-v1.1.5.min.js`, `js/kinetic-v4.5.1.min.js`
- Delete: `.travis.yml`
- Delete: `demos/` directory
- Delete: `test/index.html`, `test/lib/`

- [ ] **Step 1: Move KineticJS to vendor directory and sound files to public/**

```bash
mkdir -p vendor
mv js/kinetic-v4.5.1.min.js vendor/kinetic.min.js
mkdir -p public/data/sound
mv data/sound/*.mp3 public/data/sound/
mv favicon.ico public/
```

Sound files must be in `public/` because they are referenced dynamically at runtime by Howler (Vite can't statically analyze dynamic URLs). Vite's publicDir serves these in dev and copies them to dist on build. The `data/terrains.json` stays in `data/` because it's imported at build time via Vite's JSON import.

- [ ] **Step 2: Delete old files**

```bash
rm js/coffeescript-v1.6.2.min.js js/jquery-v1.9.1.min.js js/lodash-v1.2.1.min.js js/howler-v1.1.5.min.js
rm .travis.yml
rm -rf demos
rm test/index.html
rm -rf test/lib
rmdir js
rm -rf data/sound
```

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 4: Create vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

- [ ] **Step 5: Rewrite package.json**

```json
{
  "name": "fc_tank",
  "version": "1.0.0",
  "description": "Classic FC game Battle City, built with web technologies",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/bencao/fc_tank.git"
  },
  "keywords": ["fc", "tank", "battle-city", "game"],
  "author": "Ben Cao",
  "license": "MIT",
  "devDependencies": {
    "vite": "^6",
    "vitest": "^3"
  },
  "dependencies": {
    "howler": "^2.2.4"
  }
}
```

- [ ] **Step 6: Update index.html — remove all vendor script tags, import KineticJS via module**

Replace the full `<head>` script block and the bottom script tag. The new `index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
    <title>
      FC Tank - Classic Battle City built with web technologies
    </title>
    <style type="text/css">
      #tank_sprite {
        display: none;
      }
      #canvas {
        background: #000;
        width: 600px;
        height: 520px;
      }
      #game_instructions {
        padding: 2em;
      }
      #row {
        display: flex;
      }
      body {
        background: #999;
      }
      strong {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <img
      id="tank_sprite"
      alt="tanks"
      width="400"
      height="360"
      src="image/tanks.png"
    />
    <div id="row">
      <div id="canvas"></div>
      <div id="game_instructions">
        <dl class="p1">
          <dt>P1 Control</dt>
          <dd>Press keyboard <strong>UP, DOWN, LEFT, RIGHT</strong> to move</dd>
          <dd>Press keyboard <strong>Z</strong> to fire</dd>
          <dd>
            Press keyboard <strong>SPACE</strong> to toggle 1 user or 2 users
            mode
          </dd>
          <dd>
            Press keyboard <strong>ENTER</strong> to start game or toggle game
            start/pause
          </dd>
        </dl>
        <dl class="p2">
          <dt>P2 Control</dt>
          <dd>Press keyboard <strong>W, S, A, D</strong> to move</dd>
          <dd>Press keyboard <strong>J</strong> to fire</dd>
        </dl>
      </div>
    </div>
    <script type="module" src="src/bootstrap.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Update src/bootstrap.js to import KineticJS vendor file**

```js
import "../vendor/kinetic.min.js";
import { Game } from "./game.js";

(function() {
  const game = new Game();
  window.game = game;
  window.welcome_scene = game.scenes["welcome"];
  window.stage_scene = game.scenes["stage"];
  window.battle_field_scene = game.scenes["battle_field"];
  window.report_scene = game.scenes["report"];
  return game.kick_off();
}());
```

- [ ] **Step 8: Update .gitignore**

```
node_modules
dist
```

- [ ] **Step 9: Update README.md**

```markdown
# FC Tank

Classic FC game "Battle City", built with web technologies

## Play the game

Go play at [The Game](https://fc-tank.bencao.it)

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Contribute

Dear guys, you're highly welcome to contribute to this project~

### A brief introduction of how this game was developed

Please check the [Blog Post](https://medium.com/@benb88/game-develop-in-html5-canvas-and-coffeescript-b68f7e5c0e86) for a story behind the scene.
```

- [ ] **Step 10: Install dependencies**

```bash
npm install
```

- [ ] **Step 11: Verify Vite starts (will have runtime errors due to lodash/jQuery — that's expected)**

```bash
npx vite --open
```

Verify the dev server starts and index.html loads. Console errors about `_` and `$` being undefined are expected — we fix those in the next tasks.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: set up Vite build tooling and Vercel deployment

Remove Grunt, Travis CI, old vendor JS files, demos, and QUnit test
scaffolding. Add Vite config, Vercel config, and move KineticJS to
vendor directory. Install Howler via npm."
```

---

## Task 2: Bug Fixes

**Files:**
- Modify: `src/objects/gifts.js:131-134` — fix LifeGift variable name
- Modify: `src/scenes/battle_field_scene.js:285-287` — remove duplicate missile integration
- Modify: `src/scenes/battle_field_scene.js:373` — fix random selection bias
- Modify: `src/map/terrains.js:55-62` — fix IronTerrain.weight()
- Modify: `src/map/map_2d.js:79` — fix gift random selection bias

- [ ] **Step 1: Fix LifeGift.apply() bug in src/objects/gifts.js**

Lines 131-134: change `tank.hp_up(5)` and `tank.gift_up(3)` to use the loop variable `enemy_tank`:

```js
// Before (line 131-134):
return _.each(this.map.enemy_tanks(), function(enemy_tank) {
  tank.hp_up(5);
  return tank.gift_up(3);
});

// After:
return _.each(this.map.enemy_tanks(), function(enemy_tank) {
  enemy_tank.hp_up(5);
  return enemy_tank.gift_up(3);
});
```

- [ ] **Step 2: Fix duplicate missile integration in src/scenes/battle_field_scene.js**

Delete the second missile loop at lines 285-287:

```js
// Before (lines 273-294):
integration(offset) {
  const delta_time = Math.round(offset - this.startedAt);

  for (let m of this.map.missiles) {
    m.integration(delta_time);
  }
  for (let g of this.map.gifts) {
    g.integration(delta_time);
  }
  for (let t of this.map.tanks) {
    t.integration(delta_time);
  }
  for (let m of this.map.missiles) {   // <-- DELETE THIS BLOCK
    m.integration(delta_time);          // <-- DELETE
  }                                     // <-- DELETE
  // ...

// After:
integration(offset) {
  const delta_time = Math.round(offset - this.startedAt);

  for (let m of this.map.missiles) {
    m.integration(delta_time);
  }
  for (let g of this.map.gifts) {
    g.integration(delta_time);
  }
  for (let t of this.map.tanks) {
    t.integration(delta_time);
  }
  // ...
```

- [ ] **Step 3: Fix enemy tank random selection in src/scenes/battle_field_scene.js**

Line 373: replace modulo-biased random:

```js
// Before:
const randomed = parseInt(Math.random() * 1000) % _.size(enemy_tank_types);

// After:
const randomed = Math.floor(Math.random() * enemy_tank_types.length);
```

- [ ] **Step 4: Fix gift random selection in src/map/map_2d.js**

Line 79: replace modulo-biased random:

```js
// Before:
const gift_choice = parseInt(Math.random() * 1000) % _.size(gift_classes);

// After:
const gift_choice = Math.floor(Math.random() * gift_classes.length);
```

- [ ] **Step 5: Fix IronTerrain.weight() in src/map/terrains.js**

Lines 55-62: add default case for power >= 3 (power 3 can destroy iron, so it should have a finite weight):

```js
// Before:
weight(tank) {
  switch (tank.power) {
    case 1:
      return this.map.infinity;
    case 2:
      return 20;
  }
}

// After:
weight(tank) {
  switch (tank.power) {
    case 1:
      return this.map.infinity;
    case 2:
      return 20;
    default:
      return 10;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/objects/gifts.js src/scenes/battle_field_scene.js src/map/map_2d.js src/map/terrains.js
git commit -m "fix: fix LifeGift variable bug, duplicate missile integration, random bias, and IronTerrain weight"
```

---

## Task 3: Remove jQuery

**Files:**
- Modify: `src/engine/keyboard.js`

- [ ] **Step 1: Replace jQuery with native DOM APIs in src/engine/keyboard.js**

Full replacement of the file:

```js
export class Keyboard {
  constructor() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    this._keyup_handler = null;
    this._keydown_handler = null;
  }

  reset() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    if (this._keyup_handler) {
      document.removeEventListener("keyup", this._keyup_handler);
      this._keyup_handler = null;
    }
    if (this._keydown_handler) {
      document.removeEventListener("keydown", this._keydown_handler);
      this._keydown_handler = null;
    }
  }

  map_key(code) {
    return ({
      13: 'ENTER',
      32: 'SPACE',
      37: 'LEFT',
      38: 'UP',
      39: 'RIGHT',
      40: 'DOWN',
      65: 'A',
      68: 'D',
      74: 'J',
      83: 'S',
      87: 'W',
      90: 'Z'
    })[code];
  }

  on_key_up(key_or_keys, callback) {
    if (Array.isArray(key_or_keys)) {
      key_or_keys.forEach(key => { this.key_up_callbacks[key] = callback; });
    } else {
      this.key_up_callbacks[key_or_keys] = callback;
    }
    if (this._keyup_handler) {
      document.removeEventListener("keyup", this._keyup_handler);
    }
    this._keyup_handler = event => {
      const key = this.map_key(event.which);
      if (key in this.key_up_callbacks) {
        this.key_up_callbacks[key](event);
        event.preventDefault();
      }
    };
    document.addEventListener("keyup", this._keyup_handler);
  }

  on_key_down(key_or_keys, callback) {
    if (Array.isArray(key_or_keys)) {
      key_or_keys.forEach(key => { this.key_down_callbacks[key] = callback; });
    } else {
      this.key_down_callbacks[key_or_keys] = callback;
    }
    if (this._keydown_handler) {
      document.removeEventListener("keydown", this._keydown_handler);
    }
    this._keydown_handler = event => {
      const key = this.map_key(event.which);
      if (key in this.key_down_callbacks) {
        this.key_down_callbacks[key](event);
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", this._keydown_handler);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/keyboard.js
git commit -m "refactor: replace jQuery with native DOM APIs in keyboard handler"
```

---

## Task 4: Remove Lodash — Engine and Map Layer

**Files:**
- Modify: `src/engine/sound.js`
- Modify: `src/engine/data_structures.js`
- Modify: `src/map/map_area_2d.js`
- Modify: `src/map/map_unit_2d.js`
- Modify: `src/map/movable_map_unit_2d.js`
- Modify: `src/map/map_2d.js`
- Modify: `src/map/terrains.js`
- Modify: `src/map/tiled_map_builder.js`

- [ ] **Step 1: Update src/engine/sound.js — replace lodash, use npm Howler**

```js
import { Howl } from 'howler';

export class Sound {
  constructor() {
    this.bgms_playing = {};
    this.bgms         = {};

    this.supported_events().forEach(event_name => {
      this.bgms_playing[event_name] = false;
      this.bgms[event_name] = new Howl({
        src    : [`data/sound/${event_name}.mp3`],
        loop   : false,
        onplay : () => { this.bgms_playing[event_name] = true; },
        onend  : () => { this.bgms_playing[event_name] = false; }
      });
    });
  }

  supported_events() {
    return [
      'start_stage',
      'enemy_move',
      'user_move',
      'fire',
      'fire_reach_wall',
      'gift',
      'gift_bomb',
      'gift_life',
      'lose'
    ];
  }

  play(event_name) {
    if (event_name in this.bgms && !this.bgms_playing[event_name]) {
      return this.bgms[event_name].play();
    }
  }
}
```

Note: Howler v2 uses `src` instead of `urls`.

- [ ] **Step 2: Update src/engine/data_structures.js — replace Array.from() patterns**

Replace all `Array.from([a, b])` destructuring with plain `[a, b]`. These are the specific lines:

Line 55: `let [curr, min] = Array.from([this.head, this.head])` → `let [curr, min] = [this.head, this.head]`

Line 67: `[min.sibling, min.prev_sibling] = Array.from([null, null])` → `[min.sibling, min.prev_sibling] = [null, null]`

Line 77-78: `[curr.prev_sibling, curr.sibling, curr.parent] = Array.from([curr.sibling, curr.prev_sibling, null])` → `[curr.prev_sibling, curr.sibling, curr.parent] = [curr.sibling, curr.prev_sibling, null]`

Line 131: `[y.parent, z.parent] = Array.from([z.parent, y.parent])` → `[y.parent, z.parent] = [z.parent, y.parent]`

Line 135: `[y.prev_sibling, z.prev_sibling] = Array.from([z.prev_sibling, y.prev_sibling])` → `[y.prev_sibling, z.prev_sibling] = [z.prev_sibling, y.prev_sibling]`

Line 139: `[y.sibling, z.sibling] = Array.from([z.sibling, y.sibling])` → `[y.sibling, z.sibling] = [z.sibling, y.sibling]`

Line 151: `[y.child, z.child] = Array.from([z.child, y.child])` → `[y.child, z.child] = [z.child, y.child]`

Line 152: `[y.degree, z.degree] = Array.from([z.degree, y.degree])` → `[y.degree, z.degree] = [z.degree, y.degree]`

- [ ] **Step 3: Update src/map/map_area_2d.js — replace lodash**

```js
import { Direction } from "../constants.js";

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

export class MapArea2D {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  intersect(area) {
    return new MapArea2D(Math.max(area.x1, this.x1), Math.max(area.y1, this.y1),
      Math.min(area.x2, this.x2), Math.min(area.y2, this.y2));
  }
  sub(area) {
    const intersection = this.intersect(area);
    return [
      new MapArea2D(this.x1, this.y1, this.x2, intersection.y1),
      new MapArea2D(this.x1, intersection.y2, this.x2, this.y2),
      new MapArea2D(this.x1, intersection.y1, intersection.x1, intersection.y2),
      new MapArea2D(intersection.x2, intersection.y1, this.x2, intersection.y2)
    ].filter(candidate_area => candidate_area.valid());
  }
  collide(area) {
    return !((this.x2 <= area.x1) || (this.y2 <= area.y1) || (this.x1 >= area.x2) || (this.y1 >= area.y2));
  }
  extend(direction, ratio) {
    switch (direction) {
      case Direction.UP:
        return new MapArea2D(this.x1, this.y1 - (ratio * this.height()), this.x2, this.y2);
      case Direction.RIGHT:
        return new MapArea2D(this.x1, this.y1, this.x2 + (ratio * this.width()), this.y2);
      case Direction.DOWN:
        return new MapArea2D(this.x1, this.y1, this.x2, this.y2 + (ratio * this.height()));
      case Direction.LEFT:
        return new MapArea2D(this.x1 - (ratio * this.width()), this.y1, this.x2, this.y2);
    }
  }
  equals(area) {
    if (!(area instanceof MapArea2D)) { return false; }
    return (area.x1 === this.x1) && (area.x2 === this.x2) && (area.y1 === this.y1) && (area.y2 === this.y2);
  }
  valid() { return (this.x2 > this.x1) && (this.y2 > this.y1); }
  center() { return new Point((this.x1 + this.x2)/2, (this.y1 + this.y2)/2); }
  clone() { return new MapArea2D(this.x1, this.y1, this.x2, this.y2); }
  width() { return this.x2 - this.x1; }
  height() { return this.y2 - this.y1; }
  to_s() { return `[${this.x1}, ${this.y1}, ${this.x2}, ${this.y2}]`; }
}
```

- [ ] **Step 4: Update src/map/map_unit_2d.js — replace initClass and lodash**

```js
import { Animations } from "../constants.js";

export class MapUnit2D {
  static group = 'middle';
  static max_defend_point = 9;

  constructor(map, area) {
    this.map = map;
    this.area = area;
    this.default_width = this.map.default_width;
    this.default_height = this.map.default_height;
    this.bom_on_destroy = false;
    this.destroyed = false;
    this.attached_timeout_handlers = [];
  }

  get group() { return this.constructor.group; }
  get max_defend_point() { return this.constructor.max_defend_point; }

  after_new_display() {
    this.map.groups[this.group].add(this.display_object);
    return this.display_object.start();
  }

  destroy_display() {
    if (this.bom_on_destroy) {
      this.display_object.setOffset(20, 20);
      this.display_object.setAnimations(Animations.movables);
      this.display_object.setAnimation('bom');
      this.display_object.setFrameRate(Animations.rate('bom'));
      this.display_object.start();
      return this.display_object.afterFrame(3, () => {
        this.display_object.stop();
        return this.display_object.destroy();
      });
    } else {
      this.display_object.stop();
      return this.display_object.destroy();
    }
  }

  width() { return this.area.x2 - this.area.x1; }
  height() { return this.area.y2 - this.area.y1; }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
    }
    this.destroy_display();
    this.detach_timeout_events();
    return this.map.delete_map_unit(this);
  }

  defend(missile, destroy_area) { return 0; }
  accept(map_unit) { return true; }

  attach_timeout_event(func, delay) {
    const handle = setTimeout(func, delay);
    return this.attached_timeout_handlers.push(handle);
  }

  detach_timeout_events() {
    this.attached_timeout_handlers.forEach(handle => clearTimeout(handle));
  }
}
```

Note: The old code used `this.prototype.group` in `initClass()` which set instance properties via the prototype. We replace this with static class fields plus getter accessors so subclasses can override the static field and instances read the correct value via `this.group`.

- [ ] **Step 5: Update src/map/movable_map_unit_2d.js — replace initClass, lodash, Array.from**

```js
import { Direction, Animations } from "../constants.js";
import { MapUnit2D } from "./map_unit_2d.js";
import { MapArea2D } from "./map_area_2d.js";
import { Commander } from "../objects/commanders.js";

export class MovableMapUnit2D extends MapUnit2D {
  static speed = 0.08;

  get speed() { return this.constructor.speed; }

  constructor(map, area) {
    super(map, area);
    this.delayed_commands = [];
    this.moving = false;
    this.direction = 0;
    this.commander = new Commander(this);
  }

  new_display() {
    const center = this.area.center();
    return this.display_object = new Kinetic.Sprite({
      x: center.x,
      y: center.y,
      image: this.map.image,
      animation: this.animation_state(),
      animations: Animations.movables,
      frameRate: Animations.rate(this.animation_state()),
      index: 0,
      offset: {x: this.area.width()/2, y: this.area.height()/2},
      rotationDeg: this.direction,
      map_unit: this
    });
  }

  update_display() {
    if (this.destroyed) { return; }
    this.display_object.setAnimation(this.animation_state());
    this.display_object.setFrameRate(Animations.rate(this.animation_state()));
    this.display_object.setRotationDeg(this.direction);
    const center = this.area.center();
    return this.display_object.setAbsolutePosition(center.x, center.y);
  }

  queued_delayed_commands() {
    const commands = this.delayed_commands;
    this.delayed_commands = [];
    return commands;
  }
  add_delayed_command(command) { return this.delayed_commands.push(command); }

  integration(delta_time) {
    let cmd;
    if (this.destroyed) { return; }
    this.commands = [...new Set([...this.commander.next_commands(), ...this.queued_delayed_commands()])];
    for (cmd of this.commands) { this.handle_turn(cmd); }
    for (cmd of this.commands) { this.handle_move(cmd, delta_time); }
  }

  handle_turn(command) {
    switch(command.type) {
      case "direction":
        return this.turn(command.params.direction);
    }
  }

  handle_move(command, delta_time) {
    switch(command.type) {
      case "start_move":
        this.moving = true;
        var max_offset = parseInt(this.speed * delta_time);
        var intent_offset = command.params.offset;
        if (intent_offset === null) {
          return this.move(max_offset);
        } else if (intent_offset > 0) {
          const real_offset = Math.min(intent_offset, max_offset);
          if (this.move(real_offset)) {
            command.params.offset -= real_offset;
            if (command.params.offset > 0) { return this.add_delayed_command(command); }
          } else {
            return this.add_delayed_command(command);
          }
        }
        break;
      case "stop_move":
        return this.moving = false;
    }
  }

  turn(direction) {
    if ([Direction.UP, Direction.DOWN].includes(direction)) {
      if (this._adjust_x()) { this.direction = direction; }
    } else {
      if (this._adjust_y()) { this.direction = direction; }
    }
    return this.update_display();
  }

  _try_adjust(area) {
    if (this.map.area_available(this, area)) {
      this.area = area;
      return true;
    } else {
      return false;
    }
  }

  _adjust_x() {
    const offset = (this.default_height/4) -
      ((this.area.x1 + (this.default_height/4))%(this.default_height/2));
    return this._try_adjust(new MapArea2D(this.area.x1 + offset, this.area.y1,
      this.area.x2 + offset, this.area.y2));
  }

  _adjust_y() {
    const offset = (this.default_width/4) -
      ((this.area.y1 + (this.default_width/4))%(this.default_width/2));
    return this._try_adjust(new MapArea2D(this.area.x1, this.area.y1 + offset,
      this.area.x2, this.area.y2 + offset));
  }

  move(offset) {
    for (let os = offset; os >= 1; os--) {
      if (this._try_move(os)) return true;
    }
    return false;
  }

  _try_move(offset) {
    const [offset_x, offset_y] = this._offset_by_direction(offset);
    if ((offset_x === 0) && (offset_y === 0)) { return false; }
    const target_x = this.area.x1 + offset_x;
    const target_y = this.area.y1 + offset_y;
    const target_area = new MapArea2D(target_x, target_y,
      target_x + this.width(), target_y + this.height());
    if (this.map.area_available(this, target_area)) {
      this.area = target_area;
      this.update_display();
      return true;
    } else {
      return false;
    }
  }

  _offset_by_direction(offset) {
    offset = parseInt(offset);
    switch (this.direction) {
      case Direction.UP:
        return [0, -Math.min(offset, this.area.y1)];
      case Direction.RIGHT:
        return [Math.min(offset, this.map.max_x - this.area.x2), 0];
      case Direction.DOWN:
        return [0, Math.min(offset, this.map.max_y - this.area.y2)];
      case Direction.LEFT:
        return [-Math.min(offset, this.area.x1), 0];
    }
  }
}
```

Note: `_.union` was used to merge commands arrays. Since commands are objects (not primitives), `_.union` with objects doesn't actually deduplicate — it just concatenates. The original behavior is preserved by spreading both arrays. The `_.detect(_.range(1, offset + 1).reverse(), ...)` in `move()` is replaced with a simple reverse for-loop.

- [ ] **Step 6: Update src/map/map_2d.js — replace lodash and Array.from**

Replace the full file. Key changes:
- `_.each` → `.forEach`
- `_.select` → `.filter`
- `_.first(_.select(...))` → `.find`
- `_.without` → `.filter(x => x !== item)`
- `_.all` → `.every`
- `_.size` → `.length`
- `_.isEmpty` → `!x || x.length === 0`
- `_.range` → for loops
- `_.max(_.map(...))` → `Math.max(...arr.map(...))`
- `Array.from(...)` → plain destructuring or for-of

```js
import { BinomialHeap, BinomialHeapNode } from "../engine/data_structures.js";
import { MapArea2DVertex } from "./map_area_2d_vertex.js";
import { Missile } from "../objects/missile.js";
import { Terrain } from "./terrains.js";
import { Gift, getGiftClasses } from "../objects/gifts.js";
import { Tank, UserTank, EnemyTank } from "../objects/tanks.js";

export class Map2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.max_x = 520;
    this.max_y = 520;
    this.default_width = 40;
    this.default_height = 40;
    this.infinity = 65535;
    this.map_units = [];
    this.terrains = [];
    this.tanks = [];
    this.missiles = [];
    this.gifts = [];
    this.groups = {
      gift: new Kinetic.Group(),
      front: new Kinetic.Group(),
      middle: new Kinetic.Group(),
      back: new Kinetic.Group()
    };
    this.canvas.add(this.groups["back"]);
    this.canvas.add(this.groups["middle"]);
    this.canvas.add(this.groups["front"]);
    this.canvas.add(this.groups["gift"]);

    this.image = document.getElementById("tank_sprite");

    this.vertexes_columns = (4 * this.max_x) / this.default_width - 3;
    this.vertexes_rows = (4 * this.max_y) / this.default_height - 3;
    this.vertexes = this.init_vertexes();
    this.home_vertex = this.vertexes[24][48];

    this.bindings = {};
  }

  reset() {
    this.bindings = {};
    this.map_units.forEach(unit => unit.destroy());
  }

  add_terrain(terrain_cls, area) {
    const terrain = new terrain_cls(this, area);
    terrain.new_display();
    terrain.after_new_display();
    this.terrains.push(terrain);
    this.map_units.push(terrain);
    return terrain;
  }

  add_tank(tank_cls, area) {
    const tank = new tank_cls(this, area);
    tank.new_display();
    tank.after_new_display();
    this.tanks.push(tank);
    this.map_units.push(tank);
    return tank;
  }

  add_missile(parent) {
    const missile = new Missile(this, parent);
    missile.new_display();
    missile.after_new_display();
    this.missiles.push(missile);
    this.map_units.push(missile);
    return missile;
  }

  random_gift() {
    this.gifts.forEach(gift => gift.destroy());

    const gift_classes = getGiftClasses();
    const vx = Math.floor(Math.random() * this.vertexes_rows);
    const vy = Math.floor(Math.random() * this.vertexes_columns);
    const gift_choice = Math.floor(Math.random() * gift_classes.length);
    const gift = new gift_classes[gift_choice](
      this,
      this.vertexes[vx][vy].clone()
    );
    gift.new_display();
    gift.after_new_display();
    this.gifts.push(gift);
    this.map_units.push(gift);
    return gift;
  }

  delete_map_unit(map_unit) {
    if (map_unit instanceof Terrain) {
      this.terrains = this.terrains.filter(t => t !== map_unit);
    } else if (map_unit instanceof Missile) {
      this.missiles = this.missiles.filter(m => m !== map_unit);
    } else if (map_unit instanceof Tank) {
      this.tanks = this.tanks.filter(t => t !== map_unit);
    } else if (map_unit instanceof Gift) {
      this.gifts = this.gifts.filter(g => g !== map_unit);
    }
    this.map_units = this.map_units.filter(u => u !== map_unit);
  }

  p1_tank() {
    return this.tanks.find(tank => tank.type() === "user_p1");
  }
  p2_tank() {
    return this.tanks.find(tank => tank.type() === "user_p2");
  }
  home() {
    return this.terrains.find(terrain => terrain.type() === "home");
  }
  user_tanks() {
    return this.tanks.filter(tank => tank instanceof UserTank);
  }
  enemy_tanks() {
    return this.tanks.filter(tank => tank instanceof EnemyTank);
  }

  units_at(area) {
    return this.map_units.filter(map_unit => map_unit.area.collide(area));
  }
  out_of_bound(area) {
    return (
      area.x1 < 0 || area.x2 > this.max_x || area.y1 < 0 || area.y2 > this.max_y
    );
  }
  area_available(unit, area) {
    return this.map_units.every(map_unit => {
      return (
        map_unit === unit ||
        map_unit.accept(unit) ||
        !map_unit.area.collide(area)
      );
    });
  }

  init_vertexes() {
    const vertexes = [];
    let x1 = 0, x2 = this.default_width;
    while (x2 <= this.max_x) {
      const column_vertexes = [];
      let y1 = 0, y2 = this.default_height;
      while (y2 <= this.max_y) {
        column_vertexes.push(new MapArea2DVertex(x1, y1, x2, y2));
        y1 += this.default_height / 4;
        y2 += this.default_height / 4;
      }
      vertexes.push(column_vertexes);
      x1 += this.default_width / 4;
      x2 += this.default_width / 4;
    }
    for (let x = 0; x < this.vertexes_columns; x++) {
      for (let y = 0; y < this.vertexes_rows; y++) {
        for (let sib of [
          { x, y: y - 1 },
          { x: x + 1, y },
          { x, y: y + 1 },
          { x: x - 1, y }
        ]) {
          vertexes[x][y].init_vxy(x, y);
          if (
            0 <= sib.x &&
            sib.x < this.vertexes_columns &&
            (0 <= sib.y && sib.y < this.vertexes_rows)
          ) {
            vertexes[x][y].add_sibling(vertexes[sib.x][sib.y]);
          }
        }
      }
    }
    return vertexes;
  }

  vertexes_at(area) {
    const vx = parseInt((area.x1 * 4) / this.default_width);
    const vy = parseInt((area.y1 * 4) / this.default_height);
    return this.vertexes[vx][vy];
  }

  random_vertex() {
    let vx = Math.floor(Math.random() * this.vertexes_rows);
    if (vx % 2 === 1) {
      vx = vx - 1;
    }
    let vy = Math.floor(Math.random() * this.vertexes_columns);
    if (vy % 2 === 1) {
      vy = vy - 1;
    }
    return this.vertexes[vx][vy];
  }

  weight(tank, from, to) {
    const sub_areas = to.sub(from);
    const sub_area = sub_areas[0];
    const terrain_units = this.units_at(sub_area).filter(
      unit => unit instanceof Terrain
    );
    if (terrain_units.length === 0) {
      return 1;
    }
    const weights = terrain_units.map(terrain_unit => terrain_unit.weight(tank));
    const max_weight = Math.max(...weights);
    return (
      (max_weight / (this.default_width * this.default_height)) *
      sub_area.width() *
      sub_area.height()
    );
  }

  shortest_path(tank, start_vertex, end_vertex) {
    const [d, pi] = this.intialize_single_source(end_vertex);
    d[start_vertex.vx][start_vertex.vy].key = 0;
    const heap = new BinomialHeap();
    for (let x = 0; x < this.vertexes_columns; x++) {
      for (let y = 0; y < this.vertexes_rows; y++) {
        heap.insert(d[x][y]);
      }
    }
    while (!heap.is_empty()) {
      const u = heap.extract_min().satellite;
      for (let v of u.siblings) {
        this.relax(heap, d, pi, u, v, this.weight(tank, u, v), end_vertex);
      }
      if (u === end_vertex) {
        break;
      }
    }
    return this.calculate_shortest_path_from_pi(pi, start_vertex, end_vertex);
  }

  intialize_single_source(target_vertex) {
    const d = [];
    const pi = [];
    for (let x = 0; x < this.vertexes_columns; x++) {
      const column_ds = [];
      const column_pi = [];
      for (let y = 0; y < this.vertexes_rows; y++) {
        const node = new BinomialHeapNode(
          this.vertexes[x][y],
          this.infinity - this.vertexes[x][y].a_star_weight(target_vertex)
        );
        column_ds.push(node);
        column_pi.push(null);
      }
      d.push(column_ds);
      pi.push(column_pi);
    }
    return [d, pi];
  }

  relax(heap, d, pi, u, v, w, target_vertex) {
    if (v.vx % 2 === 1 && u.vx % 2 === 1) {
      return;
    }
    if (v.vy % 2 === 1 && u.vy % 2 === 1) {
      return;
    }
    const aw = v.a_star_weight(target_vertex) - u.a_star_weight(target_vertex);
    if (d[v.vx][v.vy].key > d[u.vx][u.vy].key + w + aw) {
      heap.decrease_key(d[v.vx][v.vy], d[u.vx][u.vy].key + w + aw);
      return (pi[v.vx][v.vy] = u);
    }
  }

  calculate_shortest_path_from_pi(pi, start_vertex, end_vertex) {
    const reverse_paths = [];
    let v = end_vertex;
    while (pi[v.vx][v.vy] !== null) {
      reverse_paths.push(v);
      v = pi[v.vx][v.vy];
    }
    reverse_paths.push(start_vertex);
    return reverse_paths.reverse();
  }

  bind(event, callback, scope) {
    if (scope == null) {
      scope = this;
    }
    if (!this.bindings[event] || this.bindings[event].length === 0) {
      this.bindings[event] = [];
    }
    return this.bindings[event].push({ scope: scope, callback: callback });
  }

  trigger(event, ...params) {
    if (!this.bindings[event] || this.bindings[event].length === 0) {
      return;
    }
    return this.bindings[event].map(handler =>
      handler.callback.apply(handler.scope, params)
    );
  }
}
```

- [ ] **Step 7: Update src/map/terrains.js — replace initClass, lodash, Array.from, includes IronTerrain fix**

```js
import { Animations } from "../constants.js";
import { MapUnit2D } from "./map_unit_2d.js";
import { MapArea2D } from "./map_area_2d.js";
import { Missile } from "../objects/missile.js";
import { Tank } from "../objects/tanks.js";

export class Terrain extends MapUnit2D {
  accept(map_unit) {
    return false;
  }
  new_display() {
    let animation;
    const animations = structuredClone(Animations.terrain(this.type()));
    for (animation of animations) {
      animation.x += this.area.x1 % 40;
      animation.y += this.area.y1 % 40;
      animation.width = this.area.width();
      animation.height = this.area.height();
    }
    return (this.display_object = new Kinetic.Sprite({
      x: this.area.x1,
      y: this.area.y1,
      image: this.map.image,
      index: 0,
      animation: "static",
      animations: { static: animations },
      map_unit: this
    }));
  }
}

export class BrickTerrain extends Terrain {
  type() {
    return "brick";
  }
  weight(tank) {
    return 40 / tank.power;
  }
  defend(missile, destroy_area) {
    const pieces = this.area.sub(destroy_area);
    pieces.forEach(piece => {
      this.map.add_terrain(BrickTerrain, piece);
    });
    this.destroy();
    return 1;
  }
}

export class IronTerrain extends Terrain {
  type() {
    return "iron";
  }
  weight(tank) {
    switch (tank.power) {
      case 1:
        return this.map.infinity;
      case 2:
        return 20;
      default:
        return 10;
    }
  }
  defend(missile, destroy_area) {
    if (missile.power < 2) {
      return this.max_defend_point;
    }
    const double_destroy_area = destroy_area.extend(missile.direction, 1);
    const pieces = this.area.sub(double_destroy_area);
    pieces.forEach(piece => {
      this.map.add_terrain(IronTerrain, piece);
    });
    this.destroy();
    return 2;
  }
}

export class WaterTerrain extends Terrain {
  static group = "back";
  accept(map_unit) {
    if (map_unit instanceof Tank) {
      return map_unit.ship;
    } else {
      return map_unit instanceof Missile;
    }
  }
  type() {
    return "water";
  }
  weight(tank) {
    switch (tank.ship) {
      case true:
        return 4;
      case false:
        return this.map.infinity;
    }
  }
}

export class IceTerrain extends Terrain {
  static group = "back";
  accept(map_unit) {
    return true;
  }
  type() {
    return "ice";
  }
  weight(tank) {
    return 4;
  }
}

export class GrassTerrain extends Terrain {
  static group = "front";
  accept(map_unit) {
    return true;
  }
  type() {
    return "grass";
  }
  weight(tank) {
    return 4;
  }
}

export class HomeTerrain extends Terrain {
  type() {
    return "home";
  }
  accept(map_unit) {
    if (this.destroyed && map_unit instanceof Missile) {
      return true;
    }
    return false;
  }
  weight(tank) {
    return 0;
  }
  new_display() {
    return (this.display_object = new Kinetic.Sprite({
      x: this.area.x1,
      y: this.area.y1,
      image: this.map.image,
      index: 0,
      animations: {
        origin: Animations.terrain("home_origin"),
        destroyed: Animations.terrain("home_destroyed")
      },
      animation: "origin",
      map_unit: this
    }));
  }
  defend(missile, destroy_area) {
    if (this.destroyed) {
      return this.max_defend_point;
    }
    this.destroyed = true;
    this.display_object.setAnimation("destroyed");
    this.map.trigger("home_destroyed");
    return this.max_defend_point;
  }

  defend_terrains() {
    const home_defend_area = new MapArea2D(220, 460, 300, 520);
    return this.map.units_at(home_defend_area).filter(
      unit => !(unit instanceof HomeTerrain) && !(unit instanceof Tank)
    );
  }

  delete_defend_terrains() {
    this.defend_terrains().forEach(terrain => terrain.destroy());
  }

  add_defend_terrains(terrain_cls) {
    for (let area of [
      new MapArea2D(220, 460, 260, 480),
      new MapArea2D(260, 460, 300, 480),
      new MapArea2D(220, 480, 240, 520),
      new MapArea2D(280, 480, 300, 520)
    ]) {
      if (this.map.units_at(area).length === 0) {
        this.map.add_terrain(terrain_cls, area);
      }
    }
  }

  setup_defend_terrains() {
    this.delete_defend_terrains();
    return this.add_defend_terrains(IronTerrain);
  }

  restore_defend_terrains() {
    this.delete_defend_terrains();
    return this.add_defend_terrains(BrickTerrain);
  }
}
```

- [ ] **Step 8: Update src/map/tiled_map_builder.js — replace lodash and Array.from**

```js
import { MapArea2D } from "./map_area_2d.js";
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
} from "./terrains.js";

function typeToClass(type) {
  const map = {
    BrickTerrain,
    IronTerrain,
    WaterTerrain,
    GrassTerrain,
    HomeTerrain,
    IceTerrain
  };
  return map[type] || BrickTerrain;
}

export { typeToClass };

export class TiledMapBuilder {
  constructor(map, json) {
    this.map = map;
    this.json = json;
    this.tile_width = parseInt(this.json.tilewidth);
    this.tile_height = parseInt(this.json.tileheight);
    this.map_width = parseInt(this.json.width);
    this.map_height = parseInt(this.json.height);
    this.tile_properties = {};
    this.json.tilesets.forEach(tileset => {
      for (let gid in tileset.tileproperties) {
        const props = tileset.tileproperties[gid];
        this.tile_properties[tileset.firstgid + parseInt(gid)] = props;
      }
    });
  }
  setup_stage(stage) {
    const home_layer = this.json.layers.find(
      layer => layer.name === "Home"
    );
    const stage_layer = this.json.layers.find(
      layer => layer.name === `Stage ${stage}`
    );
    [home_layer, stage_layer].forEach(layer => {
      let h = 0;
      while (h < this.map_height) {
        let w = 0;
        while (w < this.map_width) {
          const tile_id = layer.data[h * this.map_width + w];
          if (tile_id !== 0) {
            const properties = this.tile_properties[tile_id];
            const x1 = w * this.tile_width + parseInt(properties.x_offset);
            const y1 = h * this.tile_height + parseInt(properties.y_offset);
            const area = new MapArea2D(
              x1,
              y1,
              x1 + parseInt(properties.width),
              y1 + parseInt(properties.height)
            );
            this.map.add_terrain(typeToClass(properties.type), area);
          }
          w += 1;
        }
        h += 1;
      }
    });
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/engine/ src/map/
git commit -m "refactor: remove lodash and Array.from patterns from engine and map layer"
```

---

## Task 5: Remove Lodash — Objects and Scenes Layer

**Files:**
- Modify: `src/objects/tanks.js`
- Modify: `src/objects/missile.js`
- Modify: `src/objects/gifts.js`
- Modify: `src/objects/commanders.js`
- Modify: `src/scenes/battle_field_scene.js`
- Modify: `src/scenes/report_scene.js`
- Modify: `src/views/welcome_view.js`
- Modify: `src/views/battle_field_view.js`
- Modify: `src/constants.js`
- Modify: `src/game.js`

- [ ] **Step 1: Update src/constants.js — replace initClass**

Replace the `initClass()` pattern on both `Direction` and `Animations` with static fields:

For `Direction` (lines 1-12):
```js
export class Direction {
  static UP = 0;
  static DOWN = 180;
  static LEFT = 270;
  static RIGHT = 90;

  static all() {
    return [this.UP, this.DOWN, this.LEFT, this.RIGHT];
  }
}
```
Delete `Direction.initClass();`

For `Animations` (lines 14-320):
```js
export class Animations {
  static movables = { /* keep existing data exactly as-is */ };
  static gifts = { /* keep existing data exactly as-is */ };
  static rates = { /* keep existing data exactly as-is */ };
  static terrains = { /* keep existing data exactly as-is */ };

  static movable(type) {
    return this.movables[type];
  }
  static rate(type) {
    return this.rates[type];
  }
  static terrain(type) {
    return this.terrains[type];
  }
}
```
Delete `Animations.initClass();`

Move the data from `initClass()` body directly into static field initializers. The data values stay identical.

- [ ] **Step 2: Update src/game.js — replace lodash**

Line 127 `_.each(this.scenes, scene => scene.stop())`:
```js
Object.values(this.scenes).forEach(scene => scene.stop());
```

Line 134 `if (!_.isEmpty(this.current_scene))`:
```js
if (this.current_scene) {
```

- [ ] **Step 3: Update src/objects/tanks.js — replace initClass and lodash**

Replace `initClass` patterns and all lodash calls:

`UserTank` (line 134-198): replace `static initClass() { this.prototype.speed = 0.13; }` / `UserTank.initClass()` with `static speed = 0.13;`

`StupidTank` (line 285-293): `static speed = 0.07;` — delete `StupidTank.initClass()`
`FoolTank` (line 295-303): `static speed = 0.07;` — delete `FoolTank.initClass()`
`FishTank` (line 305-313): `static speed = 0.13;` — delete `FishTank.initClass()`
`StrongTank` (line 315-323): `static speed = 0.07;` — delete `StrongTank.initClass()`

Lodash replacements:
- Line 26: `_.min([this.level + levels, 3])` → `Math.min(this.level + levels, 3)`
- Line 38: `_.max([this.hp + 1, this.max_hp])` → `Math.max(this.hp + 1, this.max_hp)`
- Line 43: `_.max([this.hp + 1, this.max_hp])` → `Math.max(this.hp + 1, this.max_hp)`
- Line 59: `_.max([1, this.level - 1])` → `Math.max(1, this.level - 1)`
- Line 77: `_.size(this.missiles)` → `this.missiles.length`
- Line 113: `Array.from(this.commands).map(cmd => this.handle_fire(cmd))` → `this.commands.forEach(cmd => this.handle_fire(cmd))`
- Line 117: `_.without(this.missiles, missile)` → `this.missiles.filter(m => m !== missile)`
- Line 162: `_.min(this.hp, missile.power)` → `Math.min(this.hp, missile.power)` (NOTE: `_.min` with two args is wrong — lodash v1 `_.min` takes an array. But with two plain args, it compares. The intent is `Math.min`.)
- Line 246: same as above
- Line 262: `_.min([this.hp, 4])` → `Math.min(this.hp, 4)`

- [ ] **Step 4: Update src/objects/missile.js — replace initClass and lodash**

Replace `static initClass() { this.prototype.speed = 0.2; }` / `Missile.initClass()` with `static speed = 0.2;`

Line 85: `_.each(hit_map_units, unit => {` → `hit_map_units.forEach(unit => {`

- [ ] **Step 5: Update src/objects/gifts.js — replace initClass and lodash (includes LifeGift fix)**

Replace `static initClass() { this.prototype.group = "gift"; }` / `Gift.initClass()` with `static group = "gift";`

Lodash replacements:
- Line 34: `_.select(...)` → `.filter(...)`
- Line 38: `_.each(tanks, ...)` → `tanks.forEach(...)`
- Line 39: `_.size(tanks)` → `tanks.length`
- Line 68: `_.each(this.map.user_tanks(), ...)` → `this.map.user_tanks().forEach(...)`
- Line 73: `_.each(this.map.enemy_tanks(), ...)` → `this.map.enemy_tanks().forEach(...)`
- Lines 131-134: Fix the LifeGift bug AND replace lodash:
```js
apply(tank) {
  if (tank instanceof EnemyTank) {
    this.map.enemy_tanks().forEach(enemy_tank => {
      enemy_tank.hp_up(5);
      enemy_tank.gift_up(3);
    });
  } else {
    this.map.trigger("tank_life_up", tank);
  }
}
```
- Line 161: `_.each(this.map.user_tanks(), tank => tank.freeze())` → `this.map.user_tanks().forEach(tank => tank.freeze())`
- Line 163: `_.each(this.map.enemy_tanks(), tank => tank.freeze())` → `this.map.enemy_tanks().forEach(tank => tank.freeze())`

- [ ] **Step 6: Update src/objects/commanders.js — replace lodash and Array.from**

- Line 22: `_.uniq(this.commands, function(command) {...})` — this is lodash v1 `_.uniq` with an iterator (like `uniqBy`). Replace with:
```js
next_commands() {
  this.commands = [];
  this.next();
  const seen = new Set();
  return this.commands.filter(command => {
    const key = command.type === "direction"
      ? command.params.direction
      : command.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```
- Line 123: `_.isEmpty(sequences)` → `sequences.length === 0`
- Line 138: `_.contains(sequences, "start")` → `sequences.includes("start")`
- Line 139: `_.contains(sequences, "end")` → `sequences.includes("end")`
- Line 185: `_.size(this.path)` → `this.path.length`
- Line 226: `_.size(this.map_unit.delayed_commands)` → `this.map_unit.delayed_commands.length`
- Line 229: `_.size(this.path)` → `this.path.length`
- Line 233: `Array.from(this.offset_of(...))` → `this.offset_of(...)`

- [ ] **Step 7: Update src/scenes/battle_field_scene.js — replace lodash and jQuery ajax**

Replace the `$.ajax` call with a Vite JSON import at the top of file:

```js
import { Scene } from "../engine/scene.js";
import { Map2D } from "../map/map_2d.js";
import { MapArea2D } from "../map/map_area_2d.js";
import { TiledMapBuilder } from "../map/tiled_map_builder.js";
import terrainsJson from "../../data/terrains.json";
import {
  UserTank,
  UserP1Tank,
  UserP2Tank,
  EnemyTank,
  StupidTank,
  StrongTank,
  FishTank,
  FoolTank
} from "../objects/tanks.js";
```

Replace the constructor's `$.ajax(...)` block:
```js
constructor(game, view) {
  super(game, view);
  this.layer = this.view.layer;
  this.map = new Map2D(this.layer);
  this.builder = new TiledMapBuilder(this.map, terrainsJson);
  this.reset_config_variables();
}
```

Lodash replacements:
- Line 213: `_.forIn(p1_control_mappings, (virtual_command, physical_key) => {` → `Object.entries(p1_control_mappings).forEach(([physical_key, virtual_command]) => {`
- Line 226: same for p2_control_mappings
- Line 373: already fixed in Task 2
- Line 387: `_.size(this.map.enemy_tanks())` → `this.map.enemy_tanks().length`
- Line 400: `_.isNull(this.winner)` → `this.winner === null`
- Line 412: `_.isNull(this.winner)` → `this.winner === null`
- Line 453: `_.each(tanks, tank => {` → `tanks.forEach(tank => {`
- Line 464: `_.detect(tanks, tank => {` → `tanks.find(tank => {`

- [ ] **Step 8: Update src/scenes/report_scene.js — replace lodash**

- Line 19: `_.max([...])` → `Math.max(...)`
- Line 55: `_.each(this.game.get_status(...), type => {` → `this.game.get_status(...).forEach(type => {`

- [ ] **Step 9: Update src/views/welcome_view.js — replace lodash and Array.from**

- Line 138: `_.cloneDeep(Animations.terrain('brick'))` → `structuredClone(Animations.terrain('brick'))`
- Line 139: `for (animation of Array.from(animations))` → `for (animation of animations)`

- [ ] **Step 10: Update src/views/battle_field_view.js — replace lodash**

- Line 16: `_.each(this.enemy_symbols, symbol => symbol.destroy())` → `this.enemy_symbols.forEach(symbol => symbol.destroy())`

- [ ] **Step 11: Run Vite dev server and verify the game loads and plays**

```bash
npx vite
```

Open http://localhost:5173 in a browser. Verify:
- Welcome screen renders with TANK 1990 logo
- Player selection works (SPACE to toggle, ENTER to start)
- Stage screen appears
- Gameplay works (tanks move, fire, enemies spawn and move)
- Game over / win report screen shows

- [ ] **Step 12: Commit**

```bash
git add src/ 
git commit -m "refactor: remove lodash from objects, scenes, and views layer

Replace all lodash calls with native JS equivalents. Replace jQuery
$.ajax with Vite JSON import. Remove all initClass() CoffeeScript
patterns and use static class fields."
```

---

## Task 6: Verify Build

**Files:** None modified

- [ ] **Step 1: Run vite build**

```bash
npx vite build
```

Expected: Build completes without errors, output in `dist/`.

- [ ] **Step 2: Preview the production build**

```bash
npx vite preview
```

Open http://localhost:4173 and verify the game works the same as dev mode.

- [ ] **Step 3: Commit if any build fixes were needed**

Only commit if changes were required. Otherwise skip.

---

## Task 7: Unit Tests — Data Structures and Map Geometry

**Files:**
- Create: `test/engine/data_structures.test.js`
- Create: `test/map/map_area_2d.test.js`
- Create: `test/map/map_area_2d_vertex.test.js`
- Create: `test/constants.test.js`

- [ ] **Step 1: Create test/engine/data_structures.test.js**

```js
import { describe, it, expect } from 'vitest';
import { BinomialHeap, BinomialHeapNode } from '../../src/engine/data_structures.js';

describe('BinomialHeapNode', () => {
  it('initializes with satellite and key', () => {
    const node = new BinomialHeapNode('data', 5);
    expect(node.satellite).toBe('data');
    expect(node.key).toBe(5);
    expect(node.parent).toBeNull();
    expect(node.degree).toBe(0);
    expect(node.child).toBeNull();
    expect(node.sibling).toBeNull();
  });

  it('is_head when no parent and no prev_sibling', () => {
    const node = new BinomialHeapNode('a', 1);
    expect(node.is_head()).toBe(true);
  });

  it('is_first_child when has parent but no prev_sibling', () => {
    const parent = new BinomialHeapNode('p', 1);
    const child = new BinomialHeapNode('c', 2);
    child.parent = parent;
    expect(child.is_first_child()).toBe(true);
  });
});

describe('BinomialHeap', () => {
  it('starts empty', () => {
    const heap = new BinomialHeap();
    expect(heap.is_empty()).toBe(true);
  });

  it('insert and extract_min returns minimum', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('c', 3));
    heap.insert(new BinomialHeapNode('a', 1));
    heap.insert(new BinomialHeapNode('b', 2));

    const min = heap.extract_min();
    expect(min.satellite).toBe('a');
    expect(min.key).toBe(1);
  });

  it('extracts in sorted order', () => {
    const heap = new BinomialHeap();
    const values = [5, 3, 8, 1, 4, 2, 7, 6];
    values.forEach(v => heap.insert(new BinomialHeapNode(v, v)));

    const extracted = [];
    while (!heap.is_empty()) {
      extracted.push(heap.extract_min().key);
    }
    expect(extracted).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('min returns minimum without removing', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('b', 2));
    heap.insert(new BinomialHeapNode('a', 1));

    expect(heap.min().key).toBe(1);
    expect(heap.is_empty()).toBe(false);
  });

  it('decrease_key moves node up', () => {
    const heap = new BinomialHeap();
    const node_a = new BinomialHeapNode('a', 5);
    const node_b = new BinomialHeapNode('b', 3);
    heap.insert(node_a);
    heap.insert(node_b);

    heap.decrease_key(node_a, 1);
    expect(heap.extract_min().satellite).toBe('a');
  });

  it('decrease_key throws if new key is greater', () => {
    const heap = new BinomialHeap();
    const node = new BinomialHeapNode('a', 5);
    heap.insert(node);

    expect(() => heap.decrease_key(node, 10)).toThrow('new key is greater than current key');
  });

  it('delete removes a specific node', () => {
    const heap = new BinomialHeap();
    const node_a = new BinomialHeapNode('a', 1);
    const node_b = new BinomialHeapNode('b', 2);
    const node_c = new BinomialHeapNode('c', 3);
    heap.insert(node_a);
    heap.insert(node_b);
    heap.insert(node_c);

    heap.delete(node_b);

    const remaining = [];
    while (!heap.is_empty()) {
      remaining.push(heap.extract_min().satellite);
    }
    expect(remaining).toEqual(['a', 'c']);
  });

  it('union merges two heaps', () => {
    const heap1 = new BinomialHeap();
    heap1.insert(new BinomialHeapNode('a', 1));
    heap1.insert(new BinomialHeapNode('c', 3));

    const heap2 = new BinomialHeap();
    heap2.insert(new BinomialHeapNode('b', 2));
    heap2.insert(new BinomialHeapNode('d', 4));

    heap1.union(heap2);

    const extracted = [];
    while (!heap1.is_empty()) {
      extracted.push(heap1.extract_min().key);
    }
    expect(extracted).toEqual([1, 2, 3, 4]);
  });

  it('handles single element', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('only', 42));
    expect(heap.extract_min().key).toBe(42);
    expect(heap.is_empty()).toBe(true);
  });

  it('extract_min on empty returns null', () => {
    const heap = new BinomialHeap();
    expect(heap.extract_min()).toBeNull();
  });
});
```

- [ ] **Step 2: Create test/map/map_area_2d.test.js**

```js
import { describe, it, expect } from 'vitest';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('MapArea2D', () => {
  it('stores coordinates', () => {
    const area = new MapArea2D(10, 20, 30, 40);
    expect(area.x1).toBe(10);
    expect(area.y1).toBe(20);
    expect(area.x2).toBe(30);
    expect(area.y2).toBe(40);
  });

  it('calculates width and height', () => {
    const area = new MapArea2D(10, 20, 50, 60);
    expect(area.width()).toBe(40);
    expect(area.height()).toBe(40);
  });

  it('calculates center', () => {
    const area = new MapArea2D(0, 0, 40, 40);
    const center = area.center();
    expect(center.x).toBe(20);
    expect(center.y).toBe(20);
  });

  it('detects collision', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(20, 20, 60, 60);
    expect(a.collide(b)).toBe(true);
  });

  it('detects non-collision', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(40, 40, 80, 80);
    expect(a.collide(b)).toBe(false);
  });

  it('detects non-collision when adjacent', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(40, 0, 80, 40);
    expect(a.collide(b)).toBe(false);
  });

  it('calculates intersection', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(20, 20, 60, 60);
    const inter = a.intersect(b);
    expect(inter.x1).toBe(20);
    expect(inter.y1).toBe(20);
    expect(inter.x2).toBe(40);
    expect(inter.y2).toBe(40);
  });

  it('subtracts area correctly', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 20, 40);
    const result = a.sub(b);
    expect(result.length).toBe(1);
    expect(result[0].x1).toBe(20);
    expect(result[0].y1).toBe(0);
    expect(result[0].x2).toBe(40);
    expect(result[0].y2).toBe(40);
  });

  it('sub returns empty for identical areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const result = a.sub(a);
    expect(result.length).toBe(0);
  });

  it('sub returns multiple pieces for center cut', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(10, 10, 30, 30);
    const result = a.sub(b);
    expect(result.length).toBe(4);
  });

  it('valid returns true for valid area', () => {
    expect(new MapArea2D(0, 0, 40, 40).valid()).toBe(true);
  });

  it('valid returns false for zero-width area', () => {
    expect(new MapArea2D(10, 0, 10, 40).valid()).toBe(false);
  });

  it('valid returns false for negative area', () => {
    expect(new MapArea2D(40, 0, 0, 40).valid()).toBe(false);
  });

  it('equals returns true for identical areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 40, 40);
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different areas', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const b = new MapArea2D(0, 0, 40, 80);
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for non-MapArea2D', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    expect(a.equals({ x1: 0, y1: 0, x2: 40, y2: 40 })).toBe(false);
  });

  it('clone creates an independent copy', () => {
    const a = new MapArea2D(10, 20, 30, 40);
    const b = a.clone();
    expect(a.equals(b)).toBe(true);
    b.x1 = 99;
    expect(a.x1).toBe(10);
  });

  it('extend up increases y1', () => {
    const a = new MapArea2D(0, 20, 40, 60);
    const extended = a.extend(0, 1); // Direction.UP = 0
    expect(extended.y1).toBe(-20);
    expect(extended.y2).toBe(60);
  });

  it('extend right increases x2', () => {
    const a = new MapArea2D(0, 0, 40, 40);
    const extended = a.extend(90, 1); // Direction.RIGHT = 90
    expect(extended.x2).toBe(80);
  });

  it('to_s returns formatted string', () => {
    const a = new MapArea2D(10, 20, 30, 40);
    expect(a.to_s()).toBe('[10, 20, 30, 40]');
  });
});
```

- [ ] **Step 3: Create test/map/map_area_2d_vertex.test.js**

```js
import { describe, it, expect } from 'vitest';
import { MapArea2DVertex } from '../../src/map/map_area_2d_vertex.js';

describe('MapArea2DVertex', () => {
  it('extends MapArea2D with siblings', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    expect(v.siblings).toEqual([]);
    expect(v.x1).toBe(0);
  });

  it('init_vxy sets vertex coordinates', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    v.init_vxy(3, 5);
    expect(v.vx).toBe(3);
    expect(v.vy).toBe(5);
  });

  it('add_sibling adds to siblings list', () => {
    const v1 = new MapArea2DVertex(0, 0, 40, 40);
    const v2 = new MapArea2DVertex(40, 0, 80, 40);
    v1.add_sibling(v2);
    expect(v1.siblings).toContain(v2);
  });

  it('a_star_weight calculates squared distance / 2', () => {
    const v1 = new MapArea2DVertex(0, 0, 40, 40);
    const v2 = new MapArea2DVertex(40, 40, 80, 80);
    v1.init_vxy(0, 0);
    v2.init_vxy(4, 4);
    // (4-0)^2 + (4-0)^2 = 32, /2 = 16
    expect(v1.a_star_weight(v2)).toBe(16);
  });

  it('a_star_weight is 0 for same vertex', () => {
    const v = new MapArea2DVertex(0, 0, 40, 40);
    v.init_vxy(2, 3);
    expect(v.a_star_weight(v)).toBe(0);
  });
});
```

- [ ] **Step 4: Create test/constants.test.js**

```js
import { describe, it, expect } from 'vitest';
import { Direction, Animations } from '../src/constants.js';

describe('Direction', () => {
  it('has correct values', () => {
    expect(Direction.UP).toBe(0);
    expect(Direction.DOWN).toBe(180);
    expect(Direction.LEFT).toBe(270);
    expect(Direction.RIGHT).toBe(90);
  });

  it('all() returns all four directions', () => {
    const all = Direction.all();
    expect(all).toHaveLength(4);
    expect(all).toContain(0);
    expect(all).toContain(180);
    expect(all).toContain(270);
    expect(all).toContain(90);
  });
});

describe('Animations', () => {
  it('has movables data', () => {
    expect(Animations.movables).toBeDefined();
    expect(Animations.movables.missile).toBeDefined();
    expect(Animations.movables.bom).toHaveLength(4);
  });

  it('movable() returns animation data', () => {
    const missile = Animations.movable('missile');
    expect(missile).toBeDefined();
    expect(missile[0]).toHaveProperty('x');
    expect(missile[0]).toHaveProperty('y');
  });

  it('rate() returns frame rate', () => {
    expect(Animations.rate('bom')).toBe(12);
    expect(Animations.rate('missile')).toBe(1);
  });

  it('terrain() returns terrain animation data', () => {
    const brick = Animations.terrain('brick');
    expect(brick).toBeDefined();
    expect(brick[0]).toHaveProperty('x');
  });

  it('has gifts data', () => {
    expect(Animations.gifts).toBeDefined();
    expect(Animations.gifts.land_mine).toBeDefined();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add test/
git commit -m "test: add unit tests for data structures, map geometry, and constants"
```

---

## Task 8: Unit Tests — Game Logic

**Files:**
- Create: `test/game.test.js`
- Create: `test/objects/commanders.test.js`

- [ ] **Step 1: Create test/game.test.js**

```js
import { describe, it, expect, beforeEach } from 'vitest';

// Game depends on Kinetic (global), so we mock it
import { vi } from 'vitest';
globalThis.Kinetic = {
  Stage: vi.fn(() => ({ add: vi.fn() })),
  Layer: vi.fn(() => ({ add: vi.fn(), hide: vi.fn(), show: vi.fn(), draw: vi.fn() })),
  Group: vi.fn(() => ({ add: vi.fn() })),
  Sprite: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), destroy: vi.fn() })),
  Text: vi.fn(() => ({ setText: vi.fn() })),
  Rect: vi.fn(),
  Tween: vi.fn(() => ({ play: vi.fn() })),
  Path: vi.fn(),
  Easings: { Linear: 'linear' }
};
globalThis.document = globalThis.document || {};
const origGetElement = globalThis.document.getElementById;
globalThis.document.getElementById = vi.fn((id) => {
  if (id === 'tank_sprite') return {};
  if (origGetElement) return origGetElement.call(document, id);
  return null;
});

import { Game } from '../src/game.js';

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game();
  });

  it('initializes with default config', () => {
    expect(game.get_config('initial_players')).toBe(1);
    expect(game.get_config('total_stages')).toBe(50);
    expect(game.get_config('enemies_per_stage')).toBe(20);
  });

  it('initializes with default statuses', () => {
    expect(game.get_status('players')).toBe(1);
    expect(game.get_status('current_stage')).toBe(1);
    expect(game.get_status('game_over')).toBe(false);
  });

  it('updates status', () => {
    game.update_status('players', 2);
    expect(game.get_status('players')).toBe(2);
  });

  it('next_stage cycles forward', () => {
    game.next_stage();
    expect(game.get_status('current_stage')).toBe(2);
  });

  it('prev_stage cycles backward', () => {
    game.prev_stage();
    expect(game.get_status('current_stage')).toBe(50);
  });

  it('mod_stage wraps around forward', () => {
    expect(game.mod_stage(50, 1)).toBe(1);
  });

  it('mod_stage wraps around backward', () => {
    expect(game.mod_stage(1, -1)).toBe(50);
  });

  it('single_player_mode returns true when players is 1', () => {
    expect(game.single_player_mode()).toBe(true);
  });

  it('single_player_mode returns false when players is 2', () => {
    game.update_status('players', 2);
    expect(game.single_player_mode()).toBe(false);
  });

  it('increase_p1_score adds to p1 score', () => {
    game.increase_p1_score(100);
    expect(game.get_status('p1_score')).toBe(100);
    game.increase_p1_score(200);
    expect(game.get_status('p1_score')).toBe(300);
  });

  it('increase_p2_score adds to p2 score', () => {
    game.increase_p2_score(500);
    expect(game.get_status('p2_score')).toBe(500);
  });
});
```

- [ ] **Step 2: Create test/objects/commanders.test.js**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { Commander, UserCommander, EnemyAICommander, MissileCommander } from '../../src/objects/commanders.js';
import { Direction } from '../../src/constants.js';

describe('Commander', () => {
  it('creates direction command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.turn('down');
    expect(cmd.commands.length).toBe(1);
    expect(cmd.commands[0].type).toBe('direction');
    expect(cmd.commands[0].params.direction).toBe(Direction.DOWN);
  });

  it('creates start_move command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.start_move(10);
    expect(cmd.commands[0].type).toBe('start_move');
    expect(cmd.commands[0].params.offset).toBe(10);
  });

  it('creates stop_move command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.stop_move();
    expect(cmd.commands[0].type).toBe('stop_move');
  });

  it('creates fire command', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.fire();
    expect(cmd.commands[0].type).toBe('fire');
  });

  it('direction_changed detects when direction differs', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    expect(cmd.direction_changed('down')).toBe(true);
    expect(cmd.direction_changed('up')).toBe(false);
  });

  it('next_commands deduplicates by type', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new Commander(map_unit);
    cmd.next = () => {
      cmd.fire();
      cmd.fire();
      cmd.start_move();
    };
    const commands = cmd.next_commands();
    expect(commands.length).toBe(2);
  });
});

describe('UserCommander', () => {
  let cmd;

  beforeEach(() => {
    const map_unit = { direction: Direction.UP };
    cmd = new UserCommander(map_unit);
  });

  it('tracks on-going commands', () => {
    cmd.on_command_start('fire');
    expect(cmd.is_on_going('fire')).toBe(true);

    cmd.on_command_end('fire');
    expect(cmd.is_on_going('fire')).toBe(false);
  });

  it('reset clears all state', () => {
    cmd.on_command_start('up');
    cmd.reset();
    expect(cmd.is_on_going('up')).toBe(false);
  });

  it('generates fire command from on-going', () => {
    cmd.on_command_start('fire');
    const commands = cmd.next_commands();
    const has_fire = commands.some(c => c.type === 'fire');
    expect(has_fire).toBe(true);
  });

  it('generates move commands from on-going direction', () => {
    cmd.on_command_start('right');
    const commands = cmd.next_commands();
    const has_direction = commands.some(c => c.type === 'direction');
    const has_move = commands.some(c => c.type === 'start_move');
    expect(has_direction).toBe(true);
    expect(has_move).toBe(true);
  });
});

describe('MissileCommander', () => {
  it('always generates start_move', () => {
    const map_unit = { direction: Direction.UP };
    const cmd = new MissileCommander(map_unit);
    const commands = cmd.next_commands();
    expect(commands.some(c => c.type === 'start_move')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add test/
git commit -m "test: add unit tests for Game class and Commander classes"
```

---

## Task 9: Unit Tests — Terrain and Map Builder

**Files:**
- Create: `test/map/terrains.test.js`
- Create: `test/map/tiled_map_builder.test.js`

- [ ] **Step 1: Create test/map/terrains.test.js**

Test the terrain weight() and defend() logic without canvas rendering:

```js
import { describe, it, expect } from 'vitest';
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  IceTerrain,
  GrassTerrain
} from '../../src/map/terrains.js';

describe('BrickTerrain', () => {
  it('weight is inversely proportional to power', () => {
    const terrain = Object.create(BrickTerrain.prototype);
    expect(terrain.weight({ power: 1 })).toBe(40);
    expect(terrain.weight({ power: 2 })).toBe(20);
    expect(terrain.weight({ power: 4 })).toBe(10);
  });

  it('type is brick', () => {
    const terrain = Object.create(BrickTerrain.prototype);
    expect(terrain.type()).toBe('brick');
  });
});

describe('IronTerrain', () => {
  it('weight is infinity for power 1', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 1 })).toBe(65535);
  });

  it('weight is 20 for power 2', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 2 })).toBe(20);
  });

  it('weight is 10 for power >= 3', () => {
    const terrain = Object.create(IronTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ power: 3 })).toBe(10);
    expect(terrain.weight({ power: 4 })).toBe(10);
  });

  it('type is iron', () => {
    const terrain = Object.create(IronTerrain.prototype);
    expect(terrain.type()).toBe('iron');
  });
});

describe('WaterTerrain', () => {
  it('weight is 4 when tank has ship', () => {
    const terrain = Object.create(WaterTerrain.prototype);
    expect(terrain.weight({ ship: true })).toBe(4);
  });

  it('weight is infinity when tank has no ship', () => {
    const terrain = Object.create(WaterTerrain.prototype);
    terrain.map = { infinity: 65535 };
    expect(terrain.weight({ ship: false })).toBe(65535);
  });
});

describe('IceTerrain', () => {
  it('weight is always 4', () => {
    const terrain = Object.create(IceTerrain.prototype);
    expect(terrain.weight({})).toBe(4);
  });

  it('accepts any unit', () => {
    const terrain = Object.create(IceTerrain.prototype);
    expect(terrain.accept({})).toBe(true);
  });
});

describe('GrassTerrain', () => {
  it('weight is always 4', () => {
    const terrain = Object.create(GrassTerrain.prototype);
    expect(terrain.weight({})).toBe(4);
  });

  it('accepts any unit', () => {
    const terrain = Object.create(GrassTerrain.prototype);
    expect(terrain.accept({})).toBe(true);
  });
});
```

- [ ] **Step 2: Create test/map/tiled_map_builder.test.js**

```js
import { describe, it, expect } from 'vitest';
import { typeToClass } from '../../src/map/tiled_map_builder.js';
import {
  BrickTerrain,
  IronTerrain,
  WaterTerrain,
  GrassTerrain,
  HomeTerrain,
  IceTerrain
} from '../../src/map/terrains.js';

describe('typeToClass', () => {
  it('maps BrickTerrain', () => {
    expect(typeToClass('BrickTerrain')).toBe(BrickTerrain);
  });

  it('maps IronTerrain', () => {
    expect(typeToClass('IronTerrain')).toBe(IronTerrain);
  });

  it('maps WaterTerrain', () => {
    expect(typeToClass('WaterTerrain')).toBe(WaterTerrain);
  });

  it('maps GrassTerrain', () => {
    expect(typeToClass('GrassTerrain')).toBe(GrassTerrain);
  });

  it('maps HomeTerrain', () => {
    expect(typeToClass('HomeTerrain')).toBe(HomeTerrain);
  });

  it('maps IceTerrain', () => {
    expect(typeToClass('IceTerrain')).toBe(IceTerrain);
  });

  it('defaults to BrickTerrain for unknown type', () => {
    expect(typeToClass('UnknownTerrain')).toBe(BrickTerrain);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add test/
git commit -m "test: add unit tests for terrain classes and map builder"
```

---

## Task 10: Unit Tests — Tanks, Missiles, and Gifts

**Files:**
- Create: `test/objects/tanks.test.js`
- Create: `test/objects/missile.test.js`
- Create: `test/objects/gifts.test.js`

- [ ] **Step 1: Create test/objects/tanks.test.js**

```js
import { describe, it, expect } from 'vitest';
import { Tank, UserTank, EnemyTank, StupidTank, FoolTank, FishTank, StrongTank } from '../../src/objects/tanks.js';

describe('Tank (base)', () => {
  function makeTank() {
    const t = Object.create(Tank.prototype);
    t.hp = 1;
    t.power = 1;
    t.level = 1;
    t.max_missile = 1;
    t.max_hp = 2;
    t.missiles = [];
    t.ship = false;
    t.guard = false;
    t.initializing = false;
    t.frozen = false;
    return t;
  }

  it('dead() returns true when hp <= 0', () => {
    const t = makeTank();
    t.hp = 0;
    expect(t.dead()).toBe(true);
  });

  it('dead() returns false when hp > 0', () => {
    const t = makeTank();
    expect(t.dead()).toBe(false);
  });

  it('level_up caps at 3', () => {
    const t = makeTank();
    t.update_display = () => {};
    t.level_up(5);
    expect(t.level).toBe(3);
  });

  it('level_up adjusts power and max_missile', () => {
    const t = makeTank();
    t.update_display = () => {};

    t.level_up(1); // level 2
    expect(t.level).toBe(2);
    expect(t.power).toBe(1);
    expect(t.max_missile).toBe(2);

    t.level_up(1); // level 3
    expect(t.level).toBe(3);
    expect(t.power).toBe(2);
    expect(t.max_missile).toBe(2);
  });

  it('can_fire returns true when missiles < max_missile', () => {
    const t = makeTank();
    expect(t.can_fire()).toBe(true);
  });

  it('can_fire returns false when missiles >= max_missile', () => {
    const t = makeTank();
    t.missiles = [{}];
    expect(t.can_fire()).toBe(false);
  });

  it('delete_missile removes from list', () => {
    const t = makeTank();
    const m1 = { id: 1 };
    const m2 = { id: 2 };
    t.missiles = [m1, m2];
    t.delete_missile(m1);
    expect(t.missiles).toEqual([m2]);
  });
});

describe('Tank speeds', () => {
  it('UserTank speed is 0.13', () => {
    expect(UserTank.speed).toBe(0.13);
  });

  it('StupidTank speed is 0.07', () => {
    expect(StupidTank.speed).toBe(0.07);
  });

  it('FoolTank speed is 0.07', () => {
    expect(FoolTank.speed).toBe(0.07);
  });

  it('FishTank speed is 0.13', () => {
    expect(FishTank.speed).toBe(0.13);
  });

  it('StrongTank speed is 0.07', () => {
    expect(StrongTank.speed).toBe(0.07);
  });
});

describe('Tank types', () => {
  it('StupidTank type is stupid', () => {
    const t = Object.create(StupidTank.prototype);
    expect(t.type()).toBe('stupid');
  });

  it('FoolTank type is fool', () => {
    const t = Object.create(FoolTank.prototype);
    expect(t.type()).toBe('fool');
  });

  it('FishTank type is fish', () => {
    const t = Object.create(FishTank.prototype);
    expect(t.type()).toBe('fish');
  });

  it('StrongTank type is strong', () => {
    const t = Object.create(StrongTank.prototype);
    expect(t.type()).toBe('strong');
  });
});
```

- [ ] **Step 2: Create test/objects/missile.test.js**

```js
import { describe, it, expect } from 'vitest';
import { Missile } from '../../src/objects/missile.js';
import { Direction } from '../../src/constants.js';
import { MapArea2D } from '../../src/map/map_area_2d.js';

describe('Missile', () => {
  it('speed is 0.2', () => {
    expect(Missile.speed).toBe(0.2);
  });

  it('type is missile', () => {
    const m = Object.create(Missile.prototype);
    expect(m.type()).toBe('missile');
  });

  it('animation_state is missile', () => {
    const m = Object.create(Missile.prototype);
    expect(m.animation_state()).toBe('missile');
  });

  it('destroy_area computes correct area for UP direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.UP;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(10);  // 20 - 40/4 = 10
    expect(da.y1).toBe(0);   // 10 - 40/4 = 0
    expect(da.x2).toBe(40);  // 30 + 40/4 = 40
    expect(da.y2).toBe(10);  // y1
  });

  it('destroy_area computes correct area for RIGHT direction', () => {
    const m = Object.create(Missile.prototype);
    m.direction = Direction.RIGHT;
    m.area = new MapArea2D(20, 10, 30, 30);
    m.default_width = 40;
    m.default_height = 40;

    const da = m.destroy_area();
    expect(da.x1).toBe(30);  // x2
    expect(da.y1).toBe(0);   // 10 - 40/4
    expect(da.x2).toBe(40);  // 30 + 40/4
    expect(da.y2).toBe(40);  // 30 + 40/4
  });
});
```

- [ ] **Step 3: Create test/objects/gifts.test.js**

```js
import { describe, it, expect, vi } from 'vitest';
import { getGiftClasses, GunGift, StarGift, ShipGift, HatGift, ClockGift, LifeGift, LandMineGift, ShovelGift } from '../../src/objects/gifts.js';

describe('getGiftClasses', () => {
  it('returns 8 gift types', () => {
    expect(getGiftClasses()).toHaveLength(8);
  });

  it('includes all gift types', () => {
    const classes = getGiftClasses();
    expect(classes).toContain(GunGift);
    expect(classes).toContain(HatGift);
    expect(classes).toContain(ShipGift);
    expect(classes).toContain(StarGift);
    expect(classes).toContain(LifeGift);
    expect(classes).toContain(ClockGift);
    expect(classes).toContain(ShovelGift);
    expect(classes).toContain(LandMineGift);
  });
});

describe('Gift types', () => {
  it('GunGift type is gun', () => {
    const g = Object.create(GunGift.prototype);
    expect(g.type()).toBe('gun');
  });

  it('StarGift type is star', () => {
    const g = Object.create(StarGift.prototype);
    expect(g.type()).toBe('star');
  });

  it('ShipGift type is ship', () => {
    const g = Object.create(ShipGift.prototype);
    expect(g.type()).toBe('ship');
  });

  it('HatGift type is hat', () => {
    const g = Object.create(HatGift.prototype);
    expect(g.type()).toBe('hat');
  });

  it('ClockGift type is clock', () => {
    const g = Object.create(ClockGift.prototype);
    expect(g.type()).toBe('clock');
  });

  it('LifeGift type is life', () => {
    const g = Object.create(LifeGift.prototype);
    expect(g.type()).toBe('life');
  });

  it('LandMineGift type is land_mine', () => {
    const g = Object.create(LandMineGift.prototype);
    expect(g.type()).toBe('land_mine');
  });

  it('ShovelGift type is shovel', () => {
    const g = Object.create(ShovelGift.prototype);
    expect(g.type()).toBe('shovel');
  });
});

describe('GunGift.apply', () => {
  it('levels up tank by 2', () => {
    const g = Object.create(GunGift.prototype);
    const tank = { level_up: vi.fn() };
    g.apply(tank);
    expect(tank.level_up).toHaveBeenCalledWith(2);
  });
});

describe('StarGift.apply', () => {
  it('levels up tank by 1', () => {
    const g = Object.create(StarGift.prototype);
    const tank = { level_up: vi.fn() };
    g.apply(tank);
    expect(tank.level_up).toHaveBeenCalledWith(1);
  });
});

describe('ShipGift.apply', () => {
  it('enables ship on tank', () => {
    const g = Object.create(ShipGift.prototype);
    const tank = { on_ship: vi.fn() };
    g.apply(tank);
    expect(tank.on_ship).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add test/
git commit -m "test: add unit tests for tanks, missiles, and gifts"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Preview production build and verify game plays correctly**

```bash
npx vite preview
```

Play through at least one full stage to verify everything works.

- [ ] **Step 4: Verify no lodash, jQuery, or CoffeeScript references remain**

```bash
grep -r '\b_\.' src/ --include='*.js' | head -20
grep -r '\$(' src/ --include='*.js' | head -20
grep -r 'initClass' src/ --include='*.js' | head -20
grep -r 'Array\.from' src/ --include='*.js' | head -20
grep -r 'coffeescript' . --include='*.js' --include='*.html' | head -20
```

Expected: No matches for any of these patterns.

- [ ] **Step 5: Final commit if any fixes were needed**

Only commit if changes were required.
