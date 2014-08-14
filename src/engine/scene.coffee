class Scene
  constructor: (@game, @view) ->
    @keyboard = new Keyboard()
    @sound    = new Sound()

  start: () ->
    @keyboard.reset
    @view.show()

  stop: () ->
    @keyboard.reset
    @view.hide()
