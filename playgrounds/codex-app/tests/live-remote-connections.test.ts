import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LiveRemoteConnectionRegistry,
  normalizeRemoteConnection,
} from "../electron/live-remote-connections";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-remote-connection-registry-"));
  return {
    path: join(directory, "connections.json"),
    registry: new LiveRemoteConnectionRegistry(join(directory, "connections.json")),
  };
}

const base = {
  detail: "ws://127.0.0.1:8787",
  id: "loopback-runner",
  kind: "device" as const,
  label: "Loopback runner",
  status: "disconnected" as const,
  updatedAt: 1,
};

describe("playground-owned remote connection registry", () => {
  it("normalizes, persists, updates, and forgets connection metadata", async () => {
    const { path, registry } = await fixture();
    await expect(registry.upsert(base)).resolves.toMatchObject(base);
    await expect(
      registry.upsert({ ...base, detail: " ws://127.0.0.1:9000 ", updatedAt: 2 }),
    ).resolves.toMatchObject({ detail: "ws://127.0.0.1:9000" });
    const restarted = new LiveRemoteConnectionRegistry(path);
    await expect(restarted.list()).resolves.toEqual([
      { ...base, detail: "ws://127.0.0.1:9000", updatedAt: 2 },
    ]);
    expect(await restarted.forget(base.id)).toBe(true);
    expect(await restarted.list()).toEqual([]);
    expect(JSON.parse(await readFile(path, "utf8")).version).toBe(1);
  });

  it("keeps credentials out of the public record and rejects malformed values", () => {
    expect(normalizeRemoteConnection(base)).toEqual(base);
    for (const value of [null, {}, { ...base, kind: "token" }, { ...base, label: "" }]) {
      expect(() => normalizeRemoteConnection(value)).toThrow(/connection/i);
    }
  });

  it("fails closed on corrupt data and busy locks", async () => {
    const { path, registry } = await fixture();
    const raw = JSON.stringify({ version: 1, connections: [{ ...base, id: "" }] });
    await writeFile(path, raw);
    await expect(registry.list()).rejects.toThrow(/connection/i);
    expect(await readFile(path, "utf8")).toBe(raw);

    const clean = await fixture();
    await mkdir(`${clean.path}.lock`);
    await expect(new LiveRemoteConnectionRegistry(clean.path, 20).upsert(base)).rejects.toThrow(/busy/);
    await rmdir(`${clean.path}.lock`);
  });

  it("recovers a lock whose owner process has exited", async () => {
    const { path } = await fixture();
    await mkdir(`${path}.lock`);
    await writeFile(`${path}.lock/owner.json`, JSON.stringify({ pid: 2_147_483_647, startedAt: 1, token: "dead" }));
    await expect(new LiveRemoteConnectionRegistry(path, 100).upsert(base)).resolves.toMatchObject(base);
  });
});
