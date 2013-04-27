class Game
  constructor: () ->
    @canvas = new Kinetic.Stage({container: 'canvas', width: 600, height: 520})
    @init_default_config()
    @scenes = {
      'welcome': new WelcomeScene(this),
      'stage': new StageScene(this),
      'game': new GameScene(this),
      'report': new ReportScene(this),
      'hi_score': new HiScoreScene(this)
    }
    @current_scene = null

  set_config: (key, value) -> @configs[key] = value
  get_config: (key) -> @configs[key]
  init_default_config: () ->
    @configs = {
      fps: 60, players: 1, current_stage: 1, stages: 5,
      hi_score: 20000, p1_score: 0, p2_score: 0,
      last_score: 0, player_initial_life: 2, enemies_per_stage: 20,
    }

  kick_off: () -> @switch_scene('welcome')

  next_stage: () ->
    @configs['current_stage'] = (@configs['current_stage'] + 1
      + @configs['stages']) % @configs['stages']
    if @configs['current_stage'] == 0
      @configs['current_stage'] = @configs['stages']
    @configs['current_stage']

  reset: () ->
    _.each @scenes, (scene) -> scene.stop()
    @current_scene = null
    @init_default_config()
    @kick_off()

  switch_scene: (type) ->
    target_scene = @scenes[type]
    @current_scene.stop() unless _.isEmpty(@current_scene)
    target_scene.start()
    @current_scene = target_scene

class Scene
  constructor: (@game) ->
    @layer = new Kinetic.Layer()
    @game.canvas.add(@layer)
    # Kinetic bug fix start
    sprite = (new Kinetic.Sprite({
      x: -99,
      y: -99,
      image: document.getElementById('tank_sprite'),
      animation: 'brick',
      animations: Animations.terrains,
      frameRate: Animations.rate('brick'),
      index: 0
    }))
    @layer.add(sprite)
    sprite.start()
    # Kinetic bug fix end
    @layer.hide()

  start: () -> @layer.show()
  stop: () -> @layer.hide()

