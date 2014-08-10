class GameScene extends Scene
  constructor: (@game) ->
    super(@game)
    @map   = new Map2D(@layer)
    @sound = new Sound()
    $.ajax {
      url     : "data/terrains.json",
      success : (json) => @builder = new TiledMapBuilder(@map, json),
      dataType: 'json',
      async   : false
    }
    @reset_config_variables()
    @init_status()

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
    @remain_user_p1_lives = @game.get_config('p1_lives')
    if @game.get_config('players') == 2
      @remain_user_p2_lives = @game.get_config('p2_lives')
    else
      @remain_user_p2_lives = 0
    @current_stage = @game.get_config('current_stage')
    @last_enemy_born_area_index = 0
    @winner = null

  start: () ->
    super()
    @load_config_variables()
    @start_map()
    @enable_user_control()
    @enable_system_control()
    @start_time_line()
    @running = true
    @p1_user_initialized = false
    @p2_user_initialized = false

  stop: () ->
    super()
    @update_status()
    @stop_time_line()
    @save_user_status() if @winner == 'user'
    @map.reset()

  save_user_status: () ->
    @game.set_config('p1_lives', @remain_user_p1_lives + 1)
    @game.set_config('p2_lives', @remain_user_p2_lives + 1)
    if @map.p1_tank() != undefined
      @game.set_config('p1_level', @map.p1_tank().level)
      @game.set_config('p1_ship', @map.p1_tank().ship)
    if @map.p2_tank() != undefined
      @game.set_config('p2_level', @map.p2_tank().level)
      @game.set_config('p2_ship', @map.p2_tank().ship)

  start_map: () ->
    # wait until builder loaded
    @map.bind('map_ready', (() -> @sound.play('start_stage')), this)
    @map.bind('map_ready', @born_p1_tank, this)
    @map.bind('map_ready', @born_p2_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('user_tank_destroyed', @born_user_tanks, this)
    @map.bind('user_tank_destroyed', (() -> @sound.play('gift_bomb')), this)
    @map.bind('enemy_tank_destroyed', @born_enemy_tanks, this)
    @map.bind('enemy_tank_destroyed', @draw_tank_points, this)
    @map.bind('enemy_tank_destroyed', (() -> @sound.play('gift_bomb')), this)
    @map.bind('gift_consumed', @draw_gift_points, this)
    @map.bind('gift_consumed', (() -> @sound.play('gift')), this)
    @map.bind('home_destroyed', @check_enemy_win, this)
    @map.bind('home_destroyed', (() -> @sound.play('gift_bomb')), this)
    @map.bind('tank_life_up', @add_extra_life, this)
    @map.bind('tank_life_up', (() -> @sound.play('gift_life')), this)
    @map.bind('user_fired', (() -> @sound.play('fire')), this)
    @map.bind('user_moved', (() -> @sound.play('user_move')), this)
    @map.bind('enemy_moved', (() -> @sound.play('enemy_move')), this)
    @builder.setup_stage(@current_stage)
    @map.trigger('map_ready')

  enable_user_control: () ->
    p1_control_mappings = {
      "UP"   : "up",
      "DOWN" : "down",
      "LEFT" : "left",
      "RIGHT": "right",
      "Z"    : "fire"
    }

    p2_control_mappings = {
      "W": "up",
      "S": "down",
      "A": "left",
      "D": "right",
      "J": "fire"
    }

    _.forIn p1_control_mappings, (virtual_command, physical_key) =>
      @keyboard.on_key_down physical_key, (event) =>
        if @map.p1_tank()
          @map.p1_tank().commander.on_command_start(virtual_command)
      @keyboard.on_key_up physical_key, (event) =>
        if @map.p1_tank()
          @map.p1_tank().commander.on_command_end(virtual_command)

    _.forIn p2_control_mappings, (virtual_command, physical_key) =>
      @keyboard.on_key_down physical_key, (event) =>
        if @map.p2_tank()
          @map.p2_tank().commander.on_command_start(virtual_command)
      @keyboard.on_key_up physical_key, (event) =>
        if @map.p2_tank()
          @map.p2_tank().commander.on_command_end(virtual_command)

  enable_system_control: () ->
    @keyboard.on_key_down "ENTER", (event) =>
      if @running then @pause() else @rescue()

  pause: () ->
    @running = false
    @stop_time_line()
    @disable_user_controls()

  disable_user_controls: () ->
    @keyboard.reset()
    @map.p1_tank().commander.reset() if @map.p1_tank()
    @map.p2_tank().commander.reset() if @map.p2_tank()
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
      unit.integration(delta_time) for unit in @map.missiles
      unit.integration(delta_time) for unit in @map.gifts
      unit.integration(delta_time) for unit in @map.tanks
      unit.integration(delta_time) for unit in @map.missiles
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
    @enemy_symbols = []
    if @remain_enemy_counts > 0
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
    if @remain_user_p1_lives > 0
      @remain_user_p1_lives -= 1
      @map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
      unless @p1_user_initialized
        inherited_level = @game.get_config('p1_level')
        @map.p1_tank().level_up(inherited_level - 1)
        @p1_user_initialized = true
      @update_status()
    else
      @check_enemy_win()

  born_p2_tank: () ->
    if @remain_user_p2_lives > 0
      @remain_user_p2_lives -= 1
      @map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))
      unless @p2_user_initialized
        inherited_level = @game.get_config('p2_level')
        @map.p2_tank().level_up(inherited_level - 1)
        @p2_user_initialized = true
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
    if @remain_enemy_counts == 0 and _.size(@map.enemy_tanks()) == 0
      @user_win()

  check_enemy_win: () ->
    @enemy_win() if @map.home().destroyed
    @enemy_win() if (@remain_user_p1_lives == 0 and @remain_user_p2_lives == 0)

  user_win: () ->
    return unless _.isNull(@winner)
    @winner = 'user'
    # report
    setTimeout((() =>
      @game.next_stage()
      @game.switch_scene('report')
    ), 3000)

  enemy_win: () ->
    return unless _.isNull(@winner)
    @winner = 'enemy'
    @disable_user_controls()
    setTimeout(() =>
      @game.set_config('game_over', true)
      @sound.play('lose')
      @game.switch_scene('report')
    , 3000)

  born_user_tanks: (tank, killed_by_tank) ->
    if tank instanceof UserP1Tank
      @born_p1_tank()
    else
      @born_p2_tank()

  born_enemy_tanks: (tank, killed_by_tank) ->
    if killed_by_tank instanceof UserP1Tank
      p1_kills = @game.get_config('p1_killed_enemies')
      p1_kills.push(tank.type())
    else if killed_by_tank instanceof UserP2Tank
      p2_kills = @game.get_config('p2_killed_enemies')
      p2_kills.push(tank.type())
    @born_enemy_tank()

  draw_tank_points: (tank, killed_by_tank) ->
    if tank instanceof EnemyTank
      point_label = new Kinetic.Text({
        x         : (tank.area.x1 + tank.area.x2) / 2 - 10,
        y         : (tank.area.y1 + tank.area.y2) / 2 - 5,
        fontSize  : 16,
        fontStyle : "bold",
        fontFamily: "Courier",
        text      : @game.get_config("score_for_#{tank.type()}")
        fill      : "#fff"
      })
      @status_panel.add(point_label)
      setTimeout(() ->
        point_label.destroy()
      , 1500)

  draw_gift_points: (gift, tanks) ->
    _.detect(tanks, (tank) =>
      if tank instanceof UserTank
        point_label = new Kinetic.Text({
          x         : (gift.area.x1 + gift.area.x2) / 2 - 10,
          y         : (gift.area.y1 + gift.area.y2) / 2 - 5,
          fontSize  : 16,
          fontStyle : "bold",
          fontFamily: "Courier",
          text      : @game.get_config("score_for_gift"),
          fill      : "#fff"
        })
        @status_panel.add(point_label)
        setTimeout(() ->
          point_label.destroy()
        , 1500)
        true
      else
        false
    )
