class ReportScene extends Scene
  start: () ->
    super()
    @view.update_p1_scores(@game.get_status('p1_score'), @calculate_p1_numbers())
    unless @game.single_player_mode()
      @view.show_p2_scores()
      @view.update_p2_scores(@game.get_status('p2_score'), @calculate_p2_numbers())
    @game.update_status('hi_score', _.max([
      @game.get_status('p1_score'),
      @game.get_status('p2_score'),
      @game.get_config('initial_hi_score')
    ]))
    @view.update_hi_score(@game.get_status('hi_score'))
    setTimeout(() =>
      if @game.get_status('game_over')
        @game.switch_scene('welcome')
      else
        @game.next_stage()
        @game.update_status('stage_autostart', true)
        @game.switch_scene('stage')
    , 5000)

  stop: () ->
    super()

  calculate_p1_numbers: () ->
    p1_numbers = {
      stupid: 0, stupid_pts: 0,
      fish  : 0, fish_pts  : 0,
      fool  : 0, fool_pts  : 0,
      strong: 0, strong_pts: 0,
      total : 0, total_pts : 0
    }
    _.each(@game.get_status('p1_killed_enemies'), (type) =>
      p1_numbers[type] += 1
      p1_numbers["#{type}_pts"] += @game.get_config("score_for_#{type}")
      p1_numbers['total'] += 1
      p1_numbers['total_pts'] += @game.get_config("score_for_#{type}")
    )
    p1_numbers

  calculate_p2_numbers: () ->
    p2_numbers = {
      stupid: 0, stupid_pts: 0,
      fish  : 0, fish_pts  : 0,
      fool  : 0, fool_pts  : 0,
      strong: 0, strong_pts: 0,
      total : 0, total_pts : 0
    }

    _.each(@game.get_status('p2_killed_enemies'), (type) ->
      p2_numbers[type] += 1
      p2_numbers["#{type}_pts"] += @game.get_config("score_for_#{type}")
      p2_numbers['total'] += 1
      p2_numbers['total_pts'] += @game.get_config("score_for_#{type}")
    )
    p2_numbers
