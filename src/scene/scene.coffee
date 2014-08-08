class Scene
  constructor: (@game) ->
    @layer = new Kinetic.Layer()
    @game.canvas.add(@layer)
    @layer.hide()

  start: () ->
    @layer.show()
    @layer.draw()
  stop: () -> @layer.hide()
