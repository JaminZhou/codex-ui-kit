export class LiveTurnStartGate {
  private starting = false;

  async run<T>(
    hasActiveTurn: () => boolean,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.starting || hasActiveTurn()) {
      throw new Error("A live turn is already running.");
    }

    this.starting = true;
    try {
      return await operation();
    } finally {
      this.starting = false;
    }
  }
}
