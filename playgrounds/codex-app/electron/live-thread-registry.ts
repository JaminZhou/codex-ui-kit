import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { basename, dirname, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";

export interface OwnedLiveThread {
  id: string;
  directory: string;
  title: string;
  updatedAt: number;
}

export interface OwnedLiveProject {
  path: string;
  label: string;
  updatedAt: number;
}
interface RegistryData {
  threads: OwnedLiveThread[];
  projects: OwnedLiveProject[];
}

/** Only threads created by this playground are eligible for history access.
 * Public source labels are not reliable ownership credentials. */
export class LiveThreadRegistry {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly path: string) {
    if (!isAbsolute(path)) throw new TypeError("An absolute history registry path is required.");
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
          typeof thread.title !== "string" || typeof thread.updatedAt !== "number" || !Number.isFinite(thread.updatedAt)) {
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
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(directory: string): Promise<OwnedLiveThread[]> {
    return this.serialize(async () => (await this.read()).threads.filter(thread => thread.directory === directory)
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

  rememberProject(project: OwnedLiveProject): Promise<void> {
    return this.serialize(async () => {
      if (typeof project.path !== "string" || !isAbsolute(project.path) || typeof project.label !== "string" ||
          !project.label.trim() || !Number.isFinite(project.updatedAt)) throw new TypeError("Invalid project metadata.");
      const data = await this.read();
      data.projects = [...data.projects.filter(entry => entry.path !== project.path), project];
      await this.write(data);
    });
  }

  async require(directory: string, id: string): Promise<OwnedLiveThread> {
    const thread = (await this.list(directory)).find(thread => thread.id === id);
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
}
