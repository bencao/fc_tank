export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.layer = new Kinetic.Layer();
    this.canvas.add(this.layer);
    this.layer.hide();
    this.init_view();
  }

  show() {
    this.layer.show();
    return this.layer.draw();
  }

  hide() {
    return this.layer.hide();
  }

  init_view() {}
}
