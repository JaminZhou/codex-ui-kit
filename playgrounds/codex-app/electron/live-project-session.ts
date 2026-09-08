/** The caller serializes starts and rejects them while a turn is active. */
export class LiveProjectSession<T> {
  private threads = new Map<string, T>();
  private generation = 0;

  clear() {
    this.generation += 1;
    this.threads.clear();
  }

  get(directory: string): T | undefined { return this.threads.get(directory); }

  removeWhere(matches: (thread: T) => boolean): void {
    // A delayed notification must not allow an in-flight resume to refill cache.
    this.generation += 1;
    for (const [directory, thread] of this.threads) {
      if (matches(thread)) this.threads.delete(directory);
    }
  }

  async replace(directory: string, create: () => Promise<T>): Promise<T> {
    const generation = this.generation;
    const thread = await create();
    if (generation !== this.generation) throw new Error("The live session was closed before the thread started.");
    this.threads.set(directory, thread);
    return thread;
  }

  async select(directory: string, create: () => Promise<T>): Promise<T> {
    if (this.threads.has(directory)) return this.threads.get(directory)!;
    return this.replace(directory, create);
  }
}

export function resolveLiveProject(
  input: unknown,
  projects: ReadonlyMap<string, string>,
): { directory: string; prompt: string } {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("A live prompt and host-selected project are required.");
  }
  const { prompt, projectToken } = input as Record<string, unknown>;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new TypeError("A non-empty prompt is required.");
  }
  const directory = typeof projectToken === "string"
    ? projects.get(projectToken)
    : undefined;
  if (!directory) {
    throw new TypeError("Select a local project before starting a live turn.");
  }
  return { directory, prompt };
}
