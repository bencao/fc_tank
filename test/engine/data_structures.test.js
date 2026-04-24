import { describe, it, expect } from 'vitest';
import { BinomialHeap, BinomialHeapNode } from '../../src/engine/data_structures.js';

describe('BinomialHeapNode', () => {
  it('initializes with satellite and key', () => {
    const node = new BinomialHeapNode('data', 5);
    expect(node.satellite).toBe('data');
    expect(node.key).toBe(5);
    expect(node.parent).toBeNull();
    expect(node.degree).toBe(0);
    expect(node.child).toBeNull();
    expect(node.sibling).toBeNull();
  });

  it('is_head when no parent and no prev_sibling', () => {
    const node = new BinomialHeapNode('a', 1);
    expect(node.is_head()).toBe(true);
  });

  it('is_first_child when has parent but no prev_sibling', () => {
    const parent = new BinomialHeapNode('p', 1);
    const child = new BinomialHeapNode('c', 2);
    child.parent = parent;
    expect(child.is_first_child()).toBe(true);
  });
});

describe('BinomialHeap', () => {
  it('starts empty', () => {
    const heap = new BinomialHeap();
    expect(heap.is_empty()).toBe(true);
  });

  it('insert and extract_min returns minimum', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('c', 3));
    heap.insert(new BinomialHeapNode('a', 1));
    heap.insert(new BinomialHeapNode('b', 2));

    const min = heap.extract_min();
    expect(min.satellite).toBe('a');
    expect(min.key).toBe(1);
  });

  it('extracts in sorted order', () => {
    const heap = new BinomialHeap();
    const values = [5, 3, 8, 1, 4, 2, 7, 6];
    values.forEach(v => heap.insert(new BinomialHeapNode(v, v)));

    const extracted = [];
    while (!heap.is_empty()) {
      extracted.push(heap.extract_min().key);
    }
    expect(extracted).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('min returns minimum without removing', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('b', 2));
    heap.insert(new BinomialHeapNode('a', 1));

    expect(heap.min().key).toBe(1);
    expect(heap.is_empty()).toBe(false);
  });

  it('decrease_key moves node up', () => {
    const heap = new BinomialHeap();
    const node_a = new BinomialHeapNode('a', 5);
    const node_b = new BinomialHeapNode('b', 3);
    heap.insert(node_a);
    heap.insert(node_b);

    heap.decrease_key(node_a, 1);
    expect(heap.extract_min().satellite).toBe('a');
  });

  it('decrease_key throws if new key is greater', () => {
    const heap = new BinomialHeap();
    const node = new BinomialHeapNode('a', 5);
    heap.insert(node);

    expect(() => heap.decrease_key(node, 10)).toThrow('new key is greater than current key');
  });

  it('delete removes a specific node', () => {
    const heap = new BinomialHeap();
    const node_a = new BinomialHeapNode('a', 1);
    const node_b = new BinomialHeapNode('b', 2);
    const node_c = new BinomialHeapNode('c', 3);
    heap.insert(node_a);
    heap.insert(node_b);
    heap.insert(node_c);

    heap.delete(node_b);

    const remaining = [];
    while (!heap.is_empty()) {
      remaining.push(heap.extract_min().satellite);
    }
    expect(remaining).toEqual(['a', 'c']);
  });

  it('union merges two heaps', () => {
    const heap1 = new BinomialHeap();
    heap1.insert(new BinomialHeapNode('a', 1));
    heap1.insert(new BinomialHeapNode('c', 3));

    const heap2 = new BinomialHeap();
    heap2.insert(new BinomialHeapNode('b', 2));
    heap2.insert(new BinomialHeapNode('d', 4));

    heap1.union(heap2);

    const extracted = [];
    while (!heap1.is_empty()) {
      extracted.push(heap1.extract_min().key);
    }
    expect(extracted).toEqual([1, 2, 3, 4]);
  });

  it('handles single element', () => {
    const heap = new BinomialHeap();
    heap.insert(new BinomialHeapNode('only', 42));
    expect(heap.extract_min().key).toBe(42);
    expect(heap.is_empty()).toBe(true);
  });

  it('extract_min on empty returns null', () => {
    const heap = new BinomialHeap();
    expect(heap.extract_min()).toBeNull();
  });
});
