import { Keyboard } from "./keyboard.js";
import { Sound } from "./sound.js";

export class Scene {
  constructor(game, view) {
    this.game = game;
    this.view = view;
    this.keyboard = new Keyboard();
    this.sound = new Sound();
  }

  start() {
    this.keyboard.reset;
    return this.view.show();
  }

  stop() {
    this.keyboard.reset;
    return this.view.hide();
  }
}
