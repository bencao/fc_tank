class Point
  constructor: (@x, @y) ->

class MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
  equals: (area) ->
    return false unless area instanceof MapArea2D
    area.x1 == @x1 and area.x2 == @x2 and area.y1 == @y1 and area.y2 == @y2
  valid: () ->
    @x2 > @x1 and @y2 > @y1
  intersect: (area) ->
    new MapArea2D(_.max([area.x1, @x1]), _.max([area.y1, @y1]),
      _.min([area.x2, @x2]), _.min([area.y2, @y2]))
  sub: (area) ->
    intersection = @intersect(area)
    _.select([
      new MapArea2D(@x1, @y1, @x2, intersection.y1),
      new MapArea2D(@x1, intersection.y2, @x2, @y2),
      new MapArea2D(@x1, intersection.y1, intersection.x1, intersection.y2),
      new MapArea2D(intersection.x2, intersection.y1, @x2, intersection.y2)
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
  to_s: () ->
    "[" + @x1 + ", " + @y1 + ", " + @x2 + ", " + @y2 + "]"

class MapArea2DVertex extends MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
    @siblings = []
  init_vxy: (@vx, @vy) ->
  add_sibling: (sibling) ->
    @siblings.push(sibling)

class Map2D
  max_x: 520
  max_y: 520
  default_width: 40
  default_height: 40
  infinity: 65535
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
    @vertexes_columns = 4 * @max_x / @default_width - 3
    @vertexes_rows = 4 * @max_y / @default_height - 3
    @vertexes = @init_vertexes()
    @home_vertex = @vertexes[24][48]

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

  init_vertexes: () ->
    vertexes = []
    [x1, x2] = [0, @default_width]
    while x2 <= @max_x
      column_vertexes = []
      [y1, y2] = [0, @default_height]
      while y2 <= @max_y
        column_vertexes.push(new MapArea2DVertex(x1, y1, x2, y2))
        [y1, y2] = [y1 + @default_height/4, y2 + @default_height/4]
      vertexes.push(column_vertexes)
      [x1, x2] = [x1 + @default_width/4, x2 + @default_width/4]
    for x in _.range(0, @vertexes_columns)
      for y in _.range(0, @vertexes_rows)
        for sib in [
          {x: x, y: y - 1},
          {x: x + 1, y: y},
          {x: x, y: y + 1},
          {x: x - 1, y: y}
        ]
          vertexes[x][y].init_vxy(x, y)
          if 0 <= sib.x < @vertexes_columns and 0 <= sib.y < @vertexes_rows
            vertexes[x][y].add_sibling(vertexes[sib.x][sib.y])
    vertexes

  # area must be the same with one of map vertexes
  vertexes_at: (area) ->
    vx = parseInt(area.x1 * 4 / @default_width)
    vy = parseInt(area.y1 * 4 / @default_height)
    @vertexes[vx][vy]

  weight: (tank, from, to) ->
    sub_area = _.first(to.sub(from))
    terrain_units = _.select(@units_at(sub_area), (unit) ->
      unit.model instanceof Terrain
    )
    return 1 if _.isEmpty(terrain_units)
    _.first(terrain_units).weight(tank) *
      sub_area.width() * sub_area.height() /
      (@default_width * @default_height)

  shortest_path: (tank, start_vertex, end_vertex) ->
    [d, pi] = @intialize_single_source()
    d[start_vertex.vx][start_vertex.vy] = 0
    # dijkstra shortest path
    # searched_vertexes = []
    remain_vertexes = _.flatten(@vertexes)
    while _.size(remain_vertexes) > 0
      u = @extract_min(remain_vertexes, d)
      remain_vertexes = _.without(remain_vertexes, u)
      # searched_vertexes.push u
      _.each(u.siblings, (v) =>
        @relax(d, pi, u, v, @weight(tank, u, v))
      )
      break if u is end_vertex
    @shortest_path_by_pi(pi, d, start_vertex, end_vertex)

  intialize_single_source: () ->
    d = []
    pi = []
    for x in _.range(0, @vertexes_columns)
      column_ds = []
      column_pi = []
      for y in _.range(0, @vertexes_rows)
        column_ds.push(@infinity)
        column_pi.push(null)
      d.push(column_ds)
      pi.push(column_pi)
    [d, pi]

  relax: (d, pi, u, v, w) ->
    if d[v.vx][v.vy] > d[u.vx][u.vy] + w
      d[v.vx][v.vy] = d[u.vx][u.vy] + w
      pi[v.vx][v.vy] = u

  extract_min: (vertexes, d) ->
    _.min(vertexes, (vertex) => d[vertex.vx][vertex.vy])

  shortest_path_by_pi: (pi, d, start_vertex, end_vertex) ->
    reverse_paths = []
    v = end_vertex
    until pi[v.vx][v.vy] is null
      reverse_paths.push(v)
      v = pi[v.vx][v.vy]
    reverse_paths.push(start_vertex)
    reverse_paths.reverse()

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
  weight: (tank) ->
    40 / tank.power
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
  weight: (tank) ->
    switch tank.power
      when 1
        @map.infinity
      when 2
        20
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
  weight: (tank) -> 4
  current_frames: () -> [{x: 40, y: 240}]

class MapUnit2DForGrass extends MapUnit2D
  layer: "front"
  weight: (tank) -> 4
  current_frames: () -> [{x: 120, y: 240}]

class MapUnit2DForWater extends MapUnit2D
  layer: "back"
  weight: (tank) ->
    switch tank.ship
      when true
        4
      when false
        @map.infinity
  current_frames: () -> [{x: 160, y: 240}]

class MapUnit2DForHome extends MapUnit2D
  weight: (tank) -> 0
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
    _.detect(_.range(1, offset + 1).reverse(), (os) => @_try_move(os))

  turn: (direction) ->
    target_area = if (direction % 180 is 0) then @_adjust_x() else @_adjust_y()
    if @map.area_available(this, target_area)
      @direction = direction
      @model.direction = direction
      @update_area(target_area)
      @update_display()

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    return false if offset_x == 0 and offset_y == 0
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y,
      target_x + @width(), target_y + @height())
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
    offset = (@default_height/4) -
      (@area.x1 + @default_height/4) % (@default_height/2)
    new MapArea2D(@area.x1 + offset, @area.y1, @area.x2 + offset, @area.y2)
  _adjust_y: () ->
    offset = (@default_width/4) -
      (@area.y1 + @default_width/4) % (@default_width/2)
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
      @model.energy -= @max_depend_point
    else
      hit_map_units = @map.units_at(destroy_area)
      _.each(hit_map_units, (unit) =>
        defend_point = unit.defend(@model, destroy_area)
        @bom_on_destroy = (defend_point == @max_depend_point)
        @model.energy -= defend_point
      )
    @model.destroy() if @model.energy <= 0
  destroy_area: ->
    switch @direction
      when 0
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y1 - @default_height/4,
          @area.x2 + @default_width/4,
          @area.y1
        )
      when 90
        new MapArea2D(
          @area.x2,
          @area.y1 - @default_height/4,
          @area.x2 + @default_width/4,
          @area.y2 + @default_height/4
        )
      when 180
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y2,
          @area.x2 + @default_width/4,
          @area.y2 + @default_height/4
        )
      when 270
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y1 - @default_height/4,
          @area.x1,
          @area.y2 + @default_height/4
        )
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
  defend: (missile, destroy_area) ->
    if (@_is_user_tank(missile.parent) ^ @_is_user_tank(@model)) is 0
      return @max_depend_point - 1
    defend_point = _.min(@model.life, missile.power)
    @model.life -= missile.power
    @model.destroy() if @model.dead()
    defend_point

  _is_user_tank: (tank) ->
    tank.type() == "user_p1" or tank.type() == "user_p2"

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
    origin = switch @model.level
      when 1 then [{x: 0, y: 120, d: 100}, {x:40, y: 120, d: 100}]
      when 2 then [{x: 80, y: 120, d: 100}, {x:120, y: 120, d: 100}]
      when 3 then [{x: 160, y: 120, d: 100}, {x:200, y: 120, d: 100}]
      when 4 then [{x: 240, y: 120, d: 100}, {x:280, y: 120, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForFishTank extends MapUnit2DForTank
  current_frames: () ->
    origin = switch @model.level
      when 1 then [{x: 0, y: 160, d: 100}, {x:40, y: 160, d: 100}]
      when 2 then [{x: 80, y: 160, d: 100}, {x:120, y: 160, d: 100}]
      when 3 then [{x: 160, y: 160, d: 100}, {x:200, y: 160, d: 100}]
      when 4 then [{x: 240, y: 160, d: 100}, {x:280, y: 160, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class MapUnit2DForStrongTank extends MapUnit2DForTank
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
  home: -> _.first(_.select(@terrains, (terrain) -> terrain.type() == "home"))

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
    @delayed_commands = []
    @init_commander()
    @moving = false

  init_commander: () ->
    @commander = new Commander()

  speed: 0.08

  queued_delayed_commands: () ->
    [commands, @delayed_commands] = [@delayed_commands, []]
    commands

  add_delayed_command: (command) ->
    @delayed_commands.push(command)

  integration: (delta_time) ->
    super(delta_time)
    @commands = _.union(@commander.next_commands(), @queued_delayed_commands())
    @handle_turn(cmd) for cmd in @commands
    @handle_move(cmd, delta_time) for cmd in @commands

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
        @moving = true
        max_offset = parseInt(@speed * delta_time)
        intent_offset = command.params.offset
        if intent_offset is null
          @move(max_offset)
        else
          real_offset = _.min([intent_offset, max_offset])
          if @move(real_offset)
            command.params.offset -= real_offset
            @add_delayed_command(command) if command.params.offset > 0
          else
            @add_delayed_command(command)

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
  accept: (battle_field_object) ->
    return true if @is_defeated and battle_field_object instanceof Missile
    false

class Tank extends MovableBattleFieldObject
  constructor: (@battle_field) ->
    super(@battle_field)
    @life = 1
    @power = 1
    @level = 1
    @max_missile = 1
    @missiles = []
    @on_ship = false
    @on_guard = false

  accept: (battle_field_object) ->
    (battle_field_object instanceof Missile) and
      (battle_field_object.parent is this)

  dead: () ->
    @life <= 0
  update_level: (@level) ->
    switch @level
      when 1
        @power = 1
        @max_missile = 1
      when 2
        @power = 2
        @max_missile = 2

  fire: () ->
    if @can_fire()
      missile = @battle_field.add_missile(this)
      @missiles.push(missile)

  can_fire: () ->
    _.size(@missiles) < @max_missile

  integration: (delta_time) ->
    super(delta_time)
    @fire() for command in _.select(@commands, (cmd) -> cmd.type == "fire")

  missile_born_area: () -> @view.missile_born_area()

  delete_missile: (missile) ->
    @missiles = _.without(@missiles, missile)

class UserTank extends Tank
  speed: 0.16

class UserP1Tank extends UserTank
  init_commander: () ->
    @commander = new UserCommander(this, {
      up: 38, down: 40, left: 37, right: 39, fire: 70
    })
  type: -> 'user_p1'

class UserP2Tank extends UserTank
  init_commander: () ->
    @commander = new UserCommander(this, {
      up: 71, down: 72, left: 73, right: 74, fire: 75
    })
  type: -> 'user_p2'

class EnemyTank extends Tank
  direction: 180
  init_commander: () ->
    @commander = new EnemyAICommander(this)
  gift: 0

class StupidTank extends EnemyTank
  speed: 0.07
  type: -> 'stupid'

class FoolTank extends EnemyTank
  speed: 0.07
  type: -> 'fool'

class FishTank extends EnemyTank
  speed: 0.18
  type: -> 'fish'

class StrongTank extends EnemyTank
  speed: 0.05
  type: -> 'strong'

class Missile extends MovableBattleFieldObject
  constructor: (@battle_field, @parent) ->
    super(@battle_field)
    @power = @parent.power
    @energy = @power
    @direction = @parent.direction
  init_commander: () ->
    @commander = new MissileCommander(this)
  speed: 0.30
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
  constructor: (@movable) ->
    @direction = @movable.direction
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
    @movable.direction != new_direction
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
  constructor: (@movable, key_setting) ->
    super(@movable)
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
            @start_move()
          else
            @stop_move() if keyup
    @reset_input()

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
  constructor: (@movable) ->
    super(@movable)
    @battle_field = @movable.battle_field
    @map = @battle_field.map
    @reset_path()
    @last_area = null
  next: ->
    # move towards home
    if _.size(@path) == 0
      console.log "calc path"
      @path = @map.shortest_path(@movable, @current_vertex(), @map.home_vertex)
      @next_move()
      # setTimeout((() => @reset_path()), 3000 + Math.random()*1000)
    else
      @next_move() if @current_vertex().equals(@target_vertex)

    # fire if can't move
    @fire() if @movable.can_fire() and
      @last_area and @last_area.equals(@movable.view.area)
    # fire if user or home in front of me
    targets = _.compact([@battle_field.p1_tank(), @battle_field.p2_tank(), @battle_field.home()])
    for target in targets
      @fire() if @in_attack_range(target.view.area)

    @last_area = @movable.view.area

  next_move: () ->
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

  current_vertex: () ->
    @map.vertexes_at(@movable.view.area)

  in_attack_range: (area) ->
    @movable.view.area.x1 == area.x1 or @movable.view.area.y1 == area.y1

class MissileCommander extends Commander
  next: -> @start_move()

class TerrainBuilder
  constructor: (@battle_field, @default_width, @default_height) ->
  batch_build: (terrain_cls, array_of_xys) ->
    for xys in array_of_xys
      @build_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3])

  build_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        area = new MapArea2D(xs, ys,
          _.min([x2, xs + @default_height]),
          _.min([y2, ys + @default_width]))
        @battle_field.add_terrain(terrain_cls, area)
        ys += @default_width
      xs += @default_height
