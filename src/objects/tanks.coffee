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
    @frozen = false
    super(@map, @area)
    @bom_on_destroy = true

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

  hp_up: (lives) -> @hp_down(-lives)

  hp_down: (lives) ->
    @hp -= lives
    if @dead()
      @destroy()
    else
      @level = _.max([1, @level - 1])
      @_level_adjust()

  on_ship: (@ship) -> @update_display()

  fire: () ->
    return unless @can_fire()
    @missiles.push(@map.add_missile(this))

  can_fire: () -> _.size(@missiles) < @max_missile

  freeze: () ->
    @frozen = true
    @update_display()
    @attach_timeout_event(() =>
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
    return if @initializing or @destroyed
    super(delta_time)
    @handle_fire(cmd) for cmd in @commands

  delete_missile: (missile) -> @missiles = _.without(@missiles, missile)

  after_new_display: () ->
    super()
    @display_object.afterFrame 4, () =>
      @initializing = false
      @update_display()

  destroy: () ->
    super()

class UserTank extends Tank
  constructor: (@map, @area) ->
    super(@map, @area)
    @guard = false
  on_guard: (@guard) ->
    @attach_timeout_event((() => @on_guard(false)), 10000) if @guard
    @update_display()
  speed: 0.13
  defend: (missile, destroy_area) ->
    if missile.parent instanceof UserTank
      @freeze() unless missile.parent is this
      return @max_defend_point - 1
    return @max_defend_point - 1 if @guard
    if @ship
      @on_ship(false)
      return @max_defend_point - 1
    defend_point = _.min(@hp, missile.power)
    @hp_down(missile.power)
    @map.trigger('user_tank_destroyed', this, missile.parent) if @dead()
    defend_point
  animation_state: () ->
    return "tank_born" if @initializing
    return "#{@type()}_lv#{@level}_with_guard" if @guard
    return "#{@type()}_lv#{@level}_frozen" if @frozen
    return "#{@type()}_lv#{@level}_with_ship" if @ship
    "#{@type()}_lv#{@level}"
  accept: (map_unit) ->
    (map_unit instanceof Missile) and (map_unit.parent is this)

  fire: () ->
    super()
    @map.trigger('user_fired')

  handle_move: (cmd, delta_time) ->
    super(cmd, delta_time)
    @map.trigger('user_moved')

class UserP1Tank extends UserTank
  constructor: (@map, @area) ->
    super(@map, @area)
    @commander = new UserCommander(this)
  type: -> 'user_p1'

class UserP2Tank extends UserTank
  constructor: (@map, @area) ->
    super(@map, @area)
    @commander = new UserCommander(this)
  type: -> 'user_p2'

class EnemyTank extends Tank
  constructor: (@map, @area) ->
    super(@map, @area)
    @max_hp = 5
    @hp = 1 + parseInt(Math.random() * (@max_hp - 1))
    @iq = 20 #parseInt(Math.random() * 60)
    @gift_counts = parseInt(Math.random() * @max_hp / 2)
    @direction = 180
    @commander = new EnemyAICommander(this)
  hp_down: (lives) ->
    @map.random_gift() if @gift_counts > 0
    @gift_counts -= lives
    super(lives)
  defend: (missile, destroy_area) ->
    return @max_defend_point - 1 if missile.parent instanceof EnemyTank
    if @ship
      @on_ship(false)
      return @max_defend_point - 1
    defend_point = _.min(@hp, missile.power)
    @hp_down(missile.power)
    @map.trigger('enemy_tank_destroyed', this, missile.parent) if @dead()
    defend_point
  animation_state: () ->
    return "tank_born" if @initializing
    prefix = if @level == 3
      'enemy_lv3'
    else if @gift_counts > 0
      "#{@type()}_with_gift"
    else
      "#{@type()}_hp" + _.min([@hp, 4])
    prefix + (if @ship then "_with_ship" else "")
  gift_up: (gifts) -> @gift_counts += gifts
  handle_fire: (cmd) -> super(cmd) unless @frozen
  accept: (map_unit) ->
    map_unit instanceof EnemyTank or ((map_unit instanceof Missile) and
      (map_unit.parent instanceof EnemyTank))
  handle_move: (cmd, delta_time) ->
    super(cmd, delta_time)
    @map.trigger('enemy_moved')

class StupidTank extends EnemyTank
  speed: 0.07
  type: -> 'stupid'

class FoolTank extends EnemyTank
  speed: 0.07
  type: -> 'fool'

class FishTank extends EnemyTank
  speed: 0.13
  type: -> 'fish'

class StrongTank extends EnemyTank
  speed: 0.07
  type: -> 'strong'
