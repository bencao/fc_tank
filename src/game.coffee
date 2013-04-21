class Game
  constructor: (@fps) ->
    @init_canvas()
    @init_scenes()
    @init_control()
    @canvas.scenes.load("game")
    @start()
    window.game = this

  init_map: (canvas, scene) ->
    map = new Map2D(canvas, scene)

    map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
    map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

    map.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40))
    map.add_tank(FishTank, new MapArea2D(240, 0, 280, 40))
    map.add_tank(StrongTank, new MapArea2D(480, 0, 520, 40))

    builder = new TerrainBuilder(map, map.default_width, map.default_height)

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

    map.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520))

    # set a reference for easier debug
    window.map = map

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
    @canvas.timeline.start()

  pause: () ->
    $(document).unbind "keyup"
    $(document).unbind "keydown"
    @canvas.timeline.stop()

  init_canvas: () ->
    @canvas = oCanvas.create({canvas: "#canvas", background: "#000", fps: @fps})

  init_scenes: () ->
    welcome_text = @canvas.display.text({
      x: 260,
      y: 170,
      origin: { x: "center", y: "top" },
      align: "center",
      font: "bold 30px sans-serif",
      text: "Hello dude\n\nPress Enter to start game!",
      fill: "#fff"
    })
    @canvas.scenes.create "welcome", () -> @add(welcome_text)

    game_scene = @canvas.scenes.create "game", () ->
    @map = @init_map(@canvas, game_scene)

  init_control: () ->
    last_time = new Date()
    mod = 0
    frame_rate = 0
    @canvas.setLoop () =>
      current_time = new Date()
      delta_time = current_time.getMilliseconds() - last_time.getMilliseconds()
      # suppose a frame will not be more than 1 second
      delta_time += 1000 if delta_time < 0
      _.each(@map.map_units, (unit) ->
        unit.integration(delta_time)
      )
      mod = (mod + 1) % 10
      _.each(@map.map_units, (unit) ->
        unit.reset_zindex()
      ) if mod == 0
      last_time = current_time
      frame_rate += 1
      # console.log "current_frame=" + frame_rate
      # game.pause() if mod == 9
    frame_text = @canvas.display.text({
      x: 510,
      y: 10,
      origin: { x: "right", y: "top" },
      font: "bold 20px sans-serif",
      text: "0 fps"
      fill: "#0f0"
    })
    @canvas.addChild(frame_text)
    # show frame rate
    setInterval(() =>
      frame_text.text = (frame_rate + " fps")
      frame_rate = 0
    , 1000)

    $(document).bind "keypress", (event) =>
      # key code mapping
      [space, enter] = [32, 13]
      switch event.which
        when enter
          @canvas.scenes.load("game", true)
          @start()
        when space
          @canvas.scenes.load("welcome", true)
          @pause()

$ ->
  new Game(60)
