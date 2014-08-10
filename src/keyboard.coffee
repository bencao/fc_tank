class Keyboard
  constructor: () ->
    @key_up_callbacks   = {}
    @key_down_callbacks = {}

  reset: () ->
    @key_up_callbacks   = {}
    @key_down_callbacks = {}

  map_key: (code) ->
    ({
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
    })[code]

  on_key_up: (key_or_keys, callback) ->
    if _.isArray(key_or_keys)
      _.each(key_or_keys, ((key) => @key_up_callbacks[key] = callback))
    else
      @key_up_callbacks[key_or_keys] = callback
    $(document).unbind("keyup").bind "keyup", (event) =>
      key = @map_key(event.which)
      if _.has(@key_up_callbacks, key)
        @key_up_callbacks[key](event)
        event.preventDefault()

  on_key_down: (key_or_keys, callback) ->
    if _.isArray(key_or_keys)
      _.each(key_or_keys, ((key) => @key_down_callbacks[key] = callback))
    else
      @key_down_callbacks[key_or_keys] = callback
    $(document).unbind("keydown").bind "keydown", (event) =>
      key = @map_key(event.which)
      if _.has(@key_down_callbacks, key)
        @key_down_callbacks[key](event)
        event.preventDefault()
