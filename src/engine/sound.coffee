class Sound
  constructor: () ->
    @bgms_playing = {}
    @bgms         = {}

    _.each(@supported_events(), (event_name) =>
      @bgms_playing[event_name] = false
      @bgms[event_name]         = new Howl({
        urls   : ['data/sound/' + event_name + '.mp3'],
        loop   : false,
        onplay : (() => @bgms_playing[event_name] = true)
        onend  : (() => @bgms_playing[event_name] = false)
      })
    )

  supported_events: () ->
    [
      'start_stage',
      'enemy_move',
      'user_move',
      'fire',
      'fire_reach_wall',
      'gift',
      'gift_bomb',
      'gift_life',
      'lose'
    ]

  play: (event_name) ->
    if _.has(@bgms, event_name) && !@bgms_playing[event_name]
      @bgms[event_name].play()
