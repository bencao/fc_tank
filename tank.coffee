class Point
  constructor: (@x, @y) ->

class MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
  has_intersection: (area) ->
    a = (@y2 - @y1) / (@x2 - @x1)
    b = (@x2 * @y1 - @x1 * @y2) / (@x2 - @x1)
    c = (@x2 * @y2 - @x1 * @y1) / (@x2 - @x1)
    (@x1 < ((area.y1 - b) / a) < @x2) or
    (@x1 < ((area.y2 - b) / a) < @x2) or
    (@x1 < ((c - area.y1) / a) < @x2) or
    (@x1 < ((c - area.y2) / a) < @x2) or
    (@y1 < (a * area.x1 + b) < @y2) or
    (@y1 < (a * area.x2 + b) < @y2) or
    (@y1 < (c - a * area.x1) < @y2) or
    (@y1 < (c - a * area.x2) < @y2)
  collide: (area) ->
    # fast method
    return false if (@x2 <= area.x1 or @y2 <= area.y1 or @x1 >= area.x2 or @y1 >= area.y2)
    # slow method
    @has_intersection(area)
  joint: (area) ->
    new MapArea2D(_.max(area.x1, @x1), _.max(area.y1, @y1), _.min(area.x2, @x2), _.min(area.y2, @y2))
  space_sub: (area) ->
    joint_area = @joint(area)
    candidates = [
      new MapArea2D(@x1, @y1, @x2, joint_area.y1),
      new MapArea2D(@x1, joint_area.y2, @x2, @y2),
      new MapArea2D(@x1, joint_area.y1, joint_area.x1, joint_area.y2),
      new MapArea2D(joint_area.x2, joint_area.y1, @x2, joint_area.y2)
    ]
    _.select(candidates, (candidate_area) -> candidate_area.is_valid_area())
  is_valid_area: () ->
    @x2 > @x1 and @y2 > @y1

class Map2D
  max_x: 520
  max_y: 520
  default_width: 40
  default_height: 40
  map_units: [] # has_many map_units
  constructor: (@battle_field) ->
    @image = document.getElementById('resources')
    @unit_map = {
      user_p1: MapUnit2DForUserTankP1,
      user_p2: MapUnit2DForUserTankP2,
      stupid: MapUnit2DForStupidTank,
      fool: MapUnit2DForFoolTank,
      fish: MapUnit2DForFishTank,
      strong: MapUnit2DForStrongTank,
      brick: MapUnit2DForBrick,
      iron: MapUnit2DForIron,
      grass: MapUnit2DForGrass,
      ice: MapUnit2DForIce,
      water: MapUnit2DForWater,
      home: MapUnit2DForHome,
      missile: MapUnit2DForMissile
    }

    @canvas = oCanvas.create({canvas: "#canvas", background: "#000", fps: 30})

    @canvas.bind "keyup", (event) =>
      @battle_field.p1_tank().commander.add_key_event("keyup", event.which)
    @canvas.bind "keydown", (event) =>
      @battle_field.p1_tank().commander.add_key_event("keydown", event.which)

    @canvas.setLoop () =>
      delta_time = 30
      _.each(battle_field.all_battle_field_objects(), (object) -> object.integration(delta_time))
      _.each(battle_field.all_battle_field_objects(), (object) -> object.render())
      _.each(battle_field.all_battle_field_objects(), (object) -> object.update())
    @canvas.timeline.start()
  find_units_at: (area) ->
    _.select(@map_units, (map_unit) ->
      map_unit.area.collide(area)
    )
  is_out_of_bound: (area) ->
    area.x1 < 0 or area.x2 > @max_x or area.y1 < 0 or area.y2 > @max_y
  space_available: (unit, area) ->
    _.all(@map_units, (map_unit) =>
      (map_unit is unit) or
        map_unit.accept(unit) or
        not map_unit.area.collide(area)
    )

  new_map_unit: (battle_field_object, area) ->
    map_unit_cls = @unit_map[battle_field_object.type()]
    map_unit = new map_unit_cls(this, battle_field_object, area)
    @canvas.addChild(map_unit.display_object)
    @map_units.push(map_unit)
    @reset_zindex()
    map_unit

  delete_map_unit: (map_unit) ->
    @map_units = _.without(@map_units, map_unit)

  reset_zindex: ->
    map_unit.reset_zindex() for map_unit in @map_units

