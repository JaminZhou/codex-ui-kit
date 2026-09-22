import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { watch as watchDirectory } from "node:fs";
import { basename, dirname, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { acquireRegistryLock } from "./registry-lock.js";

export interface OwnedLiveThread {
  id: string;
  directory: string;
  title: string;
  updatedAt: number;
  archived?: boolean;
}

export interface OwnedLiveProject {
  path: string;
  label: string;
  updatedAt: number;
}

export interface DiscoveredLiveThread extends OwnedLiveThread {}

type ArchiveMutationResult =
  | string[]
  | {
      changedThreadIds: string[];
      discoveredThreads?: DiscoveredLiveThread[];
    };
interface RegistryData {
  threads: OwnedLiveThread[];
  projects: OwnedLiveProject[];
}

/** Only threads created by this playground are eligible for history access.
 * Public source labels are not reliable ownership credentials. */
export class LiveThreadRegistry {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly path: string, private readonly lockTimeoutMs = 5000) {
    if (!isAbsolute(path)) throw new TypeError("An absolute history registry path is required.");
    if (!Number.isFinite(lockTimeoutMs) || lockTimeoutMs < 0) throw new TypeError("Invalid registry lock timeout.");
  }

  private async read(): Promise<RegistryData> {
    let raw: string;
    try { raw = await readFile(this.path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { threads: [], projects: [] };
      throw error;
    }
    const value = JSON.parse(raw) as { version?: unknown; threads?: unknown; projects?: unknown };
    if ((value?.version !== 1 && value?.version !== 2) || !Array.isArray(value.threads)) throw new Error("Unsupported live history registry.");
    const ids = new Set<string>();
    for (const thread of value.threads) {
      if (!thread || typeof thread.id !== "string" || !thread.id || ids.has(thread.id) ||
          typeof thread.directory !== "string" || !isAbsolute(thread.directory) ||
          typeof thread.title !== "string" || typeof thread.updatedAt !== "number" || !Number.isFinite(thread.updatedAt) ||
          (thread.archived !== undefined && typeof thread.archived !== "boolean")) {
        throw new Error("Invalid live history registry.");
      }
      ids.add(thread.id);
    }
    const projects = value.version === 1 ? [] : value.projects;
    if (!Array.isArray(projects)) throw new Error("Invalid project registry.");
    const paths = new Set<string>();
    for (const project of projects) {
      if (!project || typeof project.path !== "string" || !isAbsolute(project.path) || paths.has(project.path) ||
          typeof project.label !== "string" || !project.label.trim() ||
          typeof project.updatedAt !== "number" || !Number.isFinite(project.updatedAt)) throw new Error("Invalid project registry.");
      paths.add(project.path);
    }
    for (const thread of [...value.threads].sort((a, b) => b.updatedAt - a.updatedAt)) {
      if (!paths.has(thread.directory)) {
        projects.push({ path: thread.directory, label: basename(thread.directory) || thread.directory, updatedAt: thread.updatedAt });
        paths.add(thread.directory);
      }
    }
    return { threads: value.threads, projects };
  }

  private async write(data: RegistryData): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify({ version: 2, ...data }), { mode: 0o600, flag: "wx" });
    await rename(temporary, this.path);
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const locked = async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const release = await acquireRegistryLock(this.path, {
        timeoutMs: this.lockTimeoutMs,
        busyMessage: "Live history registry is busy. Retry after the other playground operation finishes.",
      });
      // Hold across remote acknowledgement and the atomic local write. A live
      // owner is never stolen; dead owners are recovered on the next attempt.
      try { return await operation(); }
      finally { await release(); }
    };
    const next = this.queue.then(locked, locked);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(directory: string, archived: boolean | "all" = false): Promise<OwnedLiveThread[]> {
    return this.serialize(async () => (await this.read()).threads.filter(thread => thread.directory === directory && (archived === "all" || Boolean(thread.archived) === archived))
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)));
  }

  /** Discover only projects selected or used by this playground. */
  directories(): Promise<string[]> {
    return this.projects().then(projects => projects.map(project => project.path));
  }

  projects(): Promise<OwnedLiveProject[]> {
    return this.serialize(async () => (await this.read()).projects
      .sort((a, b) => b.updatedAt - a.updatedAt || a.path.localeCompare(b.path)));
  }

  /**
   * Observe atomic registry replacements made by another playground process.
   * The callback is debounced because one write can emit both unlink/rename
   * events on macOS. The watcher never reads or mutates state itself; callers
   * decide when it is safe to refresh their current project/draft.
   */
  async watch(onChange: () => void): Promise<() => void> {
    if (typeof onChange !== "function") throw new TypeError("A registry change callback is required.");
    await mkdir(dirname(this.path), { recursive: true });
    const target = basename(this.path);
    let timer: NodeJS.Timeout | null = null;
    const watcher = watchDirectory(dirname(this.path), { persistent: false }, (_event, filename) => {
      const name = filename?.toString();
      if (name && name !== target) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        try { onChange(); } catch { /* observers must not tear down the watcher */ }
      }, 25);
    });
    return () => {
      if (timer) clearTimeout(timer);
      timer = null;
      watcher.close();
    };
  }

  rememberProject(project: OwnedLiveProject): Promise<void> {
    return this.serialize(async () => {
      if (typeof project.path !== "string" || !isAbsolute(project.path) || typeof project.label !== "string" ||
          !project.label.trim() || !Number.isFinite(project.updatedAt)) throw new TypeError("Invalid project metadata.");
      const data = await this.read();
      data.projects = [...data.projects.filter(entry => entry.path !== project.path), project];
      await this.write(data);
    });
  }

  async require(directory: string, id: string, archived = false): Promise<OwnedLiveThread> {
    const thread = (await this.list(directory, archived)).find(thread => thread.id === id);
    if (!thread) throw new Error("This thread does not belong to the selected playground project.");
    return thread;
  }

  remember(thread: OwnedLiveThread): Promise<void> {
    return this.serialize(async () => {
      if (!thread.id || !isAbsolute(thread.directory) || !Number.isFinite(thread.updatedAt)) throw new TypeError("Invalid owned thread metadata.");
      const data = await this.read();
      const { threads } = data;
      const previous = threads.find(entry => entry.id === thread.id);
      if (previous && previous.directory !== thread.directory) throw new Error("Cannot move a thread to another project.");
      data.threads = [...threads.filter(entry => entry.id !== thread.id), thread];
      const project = data.projects.find(entry => entry.path === thread.directory);
      if (project) project.updatedAt = Math.max(project.updatedAt, thread.updatedAt);
      else data.projects.push({ path: thread.directory, label: basename(thread.directory) || thread.directory, updatedAt: thread.updatedAt });
      await this.write(data);
    });
  }

  rename(directory: string, id: string, name: string, apply: (name: string) => Promise<unknown>): Promise<string> {
    return this.serialize(async () => {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 200) throw new TypeError("A chat name between 1 and 200 characters is required.");
      const data = await this.read();
      const thread = data.threads.find(entry => entry.id === id && entry.directory === directory && !entry.archived);
      if (!thread) throw new Error("This thread does not belong to the selected playground project.");
      const title = name.trim();
      await apply(title);
      thread.title = title;
      await this.write(data);
      return title;
    });
  }

  touch(directory: string, id: string, updatedAt: number): Promise<void> {
    return this.serialize(async () => {
      if (!Number.isFinite(updatedAt)) throw new TypeError("Invalid update time.");
      const data = await this.read();
      const thread = data.threads.find(entry => entry.id === id && entry.directory === directory && !entry.archived);
      if (!thread) throw new Error("This thread does not belong to the selected playground project.");
      thread.updatedAt = Math.max(thread.updatedAt, updatedAt);
      const project = data.projects.find(project => project.path === directory);
      if (project) project.updatedAt = Math.max(project.updatedAt, updatedAt);
      await this.write(data);
    });
  }

  /**
   * Archive mutations may include server-discovered descendants. They are
   * persisted only after the remote mutation succeeds, and only for the
   * selected project. Unarchive never implies subtree restore.
   */
  setArchived(directory: string, id: string, archived: boolean, apply: () => Promise<ArchiveMutationResult>): Promise<string[]> {
    return this.serialize(async () => {
      const data = await this.read();
      const thread = data.threads.find(entry => entry.id === id && entry.directory === directory);
      if (!thread) throw new Error("This thread does not belong to the selected playground project.");
      const result = await apply();
      const changed = Array.isArray(result) ? result : result.changedThreadIds;
      const discovered = archived && !Array.isArray(result) ? result.discoveredThreads ?? [] : [];
      const targets = new Set(archived ? [id, ...changed, ...discovered.map(entry => entry.id)] : [id]);
      for (const entry of discovered) {
        if (!entry.id || !isAbsolute(entry.directory) || entry.directory !== directory || !Number.isFinite(entry.updatedAt)) {
          throw new TypeError("Invalid discovered live thread metadata.");
        }
        const previous = data.threads.find(candidate => candidate.id === entry.id);
        if (previous && previous.directory !== directory) throw new Error("Cannot move a thread to another project.");
        if (previous) {
          previous.title = entry.title;
          previous.updatedAt = Math.max(previous.updatedAt, entry.updatedAt);
        } else {
          data.threads.push({ ...entry, archived: true });
        }
      }
      const owned = data.threads.filter(entry => targets.has(entry.id));
      for (const entry of owned) entry.archived = archived;
      await this.write(data);
      return owned.map(entry => entry.id);
    });
  }

  /** Permanently remove one already-archived owned thread after remote success. */
  delete(directory: string, id: string, apply: () => Promise<unknown>): Promise<boolean> {
    return this.serialize(async () => {
      const data = await this.read();
      const thread = data.threads.find(entry => entry.id === id && entry.directory === directory);
      if (!thread) throw new Error("This thread does not belong to the selected playground project.");
      if (!thread.archived) throw new Error("Only an archived chat can be permanently deleted.");
      await apply();
      data.threads = data.threads.filter(entry => entry.id !== id);
      await this.write(data);
      return true;
    });
  }

  observeArchived(id: string, archived: boolean): Promise<boolean> {
    return this.serialize(async () => {
      const data = await this.read();
      const thread = data.threads.find(entry => entry.id === id);
      if (!thread) return false;
      if (Boolean(thread.archived) !== archived) {
        thread.archived = archived;
        await this.write(data);
      }
      return true;
    });
  }
}
