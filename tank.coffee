class World
  max_x: 520
  max_y: 520
  unit_height: 40
  unit_width: 40
  step: 2
  tanks: []
  terrains: []
  item_counts: 0
  all_units: -> @tanks.concat(@terrains)
  observers: []
  add_tank: (tank_cls, start_x, start_y, width = @unit_width, height = @unit_height) ->
    tank = new tank_cls(this, start_x, start_y, width, height)
    tank.set_observers(@observers)
    @tanks.push(tank.set_id(++ @item_counts))
  add_terrain: (terrain_cls, start_x, start_y, width = @unit_width, height = @unit_height) ->
    terrain = new terrain_cls(this, start_x, start_y, width, height)
    terrain.set_observers(@observers)
    @terrains.push(terrain.set_id(++ @item_counts))
  batch_add_terrain_by_range: (terrain_cls, array_of_xys) ->
    for xys in array_of_xys
      this.add_terrain_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3])
  add_terrain_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        this.add_terrain(terrain_cls, xs, ys, _.min([x2 - xs, @unit_width]), _.min([y2 - ys, @unit_height]))
        ys += @unit_height
      xs += @unit_width
  p1_tank: ->
    _.find(@tanks, (tank) -> tank.type() is "user_p1")
  p2_tank: ->
    _.find(@tanks, (tank) -> tank.type() is "user_p2")
  register_observer: (o) ->
    @observers.push o
    unit.set_observers(@observers) for unit in this.all_units

class Observable
  set_observers: (@observers) ->
  notify_changed: (args...) ->
    o.on_changed(this, args) for o in @observers

class WorldUnit extends Observable
  constructor: (@world, @start_x, @start_y, @width, @height) ->
  space: () ->
    [@start_x, @start_y, @start_x + @width, @start_y + @height]
  x: () ->
    @start_x
  y: () ->
    @start_y
  origin_x: 'left'
  origin_y: 'top'
  layer: 1
  type: ->
  set_id: (@id) -> this
  enterable: (other_unit) -> true
  space_available: (x1, y1, x2, y2) ->
    self = this
    _.all(@world.all_units(), (unit) ->
      (unit is self) or unit.enterable(self) or
        not unit.overlap_with(x1, y1, x2, y2)
    )
  _insect: (x1, y1, x2, y2, x3, y3, x4, y4) ->
    a = (y4 - y3) / (x4 - x3)
    b = (x4 * y3 - x3 * y4) / (x4 - x3)
    c = (x4 * y4 - x3 * y3) / (x4 - x3)
    (x3 < ((y1 - b) / a) < x4) or
    (x3 < ((y2 - b) / a) < x4) or
    (x3 < ((c - y1) / a) < x4) or
    (x3 < ((c - y2) / a) < x4) or
    (y3 < (a * x1 + b) < y4) or
    (y3 < (a * x2 + b) < y4) or
    (y3 < (c - a * x1) < y4) or
    (y3 < (c - a * x2) < y4)
  overlap_with: (x1, y1, x2, y2) ->
    [x3, y3, x4, y4] = this.space()
    return false if (x4 <= x1 or y4 <= y1 or x3 >= x2 or y3 >= y2)
    return this._insect(x1, y1, x2, y2, x3, y3, x4, y4)

class MovableWorldUnit extends WorldUnit
  x: () ->
    @start_x + @width / 2
  y: () ->
    @start_y + @height / 2
  origin_x: 'center'
  origin_y: 'center'
  space: () ->
    [@start_x, @start_y, @start_x + @width, @start_y + @height]
  move: (offset_x, offset_y) ->
    target_x = @start_x + offset_x
    target_y = @start_y + offset_y
    if this.space_available(target_x, target_y, target_x + @width, target_y + @height)
      [@start_x, @start_y] = [target_x, target_y]
    this.notify_changed("position")

  direction: 0
  turn: (direction) ->
    return false if direction is @direction
    # this.sync_position()
    @direction = direction
    if (direction % 180 is 0) then this._adjust_x() else this._adjust_y()
    this.notify_changed("direction")
    true
  _adjust_x: () ->
    offset = (@world.unit_width / 4) - (@start_x + @world.unit_width / 4) % (@world.unit_width / 2)
    @start_x += offset
  _adjust_y: () ->
    offset = (@world.unit_height / 4) - (@start_y + @world.unit_height / 4) % (@world.unit_height / 2)
    @start_y += offset

