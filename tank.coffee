class Rect
  # x axis towards right
  # y axis towards down
  # x1, y1 stands for the top left point
  # x2, y2 stands for the right bottom point
  constructor: (@x1, @y1, @x2, @y2) ->
  contains: (rect) ->
    @x1 <= rect.x1 and @y1 <= rect.y1 and @x2 >= rect.x2 and @y2 >= rect.y2
  intersection: (rect) ->
    [max_x1, max_y1, min_x2, min_y2] = [@x1, @y1, @x2, @y2]
    max_x1 = rect.x1 if rect.x1 > max_x1
    max_y1 = rect.y1 if rect.y1 > max_y1
    min_x2 = rect.x2 if rect.x2 < min_x2
    min_y2 = rect.y2 if rect.y2 < min_y2
    new Rect(max_x1, max_y1, min_x2, min_y2)
  range_with: (rect) ->
    [min_x1, min_y1, max_x2, max_y2] = [@x1, @y1, @x2, @y2]
    min_x1 = rect.x1 if rect.x1 < min_x1
    min_y1 = rect.y1 if rect.y1 < min_y1
    max_x2 = rect.x2 if rect.x2 > max_x2
    max_y2 = rect.y2 if rect.y2 > max_y2
    new Rect(min_x1, min_y1, max_x2, max_y2)
  toString: -> @x1 + ":" + @y1 + ":" + @x2 + ":" + @y2
  width: -> @x2 - @x1
  height: -> @y2 - @y1

class World
  max_x: 520
  max_y: 520
  tanks: []
  terrains: []
  all_units: -> @tanks.concat(@terrains)
  add_tank: (tank) ->
    @tanks.push(tank)
  add_terrain: (terrain) ->
    @terrains.push(terrain)

class Observable
  observers: []
  add_observer: (o) -> @observers.push(o)
  notify_changed: (args) ->
    o.on_changed(this, args) for o in @observers

class WorldUnit extends Observable
  constructor: (@world, positions) ->
    @rect = new Rect(positions[0], positions[1], positions[2], positions[3])
  id: -> @layer.toString + @rect.toString
  layer: "main"

class Graph
  unit_rect_hash: {}
  constructor: (@world) ->
    @paper = Raphael("holder", @world.max_x, @world.max_y)
  on_changed: (unit, args) ->
    old_rect = @unit_rect_hash[unit.id]
    new_rect = unit.rect
    this.paint_all_layer(old_rect.range_with(new_rect))
    @unit_rect_hash[unit.id] = new_rect
  on_initialized: ->
    this.paint_all_layer(new Rect(0, 0, @world.max_x, @world.max_y))
  paint_all_layer: (rect) ->
    rect_units = (unit for unit in @world.all_units() when rect.contains(unit.rect))
    this.clear_rect(rect)
    for layer in ["main", "foreground"]
      this.paint_single_layer(unit, rect) for unit in rect_units when unit.layer == layer
  clear_rect: (rect) ->
    e = @paper.rect(rect.x1, rect.y1, rect.width(), rect.height())
    e.attr({ fill: '#000' })
  color_mapping: -> {
    "brick" : "#f00",
    "grass" : "#0f0",
    "iron" : "#999",
    "ice" : "#fff",
    "water" : "#00f",
    "user_primary" : "#0ff",
    "user_secondary" : "#f5f",
    "fool" : "#135",
    "fish" : "#246",
    "strong" : "#369"
  }
  paint_single_layer: (unit, rect) ->
    console.log "paingting single"
    need_paint_rect = rect.intersection(unit.rect)
    if unit instanceof Terrain
      e = @paper.rect(need_paint_rect.x1, need_paint_rect.y1, need_paint_rect.width(), need_paint_rect.height())
      e.attr({ fill: this.color_mapping()[unit.type()] })
    else
      e = @paper.rect(need_paint_rect.x1, need_paint_rect.y1, need_paint_rect.width(), need_paint_rect.height())
      e.attr({ fill: this.color_mapping()[unit.type()] })

class Terrain extends WorldUnit
  passable: (tank) -> true
  destroyable: (missile) -> false
  type: ->

class BrickTerrain extends Terrain
  passable: (tank) -> false
  destroyable: (missile) -> missile.power >= 1
  type: -> "brick"

class IronTerrain extends Terrain
  passable: (tank) -> false
  destroyable: (missile) -> missile.power >= 2
  type: -> "iron"

class WaterTerrain extends Terrain
  passable: (tank) -> tank.on_ship
  type: -> "water"

class IceTerrain extends Terrain
  passable: (tank) -> true
  type: -> "ice"

class GrassTerrain extends Terrain
  passable: (tank) -> true
  destroyable: (missile) -> missile.power >= 3
  type: -> "grass"
  layer: "foreground"

class Tank extends WorldUnit
  constructor: (world, positions, @life) -> super world, positions
  decrease_life: (x) ->
    @life -= x
    this.notify_changed('life')
  increase_life: (x) ->
    @life += x
    this.notify_changed('life')
  die: ->
    @life = 0
    this.notify_changed('life')
  is_dead: ->
    @life <= 0
  power: 0
  decrease_power: (x) ->
    @power -= x
    this.notify_changed('power')
  increase_power: (x) ->
    @power += x
    this.notify_changed('power')
  speed: 0
  ship: false
  guard: false
  increase_gift: (x) ->
  on_ship: ->
    @ship == true
  on_guard: ->
    @guard == true
  set_on_ship: (@ship) -> this.notify_changed('ship')
  set_on_guard: (@guard) -> this.notify_changed('guard')
  direction: 'N'
  turn: (@direction) -> this.notify_changed('direction')
  pos_x: 0
  pos_y: 0
  move: (offset_x, offset_y) ->
    this.notify_changed('position')
  fire: ->
  type: ->

class UserTank extends Tank
  constructor: (world, positions, @life, @primary) -> super world, positions
  power: 1
  speed: 2
  type: -> 'user_' + (if @primary then 'primary' else 'secondary')

class EnemyTank extends Tank
  constructor: (world, positions, life, @gift) -> super world, positions, life
  cruise: ->

class FoolTank extends EnemyTank
  power: 1
  speed: 1
  type: -> 'fool'

class FishTank extends EnemyTank
  power: 1
  speed: 3
  type: -> 'fish'

class StrongTank extends EnemyTank
  power: 2
  speed: 1
  type: -> 'strong'

init = ->
  console.log "init start"
  world = new World
  world.add_tank(new UserTank(world, [220, 10, 260, 50], 1, true))
  world.add_tank(new UserTank(world, [220, 370, 260, 410], 1, false))
  world.add_tank(new FoolTank(world, [220, 90, 260, 130], 1, 0))
  world.add_tank(new FishTank(world, [220, 210, 260, 250], 2, 1))
  world.add_tank(new StrongTank(world, [220, 290, 260, 330], 3, 2))

  console.log tank.type() for tank in world.tanks

  world.add_terrain(new BrickTerrain(world, [100, 100, 140, 500]))
  world.add_terrain(new GrassTerrain(world, [180, 100, 220, 500]))
  world.add_terrain(new IronTerrain(world, [260, 100, 300, 500]))
  world.add_terrain(new WaterTerrain(world, [340, 100, 380, 500]))
  world.add_terrain(new IceTerrain(world, [420, 100, 460, 500]))

  graph = new Graph(world)
  graph.on_initialized()

  console.log "init done"

$(document).ready init
