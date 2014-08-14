class BattleFieldScene extends Scene
  constructor: (@game, @view) ->
    super(@game, @view)
    @layer = @view.layer
    @map   = new Map2D(@layer)
    $.ajax {
      url     : "data/terrains.json",
      success : (json) => @builder = new TiledMapBuilder(@map, json),
      dataType: 'json',
      async   : false
    }
    @reset_config_variables()

  reset_config_variables: () ->
    @fps = 0
    @remain_enemy_counts = 0
    @current_stage = 0
    @last_enemy_born_area_index = 0

  load_config_variables: () ->
    @fps                        = @game.get_config('fps')
    @remain_enemy_counts        = @game.get_config('enemies_per_stage')
    @current_stage              = @game.get_status('current_stage')
    @last_enemy_born_area_index = 0
    @winner                     = null
    @remain_user_p1_lives       = @game.get_status('p1_lives')
    if @game.single_player_mode()
      @remain_user_p2_lives     = 0
    else
      @remain_user_p2_lives     = @game.get_status('p2_lives')
    @p1_level                   = @game.get_status('p1_level')
    @p1_ship                    = @game.get_status('p1_ship')
    @p2_level                   = @game.get_status('p2_level')
    @p2_ship                    = @game.get_status('p2_ship')
    @view.update_enemy_statuses(@remain_enemy_counts)
    @view.update_p1_lives(@remain_user_p1_lives)
    @view.update_p2_lives(@remain_user_p2_lives)
    @view.update_stage(@current_stage)

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
    @stop_time_line()
    @map.reset()

  save_user_status: () ->
    if @map.p1_tank()
      @game.update_status('p1_lives', @remain_user_p1_lives + 1)
      @game.update_status('p1_level', @map.p1_tank().level)
      @game.update_status('p1_ship', @map.p1_tank().ship)
    else
      @game.update_status('p1_lives', @remain_user_p1_lives)
    if @map.p2_tank()
      @game.update_status('p2_lives', @remain_user_p2_lives + 1)
      @game.update_status('p2_level', @map.p2_tank().level)
      @game.update_status('p2_ship', @map.p2_tank().ship)
    else
      @game.update_status('p2_lives', @remain_user_p2_lives)

  start_map: () ->
    # wait until builder loaded
    @map.bind('map_ready', (() -> @sound.play('start_stage')), this)
    @map.bind('map_ready', @born_p1_tank, this)
    @map.bind('map_ready', @born_p2_tank, this) unless @game.single_player_mode()
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)
    @map.bind('map_ready', @born_enemy_tank, this)

    @map.bind('user_tank_destroyed', @check_enemy_win, this)
    @map.bind('user_tank_destroyed', @born_user_tanks, this)
    @map.bind('user_tank_destroyed', (() -> @sound.play('gift_bomb')), this)

    @map.bind('enemy_tank_destroyed', @born_enemy_tank, this)
    @map.bind('enemy_tank_destroyed', @increase_enemy_kills_by_user, this)
    @map.bind('enemy_tank_destroyed', @increase_kill_score_by_user, this)
    @map.bind('enemy_tank_destroyed', @draw_tank_points, this)
    @map.bind('enemy_tank_destroyed', @check_user_win, this)
    @map.bind('enemy_tank_destroyed', (() -> @sound.play('gift_bomb')), this)

    @map.bind('gift_consumed', @draw_gift_points, this)
    @map.bind('gift_consumed', @increase_gift_score_by_user, this)
    @map.bind('gift_consumed', (() -> @sound.play('gift')), this)

    @map.bind('home_destroyed', @enemy_win, this)
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
      @view.update_frame_rate(@frame_rate)
      @frame_rate = 0
    , 1000)

  stop_time_line: () ->
    clearInterval(@timeline)
    clearInterval(@frame_timeline)

  add_extra_life: (tank) ->
    if tank instanceof UserP1Tank
      @remain_user_p1_lives += 1
      @view.update_p1_lives(@remain_user_p1_lives)
    else
      @remain_user_p2_lives += 1
      @view.update_p2_lives(@remain_user_p2_lives)

  born_user_tanks: (tank, killed_by_tank) ->
    if tank instanceof UserP1Tank
      @p1_level = @game.get_config('initial_p1_level')
      @p1_ship  = @game.get_config('initial_p1_ship')
      @born_p1_tank()
    else
      @p2_level = @game.get_config('initial_p2_level')
      @p2_ship  = @game.get_config('initial_p2_ship')
      @born_p2_tank()

  born_p1_tank: () ->
    if @remain_user_p1_lives > 0
      @remain_user_p1_lives -= 1
      p1_tank = @map.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
      p1_tank.level_up(@game.get_status('p1_level') - 1)
      p1_tank.on_ship(@game.get_status('p1_ship'))
      @view.update_p1_lives(@remain_user_p1_lives)

  born_p2_tank: () ->
    console.log("born p2 tank")
    console.log("#{@remain_user_p2_lives}")
    if @remain_user_p2_lives > 0
      @remain_user_p2_lives -= 1
      p2_tank = @map.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))
      p2_tank.level_up(@game.get_status('p2_level') - 1)
      p2_tank.on_ship(@game.get_status('p2_ship'))
      @view.update_p2_lives(@remain_user_p2_lives)

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
      @view.update_enemy_statuses(@remain_enemy_counts)

  check_user_win: () ->
    if @remain_enemy_counts == 0 and _.size(@map.enemy_tanks()) == 0
      @user_win()

  check_enemy_win: () ->
    @enemy_win() if (@remain_user_p1_lives == 0 and @remain_user_p2_lives == 0)

  user_win: () ->
    return unless _.isNull(@winner)
    @winner = 'user'
    # report
    setTimeout((() =>
      @save_user_status()
      @game.switch_scene('report')
    ), 3000)

  enemy_win: () ->
    return unless _.isNull(@winner)
    @winner = 'enemy'
    @disable_user_controls()
    setTimeout(() =>
      @game.update_status('game_over', true)
      @sound.play('lose')
      @game.switch_scene('report')
    , 3000)

  increase_kill_score_by_user: (tank, killed_by_tank) ->
    tank_score = @game.get_config("score_for_#{tank.type()}")
    if killed_by_tank instanceof UserP1Tank
      @game.increase_p1_score(tank_score)
    else
      @game.increase_p2_score(tank_score)

  increase_enemy_kills_by_user: (tank, killed_by_tank) ->
    if killed_by_tank instanceof UserP1Tank
      p1_kills = @game.get_status('p1_killed_enemies')
      p1_kills.push(tank.type())
    else
      p2_kills = @game.get_status('p2_killed_enemies')
      p2_kills.push(tank.type())

  draw_tank_points: (tank, killed_by_tank) ->
    if tank instanceof EnemyTank
      @view.draw_point_label(tank, @game.get_config("score_for_#{tank.type()}"))

  increase_gift_score_by_user: (gift, tanks) ->
    _.each(tanks, (tank) =>
      gift_score = @game.get_config("score_for_gift")
      if tank instanceof UserP1Tank
        @game.increase_p1_score(gift_score)
      else if tank instanceof UserP2Tank
        @game.increase_p2_score(gift_score)
    )

  draw_gift_points: (gift, tanks) ->
    _.detect(tanks, (tank) =>
      if tank instanceof UserTank
        @view.draw_point_label(tank, @game.get_config("score_for_gift"))
        true
      else
        false
    )
