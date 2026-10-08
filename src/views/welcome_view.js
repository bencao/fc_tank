import { View } from "../engine/view.js";
import { Animations } from "../constants.js";
import { MapArea2D } from "../map/map_area_2d.js";
import { DIFFICULTIES } from "../difficulty.js";

// The menu rows - players, difficulty dial, copyright - from the top down.
const MENU_TOP = 320;
const MENU_STEP = 36;

// The difficulty row lists every level at once, the chosen one lit and
// underlined. Courier advances 0.6em a character, so the row lays out by count.
const DIAL_FONT_SIZE = 16;
const DIAL_CHAR_WIDTH = DIAL_FONT_SIZE * 0.6;
const DIAL_GAP = 2 * DIAL_CHAR_WIDTH;
const DIAL_LEFT = 300 - (DIFFICULTIES.reduce((width, { name }) => width + name.length * DIAL_CHAR_WIDTH, 0) +
  (DIFFICULTIES.length - 1) * DIAL_GAP) / 2;
const DIAL_DIM = "#555";
const DIAL_LIT = { NIGHTMARE: "#f33" };
const DIAL_LIT_DEFAULT = "#fc6";

export class WelcomeView extends View {
  init_view() {
    this.static_group = new Kinetic.Group();
    this.layer.add(this.static_group);
    this.init_score_label();
    this.init_tank_90_logo();
    this.init_player_mode_selection_text();
    this.init_player_mode_selection_tank();
    this.init_difficulty_dial();
    return this.init_copy_right_text();
  }

  update_scores(p1_score, p2_score, hi_score) {
    return this.score_label.setText(`I- ${p1_score}  II- ${p2_score}  HI- ${hi_score}`);
  }

  // mode: the menu row picked - 1 PLAYER, 2 PLAYERS, FRIENDS PLAY.
  update_player_mode(mode) {
    return this.selection_tank.setAbsolutePosition(170, MENU_TOP + 10 + mode * MENU_STEP);
  }

  update_difficulty(name) {
    const ink = DIAL_LIT[name] ?? DIAL_LIT_DEFAULT;
    this.difficulty_labels.forEach((label, level) => {
      const chosen = DIFFICULTIES[level].name === name;
      label.setFill(chosen ? ink : DIAL_DIM);
      if (chosen) {
        this.difficulty_marker.setX(this.difficulty_spans[level].x);
        this.difficulty_marker.setWidth(this.difficulty_spans[level].width);
      }
    });
    return this.difficulty_marker.setFill(ink);
  }

  play_start_animation(callback) {
    this.static_group.move(-300, 0);
    return new Kinetic.Tween({
      node    : this.static_group,
      duration: 1.2,
      x       : 0,
      easing  : Kinetic.Easings.Linear,
      onFinish: callback
    }).play();
  }

  init_score_label() {
    this.score_label = new Kinetic.Text({
      x         : 40,
      y         : 40,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "",
      fill      : "#fff"
    });
    return this.static_group.add(this.score_label);
  }

