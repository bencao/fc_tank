class BattleField
  max_x: 520
  max_y: 520
  max_enegy: 100
  default_width: 40
  default_height: 40
  step: 2
  tanks: []
  terrains: []
  missiles: []
  item_counts: 0
  all_battle_field_objects: -> @tanks.concat(@terrains).concat(@missiles)
  remove_battle_field_object: (object) ->
    if object instanceof Tank
      @tanks = _.without(@tanks, object)
    if object instanceof Terrain
      @terrains = _.without(@terrains, object)
    if object instanceof Missile
      @missiles = _.without(@missiles, object)
  order_generators: {}
  add_order_generator: (type, generator_function) ->
    @order_generators[type] = generator_function
  missiles_of: (tank) ->
    _.select(@missiles, (missile) -> missile.belongs_to is tank )
  add_missile: (parent, direction, power) ->
    [start_x, start_y] = [parent.x() - @default_width / 4, parent.y() - @default_height / 4]
    missile = new Missile(this, start_x, start_y, @default_width / 2, @default_height / 2)
    missile.set_power(power)
    missile.set_direction(direction)
    missile.set_belongs_to(parent)
    missile.set_order_generator(@order_generators['missile'](this, direction))
    @missiles.push(missile.set_id(++ @item_counts))
  add_tank: (tank_cls, start_x, start_y, width = @default_height, height = @default_width) ->
    tank = new tank_cls(this, start_x, start_y, width, height)
    switch tank.type()
      when "user_p1", "user_p2"
        tank.set_order_generator(@order_generators[tank.type()](this))
      else
        tank.set_order_generator(@order_generators['enemy'](this))
    @tanks.push(tank.set_id(++ @item_counts))
  add_terrain: (terrain_cls, start_x, start_y, width = @default_height, height = @default_width) ->
    terrain = new terrain_cls(this, start_x, start_y, width, height)
    @terrains.push(terrain.set_id(++ @item_counts))
  batch_add_terrain_by_range: (terrain_cls, array_of_xys) ->
    for xys in array_of_xys
      @add_terrain_by_range(terrain_cls, xys[0], xys[1], xys[2], xys[3])
  add_terrain_by_range: (terrain_cls, x1, y1, x2, y2) ->
    xs = x1
    while xs < x2
      ys = y1
      while ys < y2
        @add_terrain(terrain_cls, xs, ys, _.min([x2 - xs, @default_height]), _.min([y2 - ys, @default_width]))
        ys += @default_width
      xs += @default_height
  p1_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p1"))
  p2_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p2"))
  find_objects_at: (xys) ->
    [x1, y1, x2, y2] = xys
    objects = []
    for object in @all_battle_field_objects()
      objects.push(object) if object.space_collide(x1, y1)
    objects
  is_out_of_bound: (xys) ->
    [x1, y1, x2, y2] = xys
    x1 < 0 or x2 > @max_x or y1 < 0 or y2 > @max_y

