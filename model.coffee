class Builder
  constructor: (@battle_field, @default_width, @default_height) ->

class TerrainBuilder extends Builder
  build: (terrain_cls, array_of_xys) ->
    for xys in array_of_xys
      @build_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3])

  build_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        area = new MapArea2D(xs, ys, _.min([x2, xs + @default_height]), _.min([y2, ys + @default_width])
        @battle_field.add_terrain(terrain_cls, area)
        ys += @default_width
      xs += @default_height

class BattleField
  constructor: () ->
    @map = new Map2D(this)
    @terrain_builder = new TerrainBuilder(this, @map.default_width, @map.default_height)

  terrains: [] # has_many terrains
  add_terrain: (terrain_cls, area) ->
    terrain = new terrain_cls(this)
    terrain.view = @map.new_map_unit(terrain, area)
    @terrains.push(terrain)
    terrain

  tanks: [] # has_many tanks
  add_tank: (tank_cls, area) ->
    tank = new tank_cls(this)
    tank.view = @map.new_map_unit(tank, area)
    @tanks.push(tank)
    tank

  missiles: [] # has_many missiles
  add_missile: (parent) ->
    missile = new Missile(this, parent)
    missile.view = @map.new_map_unit(missile, parent.missile_area())
    @missiles.push(missile)
    missile

  all_battle_field_objects: -> @tanks.concat(@terrains).concat(@missiles)

  delete_battle_field_object: (object) ->
    if object instanceof Tank
      @tanks = _.without(@tanks, object)
    if object instanceof Terrain
      @terrains = _.without(@terrains, object)
    if object instanceof Missile
      @missiles = _.without(@missiles, object)

  p1_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p1"))
  p2_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p2"))

class BattleFieldObject
  id: null
  type: null
  view: null

  constructor: (@battle_field) ->

  accept: (battle_field_object) -> true

  update: () ->
  integration: (delta_time) ->
  render: () ->

  destroy: () ->
    @view.destroy()
    @battle_field.delete_battle_field_object(this)

class MovableBattleFieldObject extends BattleFieldObject
  direction: 0

  commands: []
  commander: null

  constructor: (@battle_field) ->
    @commander = new Commander()

  speed: () -> 0.08

  moving: false

  integration: (delta_time) ->
    super(delta_time)
    @handle_turn(command) for command in @commands
    @handle_move(command, delta_time) for command in @commands
  update: () ->
    # next roundcommands
    @commands = @commander.next_commands()
    @view.update()

  turn: (@direction) ->
    @view.turn(@direction)

  handle_turn: (command) ->
    switch(command.type)
      when "direction"
        @turn(command.params.direction)

  move: (offset) ->
    @view.move(offset)

  handle_move: (command, delta_time) ->
    switch(command.type)
      when "start_move"
        # try move max distance
        @moving = true
        @move(@speed() * delta_time)
      when "stop_move"
        # do not move by default
        @moving = false

class Terrain extends BattleFieldObject
  accept: (battle_field_object) -> false

class BrickTerrain extends Terrain
  type: -> "brick"

class IronTerrain extends Terrain
  type: -> "iron"

class WaterTerrain extends Terrain
  accept: (battle_field_object) ->
    if battle_field_object instanceof Tank
      battle_field_object.on_ship
    else
      battle_field_object instanceof Missile
  type: -> "water"
  layer: 0

class IceTerrain extends Terrain
  accept: (battle_field_object) -> true
  type: -> "ice"
  layer: 0

class GrassTerrain extends Terrain
  accept: (battle_field_object) -> true
  type: -> "grass"
  layer: 2

class HomeTerrain extends Terrain
  is_defeated: false
  type: -> "home"

class Tank extends MovableBattleFieldObject
  accept: (battle_field_object) ->
    (battle_field_object instanceof Missile) and (battle_field_object.parent is this)
  life: 1
  set_life: (@life) ->
  die: ->
    @set_life(0)
  is_dead: ->
    @life <= 0

  level: 1
  set_level: (@level) ->

  power: 1
  set_power: (@power) ->

  ship: false
  set_on_ship: (@ship) ->

  guard: false
  set_on_guard: (@guard) ->

  max_missile: 5
  missiles: []
  fire: () ->
    missile = @battle_field.add_missile(this)
    @missiles.push(missile)
  handle_fire: (command) ->
    switch(command.type)
      when "fire"
        @fire() if _.size(@missiles) < @max_missile

  integration: (delta_time) ->
    super(delta_time)
    @handle_fire(command) for command in @commands

  missile_area: () -> @view.missile_area()
  delete_missile: (missile) ->
    @missiles = _.without(@missiles, missile)

class UserTank extends Tank
  speed: () -> super() * 2

class UserP1Tank extends UserTank
  constructor: (@battle_field) ->
    @commander = new UserCommander(this, {
      up: 38, down: 40, left: 37, right: 39, fire: 70
    })
  type: -> 'user_p1'


class UserP2Tank extends UserTank
  constructor: (@battle_field) ->
    @commander = new UserCommander(this, {
      up: 71, down: 72, left: 73, right: 74, fire: 75
    })
  type: -> 'user_p2'

class EnemyTank extends Tank
  constructor: (@battle_field) ->
    @commander = new EnemyAICommander(this)
  gift: 0
  set_gift: (@gift) ->
  cruise: ->

class StupidTank extends EnemyTank
  type: -> 'stupid'

class FoolTank extends EnemyTank
  type: -> 'fool'

class FishTank extends EnemyTank
  speed: () -> super() * 3
  type: -> 'fish'

class StrongTank extends EnemyTank
  type: -> 'strong'

class Missile extends MovableBattleFieldObject
  constructor: (@battle_field, @parent) ->
    @power = @parent.power
    @energy = 10 * @power
    @direction = @parent.direction
    @commander = new MissileCommander(this)
  speed: -> super() * 4
  type: -> 'missile'

  exploded: false
  explode: ->
    # bom!
    @exploded = true

  destroy: () ->
    super()
    @parent.delete_missile(this)

class Gift extends BattleFieldObject
  test: ->

class Commander
  constructor: (@battle_field_object) ->
    @direction = @battle_field_object.direction
  direction_map: {
    up: 0,
    down: 180,
    left: 270,
    right: 90
  }
  next_commands: -> []
  direction_command: (direction) ->
    {
      type: "direction",
      params: { direction: direction }
    }
  start_move_command: -> { type: "start_move" }
  stop_move_command: -> { type: "stop_move" }
  fire_command: -> { type: "fire" }

class UserCommander extends Commander
  constructor: (@battle_field_object, key_setting) ->
    super(@battle_field_object)
    for action, key of key_setting
      @key_map[key] = action
    @clear_inputs()
  key_map: {}
  inputs: null
  inputs_key_pressed: {
    up: false,
    down: false,
    left: false,
    right: false
  }
  clear_inputs: () ->
    @inputs = {
      up: [],
      down: [],
      left: [],
      right: [],
      fire: []
    }
  is_pressed: (action) ->
    @inputs_key_pressed[action]
  add_key_event: (type, key_code) ->
    switch type
      when "keyup"
        return true if _.isUndefined(@key_map[key_code])
        action = @key_map[key_code]
        @inputs_key_pressed[action] = false
        @inputs[action].push("keyup")
      when "keydown"
        return true if _.isUndefined(@key_map[key_code])
        action = @key_map[key_code]
        @inputs_key_pressed[action] = true
        @inputs[action].push("keydown")
  commands: []
  next_commands: ->
    @commands = []
    for action, key_actions of @inputs
      continue if _.size(key_actions) == 0
      switch (action)
        when "up", "down", "left", "right"
          break if @change_direction(action)
          @do_move(action)
        when "fire"
          @commands.push(@fire_command())
    for action in ["up", "down", "left", "right"]
      if @is_pressed(action)
        @change_direction(action)
        @commands.push(@start_move_command())
    @clear_inputs()
    commands@
  change_direction: (action) ->
    new_direction = @direction_map[action]
    if @direction != new_direction
      @direction = new_direction
      @commands.push(@direction_command(new_direction))
      true
    else
      false
  do_move: (action) ->
    keyup = _.contains(@inputs[action], "keyup")
    keydown = _.contains(@inputs[action], "keydown")
    if keydown
      @commands.push(@start_move_command())
    else
      @commands.push(@stop_move_command()) if keyup

class EnemyAICommander extends Commander
  next_commands: -> []

class MissileCommander extends Commander
  constructor: (@battle_field_object) ->
  next_commands: -> [@start_move_command()]
