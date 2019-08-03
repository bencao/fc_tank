import { View } from "../engine/view.js";

export class StageView extends View {
  init_view(layer) {
    this.init_bg();
    return this.init_stage_label();
  }

  init_bg() {
    return this.layer.add(new Kinetic.Rect({
      x     : 0,
      y     : 0,
      fill  : "#999",
      width : 600,
      height: 520
    }));
  }

  init_stage_label() {
    // label text
    this.stage_label = new Kinetic.Text({
      x: 250,
      y: 230,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: `STAGE ${this.current_stage}`,
      fill: "#333",
    });
    return this.layer.add(this.stage_label);
  }

  update_stage(current_stage) {
    this.stage_label.setText(`STAGE ${current_stage}`);
    return this.layer.draw();
  }
}
