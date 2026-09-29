import { View } from "../engine/view.js";
import { INITIALS_LENGTH } from "../scenes/initials.js";

const WHITE = "#fff";
const AMBER = "#FF9B3B";
const RED = "#DB2B00";
const GREY = "#999";

const LETTER_WIDTH = 60;
const LETTERS_X = 300 - (LETTER_WIDTH * INITIALS_LENGTH) / 2;

const text = options => new Kinetic.Text({
  fontSize: 22,
  fontStyle: "bold",
  fontFamily: "Courier",
  fill: WHITE,
  ...options
});

export class NameEntryView extends View {
  init_view() {
    this.layer.add(text({ x: 0, y: 60, width: 600, align: "center", fontSize: 30, text: "GAME OVER", fill: RED }));
    this.layer.add(text({ x: 0, y: 120, width: 600, align: "center", text: "ENTER YOUR INITIALS" }));
    this.player_label = text({ x: 100, y: 180, width: 200, text: "", fill: RED });
    this.score_label = text({ x: 300, y: 180, width: 200, align: "right", text: "", fill: AMBER });
    this.layer.add(this.player_label);
    this.layer.add(this.score_label);

    this.letters = [];
    for (let i = 0; i < INITIALS_LENGTH; i++) {
      const letter = text({ x: LETTERS_X + i * LETTER_WIDTH, y: 250, width: LETTER_WIDTH, align: "center", fontSize: 48, text: "A" });
      this.letters.push(letter);
      this.layer.add(letter);
    }
    this.cursor = new Kinetic.Rect({ x: LETTERS_X + 12, y: 306, width: LETTER_WIDTH - 24, height: 5, fill: AMBER });
    this.layer.add(this.cursor);

    this.hint = text({ x: 0, y: 380, width: 600, align: "center", fontSize: 14, text: "", fill: GREY });
    return this.layer.add(this.hint);
  }

  show_player(label, score) {
    this.player_label.setText(label);
    this.score_label.setText(String(score));
    this.hint.setText("UP/DOWN: LETTER   FIRE: NEXT   ENTER: DONE");
    return this.layer.draw();
  }

  show_initials(initials, cursor) {
    this.letters.forEach((letter, i) => {
      letter.setText(initials[i]);
      letter.setFill(i === cursor ? AMBER : WHITE);
    });
    this.cursor.setX(LETTERS_X + cursor * LETTER_WIDTH + 12);
    this.cursor.show();
    return this.layer.draw();
  }

  show_saving() {
    this.cursor.hide();
    this.hint.setText("SAVING...");
    return this.layer.draw();
  }
}
