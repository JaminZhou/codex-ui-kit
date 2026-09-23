import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LiveEnvironmentRegistry } from "../electron/live-environment-registry";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-environment-registry-"));
  return {
    path: join(directory, "environments.json"),
    registry: new LiveEnvironmentRegistry(join(directory, "environments.json")),
  };
}

const base = {
  directory: "/project-a",
  environmentId: "remote:dev",
  execServerUrl: "wss://exec.example.test/socket",
  updatedAt: 1,
};

describe("playground-owned environment registry", () => {
  it("persists and updates one environment by project", async () => {
    const { path, registry } = await fixture();
    await expect(registry.upsert(base)).resolves.toMatchObject(base);
    await expect(
      registry.upsert({ ...base, execServerUrl: "ws://127.0.0.1:8787", updatedAt: 2 }),
    ).resolves.toMatchObject({ execServerUrl: "ws://127.0.0.1:8787/" });
    const restarted = new LiveEnvironmentRegistry(path);
    await expect(restarted.list("/project-a")).resolves.toEqual([
      { ...base, execServerUrl: "ws://127.0.0.1:8787/", updatedAt: 2 },
    ]);
    expect(JSON.parse(await readFile(path, "utf8")).version).toBe(1);
  });

  it("isolates projects and forgets only local metadata", async () => {
    const { registry } = await fixture();
    await registry.upsert(base);
    await registry.upsert({ ...base, directory: "/project-b", environmentId: "remote:dev", updatedAt: 2 });
    expect(await registry.list("/project-a")).toHaveLength(1);
    expect(await registry.forget("/project-a", "remote:dev")).toBe(true);
    expect(await registry.list("/project-a")).toEqual([]);
    expect(await registry.list("/project-b")).toHaveLength(1);
    expect(await registry.forget("/project-a", "remote:dev")).toBe(false);
  });

  it("fails closed on corrupt data and busy locks", async () => {
    const { path, registry } = await fixture();
    const raw = JSON.stringify({ version: 1, environments: [{ ...base, directory: "relative" }] });
    await writeFile(path, raw);
    await expect(registry.list("/project-a")).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(raw);

    const clean = await fixture();
    await mkdir(`${clean.path}.lock`);
    await expect(new LiveEnvironmentRegistry(clean.path, 20).upsert(base)).rejects.toThrow(/busy/);
    await rmdir(`${clean.path}.lock`);
  });

  it("recovers a lock whose owner process has exited", async () => {
    const { path } = await fixture();
    await mkdir(`${path}.lock`);
    await writeFile(`${path}.lock/owner.json`, JSON.stringify({ pid: 2_147_483_647, startedAt: 1, token: "dead" }));
    await expect(new LiveEnvironmentRegistry(path, 100).upsert(base)).resolves.toMatchObject(base);
  });

  it("notifies a second process after an atomic registry replacement", async () => {
    const { path, registry } = await fixture();
    const writer = new LiveEnvironmentRegistry(path);
    let changed = 0;
    const stop = await registry.watch(() => { changed += 1; });
    try {
      await writer.upsert(base);
      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error("environment registry change was not observed")), 5000);
        const poll = setInterval(() => {
          if (changed > 0) {
            clearTimeout(deadline);
            clearInterval(poll);
            resolve();
          }
        }, 10);
      });
      await expect(registry.list("/project-a")).resolves.toHaveLength(1);
    } finally {
      stop();
    }
  });
});
