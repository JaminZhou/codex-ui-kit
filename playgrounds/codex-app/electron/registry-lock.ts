import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export interface RegistryLockOptions {
  timeoutMs: number;
  orphanGraceMs?: number;
  busyMessage: string;
}

interface LockOwner {
  pid: number;
  startedAt: number;
  token: string;
}

const ownerFile = "owner.json";

function processIsAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readOwner(lockPath: string): Promise<LockOwner | null> {
  try {
    const parsed = JSON.parse(await readFile(`${lockPath}/${ownerFile}`, "utf8")) as Partial<LockOwner>;
    const pid = parsed.pid;
    const startedAt = parsed.startedAt;
    const token = parsed.token;
    if (
      typeof pid !== "number" ||
      !Number.isInteger(pid) ||
      pid <= 0 ||
      typeof startedAt !== "number" ||
      !Number.isFinite(startedAt) ||
      typeof token !== "string" ||
      !token
    ) return null;
    return { pid, startedAt, token };
  } catch {
    return null;
  }
}

async function isOrphaned(lockPath: string, orphanGraceMs: number) {
  const owner = await readOwner(lockPath);
  if (owner) return !processIsAlive(owner.pid);
  try {
    const age = Date.now() - (await stat(lockPath)).mtimeMs;
    return age >= orphanGraceMs;
  } catch {
    return false;
  }
}

/**
 * Acquires a small process lock used by the playground-owned registries.
 * A lock with a live owner is never stolen, even when a remote operation is
 * slow. A lock whose owner process disappeared is removed on the next
 * operation; this is safe because the owner token is checked on release.
 */
export async function acquireRegistryLock(
  path: string,
  { timeoutMs, orphanGraceMs = 30_000, busyMessage }: RegistryLockOptions,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("Invalid registry lock timeout.");
  if (!Number.isFinite(orphanGraceMs) || orphanGraceMs < 0) throw new TypeError("Invalid orphan lock grace period.");
  await mkdir(dirname(path), { recursive: true });
  const lockPath = `${path}.lock`;
  const owner: LockOwner = { pid: process.pid, startedAt: Date.now(), token: randomUUID() };
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    try {
      await mkdir(lockPath, { mode: 0o700 });
      try {
        await writeFile(`${lockPath}/${ownerFile}`, JSON.stringify(owner), { mode: 0o600, flag: "wx" });
      } catch (error) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        const current = await readOwner(lockPath);
        if (current?.token === owner.token) await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await isOrphaned(lockPath, orphanGraceMs)) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }
      if (performance.now() >= deadline) throw new Error(busyMessage);
      await delay(25);
    }
  }
}
