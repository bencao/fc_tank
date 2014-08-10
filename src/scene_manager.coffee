class SceneManager
  constructor: () ->
    @canvas = new Kinetic.Stage({container: 'canvas', width: 600, height: 520})
    @init_default_config()
    @scenes = {
      'welcome' : new WelcomeScene(this),
      'stage'   : new StageScene(this),
      'game'    : new GameScene(this),
      'report'  : new ReportScene(this),
      'hi_score': new HiScoreScene(this)
    }
    @current_scene = null

  set_config: (key, value) -> @configs[key] = value
  get_config: (key) -> @configs[key]
  init_default_config: () ->
    @configs = {
      fps              : 60,
      players          : 1,
      current_stage    : 1,
      stages           : 50,
      stage_autostart  : false,
      game_over        : false,
      hi_score         : 20000,
      p1_score         : 0,
      p2_score         : 0,
      p1_level         : 1,
      p2_level         : 1,
      p1_lives         : 2,
      p2_lives         : 2,
      p1_killed_enemies: [],
      p2_killed_enemies: [],
      score_for_stupid : 100,
      score_for_fish   : 200,
      score_for_fool   : 300,
      score_for_strong : 400,
      score_for_gift   : 500,
      last_score       : 0,
      enemies_per_stage: 20
    }

  kick_off_game: () -> @switch_scene('welcome')

  prev_stage: () ->
    @mod_stage(@configs['current_stage'] - 1 + @configs['stages'])

  next_stage: () ->
    @mod_stage(@configs['current_stage'] + 1 + @configs['stages'])

  mod_stage: (next) ->
    if next % @configs['stages'] == 0
      @configs['current_stage'] = @configs['stages']
    else
      @configs['current_stage'] =  next % @configs['stages']
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
