class StageScene extends Scene
  constructor: (@game) ->
    super(@game)
    @init_stage_nodes()

  start: () ->
    @current_stage = @game.get_config('current_stage')
    @update_stage_label()
    if @game.get_config('stage_autostart')
      setTimeout((() => @game.switch_scene('game')), 2000)
    else
      @enable_stage_control()
    super()

  stop: () ->
    @disable_stage_control()
    @prepare_for_game_scene()
    super()

  prepare_for_game_scene: () ->
    @game.set_config('p1_killed_enemies', [])
    @game.set_config('p2_killed_enemies', [])

  enable_stage_control: () ->
    $(document).bind "keydown", (event) =>
      switch event.which
        when 37, 38
          # UP, LEFT
          @current_stage = @game.prev_stage()
          @update_stage_label()
          event.preventDefault()
        when 39, 40
          # RIGHT, DOWN
          @current_stage = @game.next_stage()
          @update_stage_label()
          event.preventDefault()
        when 13
          # ENTER
          @game.switch_scene('game')
          event.preventDefault()
      false

  disable_stage_control: () ->
    $(document).unbind "keydown"

  init_stage_nodes: () ->
    # bg
    @layer.add(new Kinetic.Rect({
      x: 0,
      y: 0,
      fill: "#999",
      width: 600,
      height: 520
    }))
    # label text
    @stage_label = new Kinetic.Text({
      x: 250,
      y: 230,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "STAGE #{@current_stage}",
      fill: "#333",
    })
    @layer.add(@stage_label)

  update_stage_label: () ->
    @stage_label.setText("STAGE #{@current_stage}")
    @layer.draw()
