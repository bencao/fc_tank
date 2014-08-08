class Sound
  constructor: () ->
    @bgms_playing = bgms_playing = {
      'start_stage'    : false,
      'enemy_move'     : false,
      'user_move'      : false,
      'fire'           : false,
      'fire_reach_wall': false,
      'gift'           : false,
      'gift_bomb'      : false,
      'gift_life'      : false,
      'lose'           : false
    }

    @bgms = bgms = {}

    _.each(['start_stage', 'enemy_move', 'user_move', 'fire', 'fire_reach_wall', 'gift', 'gift_bomb', 'gift_life', 'lose'], (event_name) ->
      bgms[event_name] = new Howl({
        urls: ['data/sound/' + event_name + '.mp3'],
        loop: false,
        onplay: (() -> bgms_playing[event_name] = true)
        onend: (() -> bgms_playing[event_name] = false)
      })
    )

  play: (event_name) ->
    @bgms[event_name].play() unless @bgms_playing[event_name]