class WelcomeScene extends Scene
  constructor: (@game) ->
    super(@game)
    @static_group = new Kinetic.Group()
    @layer.add(@static_group)
    @init_statics()

  start: () ->
    super()
    @static_group.move(-300, 0)
    @static_group.transitionTo({
      x: 0,
      duration: 1.5,
      easing: "linear",
      callback: () =>
        @update_players()
        @enable_selection_control()
    })

  stop: () ->
    super()
    @disable_selection_control()

  enable_selection_control: () ->
    $(document).bind "keydown", (event) =>
      switch event.which
        when 13
          # ENTER
          @game.switch_scene('stage')
        when 32
          # SPACE
          @toggle_players()

  disable_selection_control: () ->
    $(document).unbind "keydown"

  toggle_players: () ->
    if @game.get_config('players') == 1
      @game.set_config('players', 2)
    else
      @game.set_config('players', 1)
    @update_players()
  update_players: () ->
    players = @game.get_config('players')
    if players == 1
      @select_tank.setAbsolutePosition(170, 350)
    else
      @select_tank.setAbsolutePosition(170, 390)

  init_statics: () ->
    # scores
    @static_group.add(new Kinetic.Text({
      x: 40,
      y: 40,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "I- #{@game.get_config('p1_score')}" +
        "  II- #{@game.get_config('p2_score')}" +
        "  HI- #{@game.get_config('hi_score')}",
      fill: "#fff"
    }))
    # logo
    image = document.getElementById('tank_sprite')
    for area in [
      # T
      new MapArea2D(80, 100, 120, 110),
      new MapArea2D(120, 100, 140, 110),
      new MapArea2D(100, 110, 120, 140),
      new MapArea2D(100, 140, 120, 170),
      # A
      new MapArea2D(170, 100, 200, 110),
      new MapArea2D(160, 110, 180, 120),
      new MapArea2D(190, 110, 210, 120),
      new MapArea2D(150, 120, 170, 140),
      new MapArea2D(150, 140, 170, 170),
      new MapArea2D(200, 120, 220, 140),
      new MapArea2D(200, 140, 220, 170),
      new MapArea2D(170, 140, 200, 150),
      # N
      new MapArea2D(230, 100, 250, 140),
      new MapArea2D(230, 140, 250, 170),
      new MapArea2D(250, 110, 260, 140),
      new MapArea2D(260, 120, 270, 150),
      new MapArea2D(270, 130, 280, 160),
      new MapArea2D(280, 100, 300, 140),
      new MapArea2D(280, 140, 300, 170),
      # K
      new MapArea2D(310, 100, 330, 140),
      new MapArea2D(310, 140, 330, 170),
      new MapArea2D(360, 100, 380, 110),
      new MapArea2D(350, 110, 370, 120),
      new MapArea2D(340, 120, 360, 130),
      new MapArea2D(330, 130, 350, 140),
      new MapArea2D(330, 140, 360, 150),
      new MapArea2D(340, 150, 370, 160),
      new MapArea2D(350, 160, 380, 170),
      # C - means coffee
      new MapArea2D(440, 100, 490, 110),
      new MapArea2D(430, 110, 450, 120),
      new MapArea2D(480, 110, 500, 120),
      new MapArea2D(420, 120, 440, 130),
      new MapArea2D(420, 130, 440, 140),
      new MapArea2D(420, 140, 440, 150),
      new MapArea2D(430, 150, 450, 160),
      new MapArea2D(480, 150, 500, 160),
      new MapArea2D(440, 160, 490, 170),

      # 1
      new MapArea2D(180, 210, 200, 220),
      new MapArea2D(170, 220, 200, 230),
      new MapArea2D(180, 230, 200, 250),
      new MapArea2D(180, 250, 200, 270),
      new MapArea2D(160, 270, 200, 280),
      new MapArea2D(200, 270, 220, 280),
      # 9
      new MapArea2D(240, 210, 260, 220),
      new MapArea2D(260, 210, 290, 220),
      new MapArea2D(230, 220, 250, 240),
      new MapArea2D(280, 220, 300, 240),
      new MapArea2D(240, 240, 260, 250),
      new MapArea2D(260, 240, 300, 250),
      new MapArea2D(280, 250, 300, 260),
      new MapArea2D(270, 260, 290, 270),
      new MapArea2D(240, 270, 280, 280),
      # 9
      new MapArea2D(320, 210, 340, 220),
      new MapArea2D(340, 210, 370, 220),
      new MapArea2D(310, 220, 330, 240),
      new MapArea2D(360, 220, 380, 240),
      new MapArea2D(320, 240, 340, 250),
      new MapArea2D(340, 240, 380, 250),
      new MapArea2D(360, 250, 380, 260),
      new MapArea2D(350, 260, 370, 270),
      new MapArea2D(320, 270, 360, 280),
      # 0
      new MapArea2D(410, 210, 440, 220),
      new MapArea2D(400, 220, 410, 230),
      new MapArea2D(430, 220, 450, 230),
      new MapArea2D(390, 230, 410, 260),
      new MapArea2D(440, 230, 460, 260),
      new MapArea2D(400, 260, 420, 270),
      new MapArea2D(440, 260, 450, 270),
      new MapArea2D(410, 270, 440, 280)
    ]
      animations = _.cloneDeep(Animations.terrain('brick'))
      for animation in animations
        animation.x += (area.x1 % 40)
        animation.y += (area.y1 % 40)
        animation.width = area.width()
        animation.height = area.height()
      brick_sprite = new Kinetic.Sprite({
        x: area.x1,
        y: area.y1,
        image: image,
        index: 0,
        animation: 'static',
        animations: {static: animations}
      })
      @static_group.add(brick_sprite)
      brick_sprite.start()
    # 1/2 user
    @static_group.add(new Kinetic.Text({
      x: 210,
      y: 340,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "1 PLAYER",
      fill: "#fff"
    }))
    @static_group.add(new Kinetic.Text({
      x: 210,
      y: 380,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "2 PLAYERS",
      fill: "#fff"
    }))
    # copy right
    @static_group.add(new Kinetic.Text({
      x: 210,
      y: 460,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "© BEN♥FENG",
      fill: "#fff"
    }))
    # tank
    @select_tank = new Kinetic.Sprite({
      x: 170,
      y: 350,
      image: image,
      animation: 'user_p1_lv1',
      animations: Animations.movables,
      frameRate: Animations.rate('user_p1_lv1'),
      index: 0,
      offset: {x: 20, y: 20},
      rotationDeg: 90,
    })
    @static_group.add(@select_tank)
    @select_tank.start()


