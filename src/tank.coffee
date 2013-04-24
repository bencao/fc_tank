class Direction
  @UP: 0
  @DOWN: 180
  @LEFT: 270
  @RIGHT: 90
  @all: () -> [@UP, @DOWN, @LEFT, @RIGHT]

class Point
  constructor: (@x, @y) ->

class MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
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
  multiply: (direction, factor) ->
    switch direction
      when Direction.UP
        new MapArea2D(@x1, @y1 - factor * @height(), @x2, @y2)
      when Direction.RIGHT
        new MapArea2D(@x1, @y1, @x2 + factor * @width(), @y2)
      when Direction.DOWN
        new MapArea2D(@x1, @y1, @x2, @y2 + factor * @height())
      when Direction.LEFT
        new MapArea2D(@x1 - factor * @width(), @y1, @x2, @y2)
  equals: (area) ->
    return false unless area instanceof MapArea2D
    area.x1 == @x1 and area.x2 == @x2 and area.y1 == @y1 and area.y2 == @y2
  valid: () -> @x2 > @x1 and @y2 > @y1
  center: () -> new Point((@x1 + @x2)/2, (@y1 + @y2)/2)
  clone: () -> new MapArea2D(@x1, @y1, @x2, @y2)
  width: () -> @x2 - @x1
  height: () -> @y2 - @y1
  to_s: () -> "[" + @x1 + ", " + @y1 + ", " + @x2 + ", " + @y2 + "]"

class MapArea2DVertex extends MapArea2D
  constructor: (@x1, @y1, @x2, @y2) -> @siblings = []
  init_vxy: (@vx, @vy) ->
  add_sibling: (sibling) -> @siblings.push(sibling)

class Map2D
  max_x: 520
  max_y: 520
  default_width: 40
  default_height: 40
  infinity: 65535

  map_units: [] # has_many map_units
  terrains: [] # has_many terrains
  tanks: [] # has_many tanks
  missiles: [] # has_many missiles
  gifts: [] # has_many gifts

  constructor: (@canvas) ->
    @groups = {
      gift: new Kinetic.Group(),
      front: new Kinetic.Group(),
      middle: new Kinetic.Group(),
      back: new Kinetic.Group()
    }
    @canvas.add(@groups['back'])
    @canvas.add(@groups['middle'])
    @canvas.add(@groups['front'])
    @canvas.add(@groups['gift'])

    @image = document.getElementById("tank_sprite")

    @vertexes_columns = 4 * @max_x / @default_width - 3
    @vertexes_rows = 4 * @max_y / @default_height - 3
    @vertexes = @init_vertexes()
    @home_vertex = @vertexes[24][48]

  add_terrain: (terrain_cls, area) ->
    terrain = new terrain_cls(this, area)
    @terrains.push(terrain)
    @map_units.push(terrain)
    terrain

  add_tank: (tank_cls, area) ->
    tank = new tank_cls(this, area)
    @tanks.push(tank)
    @map_units.push(tank)
    tank

  add_missile: (parent) ->
    missile = new Missile(this, parent)
    @missiles.push(missile)
    @map_units.push(missile)
    missile

  random_gift: () ->
    _.each(@gifts, (gift) -> gift.destroy())

    gift_classes = [GunGift, HatGift, ShipGift, StarGift,
      LifeGift, ClockGift, ShovelGift, LandMineGift]
    vx = parseInt(Math.random() * @vertexes_rows)
    vy = parseInt(Math.random() * @vertexes_columns)
    gift_choice = parseInt(Math.random() * 1000) % _.size(gift_classes)
    gift = new gift_classes[gift_choice](this, @vertexes[vx][vy].clone())
    @gifts.push(gift)
    @map_units.push(gift)
    gift

  delete_map_unit: (map_unit) ->
    if map_unit instanceof Terrain
      @terrains = _.without(@terrains, map_unit)
    else if map_unit instanceof Missile
      @missiles = _.without(@missiles, map_unit)
    else if map_unit instanceof Tank
      @tanks = _.without(@tanks, map_unit)
    else if map_unit instanceof Gift
      @gifts = _.without(@gifts, map_unit)
    @map_units = _.without(@map_units, map_unit)

  p1_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p1"))
  p2_tank: -> _.first(_.select(@tanks, (tank) -> tank.type() == "user_p2"))
  home: -> _.first(_.select(@terrains, (terrain) -> terrain.type() == "home"))
  user_tanks: -> _.select(@tanks, (tank) -> tank instanceof UserTank)
  enemy_tanks: -> _.select(@tanks, (tank) -> tank instanceof EnemyTank)

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

  # area must be the same with a map vertexe
  vertexes_at: (area) ->
    vx = parseInt(area.x1 * 4 / @default_width)
    vy = parseInt(area.y1 * 4 / @default_height)
    @vertexes[vx][vy]

  weight: (tank, from, to) ->
    sub_area = _.first(to.sub(from))
    terrain_units = _.select(@units_at(sub_area), (unit) ->
      unit instanceof Terrain
    )
    return 1 if _.isEmpty(terrain_units)
    max_weight = _.max(_.map(terrain_units, (terrain_unit) ->
      terrain_unit.weight(tank)
    ))
    max_weight / (@default_width * @default_height) *
      sub_area.width() * sub_area.height()

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
    @calculate_shortest_path_from_pi(pi, d, start_vertex, end_vertex)

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
    # a area like [30, 50, 70, 90] is not movable, so do not relax here
    return if v.vx % 2 == 1 and u.vx % 2 == 1
    return if v.vy % 2 == 1 and u.vy % 2 == 1
    if d[v.vx][v.vy] > d[u.vx][u.vy] + w
      d[v.vx][v.vy] = d[u.vx][u.vy] + w
      pi[v.vx][v.vy] = u

  extract_min: (vertexes, d) ->
    _.min(vertexes, (vertex) =>
      d[vertex.vx][vertex.vy] +
        (Math.pow(vertex.vx - 24, 2) + Math.pow(vertex.vy - 48, 2))
    )

  calculate_shortest_path_from_pi: (pi, d, start_vertex, end_vertex) ->
    reverse_paths = []
    v = end_vertex
    until pi[v.vx][v.vy] is null
      reverse_paths.push(v)
      v = pi[v.vx][v.vy]
    reverse_paths.push(start_vertex)
    reverse_paths.reverse()

