class TiledMapBuilder
  constructor: (@map, @json) ->
    @tile_width = parseInt(@json.tilewidth)
    @tile_height = parseInt(@json.tileheight)
    @map_width = parseInt(@json.width)
    @map_height = parseInt(@json.height)
    @tile_properties = {}
    _.each @json.tilesets, (tileset) =>
      for gid, props of tileset.tileproperties
        @tile_properties[tileset.firstgid + parseInt(gid)] = props
  setup_stage: (stage) ->
      home_layer = _.detect(@json.layers, (layer) -> layer.name is "Home")
      stage_layer = _.detect(@json.layers, (layer) -> layer.name is "Stage #{stage}")
      _.each [home_layer, stage_layer], (layer) =>
        h = 0
        while h < @map_height
          w = 0
          while w < @map_width
            tile_id = layer.data[h * @map_width + w]
            if tile_id != 0
              properties = @tile_properties[tile_id]
              [x1, y1] = [
                w * @tile_width + parseInt(properties.x_offset),
                h * @tile_height + parseInt(properties.y_offset)
              ]
              area = new MapArea2D(x1, y1,
                x1 + parseInt(properties.width),
                y1 + parseInt(properties.height)
              )
              @map.add_terrain(eval(properties.type), area)
            w += 1
          h += 1

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
    # set as loading
    @map = new Map2D(@game_scene)
    $.getJSON "/data/terrains.json", (json) =>
      builder = new TiledMapBuilder(@map, json)
      # stage 1
      builder.setup_stage(1)
      # set as loaded
      @map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
      @map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

      @map.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40))
      @map.add_tank(FishTank, new MapArea2D(240, 0, 280, 40))
      @map.add_tank(StrongTank, new MapArea2D(480, 0, 520, 40))

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
      x: 535,
      y: 490,
      fontSize: 20,
      fontStyle: "bold",
      text: "0 fps"
      fill: "#c00"
    })
    @status_panel.add(@frame_rate_label)

    @remain_enemy_counts = 20
    @enemy_symbols = []
    # enemy tanks
    for i in [1..@remain_enemy_counts]
      tx = (if i % 2 == 1 then 540 else 560)
      ty = parseInt((i - 1) / 2) * 25 + 20
      symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
      @enemy_symbols.push(symbol)

    # user tank status
    @remain_user_p1_lives = 2
    user_p1_label = new Kinetic.Text({
      x: 540,
      y: 300,
      fontSize: 18,
      fontStyle: "bold",
      text: "1P",
      fill: "#000"
    })
    user_p1_symbol = @new_symbol(@status_panel, 'user', 540, 320)
    user_p1_remain_lives_label = new Kinetic.Text({
      x: 565,
      y: 324,
      fontSize: 16,
      text: "#{@remain_user_p1_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p1_label)
    @status_panel.add(user_p1_remain_lives_label)

    @remain_user_p2_lives = 2
    user_p2_label = new Kinetic.Text({
      x: 540,
      y: 350,
      fontSize: 18,
      fontStyle: "bold",
      text: "2P",
      fill: "#000"
    })
    user_p2_symbol = @new_symbol(@status_panel, 'user', 540, 370)
    user_p2_remain_lives_label = new Kinetic.Text({
      x: 565,
      y: 374,
      fontSize: 16,
      text: "#{@remain_user_p2_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p2_label)
    @status_panel.add(user_p2_remain_lives_label)

    # stage status
    @current_stage = 1
    @new_symbol(@status_panel, 'stage', 540, 420)
    stage_label = new Kinetic.Text({
      x: 560,
      y: 445,
      fontSize: 16,
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
