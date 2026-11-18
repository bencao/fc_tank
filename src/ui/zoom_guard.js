// Keeps a phone from zooming the game by accident, without taking zoom away.
//
// - Double tap never zooms. Safari ignores user-scalable=no, and its
//   touch-action support doesn't stop a quick second tap on a button, so the
//   second of two quick taps is cancelled here. Cancelling it also cancels its
//   click, so an ordinary button is clicked by hand: tapping fast loses nothing.
//   The controls work off pointer events, which still arrive.
// - Pinch zooms the page, except when a finger started on the game's controls:
//   two thumbs on the pad drifting apart are playing, not zooming.
//
// The same guard runs in fc_tank, fengshen and fire-emblem-collection; each
// passes the selector for its own controls.

// Two taps closer than this are a double tap to Safari.
export const DOUBLE_TAP_MS = 350;

// Text fields keep their own taps: a double tap there selects a word.
function wants_its_taps(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable]"));
}

// Returns a function that removes the guard again.
export function install_zoom_guard(doc = document, { controls = "", now = () => Date.now() } = {}) {
  const listeners = [];
  const listen = (type, handler) => {
    doc.addEventListener(type, handler, { passive: false });
    listeners.push([type, handler]);
  };
  const block = event => {
    if (event.cancelable !== false) { event.preventDefault(); }
  };
  const on_controls = target => Boolean(controls && target?.closest?.(controls));

  // Fingers that came down on the controls, by touch identifier.
  const on_pad = new Set();
  listen("touchstart", event => {
    for (const touch of event.changedTouches ?? []) {
      if (on_controls(touch.target ?? event.target)) { on_pad.add(touch.identifier); }
    }
  });
  const lift = event => {
    for (const touch of event.changedTouches ?? []) { on_pad.delete(touch.identifier); }
    if ((event.touches?.length ?? 0) === 0) { on_pad.clear(); }
  };

  // Safari's own pinch events, and two fingers moving at once.
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
    listen(type, event => { if (on_pad.size > 0) { block(event); } });
  }
  listen("touchmove", event => {
    const pinching = (event.touches?.length ?? 0) > 1 || (event.scale ?? 1) !== 1;
    if (pinching && on_pad.size > 0) { block(event); }
  });

  // The second of two quick taps would zoom; let it press the button only.
  let last_tap = -Infinity;
  listen("touchend", event => {
    const at = now();
    const target = event.target;
    if (at - last_tap < DOUBLE_TAP_MS && !wants_its_taps(target)) {
      block(event);
      if (!on_controls(target)) { target?.click?.(); }
    }
    last_tap = at;
    lift(event);
  });
  listen("touchcancel", lift);

  return () => {
    for (const [type, handler] of listeners) { doc.removeEventListener(type, handler, { passive: false }); }
  };
}
