import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, isAbsolute } from "node:path";

export type LiveRemoteConnectionKind = "device" | "ssh";
export type LiveRemoteConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface LiveRemoteConnection {
  detail: string;
  id: string;
  kind: LiveRemoteConnectionKind;
  label: string;
  status: LiveRemoteConnectionStatus;
  updatedAt: number;
}

interface RegistryData {
  connections: LiveRemoteConnection[];
}

export interface RemoteConnectionTestResult {
  detail: string;
  id: string;
  message: string;
  status: LiveRemoteConnectionStatus;
}

function normalizeText(value: unknown, field: string) {
  if (typeof value !== "string") throw new TypeError(`${field} is required.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) {
    throw new TypeError(`${field} must be between 1 and 512 characters.`);
  }
  return normalized;
}

export function normalizeRemoteConnection(value: unknown): LiveRemoteConnection {
  if (!value || typeof value !== "object") {
    throw new TypeError("A remote connection is required.");
  }
  const input = value as Partial<LiveRemoteConnection>;
  const kind = input.kind === "device" || input.kind === "ssh" ? input.kind : null;
  if (!kind) throw new TypeError("A supported remote connection kind is required.");
  const id = normalizeText(input.id, "Connection id");
  const label = normalizeText(input.label, "Connection label");
  const detail = normalizeText(input.detail, "Connection detail");
  const status =
    input.status === "connected" ||
    input.status === "connecting" ||
    input.status === "disconnected" ||
    input.status === "error"
      ? input.status
      : "disconnected";
  return {
    detail,
    id,
    kind,
    label,
    status,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : Date.now(),
  };
}

function normalizeRegistry(value: unknown): RegistryData {
  if (!value || typeof value !== "object") {
    throw new Error("Unsupported remote connection registry.");
  }
  const input = value as { version?: unknown; connections?: unknown };
  if (input.version !== 1 || !Array.isArray(input.connections)) {
    throw new Error("Unsupported remote connection registry.");
  }
  const ids = new Set<string>();
  const connections = input.connections.map((entry) => {
    const connection = normalizeRemoteConnection(entry);
    if (ids.has(connection.id)) throw new Error("Duplicate remote connection id.");
    ids.add(connection.id);
    return connection;
  });
  return { connections };
}

/** Persists only playground-owned connection metadata; credentials stay host-owned. */
export class LiveRemoteConnectionRegistry {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly lockTimeoutMs = 5000,
  ) {
    if (!isAbsolute(path)) throw new TypeError("An absolute connection registry path is required.");
    if (!Number.isFinite(lockTimeoutMs) || lockTimeoutMs < 0) {
      throw new TypeError("Invalid connection registry lock timeout.");
    }
  }

  private async read(): Promise<RegistryData> {
    try {
      return normalizeRegistry(JSON.parse(await readFile(this.path, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { connections: [] };
      throw error;
    }
  }

  private async write(data: RegistryData) {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify({ version: 1, connections: data.connections }), {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, this.path);
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const locked = async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const lock = `${this.path}.lock`;
      const deadline = performance.now() + this.lockTimeoutMs;
      for (;;) {
        try {
          await mkdir(lock, { mode: 0o700 });
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          if (performance.now() >= deadline) throw new Error("Remote connection registry is busy.");
          await delay(25);
        }
      }
      try {
        return await operation();
      } finally {
        await rm(lock, { recursive: true, force: true });
      }
    };
    const next = this.queue.then(locked, locked);
    this.queue = next.catch(() => undefined);
    return next;
  }

  list(): Promise<LiveRemoteConnection[]> {
    return this.serialize(async () =>
      (await this.read()).connections.sort(
        (left, right) => right.updatedAt - left.updatedAt || left.label.localeCompare(right.label),
      ),
    );
  }

  upsert(value: LiveRemoteConnection): Promise<LiveRemoteConnection> {
    return this.serialize(async () => {
      const connection = normalizeRemoteConnection(value);
      const data = await this.read();
      data.connections = [
        ...data.connections.filter((candidate) => candidate.id !== connection.id),
        connection,
      ];
      await this.write(data);
      return connection;
    });
  }

  forget(id: string): Promise<boolean> {
    return this.serialize(async () => {
      const normalizedId = normalizeText(id, "Connection id");
      const data = await this.read();
      const before = data.connections.length;
      data.connections = data.connections.filter((connection) => connection.id !== normalizedId);
      if (data.connections.length !== before) await this.write(data);
      return data.connections.length !== before;
    });
  }

  updateStatus(id: string, status: LiveRemoteConnectionStatus): Promise<LiveRemoteConnection | null> {
    return this.serialize(async () => {
      const data = await this.read();
      const existing = data.connections.find((connection) => connection.id === id);
      if (!existing) return null;
      const updated = { ...existing, status, updatedAt: Date.now() };
      data.connections = data.connections.map((connection) =>
        connection.id === id ? updated : connection,
      );
      await this.write(data);
      return updated;
    });
  }
}

export async function testRemoteConnection(
  connection: LiveRemoteConnection,
  timeoutMs = 1500,
): Promise<RemoteConnectionTestResult> {
  const url = connection.detail.trim();
  if (connection.kind !== "device" || !/^wss?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/.*)?$/i.test(url)) {
    return {
      detail: connection.detail,
      id: connection.id,
      message: "Only a host-owned loopback device endpoint can be tested by this playground.",
      status: "disconnected",
    };
  }
  return await new Promise((resolve) => {
    const socket = new globalThis.WebSocket(url);
    let settled = false;
    const finish = (status: LiveRemoteConnectionStatus, message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      resolve({ detail: connection.detail, id: connection.id, message, status });
    };
    const timer = setTimeout(() => finish("error", "The device did not respond before the test timed out."), timeoutMs);
    socket.addEventListener("open", () => finish("connected", "Loopback device connection is ready."));
    socket.addEventListener("error", () => finish("error", "The device could not be reached."));
  });
}