class MapUnit2D
  layer: 1

  area: null
  gravity_point: null

  display_object: null
  origin_x: 'left'
  origin_y: 'top'

  constructor: (@map, @model, @area) ->
    @default_width = @map.default_width
    @default_height = @map.default_height
    @gravity_point = @update_gravity_point()
    @init_display()

  update_area: (@area) ->
    @gravity_point = @update_gravity_point()

  update_gravity_point: () ->
    new Point(@area.x1, @area.y1)

  init_display: () ->
    @display_object = @map.canvas.display.sprite({
      frames: @current_frames(),
      image: @map.image,
      width: @width(),
      height: @height(),
      x: @gravity_point.x,
      y: @gravity_point.y,
      origin: { x: @origin_x, y: @origin_y}
    })
    @update_display()

  update_display: () ->
    @display_object.frames = @current_frames()

  reset_zindex: () ->
    @display_object.zIndex = @layer

  current_frames: () -> []

  width: () -> @area.x2 - @area.x1
  height: () -> @area.y2 - @area.y1

  destroy: () ->
    @destroy_display()
    @map.delete_map_unit(this)

  destroy_display: () ->
    @display_object.remove()

  accept: (other_unit) -> @model.accept(other_unit.model)

  update: () ->

  fight_missile: (missile, destroy_area) -> 0

class MovableMapUnit2D extends MapUnit2D
  origin_x: 'center'
  origin_y: 'center'

  direction: 0
  constructor: (@map, @model, @area) ->
    super(@map, @model, @area)
    @direction = @model.direction

  update_gravity_point: () ->
    new Point((@area.x1 + @area.x2)/2, (@area.y1 + @area.y2)/2)

  update_display: () ->
    @display_object.frames = @current_frames()
    @display_object.rotateTo(@direction)
    @display_object.moveTo(@gravity_point.x, @gravity_point.y)

  move: (offset) ->
    _.detect(_.range(1, offset).reverse(), (os) => @_try_move(os))

  turn: (direction) ->
    @direction = direction
    if (direction % 180 is 0) then @_adjust_x() else @_adjust_y()
    @update_display()

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y, target_x + @width(), target_y + @height())
    if @map.space_available(this, target_area)
      @update_area(target_area)
      @update_display()
      true
    else
      false
  _offset_by_direction: (offset) ->
    offset = parseInt(offset)
    switch (@direction)
      when 0
        [0, - _.min([offset, @area.y1])]
      when 90
        [_.min([offset, @map.max_x - @area.x2]), 0]
      when 180
        [0, _.min([offset, @map.max_y - @area.y2])]
      when 270
        [- _.min([offset, @area.x1]), 0]

  _adjust_x: () ->
    offset = (@default_height/4) - (@area.x1 + @default_height/4) % (@default_height/2)
    @area.x1 += offset
    @area.x2 += offset
    @update_area(@area)
  _adjust_y: () ->
    offset = (@default_width/4) - (@area.y1 + @default_width/4) % (@default_width/2)
    @area.y1 += offset
    @area.y2 += offset
    @update_area(@area)

class MapUnit2DForTank extends MovableMapUnit2D
  missile_area: () ->
    new MapArea2D(@gravity_point.x - @default_width/4,
      @gravity_point.y - @default_height/4,
      @gravity_point.x + @default_width/4,
      @gravity_point.y + @default_height/4)

class MapUnit2DForUserTankP1 extends MapUnit2DForTank
  current_frames: () ->
    switch @model.level
      when 1 then [{x: 0, y: 0, d: 10}, {x:40, y: 0, d: 10}]
      when 2 then [{x: 80, y: 0, d: 100}, {x:120, y: 0, d: 100}]
      when 3 then [{x: 160, y: 0, d: 100}, {x:200, y: 0, d: 100}]

class MapUnit2DForUserTankP2 extends MapUnit2DForTank
  current_frames: () ->
    switch @model.level
      when 1 then [{x: 0, y: 40, d: 100}, {x:40, y: 40, d: 100}]
      when 2 then [{x: 80, y: 40, d: 100}, {x:120, y: 40, d: 100}]
      when 3 then [{x: 160, y: 40, d: 100}, {x:200, y: 40, d: 100}]

class MapUnit2DForBrick extends MapUnit2D
  current_frames: () -> [{x: 0, y: 240}]
  fight_missile: (missile, destroy_area) ->
    # cut self into pieces
    pieces = @area.space_sub(destroy_area)
    _.each(pieces, (piece) =>
      @model.battle_field.add_terrain(BrickTerrain, piece)
    )
    @model.destroy()
    # return cost of destroy
    10

class MapUnit2DForIce extends MapUnit2D
  current_frames: () -> [{x: 40, y: 240}]

class MapUnit2DForIron extends MapUnit2D
  current_frames: () -> [{x: 80, y: 240}]

class MapUnit2DForGrass extends MapUnit2D
  current_frames: () -> [{x: 120, y: 240}]

class MapUnit2DForWater extends MapUnit2D
  current_frames: () -> [{x: 160, y: 240}]

