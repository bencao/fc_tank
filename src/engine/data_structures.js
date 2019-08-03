export class BinomialHeapNode {
  constructor(satellite, key) {
    this.satellite = satellite;
    this.key = key;
    this.parent = null;
    this.degree = 0;
    this.child = null;
    this.sibling = null;
    this.prev_sibling = null;
  }

  link(node) {
    this.parent = node;
    this.sibling = node.child;
    if (this.sibling !== null) { this.sibling.prev_sibling = this; }
    this.prev_sibling = null;
    node.child = this;
    return node.degree += 1;
  }

  is_head() {
    return (this.parent === null) && (this.prev_sibling === null);
  }

  is_first_child() {
    return (this.parent !== null) && (this.prev_sibling === null);
  }
}

export class BinomialHeap {
  constructor(head = null) {
    this.head = head;
  }

  is_empty() { return this.head === null; }

  insert(node) { return this.union(new BinomialHeap(node)); }

  min() {
    let y = null;
    let x = this.head;
    let min = Infinity;
    while (x !== null) {
      if (x.key < min) {
        min = x.key;
        y = x;
      }
      x = x.sibling;
    }
    return y;
  }

  _extract_min_root_node() {
    // find min in the root list
    let [curr, min] = Array.from([this.head, this.head]);
    while (curr !== null) {
      if (curr.key < min.key) { min = curr; }
      curr = curr.sibling;
    }
    // remove min from root list
    if (min.is_head()) {
      this.head = min.sibling;
    } else {
      min.prev_sibling.sibling = min.sibling;
    }
    if (min.sibling !== null) { min.sibling.prev_sibling = min.prev_sibling; }
    [min.sibling, min.prev_sibling] = Array.from([null, null]);
    return min;
  }

  extract_min() {
    if (this.is_empty()) { return null; }
    const min = this._extract_min_root_node();
    let curr = min.child;
    if (curr !== null) {
      while (curr !== null) {
        [curr.prev_sibling, curr.sibling, curr.parent] =
          Array.from([curr.sibling, curr.prev_sibling, null]);
        if (curr.is_head()) { this.union(new BinomialHeap(curr)); }
        curr = curr.prev_sibling;
      }
    }
    min.parent = null;
    min.child = null;
    min.degree = 0;
    return min;
  }

  union(heap) {
    this.merge(heap);
    if (this.is_empty()) { return; }
    let prev_x = null;
    let x = this.head;
    let next_x = x.sibling;
    while (next_x !== null) {
      if ((x.degree !== next_x.degree) ||
          ((next_x.sibling !== null) && (next_x.sibling.degree === x.degree))) {
        prev_x = x;
        x = next_x;
      } else if (x.key <= next_x.key) {
        x.sibling = next_x.sibling;
        if (x.sibling !== null) { x.sibling.prev_sibling = x; }
        next_x.link(x);
      } else {
        if (prev_x === null) {
          this.head = next_x;
          this.head.prev_sibling = null;
        } else {
          prev_x.sibling = next_x;
          if (prev_x.sibling !== null) { prev_x.sibling.prev_sibling = prev_x; }
        }
        x.link(next_x);
      }
      next_x = x.sibling;
    }
    return this;
  }

  decrease_key(node, new_key) {
    if (new_key > node.key) {
      throw new Error("new key is greater than current key");
    }
    node.key = new_key;
    const y = node;
    let z = y.parent;
    return (() => {
      const result = [];
      while ((z !== null) && (y.key < z.key)) {
        if (y.is_first_child()) { y.parent.child = z; }
        if (z.is_first_child()) { z.parent.child = y; }
        [y.parent, z.parent] = Array.from([z.parent, y.parent]);

        if (y.prev_sibling !== null) { y.prev_sibling.sibling = z; }
        if (z.prev_sibling !== null) { z.prev_sibling.sibling = y; }
        [y.prev_sibling, z.prev_sibling] = Array.from([z.prev_sibling, y.prev_sibling]);

        if (y.sibling !== null) { y.sibling.prev_sibling = z; }
        if (z.sibling !== null) { z.sibling.prev_sibling = y; }
        [y.sibling, z.sibling] = Array.from([z.sibling, y.sibling]);

        let { child } = y;
        while (child !== null) {
          child.parent = z;
          child = child.sibling;
        }
        ({ child } = z);
        while (child !== null) {
          child.parent = y;
          child = child.sibling;
        }
        [y.child, z.child] = Array.from([z.child, y.child]);
        [y.degree, z.degree] = Array.from([z.degree, y.degree]);

        if (y.is_head()) { this.head = y; }
        result.push(z = y.parent);
      }
      return result;
    })();
  }

  delete(node) {
    this.decrease_key(node, -Infinity);
    return this.extract_min();
  }

  merge(heap) {
    if (heap.is_empty()) { return; }
    if (this.is_empty()) {
      this.head = heap.head;
      return;
    }

    let p1 = this.head;
    let p2 = heap.head;

    if (p1.degree < p2.degree) {
      this.head = p1;
      p1 = p1.sibling;
    } else {
      this.head = p2;
      p2 = p2.sibling;
    }
    let curr = this.head;

    while ((p1 !== null) || (p2 !== null)) {
      if (p1 === null) {
        curr.sibling = p2;
        if (p2 !== null) { p2.prev_sibling = curr; }
        break;
      } else if (p2 === null) {
        curr.sibling = p1;
        if (p1 !== null) { p1.prev_sibling = curr; }
        break;
      } else if (p1.degree < p2.degree) {
        curr.sibling = p1;
        p1.prev_sibling = curr;
        curr = p1;
        p1 = p1.sibling;
      } else {
        curr.sibling = p2;
        p2.prev_sibling = curr;
        curr = p2;
        p2 = p2.sibling;
      }
    }
    return this;
  }
}
