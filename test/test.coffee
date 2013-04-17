module "MapArea2D"
test "valid", () ->
  valid_area = new MapArea2D(0, 0, 40, 40)
  equal(valid_area.valid(), true,
    "[0, 0, 40, 40] is a valid area")

  invalid_area = new MapArea2D(50, 0, 40, 40)
  equal(invalid_area.valid(), false,
    "[50, 0, 40, 40] is an invalid area")

test "width & height", () ->
  area = new MapArea2D(50, 60, 70, 80)
  equal(area.width(), 20,
    "[50, 60, 70, 80]'s width is 20")
  equal(area.height(), 20,
    "[50, 60, 70, 80]'s height is 20")

test "equals", () ->
  ok(new MapArea2D(40, 40, 80, 80).equals(new MapArea2D(40, 40, 80, 80)),
    "area with the same x1,y1,x2,y2 equals to each other")

  equal(new MapArea2D(40, 40, 80, 80).equals(null), false,
    "do not equals to a null object")

test "intersect", () ->
  area1 = new MapArea2D(40, 40, 80, 80)
  area2 = new MapArea2D(60, 60, 100, 100)
  # ok(area1.intersect(area2).equals(new MapArea2D(60, 60, 80, 80)),
  deepEqual(area1.intersect(area2), new MapArea2D(60, 60, 80, 80),
    "intersection of [40, 40, 80, 80] and [60, 60, 100, 100] is [60, 60, 80, 80]")

  area3 = new MapArea2D(40, 40, 80, 80)
  area4 = new MapArea2D(60, 60, 70, 70)
  deepEqual(area3.intersect(area4), new MapArea2D(60, 60, 70, 70),
    "intersection of [40, 40, 80, 80] and [60, 60, 70, 70] is [60, 60, 70, 70]")

  area5 = new MapArea2D(40, 40, 80, 80)
  area6 = new MapArea2D(60, 60, 80, 80)
  deepEqual(area5.intersect(area6), new MapArea2D(60, 60, 80, 80),
    "intersection of [40, 40, 80, 80] and [60, 60, 80, 80] is [60, 60, 80, 80]")

  area7 = new MapArea2D(40, 40, 60, 60)
  area8 = new MapArea2D(60, 60, 80, 80)
  equal(area7.intersect(area8).valid(), false,
    "intersection of [40, 40, 60, 60] and [60, 60, 80, 80] is an invalid area")

  area9 = new MapArea2D(40, 40, 60, 60)
  area10 = new MapArea2D(50, 50, 80, 80)
  ok(area9.intersect(area10).equals(area10.intersect(area9)),
    "intersection is not directional, area.intersect(other_area) is the same as other_area.intersect(area)")

test "sub", () ->
  area1 = new MapArea2D(40, 40, 80, 80)
  area2 = new MapArea2D(60, 60, 80, 80)
  sub_areas = area1.sub(area2)
  equal(_.size(sub_areas), 2,
    "[40, 40, 80, 80] sub [60, 60, 80, 80] is divided to 2 sub areas")
  deepEqual(sub_areas, [
    new MapArea2D(40, 40, 80, 60),
    new MapArea2D(40, 60, 60, 80)
  ], "[40, 40, 80, 80] sub [60, 60, 80, 80] is divided to [40, 40, 80, 60] and [40, 60, 60, 80]")

  area3 = new MapArea2D(40, 40, 80, 80)
  area4 = new MapArea2D(40, 50, 80, 90)
  sub_areas2 = area3.sub(area4)
  equal(_.size(sub_areas2), 1,
    "[40, 40, 80, 80] sub [40, 50, 80, 90] is divided to 1 sub areas")
  deepEqual(sub_areas2, [new MapArea2D(40, 40, 80, 50)],
    "[40, 40, 80, 80] sub [40, 50, 80, 90] is divided to [40, 40, 80, 50]")

module "Map2D"
test "shortest_path", () ->
  # todo
  ok(true)

module "Terrain"

module "Tank"