class UI
  constructor: (@world) ->
    @image = document.getElementById('resources')
    @frame_map = {
      user_p1: new UserP1Frames,
      user_p2: new UserP2Frames,
      stupid: new StupidFrames,
      fool: new FoolFrames,
      fish: new FishFrames,
      strong: new StrongFrames,
      brick: new BrickFrames,
      iron: new IronFrames,
      grass: new GrassFrames,
      ice: new IceFrames,
      water: new WaterFrames,
      home: new HomeFrames
    }

    @canvas = oCanvas.create({canvas: "#canvas", background: "#000", fps: 40})

    @canvas.setLoop () ->
    #   # console.log "l"
    #   # handle tank/missile movements
    #   self.handle_movement(tank) for tank in world.tanks
    #   # handle explosure
    #   # handle reborn
    @canvas.timeline.start()

    this.bind_key_press()
  do_unit_map: {}
  key_map: {}
  bind_key_press: ->
    key_map = @key_map
    world = @world
    @canvas.bind "keypress", (event) ->
      return if _.isUndefined(key_map[event.which])
      [user, action] = (key_map[event.which]).split("-")
      user_tank = (if user == "p1" then world.p1_tank() else world.p2_tank())
      switch action
        when "up" then user_tank.on_up()
        when "down" then user_tank.on_down()
        when "left" then user_tank.on_left()
        when "right" then user_tank.on_right()
        when "fire" then user_tank.on_fire()
        when "select" then console.log("select")
        when "start" then console.log("start")
  register_p1_controller: (setting) ->
    for action, key of setting
      @key_map[key] = "p1-" + action
  register_p2_controller: (setting) ->
    for action, key of setting
      @key_map[key] = "p2-" + action
  on_changed: (unit, args) ->
    display_object = @do_unit_map[unit.id]
    display_object.startAnimation()
    self = this
    type = args[0]
    switch(type)
      when "position"
        display_object.animate({
          x: unit.x()
          y: unit.y()
        }, {
          duration: 20,
          easing: "linear",
          callback: () ->
            display_object.stopAnimation()
        })
      when "direction"
        display_object.rotateTo(unit.direction)
        display_object.moveTo(unit.x(), unit.y())
      else
        display_object.frames = self.frames_for(unit)
  on_destroyed: (unit) ->
    @do_unit_map[unit.id].remove()
    @do_unit_map[unit.id] = null
  on_initialized: ->
    for unit in @world.all_units()
      display_object = this.create_do(unit)
      @do_unit_map[unit.id] = display_object
      @canvas.addChild(display_object)
    for unit in @world.all_units()
      display_object.zIndex = unit.layer
  create_do: (unit) ->
    frame = @frame_map[unit.type()]
    @canvas.display.sprite({
      frames: frame.frames_for(unit),
      image: @image,
      width: unit.width,
      height: unit.height,
      x: unit.x(),
      y: unit.y(),
      origin: { x: unit.origin_x, y: unit.origin_y }
    })

class BrickFrames
  frames_for: (brick) ->
    [{x: 0, y: 240}]

class IceFrames
  frames_for: (ice) ->
    [{x: 40, y: 240}]

class IronFrames
  frames_for: (iron) ->
    [{x: 80, y: 240}]

class GrassFrames
  frames_for: (grass) ->
    [{x: 120, y: 240}]

class WaterFrames
  frames_for: (water) ->
    [{x: 160, y: 240}]

class HomeFrames
  frames_for: (home) ->
    if home.is_defeated then [{x: 240, y: 240}] else [{x: 200, y: 240}]

class UserP1Frames
  frames_for: (tank) ->
    switch tank.level
      when 1 then [{x: 0, y: 0, d: 10}, {x:40, y: 0, d: 10}]
      when 2 then [{x: 80, y: 0, d: 100}, {x:120, y: 0, d: 100}]
      when 3 then [{x: 160, y: 0, d: 100}, {x:200, y: 0, d: 100}]

class UserP2Frames
  frames_for: (tank) ->
    switch tank.level
      when 1 then [{x: 0, y: 40, d: 100}, {x:40, y: 40, d: 100}]
      when 2 then [{x: 80, y: 40, d: 100}, {x:120, y: 40, d: 100}]
      when 3 then [{x: 160, y: 40, d: 100}, {x:200, y: 40, d: 100}]