class MapUnit2D
  group: 'middle'

  max_depend_point: 9
  type: null

  constructor: (@map, @area) ->
    @default_width = @map.default_width
    @default_height = @map.default_height
    @bom_on_destroy = false
    @new_display()

  new_display: () ->
    @display_object = new Kinetic.Sprite({
      x: @area.x1,
      y: @area.y1,
      image: @map.image,
      animation: @current_animation(),
      animations: @animations(),
      frameRate: @current_frame_rate(),
      index: 0
    })
    @map.groups[@group].add(@display_object)
    @display_object.start()

  animations: () -> {
    bom: [
      {x: 360, y: 340, width: 40, height: 40},
      {x: 120, y: 340, width: 40, height: 40},
      {x: 160, y: 340, width: 40, height: 40},
      {x: 200, y: 340, width: 40, height: 40}
    ]
  }
  current_frame_rate: () -> 1
  current_animation: () -> null
  destroy_display: () ->
    if @bom_on_destroy
      @display_object.setOffset(20, 20)
      @display_object.setAnimation('bom')
      @display_object.start()
      @display_object.afterFrame 3, () =>
        @display_object.stop()
        @display_object.destroy()
    else
      @display_object.stop()
      @display_object.destroy()

  width: () -> @area.x2 - @area.x1
  height: () -> @area.y2 - @area.y1

  destroy: () ->
    @destroy_display()
    @map.delete_map_unit(this)

  defend: (missile, destroy_area) -> 0
  accept: (map_unit) -> true

