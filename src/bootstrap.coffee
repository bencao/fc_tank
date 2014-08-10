$ ->
  scene_manager        = new SceneManager()
  window.scene_manager = scene_manager
  window.game_scene    = scene_manager.scenes['game']
  scene_manager.kick_off_game()
