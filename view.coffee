class Point
  constructor: (@x, @y) ->

class MapArea2D
  constructor: (@x1, @y1, @x2, @y2) ->
  to_a: ->
    [@x1, @y1, @x2, @y2]
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
  collide: (area) ->
    [x1, y1, x2, y2] = area.to_a()
    return false if (@x2 <= x1 or @y2 <= y1 or @x1 >= x2 or @y1 >= y2)
    @_insect(x1, y1, x2, y2, @x1, @y1, @x2, @y2)
  joint: (area) ->
    [x1, y1, x2, y2] = area.to_a()
    [_.max(x1, @x1), _.max(y1, @y1), _.min(x2, @x2), _.min(y2, @y2)]
  space_sub: (area) ->
    [jx1, jy1, jx2, jy2] = @joint(area)
    candidates = [
      new MapArea2D(@x1, @y1, @x2, jy1),
      new MapArea2D(@x1, jy2, @x2, @y2),
      new MapArea2D(@x1, jy1, jx1, jy2),
      new MapArea2D(jx2, jy1, @x2, jy2)
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

  delete_map_unit: (map_unit) ->
    @map_units = _.without(@map_units, map_unit)

  reset_zindex: ->
    map_unit.reset_zindex() for map_unit in @map_units

class MapUnit2D

  origin_x: 'left'
  origin_y: 'top'

  layer: 1

  area: null
  gravity_point: null
  direction: 0

  display_object: null

  constructor: (@map, @model, @area) ->
    @default_width = @map.default_width
    @default_height = @map.default_height
    @reposition()

  reposition: () ->
    @gravity_point = new Point(@area.x1, @area.y1)
    @render_display()

  render_display: () ->
    @display_object = @map.canvas.display.sprite({
      frames: @current_frames(),
      image: @map.image,
      width: @width(),
      height: @height(),
      x: @gravity_point.x,
      y: @gravity_point.y,
      origin: { x: @origin_x, y: @origin_y }
    })
    @display_object.rotateTo(@direction)
    @display_object.moveTo(@gravity_point.x, @gravity_point.y)

  reset_zindex: () ->
    @display_object.zIndex = @layer

  current_frames: () -> []

  width: () -> @area.x2 - @area.x1
  height: () -> @area.y2 - @area.y1

  destroy: () -> @map.delete_map_unit(this)
  accept: (other_unit) -> @model.accept(other_unit.model)

  update: () ->

class MovableMapUnit2D extends MapUnit2D
  origin_x: 'center'
  origin_y: 'center'

  move: (offset) ->
    _.detect(_.range(1, offset).reverse(), (os) => @_try_move(os))

  turn: (direction) ->
    @direction = direction
    if (direction % 180 is 0) then @_adjust_x() else @_adjust_y()

  _try_move: (offset) ->
    [offset_x, offset_y] = @_offset_by_direction(offset)
    target_x = @area.x1 + offset_x
    target_y = @area.y1 + offset_y
    target_area = new MapArea2D(target_x, target_y, target_x + @width(), target_y + @height())
    if @map.space_available(this, target_area)
      @area = target_area
      @reposition()
      true
    else
      false
  _offset_by_direction: (offset) ->
    offset = parseInt(offset)
    switch (@direction)
      when 0
        [offset_x, offset_y] = [0, - _.min([offset, @area.y1])]
      when 90
        [offset_x, offset_y] = [_.min([offset, @map.max_x - @width() - @area.x1]), 0]
      when 180
        [offset_x, offset_y] = [0, _.min([offset, @map.max_y - @height() - @area.y1])]
      when 270
        [offset_x, offset_y] = [- _.min([offset, @area.x1]), 0]
    [offset_x, offset_y]

  _adjust_x: () ->
    offset = (@default_height/4) - (@area.x1 + @default_height/4) % (@default_height/2)
    @area.x1 += offset
  _adjust_y: () ->
    offset = (@default_width/4) - (@area.y1 + @default_width/4) % (@default_width/2)
    @area.y1 += offset

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

class MapUnit2DForBrick extends MovableMapUnit2D
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

class MapUnit2DForIce extends MovableMapUnit2D
  current_frames: () -> [{x: 40, y: 240}]

class MapUnit2DForIron extends MovableMapUnit2D
  current_frames: () -> [{x: 80, y: 240}]

class MapUnit2DForGrass extends MovableMapUnit2D
  current_frames: () -> [{x: 120, y: 240}]

class MapUnit2DForWater extends MovableMapUnit2D
  current_frames: () -> [{x: 160, y: 240}]

class MapUnit2DForHome extends MovableMapUnit2D
  current_frames: () ->
    if @model.is_defeated then [{x: 240, y: 240}] else [{x: 200, y: 240}]

class MapUnit2DForMissile extends MovableMapUnit2D
  current_frames: () -> [{x: 250, y: 330}]
  update: () ->
    # if collide with other object, then explode
    destroy_area = @destroy_area()
    # START HERE
    return @model.explode() if @map.is_out_of_bound(destroy_area)

    hit_map_units = @map.find_units_at(destroy_area)
    _.each(hit_map_units, (unit) =>
      @model.energy -= unit.fight_missile(this, destroy_area)
    )
    @model.explode() if @model.energy <= 0
  destroy_area: ->
    switch @direction
      when 0
        [
          @gravity_point.x - @default_width/4,
          @gravity_point.y - (@default_height/4) - 10,
          @gravity_point.x + @default_width/4,
          @gravity_point.y - @default_height/4
        ]
      when 90
        [
          @gravity_point.x + @default_width/4,
          @gravity_point.y - @default_height/4,
          @gravity_point.x + (@default_width/4) + 10,
          @gravity_point.y + @default_height/4
        ]
      when 180
        [
          @gravity_point.x - @default_width/4,
          @gravity_point.y + @default_height/4,
          @gravity_point.x + @default_width/4,
          @gravity_point.y + (@default_height/4) + 10
        ]
      when 270
        [
          @gravity_point.x - (@default_width/4) - 10,
          @gravity_point.y - @default_height/4,
          @gravity_point.x - @default_width/4,
          @gravity_point.y + @default_height/4
        ]

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

