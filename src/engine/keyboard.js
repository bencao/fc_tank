const KEY_MAP = {
  'Enter': 'ENTER',
  ' ': 'SPACE',
  'ArrowLeft': 'LEFT',
  'ArrowUp': 'UP',
  'ArrowRight': 'RIGHT',
  'ArrowDown': 'DOWN',
};

const LETTER_KEYS = new Set(['A', 'D', 'J', 'S', 'W', 'Z']);

// The game's name for a key, or undefined for one it has no use for.
export function map_key(eventKey) {
  if (KEY_MAP[eventKey]) return KEY_MAP[eventKey];
  const upper = eventKey.toUpperCase();
  if (LETTER_KEYS.has(upper)) return upper;
  return undefined;
}

export class Keyboard {
  // source: where key events come from - the page, or for friends play the
  // friend's keys arriving over the network (see src/friends/session.js).
  constructor(source = null) {
    this.source = source;
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    this._keyup_handler = null;
    this._keydown_handler = null;
  }

  target() {
    return this.source ?? document;
  }

  reset() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    if (this._keyup_handler) {
      this.target().removeEventListener("keyup", this._keyup_handler);
      this._keyup_handler = null;
    }
    if (this._keydown_handler) {
      this.target().removeEventListener("keydown", this._keydown_handler);
      this._keydown_handler = null;
    }
  }

  on_key_up(key_or_keys, callback) {
    if (Array.isArray(key_or_keys)) {
      key_or_keys.forEach(key => { this.key_up_callbacks[key] = callback; });
    } else {
      this.key_up_callbacks[key_or_keys] = callback;
    }
    if (this._keyup_handler) {
      this.target().removeEventListener("keyup", this._keyup_handler);
    }
    this._keyup_handler = event => {
      const key = map_key(event.key);
      if (key && key in this.key_up_callbacks) {
        this.key_up_callbacks[key](event);
        event.preventDefault();
      }
    };
    this.target().addEventListener("keyup", this._keyup_handler);
  }

  on_key_down(key_or_keys, callback) {
    if (Array.isArray(key_or_keys)) {
      key_or_keys.forEach(key => { this.key_down_callbacks[key] = callback; });
    } else {
      this.key_down_callbacks[key_or_keys] = callback;
    }
    if (this._keydown_handler) {
      this.target().removeEventListener("keydown", this._keydown_handler);
    }
    this._keydown_handler = event => {
      const key = map_key(event.key);
      if (key && key in this.key_down_callbacks) {
        this.key_down_callbacks[key](event);
        event.preventDefault();
      }
    };
    this.target().addEventListener("keydown", this._keydown_handler);
  }
}