class MovableMapUnit2D extends MapUnit2D
  speed: 0.08

  constructor: (@map, @area) ->
    @delayed_commands = []
    @moving = false
    @direction = 0
    @commander = new Commander(this)
    super(@map, @area)

  current_frame_rate: () -> 6

  new_display: () ->
    center = @area.center()
    @display_object = new Kinetic.Sprite({
      x: center.x,
      y: center.y,
      image: @map.image,
      animation: @current_animation(),
      animations: @animations(),
      frameRate: @current_frame_rate(),
      index: 0,
      offset: {
        x: @area.width()/2,
        y: @area.height()/2
      },
      rotationDeg: @direction
    })
    @map.groups[@group].add(@display_object)
    @display_object.start()

  update_display: () ->
    @display_object.setAnimation(@current_animation())
    @display_object.setRotationDeg(@direction)
    center = @area.center()
    @display_object.setAbsolutePosition(center.x, center.y)

  queued_delayed_commands: () ->
    [commands, @delayed_commands] = [@delayed_commands, []]
    commands
  add_delayed_command: (command) -> @delayed_commands.push(command)

  integration: (delta_time) ->
    @commands = _.union(@commander.next_commands(), @queued_delayed_commands())
    @handle_turn(cmd) for cmd in @commands
    @handle_move(cmd, delta_time) for cmd in @commands

  handle_turn: (command) ->
    switch(command.type)
      when "direction"
        @turn(command.params.direction)

  handle_move: (command, delta_time) ->
    switch(command.type)
      when "start_move"
        @moving = true
        max_offset = parseInt(@speed * delta_time)
        intent_offset = command.params.offset
        if intent_offset is null
          @move(max_offset)
        else if intent_offset > 0
          real_offset = _.min([intent_offset, max_offset])
          if @move(real_offset)
            command.params.offset -= real_offset
            @add_delayed_command(command) if command.params.offset > 0
          else
            @add_delayed_command(command)
      when "stop_move"
        # do not move by default
        @moving = false

  turn: (direction) ->
    if _.contains([Direction.UP, Direction.DOWN], direction)
      @direction = direction if @_adjust_x()
    else
      @direction = direction if @_adjust_y()
    @update_display()

  _try_adjust: (area) ->
    if @map.area_available(this, area)
      @area = area
      true
    else
      false

  _adjust_x: () ->
    offset = (@default_height/4) -
      (@area.x1 + @default_height/4)%(@default_height/2)
    @_try_adjust(new MapArea2D(@area.x1 + offset, @area.y1,
      @area.x2 + offset, @area.y2))

  _adjust_y: () ->
    offset = (@default_width/4) -
      (@area.y1 + @default_width/4)%(@default_width/2)
    @_try_adjust(new MapArea2D(@area.x1, @area.y1 + offset,
      @area.x2, @area.y2 + offset))

  move: (offset) ->
    _.detect(_.range(1, offset + 1).reverse(), (os) => @_try_move(os))

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    return false if offset_x == 0 and offset_y == 0
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y,
      target_x + @width(), target_y + @height())
    if @map.area_available(this, target_area)
      @area = target_area
      @update_display()
      true
    else
      false

  _offset_by_direction: (offset) ->
    offset = parseInt(offset)
    switch (@direction)
      when Direction.UP
        [0, - _.min([offset, @area.y1])]
      when Direction.RIGHT
        [_.min([offset, @map.max_x - @area.x2]), 0]
      when Direction.DOWN
        [0, _.min([offset, @map.max_y - @area.y2])]
      when Direction.LEFT
        [- _.min([offset, @area.x1]), 0]

class Terrain extends MapUnit2D
  accept: (map_unit) -> false
  animations: () ->
    _.merge(super(), {
      static: [
        {
          x: @image_x_offset() + @area.x1 % 40,
          y: 240 + @area.y1 % 40,
          width: @area.width(),
          height: @area.height()
        }
      ]
    })
  current_animation: () -> 'static'
  image_x_offset: -> 0

class BrickTerrain extends Terrain
  type: -> "brick"
  weight: (tank) ->
    40 / tank.power
  defend: (missile, destroy_area) ->
    # cut self into pieces
    pieces = @area.sub(destroy_area)
    _.each(pieces, (piece) =>
      @map.add_terrain(BrickTerrain, piece)
    )
    @destroy()
    # return cost of destroy
    1
  image_x_offset: -> 0

