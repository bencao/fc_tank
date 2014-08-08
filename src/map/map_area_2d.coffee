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
  extend: (direction, ratio) ->
    switch direction
      when Direction.UP
        new MapArea2D(@x1, @y1 - ratio * @height(), @x2, @y2)
      when Direction.RIGHT
        new MapArea2D(@x1, @y1, @x2 + ratio * @width(), @y2)
      when Direction.DOWN
        new MapArea2D(@x1, @y1, @x2, @y2 + ratio * @height())
      when Direction.LEFT
        new MapArea2D(@x1 - ratio * @width(), @y1, @x2, @y2)
  equals: (area) ->
    return false unless area instanceof MapArea2D
    area.x1 == @x1 and area.x2 == @x2 and area.y1 == @y1 and area.y2 == @y2
  valid: () -> @x2 > @x1 and @y2 > @y1
  center: () -> new Point((@x1 + @x2)/2, (@y1 + @y2)/2)
  clone: () -> new MapArea2D(@x1, @y1, @x2, @y2)
  width: () -> @x2 - @x1
  height: () -> @y2 - @y1
  to_s: () -> "[" + @x1 + ", " + @y1 + ", " + @x2 + ", " + @y2 + "]"
