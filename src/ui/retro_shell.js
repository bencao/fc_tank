import { compute_scale, scanline_pitch, room_haze } from "./screen_scale.js";

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

// NIGHTMARE dresses the whole room differently, so the page needs to know
// where the difficulty dial sits - now and whenever it turns.
export function reflect_difficulty(root, game) {
  const show = difficulty => { root.dataset.difficulty = difficulty.name.toLowerCase(); };
  game.on_difficulty_change(show);
  show(game.difficulty());
  return show;
}

// Friends play puts each friend at a keyboard of their own, both on the 1P
// keys - the page shows just those while it's on, and says whose they are.
export function reflect_friends(root, game) {
  const show = session => { root.dataset.friends = session?.role ?? ""; };
  game.on_friends_change(show);
  show(null);
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

// How wide the picture may be in a slot `slot_width` across: the TV's case
// and bezel wrap it, and have to fit in the slot too. `set` and `picture` are
// the TV's and the picture's current widths - whatever their size, the
// difference between them is the frame.
export function room_for_picture(slot_width, { set, picture }) {
  return slot_width - (set - picture);
}

function fit(root, screen) {
  // On a touch screen the pad has to stay in reach, so the picture always
  // shares the window with it instead of pushing it off the bottom.
  const touch = root.dataset.input === "touch";
  const stacked = window.matchMedia(STACKED_LAYOUT).matches;
  const set = screen.closest(".tv") ?? screen;
  const available_width = room_for_picture(slot_of(screen).clientWidth, {
    set: set.offsetWidth,
    picture: screen.offsetWidth
  });
  const available_height = stacked && !touch ? Infinity : viewport_room_for(screen);
  const scale = compute_scale(available_width, available_height, BASE_WIDTH, BASE_HEIGHT, MAX_SCALE);
  root.style.setProperty("--screen-scale", scale);
  show_scanlines(root, scale);
}

// Line spacing for the scanlines over the picture and the fainter haze over
// the room, both fitted to the display's pixels.
function show_scanlines(root, scale) {
  const dpr = window.devicePixelRatio || 1;
  const picture = scanline_pitch(scale, dpr);
  const room = room_haze(scale, dpr);
  root.style.setProperty("--scan-pitch", `${picture.pitch}px`);
  root.style.setProperty("--scan-line", `${picture.line}px`);
  root.style.setProperty("--haze-pitch", `${room.pitch}px`);
  root.style.setProperty("--haze-line", `${room.line}px`);
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
