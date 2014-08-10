class Commander
  constructor: (@map_unit) ->
    @direction = @map_unit.direction
    @commands  = []

  direction_action_map: {
    up   : Direction.UP,
    down : Direction.DOWN,
    left : Direction.LEFT,
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
  constructor: (@map_unit) ->
    super(@map_unit)
    @reset()

  reset: () ->
    @reset_on_going_commands()
    @reset_command_queue()

  reset_on_going_commands: () ->
    @command_on_going = {
      up   : false,
      down : false,
      left : false,
      right: false,
      fire : false
    }

  reset_command_queue: () ->
    @command_queue = {
      up   : [],
      down : [],
      left : [],
      right: [],
      fire : []
    }

  is_on_going: (command) ->
    @command_on_going[command]

  set_on_going: (command, bool) ->
    @command_on_going[command] = bool

  next: ->
    @handle_finished_commands()
    @handle_on_going_commands()

  handle_finished_commands: () ->
    for command, sequences of @command_queue
      continue if _.isEmpty(sequences)
      switch (command)
        when "fire"
          @fire()
        when "up", "down", "left", "right"
          if @direction_changed(command)
            @turn(command)
            break
          has_start_command = _.contains(sequences, "start")
          has_end_command   = _.contains(sequences, "end")
          @start_move() if has_start_command
          @stop_move()  if !has_start_command && has_end_command
    @reset_command_queue()

  handle_on_going_commands: () ->
    for command in ["up", "down", "left", "right"]
      if @is_on_going(command)
        @turn(command)
        @start_move()
    if @is_on_going("fire")
      @fire()

  on_command_start: (command) ->
    @set_on_going(command, true)
    @command_queue[command].push("start")

  on_command_end: (command) ->
    @set_on_going(command, false)
    @command_queue[command].push("end")

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
