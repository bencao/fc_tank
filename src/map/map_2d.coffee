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

    @bindings = {}

  reset: () ->
    @bindings = {}
    _.each(@map_units, (unit) -> unit.destroy())

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

  random_vertex: () ->
    vx = parseInt(Math.random() * @vertexes_rows)
    vx = (vx - 1) if vx % 2 == 1
    vy = parseInt(Math.random() * @vertexes_columns)
    vy = (vy - 1) if vy % 2 == 1
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
    [d, pi] = @intialize_single_source(end_vertex)
    d[start_vertex.vx][start_vertex.vy].key = 0
    heap = new BinomialHeap()
    for x in _.range(0, @vertexes_columns)
      for y in _.range(0, @vertexes_rows)
        heap.insert(d[x][y])
    until heap.is_empty()
      u = heap.extract_min().satellite
      for v in u.siblings
        @relax(heap, d, pi, u, v, @weight(tank, u, v), end_vertex)
      break if u is end_vertex
    @calculate_shortest_path_from_pi(pi, start_vertex, end_vertex)

  intialize_single_source: (target_vertex) ->
    d = []
    pi = []
    for x in _.range(0, @vertexes_columns)
      column_ds = []
      column_pi = []
      for y in _.range(0, @vertexes_rows)
        node = new BinomialHeapNode(@vertexes[x][y],
          @infinity - @vertexes[x][y].a_star_weight(target_vertex))
        column_ds.push(node)
        column_pi.push(null)
      d.push(column_ds)
      pi.push(column_pi)
    [d, pi]

  relax: (heap, d, pi, u, v, w, target_vertex) ->
    # an area like [30, 50, 70, 90] is not movable, so do not relax here
    return if v.vx % 2 == 1 and u.vx % 2 == 1
    return if v.vy % 2 == 1 and u.vy % 2 == 1
    aw = v.a_star_weight(target_vertex) - u.a_star_weight(target_vertex)
    if d[v.vx][v.vy].key > d[u.vx][u.vy].key + w + aw
      heap.decrease_key(d[v.vx][v.vy], d[u.vx][u.vy].key + w + aw)
      pi[v.vx][v.vy] = u

  calculate_shortest_path_from_pi: (pi, start_vertex, end_vertex) ->
    reverse_paths = []
    v = end_vertex
    until pi[v.vx][v.vy] is null
      reverse_paths.push(v)
      v = pi[v.vx][v.vy]
    reverse_paths.push(start_vertex)
    reverse_paths.reverse()

  bind: (event, callback, scope=this) ->
    @bindings[event] = [] if _.isEmpty(@bindings[event])
    @bindings[event].push({'scope': scope, 'callback': callback})

  trigger: (event, params...) ->
    return if _.isEmpty(@bindings[event])
    for handler in @bindings[event]
      handler.callback.apply(handler.scope, params)
