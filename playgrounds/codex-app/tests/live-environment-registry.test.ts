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
});
