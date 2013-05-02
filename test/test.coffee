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

test "clone", () ->
  area = new MapArea2D(40, 40, 80, 80)
  clone_area = area.clone()
  deepEqual(area, clone_area, "cloned area equals to original one")

module "Map2D"

window.TestFixtures = {
  map_fixture: () ->
    stage = new Kinetic.Stage({container: 'canvas', width: 600, height: 520})
    layer = new Kinetic.Layer()
    stage.add(layer)
    map = new Map2D(layer)
    $.ajax {
      url: "../data/terrains.json",
      success: (json) =>
        builder = new TiledMapBuilder(map, json)
        builder.setup_stage(1)
      ,
      dataType: 'json',
      async: false
    }
    map.add_tank(FoolTank, new MapArea2D(0, 0, 40, 40))
    map
}

test "shortest_path is fast enough", () ->
  map = TestFixtures.map_fixture()
  start_time = (new Date()).getMilliseconds()
  start_vertex = map.vertexes_at(new MapArea2D(0, 0, 40, 40))
  end_vertex = map.vertexes_at(new MapArea2D(460, 210, 500, 250))
  path = map.shortest_path(map.tanks[0], start_vertex, end_vertex)
  end_time = (new Date()).getMilliseconds()
  taken_time = (end_time + 1000 - start_time) % 1000
  console.log "taken #{taken_time}"
  ok(taken_time < 50, "shortest path should take less than 50 milliseconds")

module "Terrain"

module "Tank"

module "Gift"

module "Scene"

module "Binary Heap"

test "make heap", () ->
  heap = new BinaryHeap()
  equal(heap.head, null, "new heap should have a null head")
  ok(heap.empty(), "new heap should be empty")

test "make heap with custom head", () ->
  head = new BinaryHeapNode({}, -65535)
  heap = new BinaryHeap(head)
  deepEqual(heap.head, head, "new heap with a param should have a custom head")
  equal(heap.empty(), false, "new heap with a param should not be empty")

test "union", () ->
  heap1 = new BinaryHeap(new BinaryHeapNode({}, 123))
  heap2 = new BinaryHeap()

  deepEqual(heap1.union(heap2), heap1,
    "union heap with a empty heap will change nothing")
  deepEqual(heap2.union(heap1), heap1,
    "union empty heap with a non-empty heap will equal to the non-empty one")

  node3 = new BinaryHeapNode({}, 1)
  heap3 = new BinaryHeap(node3)
  node4 = new BinaryHeapNode({}, 2)
  heap4 = new BinaryHeap(node4)
  heap5 = heap3.union(heap4)
  deepEqual(heap5.head, node3, "1st node in union should now be head")
  deepEqual(heap5.head.child, node4,
    "2nd node in union with the same degree should be child")

test "insert", () ->
  node = new BinaryHeapNode({}, -65535)
  heap = new BinaryHeap()
  heap.insert(node)
  deepEqual(heap.head, node, "1st node inserted should be heap head")
  equal(heap.empty(), false, "a heap inserted something should not be empty")

  node2 = new BinaryHeapNode({}, 456)
  heap.insert(node2)
  deepEqual(heap.head.child, node2,
    "2nd inserted node should be the first child of head")

  node3 = new BinaryHeapNode({}, 123)
  heap.insert(node3)
  deepEqual(heap.head, node3,
    "3rd inserted node should become new head")
  deepEqual(heap.head.sibling, node,
    "after 3rd node inserted, 1st node inserted should be head's sibling")

test "minimum", () ->
  head = new BinaryHeapNode({}, -65535)
  heap = new BinaryHeap(head)
  heap.insert(new BinaryHeapNode({}, 123))
  equal(heap.min().key, -65535, "heap should return right minimum key")

test "extract_min", () ->
  node = new BinaryHeapNode({}, 1)
  heap = new BinaryHeap(node)
  node2 = new BinaryHeapNode({}, 6)
  heap.insert(node2)
  node3 = new BinaryHeapNode({}, 123)
  heap.insert(node3)
  node4 = new BinaryHeapNode({}, -5)
  heap.insert(node4)
  node5 = new BinaryHeapNode({}, -65535)
  heap.insert(node5)
  node6 = new BinaryHeapNode({}, 567)
  heap.insert(node6)
  node7 = new BinaryHeapNode({}, -65534)
  heap.insert(node7)
  node8 = new BinaryHeapNode({}, 0)
  heap.insert(node8)
  node9 = new BinaryHeapNode({}, 367)
  heap.insert(node9)
  node10 = new BinaryHeapNode({}, 234)
  heap.insert(node10)
  node11 = new BinaryHeapNode({}, -456)
  heap.insert(node11)
  node12 = new BinaryHeapNode({}, 65535)
  heap.insert(node12)

  deepEqual(heap.extract_min(), node5,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node7,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node11,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node4,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node8,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node2,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node3,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node10,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node9,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node6,
    "heap should correctly extract minimum node")
  deepEqual(heap.extract_min(), node12,
    "heap should correctly extract minimum node")

test "decrease_key", () ->
  node = new BinaryHeapNode({}, 1)
  heap = new BinaryHeap(node)
  node2 = new BinaryHeapNode({}, 6)
  heap.insert(node2)
  node3 = new BinaryHeapNode({}, 123)
  heap.insert(node3)
  node4 = new BinaryHeapNode({}, -5)
  heap.insert(node4)

  heap.decrease_key(node3, -456)

  deepEqual(heap.extract_min().key, -456,
    "heap should correctly extract minimum node after decrease_key")
  deepEqual(heap.extract_min().key, -5,
    "heap should correctly extract minimum node")

  heap.decrease_key(node, 0)

  deepEqual(heap.extract_min().key, 0,
    "heap should correctly extract minimum node after decrease_key")
  deepEqual(heap.extract_min().key, 6,
    "heap should correctly extract minimum node")

test "delete", () ->
  node = new BinaryHeapNode({}, 1)
  heap = new BinaryHeap(node)
  node2 = new BinaryHeapNode({}, 6)
  heap.insert(node2)
  node3 = new BinaryHeapNode({}, 123)
  heap.insert(node3)
  node4 = new BinaryHeapNode({}, -5)
  heap.insert(node4)

  heap.delete(node4)
  heap.delete(node2)

  deepEqual(heap.extract_min().key, 1,
    "heap should correctly extract minimum node after delete")
  deepEqual(heap.extract_min().key, 123,
    "heap should correctly extract minimum node after delete")
