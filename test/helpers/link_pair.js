// Two ends of an in-memory link, standing in for a WebRTC data channel:
// what one end sends arrives at the other asynchronously, in order.
export function link_pair() {
  const make = () => ({
    open: true,
    on_message: null,
    on_close: null,
    sent: [],
    send(text) {
      if (!this.open) { throw new Error('link closed'); }
      this.sent.push(text);
      queueMicrotask(() => this.peer.open && this.peer.on_message?.(text));
    },
    close() {
      if (!this.open) { return; }
      this.open = false;
      this.peer.open = false;
      queueMicrotask(() => {
        this.on_close?.();
        this.peer.on_close?.();
      });
    }
  });
  const a = make();
  const b = make();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

export const flush = () => new Promise(resolve => setTimeout(resolve, 0));
