class Point
  constructor: (@x, @y) ->

class MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
  equals: (area) ->
    area.x1 == @x1 and area.x2 == @x2 and area.y1 == @y1 and area.y2 == @y2
  valid: () ->
    @x2 > @x1 and @y2 > @y1
  intersect: (area) ->
    new MapArea2D(_.max([area.x1, @x1]), _.max([area.y1, @y1]), _.min([area.x2, @x2]), _.min([area.y2, @y2]))
  sub: (area) ->
    intersect_area = @intersect(area)
    _.select([
      new MapArea2D(@x1, @y1, @x2, intersect_area.y1),
      new MapArea2D(@x1, intersect_area.y2, @x2, @y2),
      new MapArea2D(@x1, intersect_area.y1, intersect_area.x1, intersect_area.y2),
      new MapArea2D(intersect_area.x2, intersect_area.y1, @x2, intersect_area.y2)
    ], (candidate_area) -> candidate_area.valid())
  collide: (area) ->
    not (@x2 <= area.x1 or @y2 <= area.y1 or @x1 >= area.x2 or @y1 >= area.y2)
  width: () ->
    @x2 - @x1
  height: () ->
    @y2 - @y1
  multiply: (direction, factor) ->
    switch direction
      when 0
        new MapArea2D(@x1, @y1 - factor * @height(), @x2, @y2)
      when 90
        new MapArea2D(@x1, @y1, @x2 + factor * @width(), @y2)
      when 180
        new MapArea2D(@x1, @y1, @x2, @y2 + factor * @height())
      when 270
        new MapArea2D(@x1 - factor * @width(), @y1, @x2, @y2)

class Map2D
  max_x: 520
  max_y: 520
  default_width: 40
  default_height: 40
  map_units: [] # has_many map_units
  constructor: (@battle_field, @canvas, @scene) ->
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

  units_at: (area) ->
    _.select(@map_units, (map_unit) ->
      map_unit.area.collide(area)
    )
  out_of_bound: (area) ->
    area.x1 < 0 or area.x2 > @max_x or area.y1 < 0 or area.y2 > @max_y
  area_available: (unit, area) ->
    _.all(@map_units, (map_unit) =>
      (map_unit is unit) or
        map_unit.accept(unit) or
        not map_unit.area.collide(area)
    )

  add_map_unit: (model, area) ->
    map_unit_cls = @unit_map[model.type()]
    map_unit = new map_unit_cls(this, model, area)
    @map_units.push(map_unit)
    map_unit

  delete_map_unit: (map_unit) ->
    @map_units = _.without(@map_units, map_unit)

class MapUnit2D
  layer: 10

  origin_x: 'left'
  origin_y: 'top'

  constructor: (@map, @model, @area) ->
    @default_width = @map.default_width
    @default_height = @map.default_height
    @gravity_point = @update_gravity_point()
    @new_display()

  update_area: (@area) ->
    @gravity_point = @update_gravity_point()

  update_gravity_point: () ->
    new Point(@area.x1, @area.y1)

  new_display: () ->
    @display_object = @map.canvas.display.sprite({
      frames: @initial_frames(),
      image: @map.image,
      width: @width(),
      height: @height(),
      x: @gravity_point.x,
      y: @gravity_point.y,
      origin: { x: @origin_x, y: @origin_y}
    })
    @map.scene.add(@display_object)

  current_frames: () -> []
  initial_frames: () -> @current_frames()
  update_display: () ->
    @display_object.frames = @current_frames()

  reset_zindex: () ->
    @display_object.zIndex = @layer

  width: () -> @area.x2 - @area.x1
  height: () -> @area.y2 - @area.y1

  destroy: () ->
    @destroy_display()
    @map.delete_map_unit(this)

  destroy_display: () ->
    @display_object.remove()

  accept: (other_unit) -> @model.accept(other_unit.model)

  max_depend_point: 9
  defend: (missile, destroy_area) -> 0

