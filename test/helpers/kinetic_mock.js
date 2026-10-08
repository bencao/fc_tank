import { vi } from 'vitest';

// Kinetic is a global the game reaches for at construction time. Tests only
// need it to be inert.
export function stubKinetic() {
  function node() {
    const obj = {
      add: vi.fn(), hide: vi.fn(), show: vi.fn(), draw: vi.fn(), move: vi.fn(),
      start: vi.fn(), stop: vi.fn(), destroy: vi.fn(), play: vi.fn(),
      setAbsolutePosition: vi.fn(), setText: vi.fn(), setFill: vi.fn(), setAnimation: vi.fn(),
      setAnimations: vi.fn(), setFrameRate: vi.fn(), setRotationDeg: vi.fn(),
      setOffset: vi.fn(), afterFrame: vi.fn(), batchDraw: vi.fn(), setX: vi.fn(), setWidth: vi.fn()
    };
    obj.clone = vi.fn(() => node());
    return obj;
  }
  globalThis.Kinetic = {
    Stage: vi.fn(node), Layer: vi.fn(node), Group: vi.fn(node), Sprite: vi.fn(node),
    Text: vi.fn(node), Rect: vi.fn(node), Tween: vi.fn(node), Path: vi.fn(node),
    Easings: { Linear: 'linear' }
  };
  if (!globalThis.document) { globalThis.document = {}; }
  globalThis.document.getElementById = vi.fn(() => ({}));
  globalThis.document.addEventListener = vi.fn();
  globalThis.document.removeEventListener = vi.fn();
  return node;
}
