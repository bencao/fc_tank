import { Game } from "./game.js";
import { install_screen_scaling, reflect_current_scene } from "./ui/retro_shell.js";

(function() {
  const game = new Game();
  window.game = game;
  window.welcome_scene = game.scenes["welcome"];
  window.stage_scene = game.scenes["stage"];
  window.battle_field_scene = game.scenes["battle_field"];
  window.report_scene = game.scenes["report"];
  install_screen_scaling(document.documentElement, document.getElementById("screen"));
  reflect_current_scene(document.documentElement, game);
  return game.kick_off();
}());