class MapUnit2DForBrick extends MapUnit2D
  current_frames: () -> [{x: 0, y: 240}]
  defend: (missile, destroy_area) ->
    # cut self into pieces
    pieces = @area.sub(destroy_area)
    _.each(pieces, (piece) =>
      @model.battle_field.add_terrain(BrickTerrain, piece)
    )
    @model.destroy()
    # return cost of destroy
    1

class MapUnit2DForIron extends MapUnit2D
  current_frames: () -> [{x: 80, y: 240}]
  defend: (missile, destroy_area) ->
    return @max_depend_point if missile.power < 2
    double_destroy_area = destroy_area.multiply(missile.direction, 1)
    pieces = @area.sub(double_destroy_area)
    _.each(pieces, (piece) =>
      @model.battle_field.add_terrain(IronTerrain, piece)
    )
    @model.destroy()
    2

class MapUnit2DForIce extends MapUnit2D
  layer: "back"
  current_frames: () -> [{x: 40, y: 240}]

class MapUnit2DForGrass extends MapUnit2D
  layer: "front"
  current_frames: () -> [{x: 120, y: 240}]

class MapUnit2DForWater extends MapUnit2D
  layer: "back"
  current_frames: () -> [{x: 160, y: 240}]

class MapUnit2DForHome extends MapUnit2D
  current_frames: () ->
    if @model.is_defeated then [{x: 240, y: 240}] else [{x: 200, y: 240}]
  defend: (missile, destroy_area) ->
    @model.is_defeated = true
    @update_display()
    @max_depend_point

class MovableMapUnit2D extends MapUnit2D
  origin_x: 'center'
  origin_y: 'center'

  direction: 0
  constructor: (@map, @model, @area) ->
    super(@map, @model, @area)
    @direction = @model.direction
    @bom_on_destroy = false

  update_gravity_point: () ->
    new Point((@area.x1 + @area.x2)/2, (@area.y1 + @area.y2)/2)

  update_display: () ->
    @display_object.frames = @current_frames()
    @display_object.rotateTo(@direction)
    @display_object.moveTo(@gravity_point.x, @gravity_point.y)

  move: (offset) ->
    _.detect(_.range(1, offset).reverse(), (os) => @_try_move(os))

  turn: (direction) ->
    adjusted_area = if (direction % 180 is 0) then @_adjust_x() else @_adjust_y()
    if @map.area_available(this, adjusted_area)
      @direction = direction
      @model.direction = direction
      @update_area(adjusted_area)
      @update_display()

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    return false if offset_x == 0 and offset_y == 0
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y, target_x + @width(), target_y + @height())
    if @map.area_available(this, target_area)
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
    new MapArea2D(@area.x1 + offset, @area.y1, @area.x2 + offset, @area.y2)
  _adjust_y: () ->
    offset = (@default_width/4) - (@area.y1 + @default_width/4) % (@default_width/2)
    new MapArea2D(@area.x1, @area.y1 + offset, @area.x2, @area.y2 + offset)

  destroy_display: () ->
    return super() unless @bom_on_destroy
    @display_object.width = @default_width
    @display_object.height = @default_height
    @display_object.frames = [
      {x: 360, y: 320, d: 150},
      {x: 120, y: 320, d: 150},
      {x: 160, y: 320, d: 150},
      {x: 200, y: 320, d: 150}
    ]
    @display_object.startAnimation()
    setTimeout((() => @display_object.remove()), 600)

