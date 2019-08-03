import { View } from "../engine/view.js";

export class BattleFieldView extends View {
  init_view() {
    this.status_panel = new Kinetic.Group();
    this.layer.add(this.status_panel);
    this.init_bg();
    this.init_frame_rate();
    this.init_enemy_tanks_statuses();
    this.init_p1_tank_status();
    this.init_p2_tank_status();
    return this.init_stage();
  }

  update_enemy_statuses(remain_enemy_counts) {
    _.each(this.enemy_symbols, symbol => symbol.destroy());
    this.enemy_symbols = [];
    if (remain_enemy_counts > 0) {
      return (() => {
        const result = [];
        for (let i = 1, end = remain_enemy_counts, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
          const tx = ((i % 2) === 1 ? 540 : 560);
          const ty = (parseInt((i - 1) / 2) * 25) + 20;
          const symbol = this.new_symbol(this.status_panel, 'enemy', tx, ty);
          result.push(this.enemy_symbols.push(symbol));
        }
        return result;
      })();
    }
  }

  update_p1_lives(remain_user_p1_lives) {
    return this.user_p1_remain_lives_label.setText(remain_user_p1_lives);
  }

  update_p2_lives(remain_user_p2_lives) {
    return this.user_p2_remain_lives_label.setText(remain_user_p2_lives);
  }

  update_stage(current_stage) {
    return this.stage_label.setText(current_stage);
  }

  update_frame_rate(frame_rate) {
    return this.frame_rate_label.setText(frame_rate + " fps");
  }

  draw_point_label(relative_to_object, text) {
    const point_label = new Kinetic.Text({
      x         : ((relative_to_object.area.x1 + relative_to_object.area.x2) / 2) - 10,
      y         : ((relative_to_object.area.y1 + relative_to_object.area.y2) / 2) - 5,
      fontSize  : 16,
      fontStyle : "bold",
      fontFamily: "Courier",
      text,
      fill      : "#fff"
    });
    this.status_panel.add(point_label);
    return setTimeout(() => point_label.destroy()
    , 1200);
  }

  init_bg() {
    return this.status_panel.add(new Kinetic.Rect({
      x     : 520,
      y     : 0,
      fill  : "#999",
      width : 80,
      height: 520
    }));
  }

  init_frame_rate() {
    this.frame_rate = 0;
    this.frame_rate_label = new Kinetic.Text({
      x         : 526,
      y         : 490,
      fontSize  : 20,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0 fps",
      fill      : "#c00"
    });
    return this.status_panel.add(this.frame_rate_label);
  }

  init_enemy_tanks_statuses() {
    this.enemy_symbols = [];
    return (() => {
      const result = [];
      for (let i = 1, end = this.remain_enemy_counts, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const tx = ((i % 2) === 1 ? 540 : 560);
        const ty = (parseInt((i - 1) / 2) * 25) + 20;
        const symbol = this.new_symbol(this.status_panel, 'enemy', tx, ty);
        result.push(this.enemy_symbols.push(symbol));
      }
      return result;
    })();
  }

  init_p1_tank_status() {
    const user_p1_label = new Kinetic.Text({
      x         : 540,
      y         : 300,
      fontSize  : 18,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "1P",
      fill      : "#000"
    });
    const user_p1_symbol = this.new_symbol(this.status_panel, 'user', 540, 320);
    this.user_p1_remain_lives_label = new Kinetic.Text({
      x         : 565,
      y         : 324,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : `${this.remain_user_p1_lives}`,
      fill      : "#000"
    });
    this.status_panel.add(user_p1_label);
    return this.status_panel.add(this.user_p1_remain_lives_label);
  }

  init_p2_tank_status() {
    const user_p2_label = new Kinetic.Text({
      x         : 540,
      y         : 350,
      fontSize  : 18,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "2P",
      fill      : "#000"
    });
    const user_p2_symbol = this.new_symbol(this.status_panel, 'user', 540, 370);
    this.user_p2_remain_lives_label = new Kinetic.Text({
      x         : 565,
      y         : 374,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : `${this.remain_user_p2_lives}`,
      fill      : "#000"
    });
    this.status_panel.add(user_p2_label);
    return this.status_panel.add(this.user_p2_remain_lives_label);
  }

  init_stage() {
    this.new_symbol(this.status_panel, 'stage', 540, 420);
    this.stage_label = new Kinetic.Text({
      x         : 560,
      y         : 445,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : `${this.current_stage}`,
      fill      : "#000"
    });
    return this.status_panel.add(this.stage_label);
  }

  new_symbol(parent, type, tx, ty) {
    const image = document.getElementById('tank_sprite');
    const animations = (() => { switch (type) {
      case 'enemy':
        return [{x: 320, y: 340, width: 20, height: 20}];
      case 'user':
        return [{x: 340, y: 340, width: 20, height: 20}];
      case 'stage':
        return [{x: 280, y: 340, width: 40, height: 40}];
    } })();
    const symbol = new Kinetic.Sprite({
      x         : tx,
      y         : ty,
      image,
      animation : 'static',
      animations: {
        'static': animations
      },
      frameRate : 1,
      index     : 0
    });
    parent.add(symbol);
    symbol.start();
    return symbol;
  }
}
