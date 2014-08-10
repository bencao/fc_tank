class Scene
  constructor: (@game) ->
    @layer    = new Kinetic.Layer()
    @keyboard = new Keyboard()
    @game.canvas.add(@layer)
    @layer.hide()

  start: () ->
    @layer.show()
    @layer.draw()
    @keyboard.reset

  stop: () ->
    @layer.hide()
    @keyboard.reset
