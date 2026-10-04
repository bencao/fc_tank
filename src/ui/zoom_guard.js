// Keeps iOS Safari from zooming the page mid-game. Safari ignores
// user-scalable=no, and its touch-action support doesn't stop a quick second
// tap on a fire button (double-tap zoom) or two thumbs on the pad drifting
// apart (pinch zoom). The pad works off pointer events, which still arrive
// when the touch events behind them are cancelled.

// Two taps closer than this are a double tap to Safari.
export const DOUBLE_TAP_MS = 350;

// Text fields keep their own taps: a double tap there selects a word.
function wants_its_taps(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable]"));
}

export function install_zoom_guard(doc = document, now = () => Date.now()) {
  const block = event => {
    if (event.cancelable !== false) { event.preventDefault(); }
  };
  const active = { passive: false };

  // Safari's own pinch events.
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
    doc.addEventListener(type, block, active);
  }

  // Two fingers moving at once is a pinch, wherever they landed.
  doc.addEventListener("touchmove", event => {
    if ((event.touches?.length ?? 0) > 1 || (event.scale ?? 1) !== 1) { block(event); }
  }, active);

  // The second of two quick taps would zoom; let it press the button only.
  let last_tap = -Infinity;
  doc.addEventListener("touchend", event => {
    const at = now();
    if (at - last_tap < DOUBLE_TAP_MS && !wants_its_taps(event.target)) { block(event); }
    last_tap = at;
  }, active);
}