class IronTerrain extends Terrain
  type: -> "iron"
  weight: (tank) ->
    switch tank.power
      when 1
        @map.infinity
      when 2
        20
  defend: (missile, destroy_area) ->
    return @max_depend_point if missile.power < 2
    double_destroy_area = destroy_area.multiply(missile.direction, 1)
    pieces = @area.sub(double_destroy_area)
    _.each(pieces, (piece) =>
      @map.add_terrain(IronTerrain, piece)
    )
    @destroy()
    2
  image_x_offset: -> 120

class WaterTerrain extends Terrain
  accept: (map_unit) ->
    if map_unit instanceof Tank
      map_unit.on_ship
    else
      map_unit instanceof Missile
  type: -> "water"
  group: "back"
  weight: (tank) ->
    switch tank.ship
      when true
        4
      when false
        @map.infinity
  image_x_offset: -> 240

class IceTerrain extends Terrain
  accept: (map_unit) -> true
  type: -> "ice"
  group: "back"
  weight: (tank) -> 4
  image_x_offset: -> 60

class GrassTerrain extends Terrain
  accept: (map_unit) -> true
  type: -> "grass"
  group: "front"
  weight: (tank) -> 4
  image_x_offset: -> 180

class HomeTerrain extends Terrain
  is_defeated: false
  type: -> "home"
  accept: (map_unit) ->
    return true if @is_defeated and map_unit instanceof Missile
    false
  weight: (tank) -> 0
  current_animation: () ->
    if @is_defeated then 'defeated' else 'origin'
  animations: () ->
    {
      origin: [{x: 320, y: 240, width: 40, height: 40}],
      defeated: [{x: 360, y: 240, width: 40, height: 40}]
    }
  defend: (missile, destroy_area) ->
    @is_defeated = true
    @display_object.setAnimation(@current_animation())
    @max_depend_point

  defend_terrains: () ->
    home_defend_area = new MapArea2D(220, 460, 300, 520)
    home_area = @map.home.area
    _.reject(@map.units_at(home_defend_area), (unit) ->
      unit instanceof HomeTerrain or unit instanceof Tank
    )

  delete_defend_terrains: () ->
    _.each(@defend_terrains(), (terrain) -> terrain.destroy())

  add_defend_terrains: (terrain_cls) ->
    for area in [
      new MapArea2D(220, 460, 260, 480),
      new MapArea2D(260, 460, 300, 480),
      new MapArea2D(220, 480, 240, 520),
      new MapArea2D(280, 480, 300, 520)
    ]
      @map.add_terrain(terrain_cls, area) if _.size(@map.units_at(area)) is 0

  setup_defend_terrains: () ->
    @delete_defend_terrains()
    @add_defend_terrains(IronTerrain)

  restore_defend_terrains: () ->
    @delete_defend_terrains()
    @add_defend_terrains(BrickTerrain)

class Tank extends MovableMapUnit2D
  constructor: (@map, @area) ->
    @hp = 1
    @power = 1
    @level = 1
    @max_missile = 1
    @max_hp = 2
    @missiles = []
    @ship = false
    @guard = false
    @initializing = true
    @cooling = false
    @frozen = false
    super(@map, @area)
    @bom_on_destroy = true

  accept: (map_unit) ->
    (map_unit instanceof Missile) and (map_unit.parent is this)

  dead: () -> @hp <= 0

  level_up: (levels) ->
    @level = _.min([@level + levels, 3])
    @_level_adjust()

  _level_adjust: () ->
    switch @level
      when 1
        @power = 1
        @max_missile = 1
      when 2
        @power = 1
        @hp = _.max([@hp + 1, @max_hp])
        @max_missile = 2
      when 3
        @power = 2
        @hp = _.max([@hp + 1, @max_hp])
        @max_missile = 2
    @update_display()

  hp_up: (lives) ->
    hp_down(-lives)

  hp_down: (lives) ->
    @hp -= lives
    if @dead()
      @destroy()
    else
      @level = _.max([1, @level - 1])
      @_level_adjust()

  on_ship: (@ship) -> @update_display()

  fire: () ->
    if @can_fire()
      @missiles.push(@map.add_missile(this))
      if _.size(@missiles) == @max_missile
        @cooling = true
        setTimeout((() => @cooling = false), 200)

  can_fire: () ->
    (not @cooling) and _.size(@missiles) < @max_missile

  freeze: () ->
    @frozen = true
    @update_display()
    setTimeout(() =>
      @frozen = false
      @update_display()
    , 6000)

  handle_move: (cmd, delta_time) -> super(cmd, delta_time) unless @frozen

  handle_turn: (cmd) -> super(cmd) unless @frozen

  handle_fire: (cmd) ->
    switch cmd.type
      when "fire"
        @fire()

  integration: (delta_time) ->
    return if @initializing
    super(delta_time)
    @handle_fire(cmd) for cmd in @commands

  delete_missile: (missile) -> @missiles = _.without(@missiles, missile)

  new_display: () ->
    super()
    @display_object.setAnimation('tank_born')
    @display_object.afterFrame 4, () =>
      @display_object.setAnimation(@current_animation())
      @initializing = false

  animations: () ->
    _.merge(super(), {
      tank_born: [
        {x: 360, y: 340, width: 40, height: 40},
        {x: 0, y: 340, width: 40, height: 40},
        {x: 40, y: 340, width: 40, height: 40},
        {x: 0, y: 340, width: 40, height: 40},
        {x: 80, y: 340, width: 40, height: 40}
      ]
    })

