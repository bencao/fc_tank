class MapUnit2D
  group: 'middle'
  max_defend_point: 9

  constructor: (@map, @area) ->
    @default_width = @map.default_width
    @default_height = @map.default_height
    @bom_on_destroy = false
    @destroyed = false
    @new_display() # should be overwrite
    @after_new_display()
    @attached_timeout_handlers = []

  after_new_display: () ->
    @map.groups[@group].add(@display_object)
    @display_object.start()

  destroy_display: () ->
    if @bom_on_destroy
      @display_object.setOffset(20, 20)
      @display_object.setAnimations(Animations.movables)
      @display_object.setAnimation('bom')
      @display_object.setFrameRate(Animations.rate('bom'))
      @display_object.start()
      @display_object.afterFrame 3, () =>
        @display_object.stop()
        @display_object.destroy()
    else
      @display_object.stop()
      @display_object.destroy()

  width: () -> @area.x2 - @area.x1
  height: () -> @area.y2 - @area.y1

  destroy: () ->
    unless @destroyed
      @destroyed = true
    @destroy_display()
    @detach_timeout_events()
    @map.delete_map_unit(this)

  defend: (missile, destroy_area) -> 0
  accept: (map_unit) -> true

  attach_timeout_event: (func, delay) ->
    handle = setTimeout(func, delay)
    @attached_timeout_handlers.push(handle)

  detach_timeout_events: () ->
    _.each(@attached_timeout_handlers, (handle) -> clearTimeout(handle))
