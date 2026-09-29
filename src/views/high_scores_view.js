import { View } from "../engine/view.js";
import { TOP_ENTRIES } from "../leaderboard_client.js";

const WHITE = "#fff";
const AMBER = "#FF9B3B";
const RED = "#DB2B00";
const GREY = "#999";

// Room for a friends play team's initials, "ABC&XYZ".
const NAME_WIDTH = 7;

// One leaderboard line in fixed columns - the canvas font is monospaced.
export function format_high_score_row({ rank, name, score, stage, difficulty }) {
  const place = ordinal(rank).padStart(4);
  return `${place}  ${name.padEnd(NAME_WIDTH)} ${String(score).padStart(7)}  ST${String(stage).padStart(2)}  ${difficulty}`;
}

function ordinal(rank) {
  const suffix = { 1: "ST", 2: "ND", 3: "RD" }[rank] ?? "TH";
  return `${rank}${suffix}`;
}

const text = options => new Kinetic.Text({
  fontSize: 20,
  fontStyle: "bold",
  fontFamily: "Courier",
  fill: WHITE,
  ...options
});

export class HighScoresView extends View {
  init_view() {
    this.layer.add(text({ x: 0, y: 36, width: 600, align: "center", fontSize: 26, text: "HIGH SCORES", fill: RED }));
    this.rows = [];
    for (let i = 0; i < TOP_ENTRIES; i++) {
      // The widest row, 38 characters, centred.
      const row = text({ x: 72, y: 100 + i * 32, text: "" });
      this.rows.push(row);
      this.layer.add(row);
    }
    this.message = text({ x: 0, y: 440, width: 600, align: "center", fontSize: 18, text: "", fill: GREY });
    return this.layer.add(this.message);
  }

  show_loading() {
    this.clear();
    this.message.setText("LOADING...");
    return this.layer.draw();
  }

  show_offline() {
    this.clear();
    this.message.setText("LEADERBOARD OFFLINE");
    return this.layer.draw();
  }

  // entries: best first. ranks: the runs just posted, to be marked.
  // unlisted: a new run's rank when it's too far down to be listed.
  show_entries(entries, ranks, unlisted) {
    this.clear();
    entries.slice(0, TOP_ENTRIES).forEach((entry, i) => {
      this.rows[i].setText(format_high_score_row(entry));
      this.rows[i].setFill(ranks.includes(entry.rank) ? AMBER : WHITE);
    });
    if (entries.length === 0) {
      this.message.setText("NO SCORES YET - BE THE FIRST!");
    } else if (unlisted != null) {
      this.message.setFill(AMBER);
      this.message.setText(`YOUR RANK: ${unlisted}`);
    }
    return this.layer.draw();
  }

  clear() {
    this.rows.forEach(row => row.setText(""));
    this.message.setFill(GREY);
    this.message.setText("");
  }
}