class UserTank extends Tank
  constructor: (@map, @area) ->
    super(@map, @area)
    @guard = false
  on_guard: (@guard) ->
    setTimeout((() => @on_guard(false)), 10000) if @guard
    @update_display()
  speed: 0.13
  defend: (missile, destroy_area) ->
    if missile.parent instanceof UserTank
      @freeze() unless missile.parent is this
      return @max_depend_point - 1
    return @max_depend_point - 1 if @guard
    if @ship
      @on_ship(false)
      return @max_depend_point - 1
    defend_point = _.min(@hp, missile.power)
    @hp_down(missile.power)
    defend_point
  current_animation: () ->
    if @guard
      "lv" + @level + "_with_guard"
    else if @frozen
      "lv" + @level + "_frozen"
    else if @ship
      "lv" + @level + "_with_ship"
    else
      "lv" + @level
  animations: () ->
    _.merge(super(), {
      lv1: [
        {x: 0, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv1_frozen: [
        {x: 0, y: @image_y_offset(), width: 40, height: 40},
        {x: 360, y: 320, width: 40, height: 40}
      ],
      lv1_with_ship: [
        {x: 40, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv1_with_guard: [
        {x: 0, y: @image_y_offset(), width: 40, height: 40},
        {x: 80, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv2: [
        {x: 120, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv2_frozen: [
        {x: 120, y: @image_y_offset(), width: 40, height: 40},
        {x: 360, y: 320, width: 40, height: 40}
      ],
      lv2_with_ship: [
        {x: 160, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv2_with_guard: [
        {x: 120, y: @image_y_offset(), width: 40, height: 40},
        {x: 200, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv3: [
        {x: 240, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv3_frozen: [
        {x: 240, y: @image_y_offset(), width: 40, height: 40},
        {x: 360, y: 320, width: 40, height: 40}
      ],
      lv3_with_ship: [
        {x: 280, y: @image_y_offset(), width: 40, height: 40}
      ],
      lv3_with_guard: [
        {x: 240, y: @image_y_offset(), width: 40, height: 40},
        {x: 320, y: @image_y_offset(), width: 40, height: 40}
      ]
    })
  image_y_offset: -> 0

class UserP1Tank extends UserTank
  constructor: (@map, @area) ->
    super(@map, @area)
    @commander = new UserCommander(this, {
      up: 38, down: 40, left: 37, right: 39, fire: 70
    })
  type: -> 'user_p1'
  image_y_offset: -> 0

class UserP2Tank extends UserTank
  constructor: (@map, @area) ->
    super(@map, @area)
    @commander = new UserCommander(this, {
      up: 73, down: 75, left: 74, right: 76, fire: 72
    })
  type: -> 'user_p2'
  image_y_offset: -> 40

class EnemyTank extends Tank
  constructor: (@map, @area) ->
    super(@map, @area)
    @max_hp = 10
    @hp = 1 + parseInt(Math.random() * (@max_hp - 1))
    @gift_counts = parseInt(Math.random() * @max_hp / 2)
    @direction = 180
    @commander = new EnemyAICommander(this)
  hp_down: (lives) ->
    @map.random_gift() if @gift_counts > 0
    @gift_counts -= lives
    super(lives)
  defend: (missile, destroy_area) ->
    return @max_depend_point - 1 if missile.parent instanceof EnemyTank
    if @ship
      @on_ship(false)
      return @max_depend_point - 1
    defend_point = _.min(@hp, missile.power)
    @hp_down(missile.power)
    defend_point
  animations: () ->
    _.merge(super(), {
      lv3: [
        {x: 360, y: 0, width: 40, height: 40}
      ],
      lv3_with_ship: [
        {x: 360, y: 40, width: 40, height: 40}
      ]
    })
  current_animation: () ->
    prefix = if @level == 3
      'lv3'
    else if @gift_counts > 0
      'with_gift'
    else
      'hp' + _.min([@hp, 4])
    prefix + (if @ship then "_with_ship" else "")
  animations: () ->
    _.merge(super(), {
      hp1: [
        {x: 0, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp1_with_ship: [
        {x: 40, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp2: [
        {x: 80, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp2_with_ship: [
        {x: 120, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp3: [
        {x: 160, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp3_with_ship: [
        {x: 200, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp4: [
        {x: 240, y: @image_y_offset(), width: 40, height: 40}
      ],
      hp4_with_ship: [
        {x: 280, y: @image_y_offset(), width: 40, height: 40}
      ],
      with_gift: [
        {x: 320, y: @image_y_offset(), width: 40, height: 40},
        {x: 0, y: @image_y_offset(), width: 40, height: 40}
      ],
      with_gift_with_ship: [
        {x: 360, y: @image_y_offset(), width: 40, height: 40},
        {x: 40, y: @image_y_offset(), width: 40, height: 40}
      ]
    })
  image_y_offset: -> 80
  gift_up: (gifts) -> @gift_counts += gifts
  handle_fire: (cmd) -> super(cmd) unless @frozen

class StupidTank extends EnemyTank
  speed: 0.07
  type: -> 'stupid'
  image_y_offset: -> 80

class FoolTank extends EnemyTank
  speed: 0.07
  type: -> 'fool'
  image_y_offset: -> 120

class FishTank extends EnemyTank
  speed: 0.13
  type: -> 'fish'
  image_y_offset: -> 160

class StrongTank extends EnemyTank
  speed: 0.07
  type: -> 'strong'
  image_y_offset: -> 200

class Missile extends MovableMapUnit2D
  speed: 0.30
  constructor: (@map, @parent) ->
    @area = @born_area(@parent)
    super(@map, @area)
    @power = @parent.power
    @energy = @power
    @direction = @parent.direction
    @exploded = false
    @commander = new MissileCommander(this)

  born_area: (parent) ->
    switch parent.direction
      when Direction.UP
        new MapArea2D(parent.area.x1 + @map.default_width/4,
          parent.area.y1,
          parent.area.x2 - @map.default_width/4,
          parent.area.y1 + @map.default_height/2)
      when Direction.DOWN
        new MapArea2D(parent.area.x1 + @map.default_width/4,
          parent.area.y2 - @map.default_height/2,
          parent.area.x2 - @map.default_width/4,
          parent.area.y2)
      when Direction.LEFT
        new MapArea2D(parent.area.x1,
          parent.area.y1 + @map.default_height/4,
          parent.area.x1 + @map.default_width/2,
          parent.area.y2 - @map.default_height/4)
      when Direction.RIGHT
        new MapArea2D(parent.area.x2 - @map.default_width/2,
          parent.area.y1 + @map.default_height/4,
          parent.area.x2,
          parent.area.y2 - @map.default_height/4)

  type: -> 'missile'
  explode: -> @exploded = true

  destroy: () ->
    super()
    @parent.delete_missile(this)

  animations: () ->
    _.merge(super(), {
      static: [
        {x: 250, y: 350, width: 20, height: 20}
      ]
    })
  current_animation: () -> 'static'

  move: (offset) ->
    can_move = super(offset)
    @attack() unless can_move
    can_move
  attack: () ->
    # if collide with other object, then explode
    destroy_area = @destroy_area()

    if @map.out_of_bound(destroy_area)
      @bom_on_destroy = true
      @energy -= @max_depend_point
    else
      hit_map_units = @map.units_at(destroy_area)
      _.each(hit_map_units, (unit) =>
        defend_point = unit.defend(this, destroy_area)
        @bom_on_destroy = (defend_point == @max_depend_point)
        @energy -= defend_point
      )
    @destroy() if @energy <= 0
  destroy_area: ->
    switch @direction
      when Direction.UP
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y1 - @default_height/4,
          @area.x2 + @default_width/4,
          @area.y1
        )
      when Direction.RIGHT
        new MapArea2D(
          @area.x2,
          @area.y1 - @default_height/4,
          @area.x2 + @default_width/4,
          @area.y2 + @default_height/4
        )
      when Direction.DOWN
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y2,
          @area.x2 + @default_width/4,
          @area.y2 + @default_height/4
        )
      when Direction.LEFT
        new MapArea2D(
          @area.x1 - @default_width/4,
          @area.y1 - @default_height/4,
          @area.x1,
          @area.y2 + @default_height/4
        )
  defend: (missile, destroy_area) ->
    @destroy()
    @max_depend_point - 1
  accept: (map_unit) ->
    map_unit is @parent or
      (map_unit instanceof Missile and map_unit.parent is @parent)

class Gift extends MapUnit2D
  group: 'gift'

  accept: (map_unit) -> true
  defend: (missile, destroy_area) -> 0

  integration: (delta_time) ->
    tanks = _.select(@map.units_at(@area), (unit) -> unit instanceof Tank)
    _.each(tanks, (tank) => @apply(tank))
    @destroy() if _.size(tanks) > 0

  apply: (tank) ->
  current_animation: () -> 'blink'
  current_frame_rate: () -> 4
  animations: () ->
    {
      'blink': [
        {x: @image_x_offset(), y: 300, width: 40, height: 40},
        {x: 360, y: 300, width: 40, height: 40}
      ]
    }
  image_x_offset: -> 0

class LandMineGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      _.each(@map.user_tanks(), (tank) -> tank.destroy())
    else
      _.each(@map.enemy_tanks(), (tank) -> tank.destroy())
  image_x_offset: -> 0

class GunGift extends Gift
  apply: (tank) -> tank.level_up(2)
  image_x_offset: -> 80

class ShipGift extends Gift
  apply: (tank) -> tank.on_ship(true)
  image_x_offset: -> 40

class StarGift extends Gift
  apply: (tank) -> tank.level_up(1)
  image_x_offset: -> 160

class ShovelGift extends Gift
  apply: (tank) ->
    if tank instanceof UserTank
      # add iron instead
      @map.home().setup_defend_terrains()
    else
      @map.home().delete_defend_terrains()
    # transfer back to brick after 10 seconds
    setTimeout((() => @map.home().restore_defend_terrains()), 10000)
  image_x_offset: -> 120

class LifeGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      tank.level_up(5)
      tank.gift_up(3)
    else
      # TODO add extra user life
  image_x_offset: -> 240

class HatGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      tank.hp_up(5)
    else
      tank.on_guard(true)
  image_x_offset: -> 200

class ClockGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      _.each(@map.user_tanks(), (tank) -> tank.freeze())
    else
      _.each(@map.enemy_tanks(), (tank) -> tank.freeze())
  image_x_offset: -> 280

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
  constructor: (@map_unit) ->
    super(@map_unit)
    @map = @map_unit.map
    @reset_path()
    @last_area = null
  next: ->
    # move towards home
    if _.size(@path) == 0
      @path = @map.shortest_path(@map_unit, @current_vertex(), @map.home_vertex)
      @next_move()
      setTimeout((() => @reset_path()), 3000 + Math.random()*1000)
    else
      @next_move() if @current_vertex().equals(@target_vertex)

    # fire if can't move
    if @map_unit.can_fire() and @last_area and @last_area.equals(@map_unit.area)
      @fire()
    # fire if user or home in front of me
    targets = _.compact([@map.p1_tank(), @map.p2_tank(), @map.home()])
    for target in targets
      @fire() if @in_attack_range(target.area)

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
