import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { normalizeEnvironmentId } from "./live-environment-status.js";
import { normalizeExecServerUrl } from "./live-environment-add.js";
import { acquireRegistryLock } from "./registry-lock.js";

export interface OwnedLiveEnvironment {
  directory: string;
  environmentId: string;
  execServerUrl: string;
  updatedAt: number;
}

interface RegistryData {
  environments: OwnedLiveEnvironment[];
}

function validateEnvironment(value: OwnedLiveEnvironment) {
  if (
    !value ||
    !isAbsolute(value.directory) ||
    !Number.isFinite(value.updatedAt)
  ) {
    throw new TypeError("Invalid live environment metadata.");
  }
  const environmentId = normalizeEnvironmentId(value.environmentId);
  const execServerUrl = normalizeExecServerUrl(value.execServerUrl);
  return { ...value, environmentId, execServerUrl };
}

/**
 * Persists only playground-owned environment connection metadata.
 * The App Server remains the source of remote state; forgetting a record here
 * never pretends to remove the remote environment.
 */
export class LiveEnvironmentRegistry {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly lockTimeoutMs = 5000,
  ) {
    if (!isAbsolute(path)) {
      throw new TypeError("An absolute environment registry path is required.");
    }
    if (!Number.isFinite(lockTimeoutMs) || lockTimeoutMs < 0) {
      throw new TypeError("Invalid environment registry lock timeout.");
    }
  }

  private async read(): Promise<RegistryData> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { environments: [] };
      }
      throw error;
    }
    const value = JSON.parse(raw) as { version?: unknown; environments?: unknown };
    if (value?.version !== 1 || !Array.isArray(value.environments)) {
      throw new Error("Unsupported live environment registry.");
    }
    const keys = new Set<string>();
    const environments = value.environments.map((entry) => {
      const normalized = validateEnvironment(entry as OwnedLiveEnvironment);
      const key = `${normalized.directory}\u0000${normalized.environmentId}`;
      if (keys.has(key)) throw new Error("Duplicate live environment registry entry.");
      keys.add(key);
      return normalized;
    });
    return { environments };
  }

  private async write(data: RegistryData) {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    await writeFile(
      temporary,
      JSON.stringify({ version: 1, environments: data.environments }),
      { mode: 0o600, flag: "wx" },
    );
    await rename(temporary, this.path);
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const locked = async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const release = await acquireRegistryLock(this.path, {
        timeoutMs: this.lockTimeoutMs,
        busyMessage: "Live environment registry is busy. Retry after the other playground operation finishes.",
      });
      try { return await operation(); }
      finally { await release(); }
    };
    const next = this.queue.then(locked, locked);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(directory: string): Promise<OwnedLiveEnvironment[]> {
    if (!isAbsolute(directory)) {
      return Promise.reject(new TypeError("An absolute project directory is required."));
    }
    return this.serialize(async () =>
      (await this.read()).environments
        .filter((entry) => entry.directory === directory)
        .sort((a, b) => b.updatedAt - a.updatedAt || a.environmentId.localeCompare(b.environmentId)),
    );
  }

  upsert(environment: OwnedLiveEnvironment): Promise<OwnedLiveEnvironment> {
    return this.serialize(async () => {
      const normalized = validateEnvironment(environment);
      const data = await this.read();
      data.environments = [
        ...data.environments.filter(
          (entry) =>
            entry.directory !== normalized.directory ||
            entry.environmentId !== normalized.environmentId,
        ),
        normalized,
      ];
      await this.write(data);
      return normalized;
    });
  }

  forget(directory: string, rawEnvironmentId: unknown): Promise<boolean> {
    return this.serialize(async () => {
      if (!isAbsolute(directory)) {
        throw new TypeError("An absolute project directory is required.");
      }
      const environmentId = normalizeEnvironmentId(rawEnvironmentId);
      const data = await this.read();
      const before = data.environments.length;
      data.environments = data.environments.filter(
        (entry) =>
          entry.directory !== directory || entry.environmentId !== environmentId,
      );
      if (data.environments.length !== before) await this.write(data);
      return data.environments.length !== before;
    });
  }
}
