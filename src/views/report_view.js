import { View } from "../engine/view.js";
import { Animations } from "../constants.js";

export class ReportView extends View {
  init_view() {
    this.init_hi_score();
    this.init_stage();
    this.init_bg();
    this.init_p1_scores();
    return this.init_p2_scores();
  }

  update_hi_score(score) {
    return this.hi_score_label.setText(score);
  }

  update_stage(stage) {
    return this.stage_label.setText(`STAGE ${stage}`);
  }

  show_p2_scores() {
    return this.p2_group.show();
  }

  update_p1_scores(p1_final_score, p1_scores_by_category) {
    for (let tank in p1_scores_by_category) {
      const number = p1_scores_by_category[tank];
      if (tank !== 'total_pts') { this.p1_number_labels[tank].setText(number); }
    }
    this.p1_score_label.setText(p1_final_score);
    return this.layer.draw();
  }

  update_p2_scores(p2_final_score, p2_scores_by_category) {
    for (let tank in p2_scores_by_category) {
      const number = p2_scores_by_category[tank];
      if (tank !== 'total_pts') { this.p2_number_labels[tank].setText(number); }
    }
    this.p2_score_label.setText(p2_final_score);
    return this.layer.draw();
  }

  init_hi_score() {
    this.layer.add(new Kinetic.Text({
      x         : 200,
      y         : 40,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "HI-SCORE",
      fill      : "#DB2B00"
    }));

    this.hi_score_label = new Kinetic.Text({
      x         : 328,
      y         : 40,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "",
      fill      : "#FF9B3B"
    });
    return this.layer.add(this.hi_score_label);
  }

  init_stage() {
    this.stage_label = new Kinetic.Text({
      x         : 250,
      y         : 80,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "",
      fill      : "#fff"
    });
    return this.layer.add(this.stage_label);
  }

  init_bg() {
    // center tanks
    const image = document.getElementById('tank_sprite');
    const tank_sprite = new Kinetic.Sprite({
      x          : 300,
      y          : 220,
      image,
      animation  : 'stupid_hp1',
      animations : Animations.movables,
      frameRate  : Animations.rate('stupid_hp1'),
      index      : 0,
      offset     : {x: 20, y: 20},
      rotationDeg: 0
    });
    this.layer.add(tank_sprite);
    this.layer.add(tank_sprite.clone({y: 280, animation: 'fish_hp1'}));
    this.layer.add(tank_sprite.clone({y: 340, animation: 'fool_hp1'}));
    this.layer.add(tank_sprite.clone({y: 400, animation: 'strong_hp1'}));
    // center underline
    return this.layer.add(new Kinetic.Rect({
      x     : 235,
      y     : 423,
      width : 130,
      height: 4,
      fill  : "#fff"
    }));
  }

  init_p1_scores() {
    this.p1_group = new Kinetic.Group();
    this.layer.add(this.p1_group);

    // p1 score
    this.p1_score_label = new Kinetic.Text({
      x         : 95,
      y         : 160,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0",
      fill      : "#FF9B3B",
      align     : "right",
      width     : 120
    });
    this.p1_group.add(this.p1_score_label);

    // p1 text
    this.p1_group.add(this.p1_score_label.clone({
      text: "I-PLAYER",
      fill: "#DB2B00",
      y   : 120
    }));

    // p1 pts * 4
    const p1_pts = this.p1_score_label.clone({
      x    : 175,
      y    : 210,
      text : "PTS",
      width: 40,
      fill : "#fff"
    });
    this.p1_group.add(p1_pts);
    this.p1_group.add(p1_pts.clone({y: 270}));
    this.p1_group.add(p1_pts.clone({y: 330}));
    this.p1_group.add(p1_pts.clone({y: 390}));
    this.p1_group.add(p1_pts.clone({x: 145, y: 430, text: "TOTAL", width: 70}));

    // p1 arrows * 4
    const p1_arrow = new Kinetic.Path({
      x     : 260,
      y     : 210,
      width : 16,
      height: 20,
      data  : 'M8,0 l-8,10 l8,10 l0,-6 l8,0 l0,-8 l-8,0 l0,-6 z',
      fill  : '#fff'
    });
    this.p1_group.add(p1_arrow);
    this.p1_group.add(p1_arrow.clone({y: 270}));
    this.p1_group.add(p1_arrow.clone({y: 330}));
    this.p1_group.add(p1_arrow.clone({y: 390}));

    const p1_number = this.p1_score_label.clone({
      fill : '#fff',
      x    : 226,
      y    : 210,
      width: 30,
      text : ''
    });
    const p1_number_pts                   = p1_number.clone({x:105, width: 60});
    this.p1_number_labels = {};
    this.p1_number_labels['stupid']     = p1_number;
    this.p1_number_labels['stupid_pts'] = p1_number_pts;
    this.p1_number_labels['fish']       = p1_number.clone({y: 270});
    this.p1_number_labels['fish_pts']   = p1_number_pts.clone({y: 270});
    this.p1_number_labels['fool']       = p1_number.clone({y: 330});
    this.p1_number_labels['fool_pts']   = p1_number_pts.clone({y: 330});
    this.p1_number_labels['strong']     = p1_number.clone({y: 390});
    this.p1_number_labels['strong_pts'] = p1_number_pts.clone({y: 390});
    this.p1_number_labels['total']      = p1_number.clone({y: 430});

    this.p1_group.add(this.p1_number_labels['stupid']);
    this.p1_group.add(this.p1_number_labels['stupid_pts']);
    this.p1_group.add(this.p1_number_labels['fish']);
    this.p1_group.add(this.p1_number_labels['fish_pts']);
    this.p1_group.add(this.p1_number_labels['fool']);
    this.p1_group.add(this.p1_number_labels['fool_pts']);
    this.p1_group.add(this.p1_number_labels['strong']);
    this.p1_group.add(this.p1_number_labels['strong_pts']);
    return this.p1_group.add(this.p1_number_labels['total']);
  }

