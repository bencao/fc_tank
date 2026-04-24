# Demo Mode Design

## Summary

Add an attract-mode / demo mode to the game. After 5 seconds of inactivity on the welcome screen, the game automatically starts a battle on a random stage with an AI-controlled player tank that efficiently hunts and kills enemies. Pressing ENTER during demo exits back to the welcome screen. Winning or losing in demo mode also returns to the welcome screen.

## Flow

```
Welcome Screen
  ├── User presses ENTER → normal game (stage select → battle)
  ├── User presses SPACE → toggle 1P/2P (resets inactivity timer)
  └── 5s inactivity → Demo Mode
        ├── Random stage (1–50) selected
        ├── stage_autostart = true (skip stage select input)
        ├── BattleFieldScene starts in demo_mode
        │     ├── P1 tank uses DemoAICommander (not UserCommander)
        │     ├── No keyboard controls for tank movement
        │     ├── ENTER → exit to welcome screen
        │     ├── User win → exit to welcome screen (skip report)
        │     └── Enemy win → exit to welcome screen (skip report)
        └── On exit: demo_mode reset to false, welcome screen resumes with fresh timer
```

## Changes by File

### 1. `src/game.js` — Game class

- Add `demo_mode: false` to `init_statuses()`.

### 2. `src/scenes/welcome_scene.js` — WelcomeScene

- Add `start_demo_timer()` method: sets a 5-second `setTimeout`. On fire: sets `demo_mode = true`, picks random stage, sets `stage_autostart = true`, switches to stage scene.
- Add `reset_demo_timer()` method: clears existing timer and restarts it.
- In `enable_selection_control()`: call `start_demo_timer()` after binding keys. Wrap ENTER and SPACE handlers to call `reset_demo_timer()` before their existing logic.
- In `stop()`: clear the demo timer to prevent it firing after scene exit.

### 3. `src/objects/commanders.js` — New DemoAICommander

New class extending `Commander`:

- **`next()`**: Main AI loop each frame:
  1. Get all enemy tanks from `this.map`.
  2. If no enemies, do nothing.
  3. Check if aligned (same x or same y within tank width) with any enemy — if so, turn toward it and fire.
  4. If not aligned, pathfind toward nearest enemy and move along path.
- **`find_nearest_enemy()`**: Return the enemy tank with smallest Manhattan distance.
- **`check_alignment()`**: For each enemy, check if `this.map_unit.area.x1 === enemy.area.x1` (vertical alignment) or `this.map_unit.area.y1 === enemy.area.y1` (horizontal alignment). Return the aligned enemy if found, or null.
- **`direction_toward(enemy)`**: Given alignment axis, return the direction to face the enemy.
- **Pathfinding**: Reuse `map.shortest_path()` like `EnemyAICommander`. Target the vertex of the nearest enemy. Re-path every 1–2 seconds.
- **Firing**: Always fire when aligned. Also fire with 5% chance when stuck (like enemy AI).

### 4. `src/objects/tanks.js` — UserP1Tank / UserP2Tank

No changes to tank classes. The commander swap happens in BattleFieldScene at spawn time.

### 5. `src/scenes/battle_field_scene.js` — BattleFieldScene

- **`start()`**: If `demo_mode`, skip `enable_user_control()`.
- **`born_p1_tank()`**: After spawning the tank, if `demo_mode`, replace `tank.commander` with a new `DemoAICommander(tank)`.
- **`born_p2_tank()`**: Same treatment (though demo will be 1P mode).
- **`enable_system_control()`**: If `demo_mode`, ENTER switches to welcome scene (instead of pause/resume).
- **`user_win()`**: If `demo_mode`, switch to welcome scene after timeout (skip report/save).
- **`enemy_win()`**: If `demo_mode`, switch to welcome scene after timeout (skip report/save).
- **`born_user_tanks()`**: When user tank is destroyed and respawns in demo mode, the new tank also gets `DemoAICommander`.

### 6. `src/scenes/stage_scene.js` — No changes needed

`stage_autostart` already auto-transitions to battle after 1.5s.
