import { Howler } from "howler";
import { Game } from "./game.js";
import { install_virtual_gamepad } from "./ui/virtual_gamepad.js";
import { install_screen_scaling, reflect_current_scene, reflect_difficulty } from "./ui/retro_shell.js";
import { SoundSwitch, install_sound_switch } from "./ui/sound_switch.js";

// Reading localStorage itself throws when site data is blocked.
function safe_local_storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

(function() {
  const game = new Game();
  window.game = game;
  window.welcome_scene = game.scenes["welcome"];
  window.stage_scene = game.scenes["stage"];
  window.battle_field_scene = game.scenes["battle_field"];
  window.report_scene = game.scenes["report"];
  install_virtual_gamepad(document.documentElement, document.getElementById("gamepad"));
  install_screen_scaling(document.documentElement, document.getElementById("screen"));
  reflect_current_scene(document.documentElement, game);
  reflect_difficulty(document.documentElement, game);
  install_sound_switch(
    document.documentElement,
    [...document.querySelectorAll("[data-sound-switch]")],
    new SoundSwitch(Howler, safe_local_storage())
  );
  return game.kick_off();
}());
