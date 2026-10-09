/** Share one initialization and serialize shutdown before a new connection. */
export class LiveConnectionGate<T> {
  private pending: Promise<T> | undefined;
  private closing: Promise<void> | undefined;
  connect(factory: () => Promise<T>): Promise<T> {
    if (this.closing) return this.closing.then(() => this.connect(factory));
    if (this.pending) return this.pending;
    const pending = Promise.resolve().then(factory);
    this.pending = pending;
    const clear = () => { if (this.pending === pending) this.pending = undefined; };
    void pending.then(clear, clear);
    return pending;
  }
  close(dispose: () => Promise<void>): Promise<void> {
    if (this.closing) return this.closing;
    const pending = this.pending;
    const closing = Promise.resolve().then(async () => {
      await pending?.catch(() => undefined);
      await dispose();
    });
    this.closing = closing;
    const clear = () => { if (this.closing === closing) this.closing = undefined; };
    void closing.then(clear, clear);
    return closing;
  }
}