class StupidFrames
  frames_for: (tank) ->
    origin = switch tank.level
      when 1 then [{x: 0, y: 80, d: 100}, {x:40, y: 80, d: 100}]
      when 2 then [{x: 80, y: 80, d: 100}, {x:120, y: 80, d: 100}]
      when 3 then [{x: 160, y: 80, d: 100}, {x:200, y: 80, d: 100}]
      when 4 then [{x: 240, y: 80, d: 100}, {x:280, y: 80, d: 100}]
      when 5 then [{x: 240, y: 40, d: 100}, {x:280, y: 40, d: 100}]

class FoolFrames
  frames_for: (tank) ->

class StrongFrames
  frames_for: (tank) ->

class FishFrames
  frames_for: (tank) ->

class Terrain extends WorldUnit
  enterable: (unit) -> false
  destroyable: (missile) -> false

class BrickTerrain extends Terrain
  destroyable: (missile) -> missile.power >= 1
  type: -> "brick"

class IronTerrain extends Terrain
  destroyable: (missile) -> missile.power >= 2
  type: -> "iron"

class WaterTerrain extends Terrain
  enterable: (unit) ->
    if unit instanceof Tank
      unit.on_ship
    else
      unit instanceof Missile
  type: -> "water"
  layer: 0

class IceTerrain extends Terrain
  enterable: (unit) -> true
  type: -> "ice"
  layer: 0

class GrassTerrain extends Terrain
  enterable: (unit) -> true
  destroyable: (missile) -> missile.power >= 3
  type: -> "grass"
  layer: 2

class HomeTerrain extends Terrain
  is_defeated: false
  type: -> "home"

class Tank extends MovableWorldUnit
  enterable: (unit) -> false
  life: 1
  set_life: (@life) ->
  die: ->
    this.set_life(0)
  is_dead: ->
    @life <= 0

  level: 1
  set_level: (@level) ->

  power: 1
  set_power: (@power) ->

  step: -> (@world.step * @speed)

  speed: 1
  ship: false
  set_on_ship: (@ship) ->

  guard: false
  set_on_guard: (@guard) ->

  on_up: ->
    this.move(0, - this.step()) if (! this.turn(0) && @start_y >= this.step())
  on_down: ->
    this.move(0, this.step()) if (! this.turn(180) && @start_y <= @world.max_y - @height - this.step())
  on_left: ->
    this.move(- this.step(), 0) if (! this.turn(270) && @start_x >= this.step())
  on_right: ->
    this.move(this.step(), 0) if (! this.turn(90) && @start_x <= @world.max_x - @width - this.step())
  on_fire: ->
    console.log("fire")

class UserTank extends Tank
  speed: 2

class UserP1Tank extends UserTank
  type: -> 'user_p1'

class UserP2Tank extends UserTank
  type: -> 'user_p2'

class EnemyTank extends Tank
  gift: 0
  set_gift: (@gift) ->
  cruise: ->

class StupidTank extends EnemyTank
  type: -> 'stupid'

class FoolTank extends EnemyTank
  type: -> 'fool'

class FishTank extends EnemyTank
  speed: 3
  type: -> 'fish'

class StrongTank extends EnemyTank
  type: -> 'strong'

class Missile extends MovableWorldUnit
  power: 1
  set_power: (@power) ->

class Gift extends WorldUnit
  test: () ->

init = ->
  console.log "init start"
  world = new World
  world.add_tank(UserP1Tank, 160, 480)
  world.add_tank(UserP2Tank, 320, 480)

  world.batch_add_terrain_by_range(IceTerrain, [
    [40, 0, 240, 40],
    [280, 0, 480, 40],
    [0, 40, 80, 280],
    [440, 40, 520, 280],
    [80, 240, 440, 280]
  ])
  world.batch_add_terrain_by_range(BrickTerrain, [
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
  world.batch_add_terrain_by_range(IronTerrain, [
    [0, 280, 40, 320],
    [240, 280, 280, 320],
    [480, 280, 520, 320],
    [80, 360, 120, 400],
    [160, 360, 200, 400],
    [320, 360, 360, 400],
    [400, 360, 440, 400]
  ])
  world.batch_add_terrain_by_range(GrassTerrain, [
    [0, 320, 40, 520],
    [40, 480, 120, 520],
    [400, 480, 480, 520],
    [480, 320, 520, 480]
  ])
  world.add_terrain(HomeTerrain, 240, 480)

  ui = new UI(world)
  ui.register_p1_controller({
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    fire: 70,
    select: 32,
    start: 13
  })
  ui.on_initialized()

  world.register_observer(ui)

  console.log "init done"
  document.getElementById('canvas').focus()

$(document).ready init
