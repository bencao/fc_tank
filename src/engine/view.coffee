class View
  constructor: (@canvas) ->
    @layer = new Kinetic.Layer()
    @canvas.add(@layer)
    @layer.hide()
    @init_view()

  show: () ->
    @layer.show()
    @layer.draw()

  hide: () ->
    @layer.hide()

  init_view: () ->
