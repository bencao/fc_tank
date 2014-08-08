class Terrain extends MapUnit2D
  accept: (map_unit) -> false
  new_display: () ->
    animations = _.cloneDeep(Animations.terrain(@type()))
    for animation in animations
      animation.x += (@area.x1 % 40)
      animation.y += (@area.y1 % 40)
      animation.width = @area.width()
      animation.height = @area.height()
    @display_object = new Kinetic.Sprite({
      x: @area.x1,
      y: @area.y1,
      image: @map.image,
      index: 0,
      animation: 'static',
      animations: {static: animations},
      map_unit: this
    })

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

class IronTerrain extends Terrain
  type: -> "iron"
  weight: (tank) ->
    switch tank.power
      when 1
        @map.infinity
      when 2
        20
  defend: (missile, destroy_area) ->
    return @max_defend_point if missile.power < 2
    double_destroy_area = destroy_area.extend(missile.direction, 1)
    pieces = @area.sub(double_destroy_area)
    _.each(pieces, (piece) =>
      @map.add_terrain(IronTerrain, piece)
    )
    @destroy()
    2

class WaterTerrain extends Terrain
  accept: (map_unit) ->
    if map_unit instanceof Tank
      map_unit.ship
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

class IceTerrain extends Terrain
  accept: (map_unit) -> true
  type: -> "ice"
  group: "back"
  weight: (tank) -> 4

class GrassTerrain extends Terrain
  accept: (map_unit) -> true
  type: -> "grass"
  group: "front"
  weight: (tank) -> 4

class HomeTerrain extends Terrain
  constructor: (@map, @area) ->
    super(@map, @area)
  type: -> "home"
  accept: (map_unit) ->
    return true if @destroyed and map_unit instanceof Missile
    false
  weight: (tank) -> 0
  new_display: () ->
    @display_object = new Kinetic.Sprite({
      x: @area.x1,
      y: @area.y1,
      image: @map.image,
      index: 0,
      animations: {
        origin: Animations.terrain('home_origin'),
        destroyed: Animations.terrain('home_destroyed')
      },
      animation: 'origin',
      map_unit: this
    })
  defend: (missile, destroy_area) ->
    return @max_defend_point if @destroyed
    @destroyed = true
    @display_object.setAnimation('destroyed')
    @map.trigger('home_destroyed')
    @max_defend_point

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
