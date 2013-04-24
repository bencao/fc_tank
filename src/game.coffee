class TerrainBuilder
  constructor: (@map, @default_width, @default_height) ->
  batch_build: (terrain_cls, array_of_xys) ->
    for xys in array_of_xys
      @build_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3])

  build_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        area = new MapArea2D(xs, ys,
          _.min([x2, xs + @default_height]),
          _.min([y2, ys + @default_width]))
        @map.add_terrain(terrain_cls, area)
        ys += @default_width
      xs += @default_height

class Game
  constructor: (@fps) ->
    @canvas = new Kinetic.Stage({container: 'canvas', width: 600, height: 520})
    @game_scene = new Kinetic.Layer()
    @canvas.add(@game_scene)
    @init_map()
    @init_status()
    @start()
    window.game = this

  init_map: () ->
    @map = new Map2D(@game_scene)

    @map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
    @map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

    @map.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40))
    @map.add_tank(FishTank, new MapArea2D(240, 0, 280, 40))
    @map.add_tank(StrongTank, new MapArea2D(480, 0, 520, 40))

    builder = new TerrainBuilder(@map, @map.default_width, @map.default_height)

    builder.batch_build(IceTerrain, [
      [40, 0, 240, 40],
      [280, 0, 480, 40],
      [0, 40, 80, 280],
      [440, 40, 520, 280],
      [80, 240, 440, 280]
    ])
    builder.batch_build(BrickTerrain, [
      [120, 40, 240, 80],
      [120, 80, 160, 160],
      [160, 120, 200, 160],
      [200, 80, 240, 200],
      [120, 200, 240, 240],
      [280, 40, 400, 80],
      [280, 80, 320, 200],
      [360, 80, 400, 200],
      [280, 200, 400, 240],
      [40, 340, 80, 480],
      [120, 340, 160, 480],
      [360, 340, 400, 480],
      [440, 340, 480, 480],
      [200, 300, 240, 420],
      [240, 320, 280, 400],
      [280, 300, 320, 420],
      [220, 460, 300, 480],
      [220, 480, 240, 520],
      [280, 480, 300, 520]
    ])
    builder.batch_build(IronTerrain, [
      [0, 280, 40, 320],
      [240, 280, 280, 320],
      [480, 280, 520, 320],
      [80, 360, 120, 400],
      [160, 360, 200, 400],
      [320, 360, 360, 400],
      [400, 360, 440, 400]
    ])
    builder.batch_build(GrassTerrain, [
      [0, 320, 40, 520],
      [40, 480, 120, 520],
      [400, 480, 480, 520],
      [480, 320, 520, 480]
    ])

    @map.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520))

  start: () ->
    $(document).unbind "keyup"
    $(document).bind "keyup", (event) =>
      if @map.p1_tank()
        @map.p1_tank().commander.add_key_event("keyup", event.which)
      if @map.p2_tank()
        @map.p2_tank().commander.add_key_event("keyup", event.which)

    $(document).unbind "keydown"
    $(document).bind "keydown", (event) =>
      if @map.p1_tank()
        @map.p1_tank().commander.add_key_event("keydown", event.which)
      if @map.p2_tank()
        @map.p2_tank().commander.add_key_event("keydown", event.which)
    @start_time_line()

  pause: () ->
    $(document).unbind "keyup"
    $(document).unbind "keydown"
    @stop_time_line()

  start_time_line: () ->
    last_time = new Date()
    @timeline = setInterval(() =>
      current_time = new Date()
      delta_time = current_time.getMilliseconds() - last_time.getMilliseconds()
      # assume a frame will never last more than 1 second
      delta_time += 1000 if delta_time < 0
      _.each(@map.tanks.concat(@map.missiles).concat(@map.gifts), (unit) ->
        unit.integration(delta_time)
      )
      last_time = current_time
      @frame_rate += 1
      # console.log "current_frame=" + @frame_rate
      # game.pause() if mod == 9
    , parseInt(1000/@fps))
    # show frame rate
    @frame_timeline = setInterval(() =>
      @frame_rate_label.setText(@frame_rate + " fps")
      @frame_rate = 0
    , 1000)

  stop_time_line: () ->
    clearInterval(@timeline)
    clearInterval(@frame_timeline)

  init_status: () ->
    @status_panel = new Kinetic.Group()
    @game_scene.add(@status_panel)

    # background
    @status_panel.add(new Kinetic.Rect({
      x: 520,
      y: 0,
      fill: "#999",
      width: 80,
      height: 520
    }))

    # frame rate
    @frame_rate = 0
    @frame_rate_label = new Kinetic.Text({
      x: 530,
      y: 10,
      fontSize: 20,
      fontStyle: "bold",
      text: "0 fps"
      fill: "#0f0"
    })
    @status_panel.add(@frame_rate_label)

    @remain_enemy_counts = 20
    @enemy_symbols = []
    # enemy tanks
    for i in [1..@remain_enemy_counts]
      tx = (if i % 2 == 1 then 530 else 550)
      ty = parseInt((i - 1) / 2) * 25 + 50
      symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
      @enemy_symbols.push(symbol)

    # user tank status
    @remain_user_p1_lives = 2
    user_p1_label = new Kinetic.Text({
      x: 530,
      y: 320,
      fontSize: 14,
      text: "1P",
      fill: "#000"
    })
    user_p1_symbol = @new_symbol(@status_panel, 'user', 530, 335)
    user_p1_remain_lives_label = new Kinetic.Text({
      x: 552,
      y: 335,
      fontSize: 12,
      text: "#{@remain_user_p1_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p1_label)
    @status_panel.add(user_p1_remain_lives_label)

    @remain_user_p2_lives = 2
    user_p2_label = new Kinetic.Text({
      x: 530,
      y: 360,
      fontSize: 14,
      text: "2P",
      fill: "#000"
    })
    user_p2_symbol = @new_symbol(@status_panel, 'user', 530, 375)
    user_p2_remain_lives_label = new Kinetic.Text({
      x: 552,
      y: 375,
      fontSize: 12,
      text: "#{@remain_user_p2_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p2_label)
    @status_panel.add(user_p2_remain_lives_label)

    # stage status
    @current_stage = 1
    @new_symbol(@status_panel, 'stage', 530, 400)
    stage_label = new Kinetic.Text({
      x: 552,
      y: 445,
      fontSize: 12,
      text: "#{@current_stage}",
      fill: "#000"
    })
    @status_panel.add(stage_label)

  new_symbol: (parent, type, tx, ty) ->
    animations = switch type
      when 'enemy'
        [{x: 320, y: 340, width: 20, height: 20}]
      when 'user'
        [{x: 340, y: 340, width: 20, height: 20}]
      when 'stage'
        [{x: 280, y: 340, width: 40, height: 40}]
    symbol = new Kinetic.Sprite({
      x: tx,
      y: ty,
      image: @map.image,
      animation: 'static',
      animations: {
        'static': animations
      },
      frameRate: 1,
      index: 0
    })
    parent.add(symbol)
    symbol.start()
    symbol

$ ->
  new Game(60)
