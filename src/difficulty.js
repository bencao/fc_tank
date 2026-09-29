// What the difficulty dial on the welcome screen changes, easiest first.
//   jev_guide      - TypeSafe Jev picks each enemy's objective (see src/ai/enemy_guide.js)
//   shoot_on_sight - enemies turn and fire on a player lined up with a clear shot
//   extra_enemy_hp - hit points added to every enemy tank as it arrives
export const DIFFICULTIES = [
  { name: "EASY", jev_guide: false, shoot_on_sight: false, extra_enemy_hp: 0 },
  { name: "NORMAL", jev_guide: true, shoot_on_sight: true, extra_enemy_hp: 0 },
  { name: "HARD", jev_guide: true, shoot_on_sight: true, extra_enemy_hp: 2 }
];

export const DEFAULT_DIFFICULTY = 1;
