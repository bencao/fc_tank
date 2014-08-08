












class Commander
  constructor: (@map_unit) ->
    @direction = @map_unit.direction
    @commands = []
  direction_action_map: {
    up: Direction.UP,
    down: Direction.DOWN,
    left: Direction.LEFT,
    right: Direction.RIGHT
  }
  # calculate next commands
  next: () ->

  next_commands: ->
    @commands = []
    @next()
    _.uniq(@commands, (command) ->
      return command['params']['direction'] if command['type'] == "direction"
      command['type']
    )
  direction_changed: (action) ->
    new_direction = @direction_action_map[action]
    @map_unit.direction != new_direction
  turn: (action) ->
    new_direction = @direction_action_map[action]
    @commands.push(@_direction_command(new_direction))
  start_move: (offset = null) ->
    @commands.push(@_start_move_command(offset))
  stop_move: () ->
    @commands.push(@_stop_move_command())
  fire: () ->
    @commands.push(@_fire_command())

  # private methods
  _direction_command: (direction) ->
    {
      type: "direction",
      params: { direction: direction }
    }
  _start_move_command: (offset = null) ->
    {
      type: "start_move",
      params: { offset: offset }
    }
  _stop_move_command: -> { type: "stop_move" }
  _fire_command: -> { type: "fire" }

class UserCommander extends Commander
  constructor: (@map_unit, key_setting) ->
    super(@map_unit)
    @key_map = {}
    for key, code of key_setting
      @key_map[code] = key
    @reset()
  reset: () ->
    @key_status = {
      up: false, down: false, left: false, right: false, fire: false
    }
    @inputs = { up: [], down: [], left: [], right: [], fire: [] }

  is_pressed: (key) ->
    @key_status[key]
  set_pressed: (key, bool) ->
    @key_status[key] = bool

  next: ->
    @handle_key_up_key_down()
    @handle_key_press()

  handle_key_up_key_down: () ->
    for key, types of @inputs
      continue if _.isEmpty(types)
      switch (key)
        when "fire"
          @fire()
        when "up", "down", "left", "right"
          if @direction_changed(key)
            @turn(key)
            break
          keyup = _.contains(@inputs[key], "keyup")
          keydown = _.contains(@inputs[key], "keydown")
          if keydown
            @start_move()
          else
            @stop_move() if keyup
    @inputs = { up: [], down: [], left: [], right: [], fire: [] }

  handle_key_press: () ->
    for key in ["up", "down", "left", "right"]
      if @is_pressed(key)
        @turn(key)
        @start_move()
    if @is_pressed("fire")
      @fire()

  add_key_event: (type, key_code) ->
    return true if _.isUndefined(@key_map[key_code])
    key = @key_map[key_code]
    switch type
      when "keyup"
        @set_pressed(key, false)
        @inputs[key].push("keyup")
      when "keydown"
        @set_pressed(key, true)
        @inputs[key].push("keydown")

class EnemyAICommander extends Commander
  constructor: (@map_unit) ->
    super(@map_unit)
    @map = @map_unit.map
    @reset_path()
    @last_area = null
  next: ->
    # move towards home
    if _.size(@path) == 0
      end_vertex = if (Math.random() * 100) <= @map_unit.iq
        @map.home_vertex
      else
        @map.random_vertex()
      @path = @map.shortest_path(@map_unit, @current_vertex(), end_vertex)
      @next_move()
      setTimeout((() => @reset_path()), 2000 + Math.random()*2000)
    else
      @next_move() if @current_vertex().equals(@target_vertex)

    # more chance to fire if can't move
    if @map_unit.can_fire() and @last_area and @last_area.equals(@map_unit.area)
      @fire() if Math.random() < 0.08
    else
      @fire() if Math.random() < 0.01
    # # fire if user or home in front of me
    # targets = _.compact([@map.p1_tank(), @map.p2_tank(), @map.home()])
    # for target in targets
    #   @fire() if @in_attack_range(target.area)

    @last_area = @map_unit.area

  next_move: () ->
    return if _.size(@map_unit.delayed_commands) > 0
    return if _.size(@path) == 0
    @target_vertex = @path.shift()
    [direction, offset] = @offset_of(@current_vertex(), @target_vertex)
    @turn(direction)
    @start_move(offset)

  reset_path: () ->
    @path = []

  offset_of: (current_vertex, target_vertex) ->
    if target_vertex.y1 < current_vertex.y1
      return ["up", current_vertex.y1 - target_vertex.y1]
    if target_vertex.y1 > current_vertex.y1
      return ["down", target_vertex.y1 - current_vertex.y1]
    if target_vertex.x1 < current_vertex.x1
      return ["left", current_vertex.x1 - target_vertex.x1]
    if target_vertex.x1 > current_vertex.x1
      return ["right", target_vertex.x1 - current_vertex.x1]
    ["down", 0]

  current_vertex: () -> @map.vertexes_at(@map_unit.area)

  in_attack_range: (area) ->
    @map_unit.area.x1 == area.x1 or @map_unit.area.y1 == area.y1

class MissileCommander extends Commander
  next: -> @start_move()
