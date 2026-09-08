import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LiveThreadRegistry } from "../electron/live-thread-registry";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-registry-"));
  const path = join(directory, "history.json");
  return { path, registry: new LiveThreadRegistry(path) };
}
describe("playground-owned thread registry", () => {
  it("persists, orders and isolates threads across registry restarts", async () => {
    const { path, registry } = await fixture();
    await Promise.all([
      registry.remember({ id: "a", directory: "/project-a", title: "A", updatedAt: 1 }),
      registry.remember({ id: "b", directory: "/project-b", title: "B", updatedAt: 2 }),
      registry.remember({ id: "c", directory: "/project-a", title: "C", updatedAt: 3 }),
    ]);
    expect((await new LiveThreadRegistry(path).list("/project-a")).map(thread => thread.id)).toEqual(["c", "a"]);
    await expect(registry.require("/project-b", "a")).rejects.toThrow("does not belong");
    await expect(registry.require("/project-a", "foreign-codex-thread")).rejects.toThrow("does not belong");
  });
  it("updates owned metadata but rejects moving a thread across projects", async () => {
    const { registry } = await fixture();
    await registry.remember({ id: "a", directory: "/a", title: "First", updatedAt: 1 });
    await registry.remember({ id: "a", directory: "/a", title: "Second", updatedAt: 2 });
    expect(await registry.list("/a")).toHaveLength(1);
    await expect(registry.remember({ id: "a", directory: "/b", title: "Wrong", updatedAt: 3 })).rejects.toThrow("Cannot move");
    expect((await registry.require("/a", "a")).title).toBe("Second");
  });
  it("fails closed on corrupt storage and does not overwrite it", async () => {
    const { path, registry } = await fixture();
    await writeFile(path, "broken");
    await expect(registry.list("/a")).rejects.toThrow();
    await expect(registry.remember({ id: "a", directory: "/a", title: "A", updatedAt: 1 })).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("broken");
  });
});
