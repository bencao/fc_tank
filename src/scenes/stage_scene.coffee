class StageScene extends Scene
  start: () ->
    @current_stage = @game.get_status('current_stage')
    @view.update_stage(@current_stage)
    if @game.get_status('stage_autostart')
      setTimeout((() => @game.switch_scene('battle_field')), 1500)
    else
      @enable_stage_control()
    super()

  stop: () ->
    @prepare_for_game_scene()
    super()

  prepare_for_game_scene: () ->
    @game.update_status('p1_killed_enemies', [])
    @game.update_status('p2_killed_enemies', [])

  enable_stage_control: () ->
    @keyboard.on_key_down ["UP", "LEFT"], (event) =>
      @current_stage = @game.prev_stage()
      @view.update_stage(@current_stage)
    @keyboard.on_key_down ["DOWN", "RIGHT"], (event) =>
      @current_stage = @game.next_stage()
      @view.update_stage(@current_stage)
    @keyboard.on_key_down "ENTER", (event) =>
      @game.switch_scene('battle_field')

