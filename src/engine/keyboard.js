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

  map_key(code) {
    return ({
      13: 'ENTER',
      32: 'SPACE',
      37: 'LEFT',
      38: 'UP',
      39: 'RIGHT',
      40: 'DOWN',
      65: 'A',
      68: 'D',
      74: 'J',
      83: 'S',
      87: 'W',
      90: 'Z'
    })[code];
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
      const key = this.map_key(event.which);
      if (key in this.key_up_callbacks) {
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
      const key = this.map_key(event.which);
      if (key in this.key_down_callbacks) {
        this.key_down_callbacks[key](event);
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", this._keydown_handler);
  }
}
