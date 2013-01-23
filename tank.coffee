class Map
  constructor: (@name) ->
  draw: ->
    grid: ->

class Grid
  cells: [][]
  xcell_size: 13
  ycell_size: 13

class Cell
  xpixers: 16 * 5
  ypixers: 9 * 5

class Pixer
  terrain: ->
  x_offset:

class Terrain
  constructor: (@type) ->
  type: -> @type

class Layer
  objects: []
  priority: 0
  add_object: (o) -> @objects.push(o)
  each_object: (fun) ->
    fun.call(this, o) for o in @objects

class FrontendLayer
  constructor: ->
    this.priority = 3

class MainLayer
  constructor: ->
    this.priority = 2

class BackgroundLayer
  constructor: ->
    this.priority = 1


class Game
  start: ->
  over: ->
  pause: ->

class Observable
  observers: []
  add_observer: (o) -> @observers.push(o)
  notify_changed: (from, args) ->
    o.on_changed(from, args) for o in @observers

class Observer
  on_changed: (from, args) -> alert args

class Tank extends Observable
  constructor: (@env) ->
  life: 0
  decrease_life: (x) ->
    @life -= x
    this.notify_changed(this, 'life')
  increase_life: (x) ->
    @life += x
    this.notify_changed(this, 'life')
  die: ->
    @life = 0
    this.notify_changed(this, 'life')
  is_dead: ->
    @life <= 0
  power: 0
  decrease_power: (x) ->
    @power -= x
    notify_changed(this, 'power')
  increase_power: (x) ->
    @power += x
    notify_changed(this, 'power')
  speed: 0
  ship: false
  guard: false
  gift: 0
  increase_gift: (x) ->
  with_ship: ->
    @ship == true
  with_guard: ->
    @guard == true
  set_ship: (@ship) -> notify_changed(this, 'ship')
  set_guard: (@guard) -> notify_changed(this, 'guard')
  direction: 'N'
  turn: (@direction) -> notify_changed(this, 'direction')
  pos_x: 0
  pos_y: 0
  move: (offset_x, offset_y) ->
    # consider @env.map
    @pos_x += offset_x
    @pos_x = 0 if @pos_x < 0
    @pos_x = @env.max_x if @pos_x > @env.max_x
    @pos_y += offset_y
    @pos_y = 0 if @pos_y < 0
    @pos_y = @env.max_y if @pos_y > @env.max_y
    notify_changed(this, 'position')
  x_target: (origin, offset) ->
    tx = @pos_x + offset
    tx = 0 if tx < 0
    tx = @env.max_x if tx > @env.max_x
  y_target: (origin, offset) ->
    ty = @pos_y + offset
    ty = 0 if ty < 0
    ty = @env.max_y if ty > @envmax_y.
  fire: ->
    @env.fire

class UserTank extends Tank
  constructor: (@game) ->
    @life = 1
    @power = 1
    @speed = 2
    super @game

class EnemyTank extends Tank
  cruise: ->
    move_next
    fire
    # auto move


class EnemySlowTank extends Tank
  constructor: (@game) ->
    @life = 1
    @power = 1
    @speed = 1






class Missile

class Gift


paper = Raphael("holder", 1024, 520)

circle = paper.circle(50, 40, 10)
circle.attr("fill", "#f00")