class BattleFieldObject
  constructor: (@battle_field, @start_x, @start_y, @width, @height) ->
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
  enterable: (other_battle_field_object) -> true
  space_available: (x1, y1, x2, y2) ->
    _.all(@battle_field.all_battle_field_objects(), (battle_field_object) =>
      (battle_field_object is this) or battle_field_object.enterable(this) or
        not battle_field_object.space_collide(x1, y1, x2, y2)
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
  space_collide: (x1, y1, x2, y2) ->
    [x3, y3, x4, y4] = @space()
    return false if (x4 <= x1 or y4 <= y1 or x3 >= x2 or y3 >= y2)
    @_insect(x1, y1, x2, y2, x3, y3, x4, y4)
  joint: (x1, y1, x2, y2) ->
    [x3, y3, x4, y4] = @space()
    [_.max(x1, x3), _.max(y1, y3), _.min(x2, x4), _.min(y2, y4)]
  space_sub: (x1, y1, x2, y2) ->
    [x3, y3, x4, y4] = @space()
    [x5, y5, x6, y6] = @joint(x1, y1, x2, y2)
    candidates = [
      [x3, y3, x4, y5],
      [x3, y6, x4, y4],
      [x3, y5, x5, y6],
      [x6, y5, x4, y6]
    ]
    _.reject(candidates, (sub_space) ->
      [x1, y1, x2, y2] = sub_space
      x1 == x2 or y1 == y2
    )
  set_display_object: (@display_object) ->
  update: () ->
  integration: (delta_time) ->
  handle_destroy: () ->
    @battle_field.remove_battle_field_object(this)
  on_hit_missile: (missile, destroy_area) -> 0

class MovableBattleFieldObject extends BattleFieldObject
  x: () ->
    @start_x + @width / 2
  y: () ->
    @start_y + @height / 2
  origin_x: 'center'
  origin_y: 'center'
  space: () ->
    [@start_x, @start_y, @start_x + @width, @start_y + @height]

  orders: []
  set_order_generator: (@order_generator) ->

  moving: false
  step_offset: () ->
    _.min([@width / 8, @height / 8])
  speed: () -> 0.08
  move: (offset) ->
    _.detect(_.range(1, offset).reverse(), (os) => @try_move(os))
  try_move: (offset) ->
    [offset_x, offset_y] = @offset_by_direction(offset)
    target_x = @start_x + offset_x
    target_y = @start_y + offset_y
    if @space_available(target_x, target_y, target_x + @width, target_y + @height)
      [@start_x, @start_y] = [target_x, target_y]
      true
    else
      false
  offset_by_direction: (offset) ->
    offset = parseInt(offset)
    switch (@direction)
      when 0
        [offset_x, offset_y] = [0, - _.min([offset, @start_y])]
      when 90
        [offset_x, offset_y] = [_.min([offset, @battle_field.max_x - @width - @start_x]), 0]
      when 180
        [offset_x, offset_y] = [0, _.min([offset, @battle_field.max_y - @height - @start_y])]
      when 270
        [offset_x, offset_y] = [- _.min([offset, @start_x]), 0]
    [offset_x, offset_y]

  direction: 0
  turn: (direction) ->
    @direction = direction
    if (direction % 180 is 0) then @_adjust_x() else @_adjust_y()
  _adjust_x: () ->
    offset = (@battle_field.default_height / 4) - (@start_x + @battle_field.default_height / 4) % (@battle_field.default_height / 2)
    @start_x += offset
  _adjust_y: () ->
    offset = (@battle_field.default_width / 4) - (@start_y + @battle_field.default_width / 4) % (@battle_field.default_width / 2)
    @start_y += offset

  integration: (delta_time) ->
    super(delta_time)
    @handle_turn(order) for order in @orders
    @handle_move(order, delta_time) for order in @orders
  update: () ->
    # next round orders
    @orders = @order_generator.next_orders()
  handle_turn: (order) ->
    switch(order.type)
      when "direction"
        @turn(order.params.direction)
  handle_move: (order, delta_time) ->
    switch(order.type)
      when "start_move"
        # try move max distance
        @moving = true
        @move(@speed() * delta_time)
      when "stop_move"
        # do not move by default
        @moving = false

class UI
  constructor: (@battle_field) ->
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
      home: new HomeFrames,
      missile: new MissileFrames
    }

    @canvas = oCanvas.create({canvas: "#canvas", background: "#000", fps: 30})

    battle_field = @battle_field
    @canvas.bind "keyup", (event) ->
      battle_field.p1_tank().order_generator.on_keyboard_input("keyup", event.which)
    @canvas.bind "keydown", (event) ->
      battle_field.p1_tank().order_generator.on_keyboard_input("keydown", event.which)

    @canvas.setLoop () =>
      delta_time = 30
      _.each(battle_field.all_battle_field_objects(), (object) -> object.integration(delta_time))
      _.each(battle_field.all_battle_field_objects(), (object) => @render(object))
      _.each(battle_field.all_battle_field_objects(), (object) -> object.update())
    @canvas.timeline.start()
  do_battle_field_object_map: {}
  render: (battle_field_object) ->
    display_object = @do_battle_field_object_map[battle_field_object.id]
    if _.isUndefined(display_object)
      display_object = @create_do_and_add(battle_field_object)
    display_object.rotateTo(battle_field_object.direction)
    display_object.moveTo(battle_field_object.x(), battle_field_object.y())
    frame_render = @frame_map[battle_field_object.type()]
    display_object.frames = frame_render.frames_for(battle_field_object)
  on_destroyed: (battle_field_object) ->
    @do_battle_field_object_map[battle_field_object.id].remove()
    @do_battle_field_object_map[battle_field_object.id] = null
  create_do_and_add: (battle_field_object) ->
    display_object = @create_do(battle_field_object)
    @do_battle_field_object_map[battle_field_object.id] = display_object
    @canvas.addChild(display_object)
    # @reset_zindex()
    display_object
  reset_zindex: ->
    for battle_field_object in @battle_field.all_battle_field_objects()
      display_object = @do_battle_field_object_map[battle_field_object.id]
      display_object.zIndex = battle_field_object.layer
  create_do: (battle_field_object) ->
    frame = @frame_map[battle_field_object.type()]
    @canvas.display.sprite({
      frames: frame.frames_for(battle_field_object),
      image: @image,
      width: battle_field_object.width,
      height: battle_field_object.height,
      x: battle_field_object.x(),
      y: battle_field_object.y(),
      origin: { x: battle_field_object.origin_x, y: battle_field_object.origin_y }
    })

