class BattleFieldView extends View
  init_view: () ->
    @status_panel = new Kinetic.Group()
    @layer.add(@status_panel)
    @init_bg()
    @init_frame_rate()
    @init_enemy_tanks_statuses()
    @init_p1_tank_status()
    @init_p2_tank_status()
    @init_stage()

  update_enemy_statuses: (remain_enemy_counts) ->
    _.each(@enemy_symbols, (symbol) -> symbol.destroy())
    @enemy_symbols = []
    if remain_enemy_counts > 0
      for i in [1..remain_enemy_counts]
        tx = (if i % 2 == 1 then 540 else 560)
        ty = parseInt((i - 1) / 2) * 25 + 20
        symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
        @enemy_symbols.push(symbol)

  update_p1_lives: (remain_user_p1_lives) ->
    @user_p1_remain_lives_label.setText(remain_user_p1_lives)

  update_p2_lives: (remain_user_p2_lives) ->
    @user_p2_remain_lives_label.setText(remain_user_p2_lives)

  update_stage: (current_stage) ->
    @stage_label.setText(current_stage)

  update_frame_rate: (frame_rate) ->
    @frame_rate_label.setText(frame_rate + " fps")

  draw_point_label: (relative_to_object, text) ->
    point_label = new Kinetic.Text({
      x         : (relative_to_object.area.x1 + relative_to_object.area.x2) / 2 - 10,
      y         : (relative_to_object.area.y1 + relative_to_object.area.y2) / 2 - 5,
      fontSize  : 16,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : text,
      fill      : "#fff"
    })
    @status_panel.add(point_label)
    setTimeout(() ->
      point_label.destroy()
    , 1200)

  init_bg: () ->
    @status_panel.add(new Kinetic.Rect({
      x     : 520,
      y     : 0,
      fill  : "#999",
      width : 80,
      height: 520
    }))

  init_frame_rate: () ->
    @frame_rate = 0
    @frame_rate_label = new Kinetic.Text({
      x         : 526,
      y         : 490,
      fontSize  : 20,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0 fps"
      fill      : "#c00"
    })
    @status_panel.add(@frame_rate_label)

  init_enemy_tanks_statuses: () ->
    @enemy_symbols = []
    for i in [1..@remain_enemy_counts]
      tx = (if i % 2 == 1 then 540 else 560)
      ty = parseInt((i - 1) / 2) * 25 + 20
      symbol = @new_symbol(@status_panel, 'enemy', tx, ty)
      @enemy_symbols.push(symbol)

  init_p1_tank_status: () ->
    user_p1_label = new Kinetic.Text({
      x         : 540,
      y         : 300,
      fontSize  : 18,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "1P",
      fill      : "#000"
    })
    user_p1_symbol = @new_symbol(@status_panel, 'user', 540, 320)
    @user_p1_remain_lives_label = new Kinetic.Text({
      x         : 565,
      y         : 324,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : "#{@remain_user_p1_lives}",
      fill      : "#000"
    })
    @status_panel.add(user_p1_label)
    @status_panel.add(@user_p1_remain_lives_label)

  init_p2_tank_status: () ->
    user_p2_label = new Kinetic.Text({
      x         : 540,
      y         : 350,
      fontSize  : 18,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "2P",
      fill      : "#000"
    })
    user_p2_symbol = @new_symbol(@status_panel, 'user', 540, 370)
    @user_p2_remain_lives_label = new Kinetic.Text({
      x         : 565,
      y         : 374,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : "#{@remain_user_p2_lives}",
      fill      : "#000"
    })
    @status_panel.add(user_p2_label)
    @status_panel.add(@user_p2_remain_lives_label)

  init_stage: () ->
    @new_symbol(@status_panel, 'stage', 540, 420)
    @stage_label = new Kinetic.Text({
      x         : 560,
      y         : 445,
      fontSize  : 16,
      fontFamily: "Courier",
      text      : "#{@current_stage}",
      fill      : "#000"
    })
    @status_panel.add(@stage_label)

  new_symbol: (parent, type, tx, ty) ->
    image = document.getElementById('tank_sprite')
    animations = switch type
      when 'enemy'
        [{x: 320, y: 340, width: 20, height: 20}]
      when 'user'
        [{x: 340, y: 340, width: 20, height: 20}]
      when 'stage'
        [{x: 280, y: 340, width: 40, height: 40}]
    symbol = new Kinetic.Sprite({
      x         : tx,
      y         : ty,
      image     : image,
      animation : 'static',
      animations: {
        'static': animations
      },
      frameRate : 1,
      index     : 0
    })
    parent.add(symbol)
    symbol.start()
    symbol
