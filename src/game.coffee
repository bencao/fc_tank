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
    @init_map()
    @init_control()
    @start()
    window.game = this

  init_map: () ->
    @map = new Map2D

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
    frame_rate = 0
    last_time = new Date()
    @timeline = setInterval(() =>
      current_time = new Date()
      delta_time = current_time.getMilliseconds() - last_time.getMilliseconds()
      # assume a frame will never last more than 1 second
      delta_time += 1000 if delta_time < 0
      _.each(@map.tanks.concat(@map.missiles), (unit) ->
        unit.integration(delta_time)
      )
      last_time = current_time
      frame_rate += 1
      # console.log "current_frame=" + frame_rate
      # game.pause() if mod == 9
    , parseInt(1000/@fps))
    # show frame rate
    @frame_timeline = setInterval(() =>
      @frame_text.setText(frame_rate + " fps")
      frame_rate = 0
    , 1000)

  stop_time_line: () ->
    clearInterval(@timeline)
    clearInterval(@frame_timeline)

  init_control: () ->
    last_time = new Date()
    @frame_text = new Kinetic.Text({
      x: 480,
      y: 10,
      fontSize: 20,
      fontStyle: "bold",
      text: "0 fps"
      fill: "#0f0"
    })
    @map.groups['status'].add(@frame_text)

$ ->
  new Game(60)