  init_p2_scores() {
    this.p2_group = new Kinetic.Group();
    this.layer.add(this.p2_group);

    // p2 score
    this.p2_score_label = new Kinetic.Text({
      x         : 385,
      y         : 160,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0",
      fill      : "#FF9B3B"
    });
    this.p2_group.add(this.p2_score_label);
    // p2 text
    this.p2_group.add(this.p2_score_label.clone({
      text: "II-PLAYER",
      fill: "#DB2B00",
      y   : 120
    }));
    // p2 arrow * 4
    const p2_pts = this.p2_score_label.clone({
      y    : 210,
      text : "PTS",
      width: 40,
      fill : "#fff"
    });
    this.p2_group.add(p2_pts);
    this.p2_group.add(p2_pts.clone({y: 270}));
    this.p2_group.add(p2_pts.clone({y: 330}));
    this.p2_group.add(p2_pts.clone({y: 390}));
    this.p2_group.add(p2_pts.clone({y: 430, text: "TOTAL", width: 70}));

    // p2 arrow * 4
    const p2_arrow = new Kinetic.Path({
      x     : 324,
      y     : 210,
      width : 16,
      height: 20,
      data  : 'M8,0 l8,10 l-8,10 l0,-6 l-8,0 l0,-8 l8,0 l0,-6 z',
      fill  : '#fff'
    });
    this.p2_group.add(p2_arrow);
    this.p2_group.add(p2_arrow.clone({y: 270}));
    this.p2_group.add(p2_arrow.clone({y: 330}));
    this.p2_group.add(p2_arrow.clone({y: 390}));

    // p2 numbers
    const p2_number = this.p2_score_label.clone({
      fill: '#fff',
      x: 344,
      y: 210,
      width: 30,
      text: '75'
    });
    const p2_number_pts                   = p2_number.clone({x:435, width: 60, text: '3800'});
    this.p2_number_labels = {};
    this.p2_number_labels['stupid']     = p2_number;
    this.p2_number_labels['stupid_pts'] = p2_number_pts;
    this.p2_number_labels['fish']       = p2_number.clone({y: 270});
    this.p2_number_labels['fish_pts']   = p2_number_pts.clone({y: 270});
    this.p2_number_labels['fool']       = p2_number.clone({y: 330});
    this.p2_number_labels['fool_pts']   = p2_number_pts.clone({y: 330});
    this.p2_number_labels['strong']     = p2_number.clone({y: 390});
    this.p2_number_labels['strong_pts'] = p2_number_pts.clone({y: 390});
    this.p2_number_labels['total']      = p2_number.clone({y: 430});

    this.p2_group.add(this.p2_number_labels['stupid']);
    this.p2_group.add(this.p2_number_labels['stupid_pts']);
    this.p2_group.add(this.p2_number_labels['fish']);
    this.p2_group.add(this.p2_number_labels['fish_pts']);
    this.p2_group.add(this.p2_number_labels['fool']);
    this.p2_group.add(this.p2_number_labels['fool_pts']);
    this.p2_group.add(this.p2_number_labels['strong']);
    this.p2_group.add(this.p2_number_labels['strong_pts']);
    this.p2_group.add(this.p2_number_labels['total']);

    return this.p2_group.hide();
  }
}
