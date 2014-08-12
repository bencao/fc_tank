class StageScene extends Scene
  constructor: (@game) ->
    super(@game)
    @init_stage_nodes()

  start: () ->
    @current_stage = @game.get_status('current_stage')
    @update_stage_label()
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
      @update_stage_label()
    @keyboard.on_key_down ["DOWN", "RIGHT"], (event) =>
      @current_stage = @game.next_stage()
      @update_stage_label()
    @keyboard.on_key_down "ENTER", (event) =>
      @game.switch_scene('battle_field')

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
