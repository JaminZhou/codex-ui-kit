import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";

export interface OwnedLiveThread {
  id: string;
  directory: string;
  title: string;
  updatedAt: number;
}

/** Only threads created by this playground are eligible for history access.
 * Public source labels are not reliable ownership credentials. */
export class LiveThreadRegistry {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly path: string) {
    if (!isAbsolute(path)) throw new TypeError("An absolute history registry path is required.");
  }

  private async read(): Promise<OwnedLiveThread[]> {
    let raw: string;
    try { raw = await readFile(this.path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const value = JSON.parse(raw) as { version?: unknown; threads?: unknown };
    if (value?.version !== 1 || !Array.isArray(value.threads)) throw new Error("Unsupported live history registry.");
    const ids = new Set<string>();
    for (const thread of value.threads) {
      if (!thread || typeof thread.id !== "string" || !thread.id || ids.has(thread.id) ||
          typeof thread.directory !== "string" || !isAbsolute(thread.directory) ||
          typeof thread.title !== "string" || typeof thread.updatedAt !== "number" || !Number.isFinite(thread.updatedAt)) {
        throw new Error("Invalid live history registry.");
      }
      ids.add(thread.id);
    }
    return value.threads;
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(directory: string): Promise<OwnedLiveThread[]> {
    return this.serialize(async () => (await this.read()).filter(thread => thread.directory === directory)
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)));
  }

  /** Discover only directories for threads this playground has recorded. */
  directories(): Promise<string[]> {
    return this.serialize(async () => [...new Set((await this.read())
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
      .map(thread => thread.directory))]);
  }

  async require(directory: string, id: string): Promise<OwnedLiveThread> {
    const thread = (await this.list(directory)).find(thread => thread.id === id);
    if (!thread) throw new Error("This thread does not belong to the selected playground project.");
    return thread;
  }

  remember(thread: OwnedLiveThread): Promise<void> {
    return this.serialize(async () => {
      if (!thread.id || !isAbsolute(thread.directory) || !Number.isFinite(thread.updatedAt)) throw new TypeError("Invalid owned thread metadata.");
      const threads = await this.read();
      const previous = threads.find(entry => entry.id === thread.id);
      if (previous && previous.directory !== thread.directory) throw new Error("Cannot move a thread to another project.");
      const next = [...threads.filter(entry => entry.id !== thread.id), thread];
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify({ version: 1, threads: next }), { mode: 0o600, flag: "wx" });
      await rename(temporary, this.path);
    });
  }
}