class StageScene extends Scene
  constructor: (@game) ->
    super(@game)
    @init_stage_nodes()

  start: () ->
    super()
    @current_stage = @game.get_config('current_stage')
    @update_stage_label()
    @enable_stage_control()

  stop: () ->
    super()
    @disable_stage_control()

  enable_stage_control: () ->
    $(document).bind "keydown", (event) =>
      switch event.which
        when 37, 38
          # UP, LEFT
          @current_stage = @game.prev_stage()
          @update_stage_label()
        when 39, 40
          # RIGHT, DOWN
          @current_stage = @game.next_stage()
          @update_stage_label()
        when 13
          # ENTER
          @game.switch_scene('game')

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
      fill: "#333"
    })
    @layer.add(@stage_label)

  update_stage_label: () ->
    @stage_label.setText("STAGE #{@current_stage}")

class ReportScene extends Scene
  constructor: (@game) ->
    super(@game)

  start: () ->
    super()
    # add

class HiScoreScene extends Scene
  constructor: (@game) ->
    super(@game)

  start: () ->
    super()
    # add

class GameScene extends Scene
  constructor: (@game) ->
    super(@game)
    @map = new Map2D(@layer)
    $.ajax {
      url: "data/terrains.json",
      success: (json) => @builder = new TiledMapBuilder(@map, json),
      dataType: 'json',
      async: false
    }
    @reset_config_variables()
    @init_status()
    window.gs = this # for debug

  reset_config_variables: () ->
    @fps = 0
    @remain_enemy_counts = 0
    @remain_user_p1_lives = 0
    @remain_user_p2_lives = 0
    @current_stage = 0
    @last_enemy_born_area_index = 0

  load_config_variables: () ->
    @fps = @game.get_config('fps')
    @remain_enemy_counts = @game.get_config('enemies_per_stage')
    @remain_user_p1_lives = @game.get_config('player_initial_life')
    if @game.get_config('players') == 2
      @remain_user_p2_lives = @game.get_config('player_initial_life')
    else
      @remain_user_p2_lives = 0
    @current_stage = @game.get_config('current_stage')
    @last_enemy_born_area_index = 0

  start: () ->
    super()
    @load_config_variables()
    @start_map()
    @enable_user_control()
    @enable_system_control()
    @start_time_line()
    @running = true

  stop: () ->
    super()
    @update_status()
    @disable_controls()
    @map.reset()

  start_map: () ->
    # wait until builder loaded
    @map.bind('map_ready', @born_p1_tank, this)
    @map.bind('map_ready', @born_p2_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('tank_destroyed', @born_tanks, this)
    @map.bind('home_destroyed', @check_enemy_win, this)
    @map.bind('tank_life_up', @add_extra_life, this)
    @builder.setup_stage(@current_stage)
    @map.trigger('map_ready')

  enable_user_control: () ->
    $(document).bind "keyup", (event) =>
      if @map.p1_tank()
        @map.p1_tank().commander.add_key_event("keyup", event.which)
      if @map.p2_tank()
        @map.p2_tank().commander.add_key_event("keyup", event.which)

    $(document).bind "keydown", (event) =>
      if @map.p1_tank()
        @map.p1_tank().commander.add_key_event("keydown", event.which)
      if @map.p2_tank()
        @map.p2_tank().commander.add_key_event("keydown", event.which)

  enable_system_control: () ->
    $(document).bind "keydown", (event) =>
      switch event.which
        when 13
          # ENTER
          if @running then @pause() else @rescue()
        when 27
          # ESC
          @game.reset()

  disable_controls: () ->
    $(document).unbind "keyup"
    $(document).unbind "keydown"

  pause: () ->
    @running = false
    @stop_time_line()
    @disable_controls()
    @enable_system_control()

  rescue: () ->
    @running = true
    @start_time_line()
    @enable_user_control()

  start_time_line: () ->
    last_time = new Date()
    @timeline = setInterval(() =>
      current_time = new Date()
      delta_time = current_time.getMilliseconds() - last_time.getMilliseconds()
      # assume a frame will never last more than 1 second
      delta_time += 1000 if delta_time < 0
      _.each(@map.tanks.concat(@map.missiles).concat(@map.gifts), (unit) ->
        unit.integration(delta_time) unless unit.destroyed
      )
      last_time = current_time
      @frame_rate += 1
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
    @layer.add(@status_panel)

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
      x: 526,
      y: 490,
      fontSize: 20,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "0 fps"
      fill: "#c00"
    })
    @status_panel.add(@frame_rate_label)

    @enemy_symbols = []
    # enemy tanks
    for i in [1..@remain_enemy_counts]
      tx = (if i % 2 == 1 then 540 else 560)
      ty = parseInt((i - 1) / 2) * 25 + 20
      symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
      @enemy_symbols.push(symbol)

    # user tank status
    user_p1_label = new Kinetic.Text({
      x: 540,
      y: 300,
      fontSize: 18,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "1P",
      fill: "#000"
    })
    user_p1_symbol = @new_symbol(@status_panel, 'user', 540, 320)
    @user_p1_remain_lives_label = new Kinetic.Text({
      x: 565,
      y: 324,
      fontSize: 16,
      fontFamily: "Courier",
      text: "#{@remain_user_p1_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p1_label)
    @status_panel.add(@user_p1_remain_lives_label)

    user_p2_label = new Kinetic.Text({
      x: 540,
      y: 350,
      fontSize: 18,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "2P",
      fill: "#000"
    })
    user_p2_symbol = @new_symbol(@status_panel, 'user', 540, 370)
    @user_p2_remain_lives_label = new Kinetic.Text({
      x: 565,
      y: 374,
      fontSize: 16,
      fontFamily: "Courier",
      text: "#{@remain_user_p2_lives}",
      fill: "#000"
    })
    @status_panel.add(user_p2_label)
    @status_panel.add(@user_p2_remain_lives_label)

    # stage status
    @new_symbol(@status_panel, 'stage', 540, 420)
    @stage_label = new Kinetic.Text({
      x: 560,
      y: 445,
      fontSize: 16,
      fontFamily: "Courier",
      text: "#{@current_stage}",
      fill: "#000"
    })
    @status_panel.add(@stage_label)

  update_status: () ->
    _.each(@enemy_symbols, (symbol) -> symbol.destroy())
    for i in [1..@remain_enemy_counts]
      tx = (if i % 2 == 1 then 540 else 560)
      ty = parseInt((i - 1) / 2) * 25 + 20
      symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
      @enemy_symbols.push(symbol)
    @user_p1_remain_lives_label.setText(@remain_user_p1_lives)
    @user_p2_remain_lives_label.setText(@remain_user_p2_lives)
    @stage_label.setText(@current_stage)

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

  add_extra_life: (tank) ->
    if tank instanceof UserP1Tank
      @remain_user_p1_lives += 1
    else
      @remain_user_p2_lives += 1
    @update_status()

  born_p1_tank: () ->
    console.log "born p1 tank"
    if @remain_user_p1_lives > 0
      @remain_user_p1_lives -= 1
      @map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
      @update_status()
    else
      @check_enemy_win()

  born_p2_tank: () ->
    if @remain_user_p2_lives > 0
      @remain_user_p2_lives -= 1
      @map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))
      @update_status()
    else
      @check_enemy_win()

  born_enemy_tank: () ->
    if @remain_enemy_counts > 0
      @remain_enemy_counts -= 1
      enemy_born_areas = [
        new MapArea2D(0, 0, 40, 40),
        new MapArea2D(240, 0, 280, 40),
        new MapArea2D(480, 0, 520, 40)
      ]
      enemy_tank_types = [StupidTank, FishTank, FoolTank, StrongTank]
      randomed = parseInt(Math.random() * 1000) % _.size(enemy_tank_types)
      @map.add_tank(enemy_tank_types[randomed],
        enemy_born_areas[@last_enemy_born_area_index])
      @last_enemy_born_area_index = (@last_enemy_born_area_index + 1) % 3
      @update_status()
    else
      @check_user_win()

  check_user_win: () ->
    @user_win() if @remain_enemy_counts == 0 and _.size(@map.enemy_tanks()) == 0

  check_enemy_win: () ->
    @enemy_win() if @map.home().destroyed
    @enemy_win() if (@remain_user_p1_lives == 0 and @remain_user_p2_lives == 0)

  user_win: () ->
    # report
    setTimeout((() =>
      @game.next_stage()
      @game.switch_scene('report')
    ), 5000)

  enemy_win: () ->
    # hi score or
    # welcome
    setTimeout(() =>
      @game.switch_scene('welcome')
    , 10000)

  born_tanks: (tank) ->
    if tank instanceof UserP1Tank
      @born_p1_tank()
    else if tank instanceof UserP2Tank
      @born_p2_tank()
    else
      @born_enemy_tank()

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

$ ->
  game = new Game()
  window.game = game
  game.kick_off()
