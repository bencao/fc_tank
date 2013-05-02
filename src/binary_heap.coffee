class BinaryHeapNode
  constructor: (@object, @key) ->
    @parent = null
    @degree = 0
    @child = null
    @sibling = null
  link: (node) ->
    @parent = node
    @sibling = node.child
    node.child = this
    node.degree += 1

class BinaryHeap
  constructor: (@head = null) ->
  empty: () -> @head == null
  insert: (node) -> @union(new BinaryHeap(node))
  min: () ->
    y = null
    x = @head
    min = Infinity
    while x != null
      if x.key < min
        min = x.key
        y = x
      x = x.sibling
    y
  _extract_min_root_node: () ->
    # find min in the root list
    curr = @head
    min = curr
    prev_min = null
    while curr.sibling != null
      if curr.sibling.key < min.key
        min = curr.sibling
        prev_min = curr
      curr = curr.sibling
    # remove min from root list
    if prev_min != null
      prev_min.sibling = min.sibling
    else
      @head = min.sibling
    min.sibling = null
    min
  extract_min: () ->
    return null if @empty()
    min = @_extract_min_root_node()
    curr_child = min.child
    if curr_child != null
      p1 = null
      p2 = curr_child
      while p2 != null
        pt = p2
        p2 = pt.sibling
        pt.sibling = p1
        p1 = pt
      @union(new BinaryHeap(p1))
    min.child = null
    min
  union: (heap) ->
    @merge(heap)
    return if @empty()
    prev_x = null
    x = @head
    next_x = x.sibling
    while next_x != null
      if x.degree != next_x.degree or
          (next_x.sibling != null and next_x.sibling.degree == x.degree)
        prev_x = x
        x = next_x
      else if x.key <= next_x.key
        x.sibling = next_x.sibling
        next_x.link(x)
      else
        if prev_x == null
          @head = next_x
        else
          prev_x.sibling = next_x
        x.link(next_x)
      next_x = x.sibling
    this
  decrease_key: (node, new_key) ->
    if new_key > node.key
      throw new Error("new key is greater than current key")
    node.key = new_key
    y = node
    z = y.parent
    while z != null and y.key < z.key
      [y.key, z.key] = [z.key, y.key]
      [y.object, z.object] = [z.object, y.object]
      y = z
      z = y.parent

  delete: (node) ->
    @decrease_key(node, -Infinity)
    @extract_min()
  merge: (heap) ->
    return @head if heap.empty()
    if @empty()
      @head = heap.head
      return

    p1 = @head
    p2 = heap.head

    if p1.degree < p2.degree
      @head = p1
      p1 = p1.sibling
    else
      @head = p2
      p2 = p2.sibling
    curr = @head

    while p1 != null or p2 != null
      if p1 == null
        curr.sibling = p2
        break
      else if p2 == null
        curr.sibling = p1
        break
      else if p1.degree < p2.degree
        curr.sibling = p1
        curr = p1
        p1 = p1.sibling
      else
        curr.sibling = p2
        curr = p2
        p2 = p2.sibling
    this
