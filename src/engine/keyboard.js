export class Keyboard {
  constructor() {
    this.key_up_callbacks   = {};
    this.key_down_callbacks = {};
  }

  reset() {
    this.key_up_callbacks   = {};
    return this.key_down_callbacks = {};
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
    if (_.isArray(key_or_keys)) {
      _.each(key_or_keys, (key => { return this.key_up_callbacks[key] = callback; }));
    } else {
      this.key_up_callbacks[key_or_keys] = callback;
    }
    return $(document).unbind("keyup").bind("keyup", event => {
      const key = this.map_key(event.which);
      if (_.has(this.key_up_callbacks, key)) {
        this.key_up_callbacks[key](event);
        return event.preventDefault();
      }
    });
  }

  on_key_down(key_or_keys, callback) {
    if (_.isArray(key_or_keys)) {
      _.each(key_or_keys, (key => { return this.key_down_callbacks[key] = callback; }));
    } else {
      this.key_down_callbacks[key_or_keys] = callback;
    }
    return $(document).unbind("keydown").bind("keydown", event => {
      const key = this.map_key(event.which);
      if (_.has(this.key_down_callbacks, key)) {
        this.key_down_callbacks[key](event);
        return event.preventDefault();
      }
    });
  }
}
