const KEY_MAP = {
  'Enter': 'ENTER',
  ' ': 'SPACE',
  'ArrowLeft': 'LEFT',
  'ArrowUp': 'UP',
  'ArrowRight': 'RIGHT',
  'ArrowDown': 'DOWN',
};

const LETTER_KEYS = new Set(['A', 'D', 'J', 'S', 'W', 'Z']);

function mapKey(eventKey) {
  if (KEY_MAP[eventKey]) return KEY_MAP[eventKey];
  const upper = eventKey.toUpperCase();
  if (LETTER_KEYS.has(upper)) return upper;
  return undefined;
}

export class Keyboard {
  constructor() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    this._keyup_handler = null;
    this._keydown_handler = null;
  }

  reset() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
    if (this._keyup_handler) {
      document.removeEventListener("keyup", this._keyup_handler);
      this._keyup_handler = null;
    }
    if (this._keydown_handler) {
      document.removeEventListener("keydown", this._keydown_handler);
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
      document.removeEventListener("keyup", this._keyup_handler);
    }
    this._keyup_handler = event => {
      const key = mapKey(event.key);
      if (key && key in this.key_up_callbacks) {
        this.key_up_callbacks[key](event);
        event.preventDefault();
      }
    };
    document.addEventListener("keyup", this._keyup_handler);
  }

  on_key_down(key_or_keys, callback) {
    if (Array.isArray(key_or_keys)) {
      key_or_keys.forEach(key => { this.key_down_callbacks[key] = callback; });
    } else {
      this.key_down_callbacks[key_or_keys] = callback;
    }
    if (this._keydown_handler) {
      document.removeEventListener("keydown", this._keydown_handler);
    }
    this._keydown_handler = event => {
      const key = mapKey(event.key);
      if (key && key in this.key_down_callbacks) {
        this.key_down_callbacks[key](event);
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", this._keydown_handler);
  }
}