class MapUnit2DForMissile extends MovableMapUnit2D
  current_frames: () -> [{x: 250, y: 330}]
  move: (offset) ->
    can_move = super(offset)
    @attack() unless can_move
    can_move
  attack: () ->
    # if collide with other object, then explode
    destroy_area = @destroy_area()

    if @map.out_of_bound(destroy_area)
      @bom_on_destroy = true
      @model.destroy()
    else
      hit_map_units = @map.units_at(destroy_area)
      _.each(hit_map_units, (unit) =>
        @model.energy -= unit.defend(@model, destroy_area)
      )
      @model.destroy() if @model.energy <= 0
  destroy_area: ->
    switch @direction
      when 0
        new MapArea2D(@area.x1 - @default_width/4, @area.y1 - @default_height/4, @area.x2 + @default_width/4, @area.y1)
      when 90
        new MapArea2D(@area.x2, @area.y1 - @default_height/4, @area.x2 + @default_width/4, @area.y2 + @default_height/4)
      when 180
        new MapArea2D(@area.x1 - @default_width/4, @area.y2, @area.x2 + @default_width/4, @area.y2 + @default_height/4)
      when 270
        new MapArea2D(@area.x1 - @default_width/4, @area.y1 - @default_height/4, @area.x1, @area.y2 + @default_height/4)
  defend: (missile, destroy_area) ->
    @model.destroy()
    @max_depend_point

class MapUnit2DForTank extends MovableMapUnit2D
  constructor: (@map, @model, @area) ->
    super(@map, @model, @area)
    @bom_on_destroy = true
    @frozen = true
  move: (offset) ->
    if @frozen then false else super(offset)
  turn: (direction) ->
    if @frozen then false else super(direction)
  missile_born_area: () ->
    new MapArea2D(@gravity_point.x - @default_width/4,
      @gravity_point.y - @default_height/4,
      @gravity_point.x + @default_width/4,
      @gravity_point.y + @default_height/4)
  initial_frames: () ->
    [
      {x: 360, y: 320, d: 200},
      {x: 0, y: 320, d: 200},
      {x: 40, y: 320, d: 200},
      {x: 0, y: 320, d: 200},
      {x: 80, y: 320, d: 200}
    ]
  new_display: () ->
    super()
    @display_object.startAnimation()
    setTimeout((() =>
      @display_object.stopAnimation()
      @frozen = false
      @display_object.frames = @current_frames()
      @display_object.frame = 1
    ), 1000)

class MapUnit2DForUserTank extends MapUnit2DForTank
  defend: (missile, destroy_area) ->
    return 0 if missile.parent is @model
    @max_depend_point

class MapUnit2DForEnemyTank extends MapUnit2DForTank
  defend: (missile, destroy_area) ->
    return 0 if missile.parent is @model
    defend_point = _.min(@model.life, missile.power)
    @model.life -= missile.power
    @model.destroy() if @model.dead()
    defend_point

class MapUnit2DForUserTankP1 extends MapUnit2DForUserTank
  current_frames: () ->
    switch @model.level
      when 1 then [{x: 0, y: 0, d: 10}, {x:40, y: 0, d: 10}]
      when 2 then [{x: 80, y: 0, d: 100}, {x:120, y: 0, d: 100}]
      when 3 then [{x: 160, y: 0, d: 100}, {x:200, y: 0, d: 100}]

class MapUnit2DForUserTankP2 extends MapUnit2DForUserTank
  current_frames: () ->
    switch @model.level
      when 1 then [{x: 0, y: 40, d: 100}, {x:40, y: 40, d: 100}]
      when 2 then [{x: 80, y: 40, d: 100}, {x:120, y: 40, d: 100}]
      when 3 then [{x: 160, y: 40, d: 100}, {x:200, y: 40, d: 100}]

