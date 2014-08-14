class TiledMapBuilder
  constructor: (@map, @json) ->
    @tile_width = parseInt(@json.tilewidth)
    @tile_height = parseInt(@json.tileheight)
    @map_width = parseInt(@json.width)
    @map_height = parseInt(@json.height)
    @tile_properties = {}
    _.each @json.tilesets, (tileset) =>
      for gid, props of tileset.tileproperties
        @tile_properties[tileset.firstgid + parseInt(gid)] = props
  setup_stage: (stage) ->
    home_layer = _.detect(@json.layers, (layer) -> layer.name is "Home")
    stage_layer = _.detect(@json.layers, (layer) ->
      layer.name is "Stage #{stage}"
    )
    _.each [home_layer, stage_layer], (layer) =>
      h = 0
      while h < @map_height
        w = 0
        while w < @map_width
          tile_id = layer.data[h * @map_width + w]
          if tile_id != 0
            properties = @tile_properties[tile_id]
            [x1, y1] = [
              w * @tile_width + parseInt(properties.x_offset),
              h * @tile_height + parseInt(properties.y_offset)
            ]
            area = new MapArea2D(x1, y1,
              x1 + parseInt(properties.width),
              y1 + parseInt(properties.height)
            )
            @map.add_terrain(eval(properties.type), area)
          w += 1
        h += 1
