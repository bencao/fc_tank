// What the difficulty dial on the welcome screen changes, easiest first.
//   jev_guide      - TypeSafe Jev picks each enemy's objective (see src/ai/enemy_guide.js);
//                    otherwise enemies use the classic built-in AI
//   blunder_rate   - chance an enemy idles or heads the wrong way instead of
//                    following its plan, each time it plans a route
//   shoot_on_sight - enemies turn and fire on a player lined up with a clear shot
//   extra_enemy_hp - hit points added to every enemy tank as it arrives
//   player_level   - the lowest level a player tank arrives at (2 is the
//                    intermediate tank: two missiles at once and an extra hit)
//
// Whatever the level, player tanks and their missiles move 1.2x faster than
// they otherwise would (see UserTank in src/objects/tanks.js).
export const DIFFICULTIES = [
  { name: "EASY", jev_guide: false, blunder_rate: 0.5, shoot_on_sight: false, extra_enemy_hp: 0, player_level: 1 },
  { name: "NORMAL", jev_guide: false, blunder_rate: 0.25, shoot_on_sight: false, extra_enemy_hp: 0, player_level: 1 },
  { name: "HARD", jev_guide: false, blunder_rate: 0, shoot_on_sight: true, extra_enemy_hp: 1, player_level: 2 },
  { name: "NIGHTMARE", jev_guide: true, blunder_rate: 0, shoot_on_sight: true, extra_enemy_hp: 1, player_level: 2 }
];

export const DEFAULT_DIFFICULTY = 1;
