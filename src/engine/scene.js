import { Keyboard } from "./keyboard.js";
import { Sound } from "./sound.js";

export class Scene {
  constructor(game, view) {
    this.game = game;
    this.view = view;
    this.keyboard = new Keyboard();
    this.sound = new Sound();
  }

  start() {}
  stop() {}

  on_start() {
    this.keyboard.reset();
    this.start();
    return this.view.show();
  }

  on_stop() {
    this.stop();
    this.keyboard.reset();
    return this.view.hide();
  }
}