class BrickFrames
  frames_for: (brick) -> [{x: 0, y: 240}]

class IceFrames
  frames_for: (ice) -> [{x: 40, y: 240}]

class IronFrames
  frames_for: (iron) -> [{x: 80, y: 240}]

class GrassFrames
  frames_for: (grass) -> [{x: 120, y: 240}]

class WaterFrames
  frames_for: (water) -> [{x: 160, y: 240}]

class HomeFrames
  frames_for: (home) ->
    if home.is_defeated then [{x: 240, y: 240}] else [{x: 200, y: 240}]

class MissileFrames
  frames_for: (missile) -> [{x: 250, y: 330}]

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

class Terrain extends BattleFieldObject
  enterable: (battle_field_object) -> false

class BrickTerrain extends Terrain
  type: -> "brick"
  on_hit_missile: (missile, destroy_area) ->
    console.log "on hit missile"
    # cut self into pieces
    [dx1, dy1, dx2, dy2] = destroy_area
    console.log "on hit missile, da=" + dx1 + "," + dy1 + "/" + dx2 + "," + dy2
    pieces = @space_sub(dx1, dy1, dx2, dy2)
    _.each(pieces, (piece) =>
      [px1, py1, px2, py2] = piece
      @battle_field.add_terrain(BrickTerrain, px1, py1, px2 - px1, py2 - py1)
    )
    @battle_field.remove_battle_field_object(this)
    # return cost of destroy
    10

class IronTerrain extends Terrain
  type: -> "iron"

class WaterTerrain extends Terrain
  enterable: (battle_field_object) ->
    if battle_field_object instanceof Tank
      battle_field_object.on_ship
    else
      battle_field_object instanceof Missile
  type: -> "water"
  layer: 0

class IceTerrain extends Terrain
  enterable: (battle_field_object) -> true
  type: -> "ice"
  layer: 0

class GrassTerrain extends Terrain
  enterable: (battle_field_object) -> true
  type: -> "grass"
  layer: 2

class HomeTerrain extends Terrain
  is_defeated: false
  type: -> "home"

class Tank extends MovableBattleFieldObject
  enterable: (battle_field_object) ->
    (battle_field_object instanceof Missile) and battle_field_object.belongs_to is this
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

  step: -> (@battle_field.step * @speed)

  ship: false
  set_on_ship: (@ship) ->

  guard: false
  set_on_guard: (@guard) ->

  max_missile: 5
  fire: () ->
    @battle_field.add_missile(this, @direction, @power)
  handle_fire: (order) ->
    switch(order.type)
      when "fire"
        @fire() if _.size(@battle_field.missiles_of(this)) < @max_missile

  integration: (delta_time) ->
    super(delta_time)
    @handle_fire(order) for order in @orders

class UserTank extends Tank
  speed: () -> super() * 2

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
  speed: () -> super() * 3
  type: -> 'fish'

class StrongTank extends EnemyTank
  type: -> 'strong'

class Missile extends MovableBattleFieldObject
  power: 1
  energy: 10
  speed: -> super() * 4
  set_power: (@power) ->
    @energy = 10 * @power
  set_direction: (@direction) ->
  set_belongs_to: (@belongs_to) ->
  type: -> 'missile'
  update: ->
    super()
    # if collide with other object, then explode
    destroy_area = @destroy_area()
    # START HERE
    return @explode() if @battle_field.is_out_of_bound(destroy_area)

    objects = @battle_field.find_objects_at(destroy_area)
    _.each(objects, (object) =>
      @energy -= object.on_hit_missile(this, destroy_area)
    )
    @explode() if @energy <= 0

  exploded: false
  explode: ->
    # bom!
    @exploded = true

  destroy_area: ->
    switch @direction
      when 0
        [
          @x() - @battle_field.default_width / 4,
          @y() - (@battle_field.default_height / 4) - 10,
          @x() + @battle_field.default_width / 4,
          @y() - @battle_field.default_height / 4
        ]
      when 90
        [
          @x() + @battle_field.default_width / 4,
          @y() - @battle_field.default_height / 4,
          @x() + (@battle_field.default_width / 4) + 10,
          @y() + @battle_field.default_height / 4
        ]
      when 180
        [
          @x() - @battle_field.default_width / 4,
          @y() + @battle_field.default_height / 4,
          @x() + @battle_field.default_width / 4,
          @y() + (@battle_field.default_height / 4) + 10
        ]
      when 270
        [
          @x() - (@battle_field.default_width / 4) - 10,
          @y() - @battle_field.default_height / 4,
          @x() - @battle_field.default_width / 4,
          @y() + @battle_field.default_height / 4
        ]

