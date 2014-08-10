class Gift extends MapUnit2D
  group: 'gift'

  accept: (map_unit) -> true
  defend: (missile, destroy_area) -> 0

  integration: (delta_time) ->
    return if @destroyed
    tanks = _.select(@map.units_at(@area), (unit) -> unit instanceof Tank)
    _.each(tanks, (tank) => @apply(tank))
    if _.size(tanks) > 0
      @destroy()
      @map.trigger('gift_consumed', this, tanks)
  apply: (tank) ->

  new_display: () ->
    @display_object = new Kinetic.Sprite({
      x: @area.x1,
      y: @area.y1,
      image: @map.image,
      animation: @animation_state(),
      animations: Animations.gifts,
      frameRate: Animations.rate(@animation_state()),
      index: 0,
      map_unit: this
    })

  animation_state: -> @type()

class LandMineGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      _.each(@map.user_tanks(), (tank) =>
        tank.destroy()
        @map.trigger('user_tank_destroyed', tank, null)
      )
    else
      _.each(@map.enemy_tanks(), (tank) =>
        tank.destroy()
        @map.trigger('enemy_tank_destroyed', tank, null)
      )
  type: () -> 'land_mine'

class GunGift extends Gift
  apply: (tank) -> tank.level_up(2)
  type: -> 'gun'

class ShipGift extends Gift
  apply: (tank) -> tank.on_ship(true)
  type: -> 'ship'

class StarGift extends Gift
  apply: (tank) -> tank.level_up(1)
  type: -> 'star'

class ShovelGift extends Gift
  apply: (tank) ->
    if tank instanceof UserTank
      @map.home().setup_defend_terrains()
    else
      @map.home().delete_defend_terrains()
    # transfer back to brick after 10 seconds
    @attach_timeout_event(() =>
      @map.home().restore_defend_terrains()
    , 10000)
  type: -> 'shovel'

class LifeGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      _.each @map.enemy_tanks(), (enemy_tank) ->
        tank.hp_up(5)
        tank.gift_up(3)
    else
      @map.trigger('tank_life_up', tank)
      # TODO add extra user life
  type: -> 'life'

class HatGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      tank.hp_up(5)
    else
      tank.on_guard(true)
  type: -> 'hat'

class ClockGift extends Gift
  apply: (tank) ->
    if tank instanceof EnemyTank
      _.each(@map.user_tanks(), (tank) -> tank.freeze())
    else
      _.each(@map.enemy_tanks(), (tank) -> tank.freeze())
  type: -> 'clock'
