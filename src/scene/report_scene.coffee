class ReportScene extends Scene
  constructor: (@game) ->
    super(@game)
    @p1_number_labels = {}
    @p2_number_labels = {}
    @init_scene()

  start: () ->
    super()
    @update_numbers()
    setTimeout(() =>
      if @game.get_config('game_over')
        @game.switch_scene('welcome')
      else
        @game.set_config('stage_autostart', true)
        @game.switch_scene('stage')
    , 5000)

  stop: () ->
    super()

  update_numbers: () ->
    @p2_group.show() if @game.get_config('players') == 2
    p1_kills = @game.get_config('p1_killed_enemies')
    p1_numbers = {
      stupid: 0, stupid_pts: 0,
      fish: 0, fish_pts: 0,
      fool: 0, fool_pts: 0,
      strong: 0, strong_pts: 0,
      total: 0, total_pts: 0
    }
    p2_numbers = _.cloneDeep(p1_numbers)
    _.each(p1_kills, (type) =>
      p1_numbers[type] += 1
      p1_numbers["#{type}_pts"] += @game.get_config("score_for_#{type}")
      p1_numbers['total'] += 1
      p1_numbers['total_pts'] += @game.get_config("score_for_#{type}")
    )
    p2_kills = @game.get_config('p2_killed_enemies')

    _.each(p2_kills, (type) ->
      p2_numbers[type] += 1
      p2_numbers["#{type}_pts"] += @game.get_config("score_for_#{type}")
      p2_numbers['total'] += 1
      p2_numbers['total_pts'] += @game.get_config("score_for_#{type}")
    )
    for tank, number of p1_numbers
      @p1_number_labels[tank].setText(number) unless tank == 'total_pts'
    for tank, number of p2_numbers
      @p2_number_labels[tank].setText(number) unless tank == 'total_pts'
    p1_final_score = @game.get_config('p1_score') + p1_numbers.total_pts
    p2_final_score = @game.get_config('p2_score') + p2_numbers.total_pts
    @game.set_config('p1_score', p1_final_score)
    @game.set_config('p2_score', p2_final_score)
    @p1_score_label.setText(p1_final_score)
    @p2_score_label.setText(p2_final_score)
    @game.set_config('hi_score', _.max([
      p1_final_score, p2_final_score, @game.get_config('hi_score')]))

    @stage_label.setText("STAGE #{@game.get_config('current_stage')}")
    @layer.draw()

  init_scene: () ->
    # Hi score texts
    @layer.add(new Kinetic.Text({
      x: 200,
      y: 40,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "HI-SCORE",
      fill: "#DB2B00"
    }))

    # Hi score
    @hi_score_label = new Kinetic.Text({
      x: 328,
      y: 40,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "#{@game.get_config('hi_score')}",
      fill: "#FF9B3B"
    })
    @layer.add(@hi_score_label)
    # stage text
    @stage_label = new Kinetic.Text({
      x: 250,
      y: 80,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "STAGE #{@game.get_config('current_stage')}",
      fill: "#fff"
    })
    @layer.add(@stage_label)

    # center tanks
    image = document.getElementById('tank_sprite')
    tank_sprite = new Kinetic.Sprite({
      x: 300,
      y: 220,
      image: image,
      animation: 'stupid_hp1',
      animations: Animations.movables,
      frameRate: Animations.rate('stupid_hp1'),
      index: 0,
      offset: {x: 20, y: 20},
      rotationDeg: 0
    })
    @layer.add(tank_sprite)
    @layer.add(tank_sprite.clone({y: 280, animation: 'fish_hp1'}))
    @layer.add(tank_sprite.clone({y: 340, animation: 'fool_hp1'}))
    @layer.add(tank_sprite.clone({y: 400, animation: 'strong_hp1'}))
    # center underline
    @layer.add(new Kinetic.Rect({
      x: 235,
      y: 423,
      width: 130,
      height: 4,
      fill: "#fff"
    }))

    @p1_group = new Kinetic.Group()
    @layer.add(@p1_group)

    # p1 score
    @p1_score_label = new Kinetic.Text({
      x: 95,
      y: 160,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "0",
      fill: "#FF9B3B",
      align: "right",
      width: 120
    })
    @p1_group.add(@p1_score_label)
    # p1 text
    @p1_group.add(@p1_score_label.clone({
      text: "I-PLAYER",
      fill: "#DB2B00",
      y: 120
    }))

    # p1 pts * 4
    p1_pts = @p1_score_label.clone({
      x: 175,
      y: 210,
      text: "PTS",
      width: 40,
      fill: "#fff"
    })
    @p1_group.add(p1_pts)
    @p1_group.add(p1_pts.clone({y: 270}))
    @p1_group.add(p1_pts.clone({y: 330}))
    @p1_group.add(p1_pts.clone({y: 390}))
    # p1 total text
    @p1_group.add(p1_pts.clone({x: 145, y: 430, text: "TOTAL", width: 70}))
    # p1 arrows * 4
    p1_arrow = new Kinetic.Path({
      x: 260,
      y: 210,
      width: 16,
      height: 20,
      data: 'M8,0 l-8,10 l8,10 l0,-6 l8,0 l0,-8 l-8,0 l0,-6 z',
      fill: '#fff'
    })
    @p1_group.add(p1_arrow)
    @p1_group.add(p1_arrow.clone({y: 270}))
    @p1_group.add(p1_arrow.clone({y: 330}))
    @p1_group.add(p1_arrow.clone({y: 390}))

    p1_number = @p1_score_label.clone({
      fill: '#fff',
      x: 226,
      y: 210,
      width: 30,
      text: '75'
    })
    p1_number_pts = p1_number.clone({x:105, width: 60, text: '3800'})
    @p1_number_labels['stupid'] = p1_number
    @p1_number_labels['stupid_pts'] = p1_number_pts
    @p1_group.add(@p1_number_labels['stupid'])
    @p1_group.add(@p1_number_labels['stupid_pts'])
    @p1_number_labels['fish'] = p1_number.clone({y: 270})
    @p1_number_labels['fish_pts'] = p1_number_pts.clone({y: 270})
    @p1_group.add(@p1_number_labels['fish'])
    @p1_group.add(@p1_number_labels['fish_pts'])
    @p1_number_labels['fool'] = p1_number.clone({y: 330})
    @p1_number_labels['fool_pts'] = p1_number_pts.clone({y: 330})
    @p1_group.add(@p1_number_labels['fool'])
    @p1_group.add(@p1_number_labels['fool_pts'])
    @p1_number_labels['strong'] = p1_number.clone({y: 390})
    @p1_number_labels['strong_pts'] = p1_number_pts.clone({y: 390})
    @p1_group.add(@p1_number_labels['strong'])
    @p1_group.add(@p1_number_labels['strong_pts'])
    @p1_number_labels['total'] = p1_number.clone({y: 430})
    @p1_group.add(@p1_number_labels['total'])

    @p2_group = new Kinetic.Group()
    @layer.add(@p2_group)

    # p2 score
    @p2_score_label = new Kinetic.Text({
      x: 385,
      y: 160,
      fontSize: 22,
      fontStyle: "bold",
      fontFamily: "Courier",
      text: "0",
      fill: "#FF9B3B"
    })
    @p2_group.add(@p2_score_label)
    # p2 text
    @p2_group.add(@p2_score_label.clone({
      text: "II-PLAYER",
      fill: "#DB2B00",
      y: 120
    }))
    # p2 arrow * 4
    p2_pts = @p2_score_label.clone({
      y: 210,
      text: "PTS",
      width: 40,
      fill: "#fff"
    })
    @p2_group.add(p2_pts)
    @p2_group.add(p2_pts.clone({y: 270}))
    @p2_group.add(p2_pts.clone({y: 330}))
    @p2_group.add(p2_pts.clone({y: 390}))
    # p2 total text
    @p2_group.add(p2_pts.clone({y: 430, text: "TOTAL", width: 70}))
    # p2 arrow * 4
    p2_arrow = new Kinetic.Path({
      x: 324,
      y: 210,
      width: 16,
      height: 20,
      data: 'M8,0 l8,10 l-8,10 l0,-6 l-8,0 l0,-8 l8,0 l0,-6 z',
      fill: '#fff'
    })
    @p2_group.add(p2_arrow)
    @p2_group.add(p2_arrow.clone({y: 270}))
    @p2_group.add(p2_arrow.clone({y: 330}))
    @p2_group.add(p2_arrow.clone({y: 390}))
    # p2 numbers
    p2_number = @p2_score_label.clone({
      fill: '#fff',
      x: 344,
      y: 210,
      width: 30,
      text: '75'
    })
    p2_number_pts = p2_number.clone({x:435, width: 60, text: '3800'})
    @p2_number_labels['stupid'] = p2_number
    @p2_number_labels['stupid_pts'] = p2_number_pts
    @p2_group.add(@p2_number_labels['stupid'])
    @p2_group.add(@p2_number_labels['stupid_pts'])
    @p2_number_labels['fish'] = p2_number.clone({y: 270})
    @p2_number_labels['fish_pts'] = p2_number_pts.clone({y: 270})
    @p2_group.add(@p2_number_labels['fish'])
    @p2_group.add(@p2_number_labels['fish_pts'])
    @p2_number_labels['fool'] = p2_number.clone({y: 330})
    @p2_number_labels['fool_pts'] = p2_number_pts.clone({y: 330})
    @p2_group.add(@p2_number_labels['fool'])
    @p2_group.add(@p2_number_labels['fool_pts'])
    @p2_number_labels['strong'] = p2_number.clone({y: 390})
    @p2_number_labels['strong_pts'] = p2_number_pts.clone({y: 390})
    @p2_group.add(@p2_number_labels['strong'])
    @p2_group.add(@p2_number_labels['strong_pts'])
    @p2_number_labels['total'] = p2_number.clone({y: 430})
    @p2_group.add(@p2_number_labels['total'])

    @p2_group.hide()
