class WelcomeScene extends Scene
  start: () ->
    super()
    @view.play_start_animation(() =>
      @view.update_player_mode(@game.single_player_mode())
      @enable_selection_control()
    )
    @view.update_scores(
      @game.get_status('p1_score'),
      @game.get_status('p2_score'),
      @game.get_status('hi_score')
    )

  stop: () ->
    super()
    @prepare_for_game_scene()

  prepare_for_game_scene: () ->
    @game.update_status('game_over', false)
    @game.update_status('stage_autostart', false)
    @game.update_status('current_stage', @game.get_config('initial_stage'))
    @game.update_status('p1_score', @game.get_config('initial_p1_score'))
    @game.update_status('p2_score', @game.get_config('initial_p2_score'))
    @game.update_status('p1_lives', @game.get_config('initial_p1_lives'))
    @game.update_status('p2_lives', @game.get_config('initial_p2_lives'))
    @game.update_status('p1_level', @game.get_config('initial_p1_level'))
    @game.update_status('p2_level', @game.get_config('initial_p2_level'))
    @game.update_status('p1_ship', @game.get_config('initial_p1_ship'))
    @game.update_status('p2_ship', @game.get_config('initial_p2_ship'))

  enable_selection_control: () ->
    @keyboard.on_key_down 'ENTER', () =>
      @game.switch_scene('stage')

    @keyboard.on_key_down 'SPACE', () =>
      @toggle_players()

  toggle_players: () ->
    if @game.single_player_mode()
      @game.update_status('players', 2)
    else
      @game.update_status('players', 1)
    @view.update_player_mode(@game.single_player_mode())
