class WelcomeScene extends Scene
  constructor: (@game) ->
    super(@game)
    @static_group = new Kinetic.Group()
    @layer.add(@static_group)
    @init_statics()
    @init_logo()
    @init_user_selection()

  start: () ->
    super()
    @static_group.move(-300, 0)
    new Kinetic.Tween({
      node: @static_group,
      duration: 1.5,
      x: 0,
      easing: Kinetic.Easings.Linear,
      onFinish: () =>
        @update_players()
        @enable_selection_control()
    }).play()
    @update_numbers()

  stop: () ->
    super()
    @prepare_for_game_scene()

  update_numbers: () ->
    @numbers_label.setText("I- #{@game.get_config('p1_score')}" +
        "  II- #{@game.get_config('p2_score')}" +
        "  HI- #{@game.get_config('hi_score')}")

  prepare_for_game_scene: () ->
    @game.set_config('game_over', false)
    @game.set_config('stage_autostart', false)
    @game.set_config('current_stage', 1)
    @game.set_config('p1_score', 0)
    @game.set_config('p2_score', 0)
    @game.set_config('p1_lives', 2)
    @game.set_config('p2_lives', 2)
    @game.set_config('p1_level', 1)
    @game.set_config('p2_level', 1)

  enable_selection_control: () ->
    @keyboard.on_key_down 'ENTER', () =>
      @game.switch_scene('stage')
    @keyboard.on_key_down 'SPACE', () =>
      @toggle_players()

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
    @numbers_label = new Kinetic.Text({
      x: 40,
      y: 40,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "I- #{@game.get_config('p1_score')}" +
        "  II- #{@game.get_config('p2_score')}" +
        "  HI- #{@game.get_config('hi_score')}",
      fill: "#fff"
    })
    @static_group.add(@numbers_label)

  init_logo: () ->
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

  init_user_selection: () ->
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
    image = document.getElementById('tank_sprite')
    @select_tank = new Kinetic.Sprite({
      x: 170,
      y: 350,
      image: image,
      animation: 'user_p1_lv1',
      animations: Animations.movables,
      frameRate: Animations.rate('user_p1_lv1'),
      index: 0,
      offset: {x: 20, y: 20},
      rotationDeg: 90
    })
    @static_group.add(@select_tank)
    @select_tank.start()
