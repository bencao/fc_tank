class ReportView extends View
  init_view: () ->
    @init_hi_score()
    @init_stage()
    @init_bg()
    @init_p1_scores()
    @init_p2_scores()

  update_hi_score: (score) ->
    @hi_score_label.setText(score)

  update_stage: (stage) ->
    @stage_label.setText("STAGE #{stage}")

  show_p2_scores: () ->
    @p2_group.show()

  update_p1_scores: (p1_final_score, p1_scores_by_category) ->
    for tank, number of p1_scores_by_category
      @p1_number_labels[tank].setText(number) unless tank == 'total_pts'
    @p1_score_label.setText(p1_final_score)
    @layer.draw()

  update_p2_scores: (p2_final_score, p2_scores_by_category) ->
    for tank, number of p2_scores_by_category
      @p2_number_labels[tank].setText(number) unless tank == 'total_pts'
    @p2_score_label.setText(p2_final_score)
    @layer.draw()

  init_hi_score: () ->
    @layer.add(new Kinetic.Text({
      x         : 200,
      y         : 40,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "HI-SCORE",
      fill      : "#DB2B00"
    }))

    @hi_score_label = new Kinetic.Text({
      x         : 328,
      y         : 40,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "",
      fill      : "#FF9B3B"
    })
    @layer.add(@hi_score_label)

  init_stage: () ->
    @stage_label = new Kinetic.Text({
      x         : 250,
      y         : 80,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "",
      fill      : "#fff"
    })
    @layer.add(@stage_label)

  init_bg: () ->
    # center tanks
    image = document.getElementById('tank_sprite')
    tank_sprite = new Kinetic.Sprite({
      x          : 300,
      y          : 220,
      image      : image,
      animation  : 'stupid_hp1',
      animations : Animations.movables,
      frameRate  : Animations.rate('stupid_hp1'),
      index      : 0,
      offset     : {x: 20, y: 20},
      rotationDeg: 0
    })
    @layer.add(tank_sprite)
    @layer.add(tank_sprite.clone({y: 280, animation: 'fish_hp1'}))
    @layer.add(tank_sprite.clone({y: 340, animation: 'fool_hp1'}))
    @layer.add(tank_sprite.clone({y: 400, animation: 'strong_hp1'}))
    # center underline
    @layer.add(new Kinetic.Rect({
      x     : 235,
      y     : 423,
      width : 130,
      height: 4,
      fill  : "#fff"
    }))

  init_p1_scores: () ->
    @p1_group = new Kinetic.Group()
    @layer.add(@p1_group)

    # p1 score
    @p1_score_label = new Kinetic.Text({
      x         : 95,
      y         : 160,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0",
      fill      : "#FF9B3B",
      align     : "right",
      width     : 120
    })
    @p1_group.add(@p1_score_label)

    # p1 text
    @p1_group.add(@p1_score_label.clone({
      text: "I-PLAYER",
      fill: "#DB2B00",
      y   : 120
    }))

    # p1 pts * 4
    p1_pts = @p1_score_label.clone({
      x    : 175,
      y    : 210,
      text : "PTS",
      width: 40,
      fill : "#fff"
    })
    @p1_group.add(p1_pts)
    @p1_group.add(p1_pts.clone({y: 270}))
    @p1_group.add(p1_pts.clone({y: 330}))
    @p1_group.add(p1_pts.clone({y: 390}))
    @p1_group.add(p1_pts.clone({x: 145, y: 430, text: "TOTAL", width: 70}))

    # p1 arrows * 4
    p1_arrow = new Kinetic.Path({
      x     : 260,
      y     : 210,
      width : 16,
      height: 20,
      data  : 'M8,0 l-8,10 l8,10 l0,-6 l8,0 l0,-8 l-8,0 l0,-6 z',
      fill  : '#fff'
    })
    @p1_group.add(p1_arrow)
    @p1_group.add(p1_arrow.clone({y: 270}))
    @p1_group.add(p1_arrow.clone({y: 330}))
    @p1_group.add(p1_arrow.clone({y: 390}))

    p1_number = @p1_score_label.clone({
      fill : '#fff',
      x    : 226,
      y    : 210,
      width: 30,
      text : ''
    })
    p1_number_pts                   = p1_number.clone({x:105, width: 60})
    @p1_number_labels = {}
    @p1_number_labels['stupid']     = p1_number
    @p1_number_labels['stupid_pts'] = p1_number_pts
    @p1_number_labels['fish']       = p1_number.clone({y: 270})
    @p1_number_labels['fish_pts']   = p1_number_pts.clone({y: 270})
    @p1_number_labels['fool']       = p1_number.clone({y: 330})
    @p1_number_labels['fool_pts']   = p1_number_pts.clone({y: 330})
    @p1_number_labels['strong']     = p1_number.clone({y: 390})
    @p1_number_labels['strong_pts'] = p1_number_pts.clone({y: 390})
    @p1_number_labels['total']      = p1_number.clone({y: 430})

    @p1_group.add(@p1_number_labels['stupid'])
    @p1_group.add(@p1_number_labels['stupid_pts'])
    @p1_group.add(@p1_number_labels['fish'])
    @p1_group.add(@p1_number_labels['fish_pts'])
    @p1_group.add(@p1_number_labels['fool'])
    @p1_group.add(@p1_number_labels['fool_pts'])
    @p1_group.add(@p1_number_labels['strong'])
    @p1_group.add(@p1_number_labels['strong_pts'])
    @p1_group.add(@p1_number_labels['total'])

  init_p2_scores: () ->
    @p2_group = new Kinetic.Group()
    @layer.add(@p2_group)

    # p2 score
    @p2_score_label = new Kinetic.Text({
      x         : 385,
      y         : 160,
      fontSize  : 22,
      fontStyle : "bold",
      fontFamily: "Courier",
      text      : "0",
      fill      : "#FF9B3B"
    })
    @p2_group.add(@p2_score_label)
    # p2 text
    @p2_group.add(@p2_score_label.clone({
      text: "II-PLAYER",
      fill: "#DB2B00",
      y   : 120
    }))
    # p2 arrow * 4
    p2_pts = @p2_score_label.clone({
      y    : 210,
      text : "PTS",
      width: 40,
      fill : "#fff"
    })
    @p2_group.add(p2_pts)
    @p2_group.add(p2_pts.clone({y: 270}))
    @p2_group.add(p2_pts.clone({y: 330}))
    @p2_group.add(p2_pts.clone({y: 390}))
    @p2_group.add(p2_pts.clone({y: 430, text: "TOTAL", width: 70}))

    # p2 arrow * 4
    p2_arrow = new Kinetic.Path({
      x     : 324,
      y     : 210,
      width : 16,
      height: 20,
      data  : 'M8,0 l8,10 l-8,10 l0,-6 l-8,0 l0,-8 l8,0 l0,-6 z',
      fill  : '#fff'
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
    p2_number_pts                   = p2_number.clone({x:435, width: 60, text: '3800'})
    @p2_number_labels = {}
    @p2_number_labels['stupid']     = p2_number
    @p2_number_labels['stupid_pts'] = p2_number_pts
    @p2_number_labels['fish']       = p2_number.clone({y: 270})
    @p2_number_labels['fish_pts']   = p2_number_pts.clone({y: 270})
    @p2_number_labels['fool']       = p2_number.clone({y: 330})
    @p2_number_labels['fool_pts']   = p2_number_pts.clone({y: 330})
    @p2_number_labels['strong']     = p2_number.clone({y: 390})
    @p2_number_labels['strong_pts'] = p2_number_pts.clone({y: 390})
    @p2_number_labels['total']      = p2_number.clone({y: 430})

    @p2_group.add(@p2_number_labels['stupid'])
    @p2_group.add(@p2_number_labels['stupid_pts'])
    @p2_group.add(@p2_number_labels['fish'])
    @p2_group.add(@p2_number_labels['fish_pts'])
    @p2_group.add(@p2_number_labels['fool'])
    @p2_group.add(@p2_number_labels['fool_pts'])
    @p2_group.add(@p2_number_labels['strong'])
    @p2_group.add(@p2_number_labels['strong_pts'])
    @p2_group.add(@p2_number_labels['total'])

    @p2_group.hide()
