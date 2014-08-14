class Game
  constructor: () ->
    @canvas   = new Kinetic.Stage({container: 'canvas', width: 600, height: 520})
    @configs  = @init_default_config()
    @statuses = @init_statuses()
    @scenes   = {
      'welcome'     : new WelcomeScene(this, new WelcomeView(@canvas)),
      'stage'       : new StageScene(this, new StageView(@canvas)),
      'battle_field': new BattleFieldScene(this, new BattleFieldView(@canvas)),
      'report'      : new ReportScene(this, new ReportView(@canvas))
    }
    @current_scene = null

  get_config: (key) -> @configs[key]

  update_status: (key, value) -> @statuses[key] = value

  get_status: (key) -> @statuses[key]

  init_default_config: () ->
    {
      fps              : 60,
      initial_players  : 1,
      total_stages     : 50,
      initial_stage    : 1,
      initial_hi_score : 20000,
      initial_p1_score : 0,
      initial_p2_score : 0,
      initial_p1_level : 1,
      initial_p2_level : 1,
      initial_p1_ship  : false,
      initial_p2_ship  : false,
      initial_p1_lives : 2,
      initial_p2_lives : 2,
      score_for_stupid : 100,
      score_for_fish   : 200,
      score_for_fool   : 300,
      score_for_strong : 400,
      score_for_gift   : 500,
      enemies_per_stage: 5
    }

  init_statuses: () ->
    {
      players          : 1,
      current_stage    : 1,
      game_over        : false,
      stage_autostart  : false,
      hi_score         : 20000,
      p1_score         : 0,
      p2_score         : 0,
      p1_level         : 1,
      p2_level         : 1,
      p1_ship          : false,
      p2_ship          : false,
      p1_lives         : 2,
      p2_lives         : 2,
      p1_killed_enemies: [],
      p2_killed_enemies: []
    }

  kick_off: () -> @switch_scene('welcome')

  prev_stage: () ->
    @statuses['current_stage'] = @mod_stage(@get_status('current_stage'), -1)

  next_stage: () ->
    @statuses['current_stage'] = @mod_stage(@get_status('current_stage'), 1)

  mod_stage: (current_stage, adjustment) ->
    total_stages  = @configs['total_stages']
    if (current_stage + adjustment) == 0
      total_stages
    else
      (current_stage + total_stages + adjustment) % total_stages

  single_player_mode: () ->
    @statuses['players'] == 1

  increase_p1_score: (score) ->
    @statuses['p1_score'] += score

  increase_p2_score: (score) ->
    @statuses['p2_score'] += score

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
