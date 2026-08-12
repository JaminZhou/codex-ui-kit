export class GitBranchOperationQueue {
  private tail: Promise<void> = Promise.resolve();

  run<Result>(operation: () => Promise<Result>): Promise<Result> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    return (async () => {
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    })();
  }
}
