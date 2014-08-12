class BinomialHeapNode
  constructor: (@satellite, @key) ->
    @parent = null
    @degree = 0
    @child = null
    @sibling = null
    @prev_sibling = null

  link: (node) ->
    @parent = node
    @sibling = node.child
    @sibling.prev_sibling = this if @sibling != null
    @prev_sibling = null
    node.child = this
    node.degree += 1

  is_head: () ->
    @parent == null and @prev_sibling == null

  is_first_child: () ->
    @parent != null and @prev_sibling == null

class BinomialHeap
  constructor: (@head = null) ->

  is_empty: () -> @head == null

  insert: (node) -> @union(new BinomialHeap(node))

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
    [curr, min] = [@head, @head]
    until curr == null
      min = curr if curr.key < min.key
      curr = curr.sibling
    # remove min from root list
    if min.is_head()
      @head = min.sibling
    else
      min.prev_sibling.sibling = min.sibling
    min.sibling.prev_sibling = min.prev_sibling if min.sibling != null
    [min.sibling, min.prev_sibling] = [null, null]
    min

  extract_min: () ->
    return null if @is_empty()
    min = @_extract_min_root_node()
    curr = min.child
    if curr != null
      until curr == null
        [curr.prev_sibling, curr.sibling, curr.parent] =
          [curr.sibling, curr.prev_sibling, null]
        @union(new BinomialHeap(curr)) if curr.is_head()
        curr = curr.prev_sibling
    min.parent = null
    min.child = null
    min.degree = 0
    min

  union: (heap) ->
    @merge(heap)
    return if @is_empty()
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
        x.sibling.prev_sibling = x if x.sibling != null
        next_x.link(x)
      else
        if prev_x == null
          @head = next_x
          @head.prev_sibling = null
        else
          prev_x.sibling = next_x
          prev_x.sibling.prev_sibling = prev_x if prev_x.sibling != null
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
      y.parent.child = z if y.is_first_child()
      z.parent.child = y if z.is_first_child()
      [y.parent, z.parent] = [z.parent, y.parent]

      y.prev_sibling.sibling = z if y.prev_sibling != null
      z.prev_sibling.sibling = y if z.prev_sibling != null
      [y.prev_sibling, z.prev_sibling] = [z.prev_sibling, y.prev_sibling]

      y.sibling.prev_sibling = z if y.sibling != null
      z.sibling.prev_sibling = y if z.sibling != null
      [y.sibling, z.sibling] = [z.sibling, y.sibling]

      child = y.child
      until child == null
        child.parent = z
        child = child.sibling
      child = z.child
      until child == null
        child.parent = y
        child = child.sibling
      [y.child, z.child] = [z.child, y.child]
      [y.degree, z.degree] = [z.degree, y.degree]

      @head = y if y.is_head()
      z = y.parent

  delete: (node) ->
    @decrease_key(node, -Infinity)
    @extract_min()

  merge: (heap) ->
    return if heap.is_empty()
    if @is_empty()
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
        p2.prev_sibling = curr if p2 != null
        break
      else if p2 == null
        curr.sibling = p1
        p1.prev_sibling = curr if p1 != null
        break
      else if p1.degree < p2.degree
        curr.sibling = p1
        p1.prev_sibling = curr
        curr = p1
        p1 = p1.sibling
      else
        curr.sibling = p2
        p2.prev_sibling = curr
        curr = p2
        p2 = p2.sibling
    this
