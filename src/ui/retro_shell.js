import { compute_scale } from "./screen_scale.js";

const BASE_WIDTH = 600;
const BASE_HEIGHT = 520;
const MAX_SCALE = 2;

// Below this width the control panel sits under the TV instead of beside it,
// so the picture is sized by width alone and the page is free to scroll.
const STACKED_LAYOUT = "(max-width: 960px)";

// The blinking prompt is only true while nobody is playing, so let the shell
// follow the game's scene and hide it once a battle is under way.
export function reflect_current_scene(root, game) {
  const show = name => { root.dataset.scene = name; };
  game.on_scene_change(show);
  return show;
}

export function install_screen_scaling(root, screen) {
  const apply = () => {
    // Two passes: the first resizes the screen, the second re-measures the
    // page chrome now that the screen has its new height.
    fit(root, screen);
    fit(root, screen);
  };
  const schedule = () => requestAnimationFrame(apply);

  schedule();
  window.addEventListener("resize", schedule);
  if (document.fonts != null) { document.fonts.ready.then(schedule); }
  return apply;
}

function fit(root, screen) {
  const stacked = window.matchMedia(STACKED_LAYOUT).matches;
  const available_width = slot_of(screen).clientWidth;
  const available_height = stacked ? Infinity : viewport_room_for(screen);
  const scale = compute_scale(available_width, available_height, BASE_WIDTH, BASE_HEIGHT, MAX_SCALE);
  root.style.setProperty("--screen-scale", scale);
}

// The slot is a full-width grid cell; the set inside it shrink-wraps the
// picture, so the slot is what says how much room the picture may claim.
function slot_of(screen) {
  return screen.closest(".tv-slot") ?? screen.parentElement;
}

// Everything the page renders apart from the picture itself - marquee, chin,
// control panel, footer - is chrome the picture has to share the window with.
// Measure the cabinet rather than the document: a short page stretches to fill
// the window, which would make the chrome look far taller than it is.
function viewport_room_for(screen) {
  const cabinet = screen.closest(".cabinet") ?? document.body;
  const body = getComputedStyle(document.body);
  const gutters = parseFloat(body.paddingTop) + parseFloat(body.paddingBottom);
  const chrome = cabinet.getBoundingClientRect().height - screen.getBoundingClientRect().height + gutters;
  return window.innerHeight - chrome;
}
