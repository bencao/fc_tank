class MovableMapUnit2D extends MapUnit2D
  speed: 0.08

  constructor: (@map, @area) ->
    @delayed_commands = []
    @moving = false
    @direction = 0
    @commander = new Commander(this)
    super(@map, @area)

  new_display: () ->
    center = @area.center()
    @display_object = new Kinetic.Sprite({
      x: center.x,
      y: center.y,
      image: @map.image,
      animation: @animation_state(),
      animations: Animations.movables,
      frameRate: Animations.rate(@animation_state()),
      index: 0,
      offset: {x: @area.width()/2, y: @area.height()/2},
      rotationDeg: @direction,
      map_unit: this
    })

  update_display: () ->
    return if @destroyed
    @display_object.setAnimation(@animation_state())
    @display_object.setFrameRate(Animations.rate(@animation_state()))
    @display_object.setRotationDeg(@direction)
    center = @area.center()
    @display_object.setAbsolutePosition(center.x, center.y)

  queued_delayed_commands: () ->
    [commands, @delayed_commands] = [@delayed_commands, []]
    commands
  add_delayed_command: (command) -> @delayed_commands.push(command)

  integration: (delta_time) ->
    return if @destroyed
    @commands = _.union(@commander.next_commands(), @queued_delayed_commands())
    @handle_turn(cmd) for cmd in @commands
    @handle_move(cmd, delta_time) for cmd in @commands

  handle_turn: (command) ->
    switch(command.type)
      when "direction"
        @turn(command.params.direction)

  handle_move: (command, delta_time) ->
    switch(command.type)
      when "start_move"
        @moving = true
        max_offset = parseInt(@speed * delta_time)
        intent_offset = command.params.offset
        if intent_offset is null
          @move(max_offset)
        else if intent_offset > 0
          real_offset = _.min([intent_offset, max_offset])
          if @move(real_offset)
            command.params.offset -= real_offset
            @add_delayed_command(command) if command.params.offset > 0
          else
            @add_delayed_command(command)
      when "stop_move"
        # do not move by default
        @moving = false

  turn: (direction) ->
    if _.contains([Direction.UP, Direction.DOWN], direction)
      @direction = direction if @_adjust_x()
    else
      @direction = direction if @_adjust_y()
    @update_display()

  _try_adjust: (area) ->
    if @map.area_available(this, area)
      @area = area
      true
    else
      false

  _adjust_x: () ->
    offset = (@default_height/4) -
      (@area.x1 + @default_height/4)%(@default_height/2)
    @_try_adjust(new MapArea2D(@area.x1 + offset, @area.y1,
      @area.x2 + offset, @area.y2))

  _adjust_y: () ->
    offset = (@default_width/4) -
      (@area.y1 + @default_width/4)%(@default_width/2)
    @_try_adjust(new MapArea2D(@area.x1, @area.y1 + offset,
      @area.x2, @area.y2 + offset))

  move: (offset) ->
    _.detect(_.range(1, offset + 1).reverse(), (os) => @_try_move(os))

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    return false if offset_x == 0 and offset_y == 0
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y,
      target_x + @width(), target_y + @height())
    if @map.area_available(this, target_area)
      @area = target_area
      @update_display()
      true
    else
      false

  _offset_by_direction: (offset) ->
    offset = parseInt(offset)
    switch (@direction)
      when Direction.UP
        [0, - _.min([offset, @area.y1])]
      when Direction.RIGHT
        [_.min([offset, @map.max_x - @area.x2]), 0]
      when Direction.DOWN
        [0, _.min([offset, @map.max_y - @area.y2])]
      when Direction.LEFT
        [- _.min([offset, @area.x1]), 0]