class Gift extends BattleFieldObject
  test: ->

class OrderGenerator
  constructor: (@battle_field, @direction) ->
  direction: 0
  direction_map: {
    up: 0,
    down: 180,
    left: 270,
    right: 90
  }
  next_orders: -> []
  direction_order: (direction) ->
    {
      type: "direction",
      params: { direction: direction }
    }
  start_move_order: -> { type: "start_move" }
  stop_move_order: -> { type: "stop_move" }
  fire_order: -> { type: "fire" }

class UserOrderGenerator extends OrderGenerator
  constructor: (@battle_field, @direction, key_setting) ->
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
  on_keyboard_input: (type, key_code) ->
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
  orders: []
  next_orders: ->
    @orders = []
    for action, key_actions of @inputs
      continue if _.size(key_actions) == 0
      switch (action)
        when "up", "down", "left", "right"
          break if @change_direction(action)
          @do_move(action)
        when "fire"
          @orders.push(@fire_order())
    for action in ["up", "down", "left", "right"]
      if @is_pressed(action)
        @change_direction(action)
        @orders.push(@start_move_order())
    @clear_inputs()
    @orders
  change_direction: (action) ->
    new_direction = @direction_map[action]
    if @direction != new_direction
      @direction = new_direction
      @orders.push(@direction_order(new_direction))
      true
    else
      false
  do_move: (action) ->
    keyup = _.contains(@inputs[action], "keyup")
    keydown = _.contains(@inputs[action], "keydown")
    if keydown
      @orders.push(@start_move_order())
    else
      @orders.push(@stop_move_order()) if keyup

class EnemyAIOrderGenerator extends OrderGenerator
  next_orders: -> []

class MissileOrderGenerator extends OrderGenerator
  next_orders: -> [@start_move_order()]

class GeneratorFactory
  create_user_p1_generator: (battle_field) ->
    new UserOrderGenerator(battle_field, 0, {
      up: 38, down: 40, left: 37, right: 39, fire: 70
    })
  create_user_p2_generator: (battle_field) ->
    new UserOrderGenerator(battle_field, 0, {
      up: 71, down: 72, left: 73, right: 74, fire: 75
    })
  create_enemy_generator: (battle_field) ->
    new EnemyAIOrderGenerator(battle_field, 180)
  create_missile_generator: (battle_field, direction) ->
    new MissileOrderGenerator(battle_field, direction)

init = ->
  console.log "init start"

  generator_factory = new GeneratorFactory
  battle_field = new BattleField
  battle_field.add_order_generator("user_p1", generator_factory.create_user_p1_generator)
  battle_field.add_order_generator("user_p2", generator_factory.create_user_p2_generator)
  battle_field.add_order_generator("enemy", generator_factory.create_enemy_generator)
  battle_field.add_order_generator("missile", generator_factory.create_missile_generator)

  battle_field.add_tank(UserP1Tank, 160, 480)
  battle_field.add_tank(UserP2Tank, 320, 480)

  battle_field.batch_add_terrain_by_range(IceTerrain, [
    [40, 0, 240, 40],
    [280, 0, 480, 40],
    [0, 40, 80, 280],
    [440, 40, 520, 280],
    [80, 240, 440, 280]
  ])
  battle_field.batch_add_terrain_by_range(BrickTerrain, [
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
  battle_field.batch_add_terrain_by_range(IronTerrain, [
    [0, 280, 40, 320],
    [240, 280, 280, 320],
    [480, 280, 520, 320],
    [80, 360, 120, 400],
    [160, 360, 200, 400],
    [320, 360, 360, 400],
    [400, 360, 440, 400]
  ])
  battle_field.batch_add_terrain_by_range(GrassTerrain, [
    [0, 320, 40, 520],
    [40, 480, 120, 520],
    [400, 480, 480, 520],
    [480, 320, 520, 480]
  ])
  battle_field.add_terrain(HomeTerrain, 240, 480)

  document.battle_field = battle_field

  ui = new UI(battle_field)
  # ui.reset_zindex()

  console.log "init done"
  document.getElementById('canvas').focus()

$(document).ready init
