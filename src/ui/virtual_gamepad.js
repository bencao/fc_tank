// An on-screen FC controller for touch screens. It presses the same keys a
// keyboard would, so every scene works with it unchanged.

// Which arm of the d-pad a thumb at (dx, dy) from its centre is on - none
// while it rests within dead_zone of the centre.
export function direction_at(dx, dy, dead_zone = 6) {
  if (Math.hypot(dx, dy) < dead_zone) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "LEFT" : "RIGHT";
  }
  return dy < 0 ? "UP" : "DOWN";
}

// The keyboard keys each pad control stands in for (P1's, plus the system keys).
export const PAD_KEYS = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  A: "z",
  B: "z",
  START: "Enter",
  SELECT: " "
};

// Turns pad presses into key presses. send(type, key) delivers one
// "keydown"/"keyup" for a keyboard key.
export class GamepadKeys {
  constructor(send) {
    this.send = send;
    this.direction = null;
    // How many buttons are holding each key down - A and B share one.
    this.held = new Map();
  }

  press(button) {
    const key = PAD_KEYS[button];
    const count = this.held.get(key) ?? 0;
    this.held.set(key, count + 1);
    if (count === 0) {
      this.send("keydown", key);
    }
  }

  release(button) {
    const key = PAD_KEYS[button];
    const count = this.held.get(key) ?? 0;
    if (count === 0) {
      return;
    }
    this.held.set(key, count - 1);
    if (count === 1) {
      this.send("keyup", key);
    }
  }

  // The d-pad holds at most one arrow key down at a time.
  steer(direction) {
    if (direction === this.direction) {
      return;
    }
    if (this.direction) {
      this.send("keyup", PAD_KEYS[this.direction]);
    }
    this.direction = direction;
    if (direction) {
      this.send("keydown", PAD_KEYS[direction]);
    }
  }
}

// Phones and tablets - no hover, a finger for a pointer.
const TOUCH_SCREEN = "(hover: none) and (pointer: coarse)";

// Shows the pad on touch screens (root gets data-input="touch") and wires its
// controls to key presses on the document.
export function install_virtual_gamepad(root, pad) {
  const touch = window.matchMedia(TOUCH_SCREEN);
  const reflect = () => { root.dataset.input = touch.matches ? "touch" : "keyboard"; };
  reflect();
  touch.addEventListener("change", reflect);

  const keys = new GamepadKeys((type, key) => {
    document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
  });
  wire_dpad(pad.querySelector("[data-pad-dpad]"), keys);
  pad.querySelectorAll("[data-pad-button]").forEach(button => wire_button(button, keys));
  // A long press would otherwise pop up the browser's own menu.
  pad.addEventListener("contextmenu", event => event.preventDefault());
  return keys;
}

// The whole cross is one control: the thumb can roll from arm to arm without
// lifting, the way it would on a real pad.
function wire_dpad(dpad, keys) {
  let thumb = null;
  const steer = event => {
    const rect = dpad.getBoundingClientRect();
    const direction = direction_at(
      event.clientX - (rect.left + rect.width / 2),
      event.clientY - (rect.top + rect.height / 2),
      rect.width * 0.12
    );
    if (direction && direction !== keys.direction) { buzz(); }
    keys.steer(direction);
    dpad.dataset.direction = direction ?? "";
  };
  const lift = event => {
    if (event.pointerId !== thumb) { return; }
    thumb = null;
    keys.steer(null);
    dpad.dataset.direction = "";
  };
  dpad.addEventListener("pointerdown", event => {
    if (thumb !== null) { return; }
    thumb = event.pointerId;
    dpad.setPointerCapture(event.pointerId);
    steer(event);
  });
  dpad.addEventListener("pointermove", event => {
    if (event.pointerId === thumb) { steer(event); }
  });
  dpad.addEventListener("pointerup", lift);
  dpad.addEventListener("pointercancel", lift);
}

function wire_button(button, keys) {
  const name = button.dataset.padButton;
  const fingers = new Set();
  const lift = event => {
    if (!fingers.delete(event.pointerId)) { return; }
    keys.release(name);
    button.classList.toggle("is-pressed", fingers.size > 0);
  };
  button.addEventListener("pointerdown", event => {
    fingers.add(event.pointerId);
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-pressed");
    buzz();
    keys.press(name);
  });
  button.addEventListener("pointerup", lift);
  button.addEventListener("pointercancel", lift);
}

function buzz() {
  navigator.vibrate?.(8);
}