class MapUnit2DForStupidTank extends MapUnit2DForEnemyTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 80, d: 100}, {x:40, y: 80, d: 100}]
      when 2 then [{x: 80, y: 80, d: 100}, {x:120, y: 80, d: 100}]
      when 3 then [{x: 160, y: 80, d: 100}, {x:200, y: 80, d: 100}]
      when 4 then [{x: 240, y: 80, d: 100}, {x:280, y: 80, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForFoolTank extends MapUnit2DForEnemyTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 120, d: 100}, {x:40, y: 120, d: 100}]
      when 2 then [{x: 80, y: 120, d: 100}, {x:120, y: 120, d: 100}]
      when 3 then [{x: 160, y: 120, d: 100}, {x:200, y: 120, d: 100}]
      when 4 then [{x: 240, y: 120, d: 100}, {x:280, y: 120, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForFishTank extends MapUnit2DForEnemyTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 160, d: 100}, {x:40, y: 160, d: 100}]
      when 2 then [{x: 80, y: 160, d: 100}, {x:120, y: 160, d: 100}]
      when 3 then [{x: 160, y: 160, d: 100}, {x:200, y: 160, d: 100}]
      when 4 then [{x: 240, y: 160, d: 100}, {x:280, y: 160, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForStrongTank extends MapUnit2DForEnemyTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 200, d: 100}, {x:40, y: 200, d: 100}]
      when 2 then [{x: 80, y: 200, d: 100}, {x:120, y: 200, d: 100}]
      when 3 then [{x: 160, y: 200, d: 100}, {x:200, y: 200, d: 100}]
      when 4 then [{x: 240, y: 200, d: 100}, {x:280, y: 200, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class BattleField
  constructor: (canvas, scene) ->
    @map = new Map2D(this, canvas, scene)

  terrains: [] # has_many terrains
  add_terrain: (terrain_cls, area) ->
    terrain = new terrain_cls(this)
    terrain.view = @map.add_map_unit(terrain, area)
    @terrains.push(terrain)
    terrain

  tanks: [] # has_many tanks
  add_tank: (tank_cls, area) ->
    tank = new tank_cls(this)
    tank.view = @map.add_map_unit(tank, area)
    @tanks.push(tank)
    tank

  missiles: [] # has_many missiles
  add_missile: (parent) ->
    missile = new Missile(this, parent)
    missile.view = @map.add_map_unit(missile, parent.missile_born_area())
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

  integration: (delta_time) ->

  destroy: () ->
    @view.destroy()
    @battle_field.delete_battle_field_object(this)

class MovableBattleFieldObject extends BattleFieldObject
  direction: 0

  constructor: (@battle_field) ->
    @commander = new Commander()

  speed: () -> 0.08

  moving: false

  integration: (delta_time) ->
    super(delta_time)
    @commands = @commander.next_commands()
    @handle_turn(command) for command in @commands
    @handle_move(command, delta_time) for command in @commands

  turn: (direction) ->
    @view.turn(direction)

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

class IceTerrain extends Terrain
  accept: (battle_field_object) -> true
  type: -> "ice"

class GrassTerrain extends Terrain
  accept: (battle_field_object) -> true
  type: -> "grass"

class HomeTerrain extends Terrain
  is_defeated: false
  type: -> "home"

class Tank extends MovableBattleFieldObject
  accept: (battle_field_object) ->
    (battle_field_object instanceof Missile) and (battle_field_object.parent is this)

  life: 1
  dead: () ->
    @life <= 0
  power: 1
  level: 1
  max_missile: 1
  missiles: []
  update_level: (@level) ->
    switch @level
      when 1
        @power = 1
        @max_missile = 1
      when 2
        @power = 2
        @max_missile = 2

  ship: false
  update_ship: (@ship) ->

  guard: false
  update_guard: (@guard) ->

  fire: () ->
    if _.size(@missiles) < @max_missile
      missile = @battle_field.add_missile(this)
      @missiles.push(missile)

  integration: (delta_time) ->
    super(delta_time)
    @fire() for command in _.select(@commands, (command) -> command.type == "fire")

  missile_born_area: () -> @view.missile_born_area()

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
  direction: 180
  constructor: (@battle_field) ->
    @commander = new EnemyAICommander(this)
  gift: 0

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
    @energy = @power
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
    @commands = []
  direction_action_map: {
    up: 0,
    down: 180,
    left: 270,
    right: 90
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
    @direction != new_direction
  turn: (action) ->
    new_direction = @direction_action_map[action]
    if @direction != new_direction
      @direction = new_direction
      @commands.push(@_direction_command(new_direction))
  move: (action) ->
    switch action
      when "start"
        @commands.push(@_start_move_command())
      when "stop"
        @commands.push(@_stop_move_command())
  fire: () ->
    @commands.push(@_fire_command())

  # private methods
  _direction_command: (direction) ->
    {
      type: "direction",
      params: { direction: direction }
    }
  _start_move_command: -> { type: "start_move" }
  _stop_move_command: -> { type: "stop_move" }
  _fire_command: -> { type: "fire" }

class UserCommander extends Commander
  constructor: (@battle_field_object, key_setting) ->
    super(@battle_field_object)
    @key_map = {}
    for key, code of key_setting
      @key_map[code] = key
    @key_status = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    }
    @reset_input()
  reset_input: () ->
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
            @move("start")
          else
            @move("stop") if keyup
    @reset_input()

  handle_key_press: () ->
    for key in ["up", "down", "left", "right"]
      if @is_pressed(key)
        @turn(key)
        @move("start")
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
  next: ->
    # attack home
    # attack user tank
    @battle_field_object

class MissileCommander extends Commander
  next: -> @move("start")

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

class Game
  constructor: (@fps) ->
    @init_canvas()
    @init_scenes()
    @init_control()
    @canvas.scenes.load("game")
    @start()
    window.game = this

  init_battle_field: (canvas, scene) ->
    battle_field = new BattleField(canvas, scene)

    battle_field.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
    battle_field.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

    battle_field.add_tank(StupidTank, new MapArea2D(0, 0, 40, 40))
    battle_field.add_tank(FishTank, new MapArea2D(240, 0, 280, 40))

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
    window.bf = battle_field

  start: () ->
    $(document).unbind "keyup"
    $(document).bind "keyup", (event) =>
      @battle_field.p1_tank() and @battle_field.p1_tank().commander.add_key_event("keyup", event.which)
      @battle_field.p2_tank() and @battle_field.p2_tank().commander.add_key_event("keyup", event.which)

    $(document).unbind "keydown"
    $(document).bind "keydown", (event) =>
      @battle_field.p1_tank() and @battle_field.p1_tank().commander.add_key_event("keydown", event.which)
      @battle_field.p2_tank() and @battle_field.p2_tank().commander.add_key_event("keydown", event.which)
    @canvas.timeline.start()

  pause: () ->
    $(document).unbind "keyup"
    $(document).unbind "keydown"
    @canvas.timeline.stop()

  init_canvas: () ->
    @canvas = oCanvas.create({canvas: "#canvas", background: "#000", fps: @fps})

  init_scenes: () ->
    welcome_text = @canvas.display.text({
      x: 260,
      y: 170,
      origin: { x: "center", y: "top" },
      align: "center",
      font: "bold 30px sans-serif",
      text: "Hello dude\n\nPress Enter to start game!",
      fill: "#fff"
    })
    @canvas.scenes.create "welcome", () -> @add(welcome_text)

    game_scene = @canvas.scenes.create "game", () ->
    @battle_field = @init_battle_field(@canvas, game_scene)

  init_control: () ->
    last_time = new Date()
    mod = 0
    @canvas.setLoop () =>
      current_time = new Date()
      delta_time = current_time.getMilliseconds() - last_time.getMilliseconds()
      # suppose a frame will not be more than 1 second
      delta_time += 1000 if delta_time < 0
      _.each(@battle_field.all_battle_field_objects(), (object) -> object.integration(delta_time))
      mod = (mod + 1) % 10
      _.each(@battle_field.map.map_units, (unit) -> unit.reset_zindex()) if mod == 0
      last_time = current_time

    $(document).bind "keypress", (event) =>
      # key code mapping
      [space, enter] = [32, 13]
      switch event.which
        when enter
          @canvas.scenes.load("game", true)
          @start()
        when space
          @canvas.scenes.load("welcome", true)
          @pause()

$(document).ready () ->
  new Game(30)