class MapUnit2DForHome extends MapUnit2D
  current_frames: () ->
    if @model.is_defeated then [{x: 240, y: 240}] else [{x: 200, y: 240}]

class MapUnit2DForMissile extends MovableMapUnit2D
  current_frames: () -> [{x: 250, y: 330}]
  update: () ->
    # if collide with other object, then explode
    destroy_area = @destroy_area()
    # START HERE
    return @model.destroy() if @map.is_out_of_bound(destroy_area)

    hit_map_units = @map.find_units_at(destroy_area)
    _.each(hit_map_units, (unit) =>
      @model.energy -= unit.fight_missile(this, destroy_area)
    )
    @model.destroy() if @model.energy <= 0
  destroy_area: ->
    switch @direction
      when 0
        new MapArea2D(@area.x1, @area.y1 - @default_height/4, @area.x2, @area.y1)
      when 90
        new MapArea2D(@area.x2, @area.y1, @area.x2 + @default_width/4, @area.y2)
      when 180
        new MapArea2D(@area.x1, @area.y2, @area.x2, @area.y2 + @default_height/4)
      when 270
        new MapArea2D(@area.x1 - @default_width/4, @area.y1, @area.x1, @area.y2)
  destroy_display: () ->
    @display_object.width = 2 * @display_object.width
    @display_object.height = 2 * @display_object.height
    @display_object.frames = [
      {x: 360, y: 320, d: 200},
      {x: 120, y: 320, d: 200},
      {x: 160, y: 320, d: 200},
      {x: 200, y: 320, d: 200}
    ]
    @display_object.startAnimation()
    setTimeout((() => @display_object.remove()), 800)

class MapUnit2DForStupidTank extends MapUnit2DForTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 80, d: 100}, {x:40, y: 80, d: 100}]
      when 2 then [{x: 80, y: 80, d: 100}, {x:120, y: 80, d: 100}]
      when 3 then [{x: 160, y: 80, d: 100}, {x:200, y: 80, d: 100}]
      when 4 then [{x: 240, y: 80, d: 100}, {x:280, y: 80, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForFoolTank extends MapUnit2DForTank
  current_frames: () ->

class MapUnit2DForStrongTank extends MapUnit2DForTank
  current_frames: () ->

class MapUnit2DForFishTank extends MapUnit2DForTank
  current_frames: () ->

class BattleField
  constructor: () ->
    @map = new Map2D(this)

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
    # next round commands
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
    @commands
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

class TerrainBuilder
  constructor: (@battle_field, @default_width, @default_height) ->
  batch_build: (terrain_cls, array_of_xys) ->
    @build_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3]) for xys in array_of_xys

  build_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        area = new MapArea2D(xs, ys, _.min([x2, xs + @default_height]), _.min([y2, ys + @default_width]))
        @battle_field.add_terrain(terrain_cls, area)
        ys += @default_width
      xs += @default_height

init = ->
  console.log "init start"

  battle_field = new BattleField

  battle_field.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
  # battle_field.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

  builder = new TerrainBuilder(battle_field, battle_field.map.default_width, battle_field.map.default_height)

  builder.batch_build(IceTerrain, [
    [40, 0, 240, 40],
    [280, 0, 480, 40],
    [0, 40, 80, 280],
    [440, 40, 520, 280],
    [80, 240, 440, 280]
  ])
  builder.batch_build(BrickTerrain, [
    [120, 40, 240, 80],
    [120, 80, 160, 160],
    [160, 120, 200, 160],
    [200, 80, 240, 200],
    [120, 200, 240, 240],
    [280, 40, 400, 80],
    [280, 80, 320, 200],
    [360, 80, 400, 200],
    [280, 200, 400, 240],
    [40, 340, 80, 480],
    [120, 340, 160, 480],
    [360, 340, 400, 480],
    [440, 340, 480, 480],
    [200, 300, 240, 420],
    [240, 320, 280, 400],
    [280, 300, 320, 420],
    [220, 460, 300, 480],
    [220, 480, 240, 520],
    [280, 480, 300, 520]
  ])
  builder.batch_build(IronTerrain, [
    [0, 280, 40, 320],
    [240, 280, 280, 320],
    [480, 280, 520, 320],
    [80, 360, 120, 400],
    [160, 360, 200, 400],
    [320, 360, 360, 400],
    [400, 360, 440, 400]
  ])
  builder.batch_build(GrassTerrain, [
    [0, 320, 40, 520],
    [40, 480, 120, 520],
    [400, 480, 480, 520],
    [480, 320, 520, 480]
  ])

  battle_field.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520))

  # set a reference for easier debug
  document.battle_field = battle_field

  console.log "init done"
  document.getElementById('canvas').focus()

$(document).ready init
