export class Direction {
  static initClass() {
    this.UP = 0;
    this.DOWN = 180;
    this.LEFT = 270;
    this.RIGHT = 90;
  }
  static all() {
    return [this.UP, this.DOWN, this.LEFT, this.RIGHT];
  }
}
Direction.initClass();

export class Animations {
  static initClass() {
    this.movables = {
      bom: [
        { x: 360, y: 340, width: 40, height: 40 },
        { x: 120, y: 340, width: 40, height: 40 },
        { x: 160, y: 340, width: 40, height: 40 },
        { x: 200, y: 340, width: 40, height: 40 }
      ],
      tank_born: [
        { x: 360, y: 340, width: 40, height: 40 },
        { x: 0, y: 340, width: 40, height: 40 },
        { x: 40, y: 340, width: 40, height: 40 },
        { x: 0, y: 340, width: 40, height: 40 },
        { x: 80, y: 340, width: 40, height: 40 }
      ],
      user_p1_lv1: [{ x: 0, y: 0, width: 40, height: 40 }],
      user_p1_lv1_frozen: [
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p1_lv1_with_ship: [{ x: 40, y: 0, width: 40, height: 40 }],
      user_p1_lv1_with_guard: [
        { x: 0, y: 0, width: 40, height: 40 },
        { x: 80, y: 0, width: 40, height: 40 }
      ],
      user_p1_lv2: [{ x: 120, y: 0, width: 40, height: 40 }],
      user_p1_lv2_frozen: [
        { x: 120, y: 0, width: 40, height: 40 },
        { x: 120, y: 0, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p1_lv2_with_ship: [{ x: 160, y: 0, width: 40, height: 40 }],
      user_p1_lv2_with_guard: [
        { x: 120, y: 0, width: 40, height: 40 },
        { x: 200, y: 0, width: 40, height: 40 }
      ],
      user_p1_lv3: [{ x: 240, y: 0, width: 40, height: 40 }],
      user_p1_lv3_frozen: [
        { x: 240, y: 0, width: 40, height: 40 },
        { x: 240, y: 0, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p1_lv3_with_ship: [{ x: 280, y: 0, width: 40, height: 40 }],
      user_p1_lv3_with_guard: [
        { x: 240, y: 0, width: 40, height: 40 },
        { x: 320, y: 0, width: 40, height: 40 }
      ],
      user_p2_lv1: [{ x: 0, y: 40, width: 40, height: 40 }],
      user_p2_lv1_frozen: [
        { x: 0, y: 40, width: 40, height: 40 },
        { x: 0, y: 40, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p2_lv1_with_ship: [{ x: 40, y: 40, width: 40, height: 40 }],
      user_p2_lv1_with_guard: [
        { x: 0, y: 40, width: 40, height: 40 },
        { x: 80, y: 40, width: 40, height: 40 }
      ],
      user_p2_lv2: [{ x: 120, y: 40, width: 40, height: 40 }],
      user_p2_lv2_frozen: [
        { x: 120, y: 40, width: 40, height: 40 },
        { x: 120, y: 40, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p2_lv2_with_ship: [{ x: 160, y: 40, width: 40, height: 40 }],
      user_p2_lv2_with_guard: [
        { x: 120, y: 40, width: 40, height: 40 },
        { x: 200, y: 40, width: 40, height: 40 }
      ],
      user_p2_lv3: [{ x: 240, y: 40, width: 40, height: 40 }],
      user_p2_lv3_frozen: [
        { x: 240, y: 40, width: 40, height: 40 },
        { x: 240, y: 40, width: 40, height: 40 },
        { x: 360, y: 320, width: 40, height: 40 }
      ],
      user_p2_lv3_with_ship: [{ x: 280, y: 40, width: 40, height: 40 }],
      user_p2_lv3_with_guard: [
        { x: 240, y: 40, width: 40, height: 40 },
        { x: 320, y: 40, width: 40, height: 40 }
      ],
      enemy_lv3: [{ x: 360, y: 0, width: 40, height: 40 }],
      enemy_lv3_with_ship: [{ x: 360, y: 40, width: 40, height: 40 }],
      stupid_hp1: [{ x: 0, y: 80, width: 40, height: 40 }],
      stupid_hp1_with_ship: [{ x: 40, y: 80, width: 40, height: 40 }],
      stupid_hp2: [{ x: 80, y: 80, width: 40, height: 40 }],
      stupid_hp2_with_ship: [{ x: 120, y: 80, width: 40, height: 40 }],
      stupid_hp3: [{ x: 160, y: 80, width: 40, height: 40 }],
      stupid_hp3_with_ship: [{ x: 200, y: 80, width: 40, height: 40 }],
      stupid_hp4: [{ x: 240, y: 80, width: 40, height: 40 }],
      stupid_hp4_with_ship: [{ x: 280, y: 80, width: 40, height: 40 }],
      stupid_with_gift: [
        { x: 320, y: 80, width: 40, height: 40 },
        { x: 320, y: 80, width: 40, height: 40 },
        { x: 0, y: 80, width: 40, height: 40 }
      ],
      stupid_with_gift_with_ship: [
        { x: 360, y: 80, width: 40, height: 40 },
        { x: 40, y: 80, width: 40, height: 40 }
      ],
      fool_hp1: [{ x: 0, y: 120, width: 40, height: 40 }],
      fool_hp1_with_ship: [{ x: 40, y: 120, width: 40, height: 40 }],
      fool_hp2: [{ x: 80, y: 120, width: 40, height: 40 }],
      fool_hp2_with_ship: [{ x: 120, y: 120, width: 40, height: 40 }],
      fool_hp3: [{ x: 160, y: 120, width: 40, height: 40 }],
      fool_hp3_with_ship: [{ x: 200, y: 120, width: 40, height: 40 }],
      fool_hp4: [{ x: 240, y: 120, width: 40, height: 40 }],
      fool_hp4_with_ship: [{ x: 280, y: 120, width: 40, height: 40 }],
      fool_with_gift: [
        { x: 320, y: 120, width: 40, height: 40 },
        { x: 320, y: 120, width: 40, height: 40 },
        { x: 0, y: 120, width: 40, height: 40 }
      ],
      fool_with_gift_with_ship: [
        { x: 360, y: 120, width: 40, height: 40 },
        { x: 40, y: 120, width: 40, height: 40 }
      ],
      fish_hp1: [{ x: 0, y: 160, width: 40, height: 40 }],
      fish_hp1_with_ship: [{ x: 40, y: 160, width: 40, height: 40 }],
      fish_hp2: [{ x: 80, y: 160, width: 40, height: 40 }],
      fish_hp2_with_ship: [{ x: 120, y: 160, width: 40, height: 40 }],
      fish_hp3: [{ x: 160, y: 160, width: 40, height: 40 }],
      fish_hp3_with_ship: [{ x: 200, y: 160, width: 40, height: 40 }],
      fish_hp4: [{ x: 240, y: 160, width: 40, height: 40 }],
      fish_hp4_with_ship: [{ x: 280, y: 160, width: 40, height: 40 }],
      fish_with_gift: [
        { x: 320, y: 160, width: 40, height: 40 },
        { x: 320, y: 160, width: 40, height: 40 },
        { x: 0, y: 160, width: 40, height: 40 }
      ],
      fish_with_gift_with_ship: [
        { x: 360, y: 160, width: 40, height: 40 },
        { x: 40, y: 160, width: 40, height: 40 }
      ],
      strong_hp1: [{ x: 0, y: 200, width: 40, height: 40 }],
      strong_hp1_with_ship: [{ x: 40, y: 200, width: 40, height: 40 }],
      strong_hp2: [{ x: 80, y: 200, width: 40, height: 40 }],
      strong_hp2_with_ship: [{ x: 120, y: 200, width: 40, height: 40 }],
      strong_hp3: [{ x: 160, y: 200, width: 40, height: 40 }],
      strong_hp3_with_ship: [{ x: 200, y: 200, width: 40, height: 40 }],
      strong_hp4: [{ x: 240, y: 200, width: 40, height: 40 }],
      strong_hp4_with_ship: [{ x: 280, y: 200, width: 40, height: 40 }],
      strong_with_gift: [
        { x: 320, y: 200, width: 40, height: 40 },
        { x: 320, y: 200, width: 40, height: 40 },
        { x: 0, y: 200, width: 40, height: 40 }
      ],
      strong_with_gift_with_ship: [
        { x: 360, y: 200, width: 40, height: 40 },
        { x: 40, y: 200, width: 40, height: 40 }
      ],
      missile: [{ x: 250, y: 350, width: 20, height: 20 }]
    };

    this.gifts = {
      land_mine: [
        { x: 0, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      gun: [
        { x: 80, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      ship: [
        { x: 40, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      star: [
        { x: 160, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      shovel: [
        { x: 120, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      life: [
        { x: 240, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      hat: [
        { x: 200, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ],
      clock: [
        { x: 280, y: 300, width: 40, height: 40 },
        { x: 360, y: 300, width: 40, height: 40 }
      ]
    };

    this.rates = {
      bom: 12,
      tank_born: 7,

      user_p1_lv1: 1,
      user_p1_lv1_frozen: 0.5,
      user_p1_lv1_with_ship: 1,
      user_p1_lv1_with_guard: 4,
      user_p1_lv2: 1,
      user_p1_lv2_frozen: 1,
      user_p1_lv2_with_ship: 1,
      user_p1_lv2_with_guard: 4,
      user_p1_lv3: 1,
      user_p1_lv3_frozen: 1,
      user_p1_lv3_with_ship: 1,
      user_p1_lv3_with_guard: 4,

      user_p2_lv1: 1,
      user_p2_lv1_frozen: 1,
      user_p2_lv1_with_ship: 1,
      user_p2_lv1_with_guard: 4,
      user_p2_lv2: 1,
      user_p2_lv2_frozen: 1,
      user_p2_lv2_with_ship: 1,
      user_p2_lv2_with_guard: 4,
      user_p2_lv3: 1,
      user_p2_lv3_frozen: 1,
      user_p2_lv3_with_ship: 1,
      user_p2_lv3_with_guard: 4,

      enemy_lv3: 1,
      enemy_lv3_with_ship: 1,

      stupid_hp1: 1,
      stupid_hp1_with_ship: 1,
      stupid_hp2: 1,
      stupid_hp2_with_ship: 1,
      stupid_hp3: 1,
      stupid_hp3_with_ship: 1,
      stupid_hp4: 1,
      stupid_hp4_with_ship: 1,
      stupid_with_gift: 1,
      stupid_with_gift_with_ship: 1,

      fool_hp1: 1,
      fool_hp1_with_ship: 1,
      fool_hp2: 1,
      fool_hp2_with_ship: 1,
      fool_hp3: 1,
      fool_hp3_with_ship: 1,
      fool_hp4: 1,
      fool_hp4_with_ship: 1,
      fool_with_gift: 1,
      fool_with_gift_with_ship: 1,

      fish_hp1: 1,
      fish_hp1_with_ship: 1,
      fish_hp2: 1,
      fish_hp2_with_ship: 1,
      fish_hp3: 1,
      fish_hp3_with_ship: 1,
      fish_hp4: 1,
      fish_hp4_with_ship: 1,
      fish_with_gift: 1,
      fish_with_gift_with_ship: 1,

      strong_hp1: 1,
      strong_hp1_with_ship: 1,
      strong_hp2: 1,
      strong_hp2_with_ship: 1,
      strong_hp3: 1,
      strong_hp3_with_ship: 1,
      strong_hp4: 1,
      strong_hp4_with_ship: 1,
      strong_with_gift: 1,
      strong_with_gift_with_ship: 1,

      missile: 1,

      land_mine: 3,
      gun: 3,
      ship: 3,
      star: 3,
      shovel: 3,
      life: 3,
      hat: 3,
      clock: 3,

      brick: 1,
      iron: 1,
      water: 1,
      grass: 1,
      ice: 1,
      home: 1
    };

    this.terrains = {
      brick: [{ x: 0, y: 240, width: 40, height: 40 }],
      iron: [{ x: 120, y: 240, width: 40, height: 40 }],
      water: [{ x: 240, y: 240, width: 40, height: 40 }],
      ice: [{ x: 60, y: 240, width: 40, height: 40 }],
      grass: [{ x: 180, y: 240, width: 40, height: 40 }],
      home_origin: [{ x: 320, y: 240, width: 40, height: 40 }],
      home_destroyed: [{ x: 360, y: 240, width: 40, height: 40 }]
    };
  }
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
Animations.initClass();
