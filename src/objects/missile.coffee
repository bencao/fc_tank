class Missile extends MovableMapUnit2D
  speed: 0.20
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

  animation_state: () -> 'missile'

  move: (offset) ->
    can_move = super(offset)
    @attack() unless can_move
    can_move
  attack: () ->
    # if collide with other object, then explode
    destroy_area = @destroy_area()

    if @map.out_of_bound(destroy_area)
      @bom_on_destroy = true
      @energy -= @max_defend_point
    else
      hit_map_units = @map.units_at(destroy_area)
      _.each(hit_map_units, (unit) =>
        defend_point = unit.defend(this, destroy_area)
        @bom_on_destroy = (defend_point == @max_defend_point)
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
    @max_defend_point - 1
  accept: (map_unit) ->
    map_unit is @parent or
      (map_unit instanceof Missile and map_unit.parent is @parent)
