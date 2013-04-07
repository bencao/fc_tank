init = ->
  console.log "init start"

  battle_field = new BattleField

  battle_field.add_tank(UserP1Tank, new MapArea2D(160, 480, 200, 520))
  battle_field.add_tank(UserP2Tank, new MapArea2D(320, 480, 360, 520))

  battle_field.terrain_builder.build(IceTerrain, [
    [40, 0, 240, 40],
    [280, 0, 480, 40],
    [0, 40, 80, 280],
    [440, 40, 520, 280],
    [80, 240, 440, 280]
  ])
  battle_field.terrain_builder.build(BrickTerrain, [
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
  battle_field.terrain_builder.build(IronTerrain, [
    [0, 280, 40, 320],
    [240, 280, 280, 320],
    [480, 280, 520, 320],
    [80, 360, 120, 400],
    [160, 360, 200, 400],
    [320, 360, 360, 400],
    [400, 360, 440, 400]
  ])
  battle_field.terrain_builder.build(GrassTerrain, [
    [0, 320, 40, 520],
    [40, 480, 120, 520],
    [400, 480, 480, 520],
    [480, 320, 520, 480]
  ])
  battle_field.add_terrain(HomeTerrain, new MapArea2D(240, 480, 280, 520))

  document.battle_field = battle_field

  console.log "init done"
  document.getElementById('canvas').focus()

$(document).ready init
