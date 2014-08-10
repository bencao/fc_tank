class MapArea2DVertex extends MapArea2D
  constructor: (@x1, @y1, @x2, @y2) -> @siblings = []
  init_vxy: (@vx, @vy) ->
  add_sibling: (sibling) -> @siblings.push(sibling)
  a_star_weight: (target_vertex) ->
    (Math.pow(@vx - target_vertex.vx, 2) +
      Math.pow(@vy - target_vertex.vy, 2)) / 2
