import { View } from "../engine/view.js";

const WHITE = "#fff";
const AMBER = "#FF9B3B";
const RED = "#DB2B00";
const GREY = "#999";

const text = options => new Kinetic.Text({
  x: 0,
  width: 600,
  align: "center",
  fontSize: 22,
  fontStyle: "bold",
  fontFamily: "Courier",
  fill: WHITE,
  text: "",
  ...options
});

// The friends play lobby, for the host and the friend alike: what is going on,
// the room's code, and what to do next.
export class LobbyView extends View {
  init_view() {
    this.layer.add(text({ y: 70, fontSize: 30, text: "FRIENDS PLAY", fill: RED }));
    this.status = text({ y: 160 });
    this.code = text({ y: 220, fontSize: 48, fill: AMBER });
    this.message = text({ y: 310, fontSize: 16, fill: GREY });
    this.hint = text({ y: 440, fontSize: 14, fill: GREY });
    [this.status, this.code, this.message, this.hint].forEach(label => this.layer.add(label));
  }

  show_lobby({ status = "", code = "", message = "", hint = "" }) {
    this.status.setText(status);
    this.code.setText(code);
    this.message.setText(message);
    this.hint.setText(hint);
    return this.layer.draw();
  }
}