  init_tank_90_logo() {
    const image = document.getElementById('tank_sprite');
    return (() => {
      const result = [];
      for (let area of [
      // T
      new MapArea2D(80, 100, 120, 110),
      new MapArea2D(120, 100, 140, 110),
      new MapArea2D(100, 110, 120, 140),
      new MapArea2D(100, 140, 120, 170),
      // A
      new MapArea2D(170, 100, 200, 110),
      new MapArea2D(160, 110, 180, 120),
      new MapArea2D(190, 110, 210, 120),
      new MapArea2D(150, 120, 170, 140),
      new MapArea2D(150, 140, 170, 170),
      new MapArea2D(200, 120, 220, 140),
      new MapArea2D(200, 140, 220, 170),
      new MapArea2D(170, 140, 200, 150),
      // N
      new MapArea2D(230, 100, 250, 140),
      new MapArea2D(230, 140, 250, 170),
      new MapArea2D(250, 110, 260, 140),
      new MapArea2D(260, 120, 270, 150),
      new MapArea2D(270, 130, 280, 160),
      new MapArea2D(280, 100, 300, 140),
      new MapArea2D(280, 140, 300, 170),
      // K
      new MapArea2D(310, 100, 330, 140),
      new MapArea2D(310, 140, 330, 170),
      new MapArea2D(360, 100, 380, 110),
      new MapArea2D(350, 110, 370, 120),
      new MapArea2D(340, 120, 360, 130),
      new MapArea2D(330, 130, 350, 140),
      new MapArea2D(330, 140, 360, 150),
      new MapArea2D(340, 150, 370, 160),
      new MapArea2D(350, 160, 380, 170),
      // C - means coffee
      new MapArea2D(440, 100, 490, 110),
      new MapArea2D(430, 110, 450, 120),
      new MapArea2D(480, 110, 500, 120),
      new MapArea2D(420, 120, 440, 130),
      new MapArea2D(420, 130, 440, 140),
      new MapArea2D(420, 140, 440, 150),
      new MapArea2D(430, 150, 450, 160),
      new MapArea2D(480, 150, 500, 160),
      new MapArea2D(440, 160, 490, 170),

      // 1
      new MapArea2D(180, 210, 200, 220),
      new MapArea2D(170, 220, 200, 230),
      new MapArea2D(180, 230, 200, 250),
      new MapArea2D(180, 250, 200, 270),
      new MapArea2D(160, 270, 200, 280),
      new MapArea2D(200, 270, 220, 280),
      // 9
      new MapArea2D(240, 210, 260, 220),
      new MapArea2D(260, 210, 290, 220),
      new MapArea2D(230, 220, 250, 240),
      new MapArea2D(280, 220, 300, 240),
      new MapArea2D(240, 240, 260, 250),
      new MapArea2D(260, 240, 300, 250),
      new MapArea2D(280, 250, 300, 260),
      new MapArea2D(270, 260, 290, 270),
      new MapArea2D(240, 270, 280, 280),
      // 9
      new MapArea2D(320, 210, 340, 220),
      new MapArea2D(340, 210, 370, 220),
      new MapArea2D(310, 220, 330, 240),
      new MapArea2D(360, 220, 380, 240),
      new MapArea2D(320, 240, 340, 250),
      new MapArea2D(340, 240, 380, 250),
      new MapArea2D(360, 250, 380, 260),
      new MapArea2D(350, 260, 370, 270),
      new MapArea2D(320, 270, 360, 280),
      // 0
      new MapArea2D(410, 210, 440, 220),
      new MapArea2D(400, 220, 410, 230),
      new MapArea2D(430, 220, 450, 230),
      new MapArea2D(390, 230, 410, 260),
      new MapArea2D(440, 230, 460, 260),
      new MapArea2D(400, 260, 420, 270),
      new MapArea2D(440, 260, 450, 270),
      new MapArea2D(410, 270, 440, 280)
    ]) {
        var animation;
        const animations = structuredClone(Animations.terrain('brick'));
        for (animation of animations) {
          animation.x += (area.x1 % 40);
          animation.y += (area.y1 % 40);
          animation.width = area.width();
          animation.height = area.height();
        }
        result.push(this.static_group.add(new Kinetic.Sprite({
          x         : area.x1,
          y         : area.y1,
          image,
          index     : 0,
          animation : 'static',
          animations: {static: animations}
        })));
      }
      return result;
    })();
  }

  init_player_mode_selection_text() {
    ["1 PLAYER", "2 PLAYERS", "FRIENDS PLAY"].forEach((text, row) => {
      this.static_group.add(new Kinetic.Text({
        x         : 210,
        y         : MENU_TOP + row * MENU_STEP,
        fontSize  : 22,
        fontStyle : "bold",
        fontFamily: "Courier",
        text,
        fill      : "#fff"
      }));
    });
  }

  init_difficulty_dial() {
    const y = MENU_TOP + 3 * MENU_STEP + 4;
    let x = DIAL_LEFT;
    // Where each label sits along the row, for the underline.
    this.difficulty_spans = [];
    this.difficulty_labels = DIFFICULTIES.map(({ name }) => {
      const width = name.length * DIAL_CHAR_WIDTH;
      this.difficulty_spans.push({ x, width });
      const label = new Kinetic.Text({
        x,
        y,
        fontSize  : DIAL_FONT_SIZE,
        fontStyle : "bold",
        fontFamily: "Courier",
        text      : name,
        fill      : DIAL_DIM
      });
      x += width + DIAL_GAP;
      this.static_group.add(label);
      return label;
    });
    this.difficulty_marker = new Kinetic.Rect({
      x     : DIAL_LEFT,
      y     : y + DIAL_FONT_SIZE + 3,
      width : 0,
      height: 2,
      fill  : DIAL_LIT_DEFAULT
    });
    return this.static_group.add(this.difficulty_marker);
  }

  init_copy_right_text() {
    return this.static_group.add(new Kinetic.Text({
      x         : 210,
      y         : MENU_TOP + 4 * MENU_STEP,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "© BEN♥FENG",
      fill      : "#fff"
    }));
  }

  init_player_mode_selection_tank() {
    // tank
    const image = document.getElementById('tank_sprite');
    this.selection_tank = new Kinetic.Sprite({
      x: 170,
      y: MENU_TOP + 10,
      image,
      animation: 'user_p1_lv1',
      animations: Animations.movables,
      frameRate: Animations.rate('user_p1_lv1'),
      index: 0,
      offset: {x: 20, y: 20},
      rotationDeg: 90
    });
    this.static_group.add(this.selection_tank);
    return this.selection_tank.start();
  }
}
