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
  it("persists archived ownership and restores only the requested thread", async () => {
    const { path, registry } = await fixture();
    for (const id of ["parent", "child", "other"]) {
      await registry.remember({ id, directory: "/a", title: id, updatedAt: 1 });
    }
    expect(await registry.setArchived("/a", "parent", true, async () => ["parent", "child", "unowned"])).toEqual(["parent", "child"]);
    const restarted = new LiveThreadRegistry(path);
    expect((await restarted.list("/a")).map(row => row.id)).toEqual(["other"]);
    expect((await restarted.list("/a", true)).map(row => row.id)).toEqual(["child", "parent"]);
    await expect(restarted.require("/a", "parent")).rejects.toThrow();
    await expect(restarted.touch("/a", "parent", 5)).rejects.toThrow();
    await expect(restarted.rename("/a", "parent", "New", async () => undefined)).rejects.toThrow();
    expect(await restarted.setArchived("/a", "parent", false, async () => ["parent", "child"])).toEqual(["parent"]);
    expect((await restarted.require("/a", "parent")).title).toBe("parent");
    expect((await restarted.list("/a", true)).map(row => row.id)).toEqual(["child"]);
  });
  it("does not mutate local archive state before remote success or for foreign ownership", async () => {
    const { registry } = await fixture();
    await registry.remember({ id: "a", directory: "/a", title: "A", updatedAt: 1 });
    let calls = 0;
    await expect(registry.setArchived("/b", "a", true, async () => { calls++; return []; })).rejects.toThrow();
    expect(calls).toBe(0);
    await expect(registry.setArchived("/a", "a", true, async () => { throw new Error("remote failure"); })).rejects.toThrow("remote failure");
    expect(await registry.list("/a", true)).toEqual([]);
    expect((await registry.require("/a", "a")).archived).toBeUndefined();
    expect(await registry.observeArchived("foreign", true)).toBe(false);
    expect(await registry.observeArchived("a", true)).toBe(true);
    expect(await registry.list("/a")).toEqual([]);
    expect(await registry.observeArchived("a", false)).toBe(true);
    expect((await registry.require("/a", "a")).title).toBe("A");
  });
  it("renames only owned chats after remote success, preserving ordering and project labels", async () => {
    const { path, registry } = await fixture();
    await registry.remember({ id: "a", directory: "/a", title: "Before", updatedAt: 5 });
    let remoteCalls = 0;
    const apply = async () => { remoteCalls++; };
    await expect(registry.rename("/b", "a", "Other", apply)).rejects.toThrow("does not belong");
    await expect(registry.rename("/a", "a", "  ", apply)).rejects.toThrow();
    await expect(registry.rename("/a", "a", "x".repeat(201), apply)).rejects.toThrow();
    expect(remoteCalls).toBe(0);
    await expect(registry.rename("/a", "a", "Failed", async () => { throw new Error("remote"); })).rejects.toThrow("remote");
    expect((await registry.require("/a", "a")).title).toBe("Before");
    expect(await registry.rename("/a", "a", "  Renamed  ", apply)).toBe("Renamed");
    expect(await new LiveThreadRegistry(path).require("/a", "a")).toEqual({ id: "a", directory: "/a", title: "Renamed", updatedAt: 5 });
    expect(remoteCalls).toBe(1);
    await Promise.all([
      registry.rename("/a", "a", "Final", apply),
      registry.touch("/a", "a", 9),
    ]);
    expect(await registry.require("/a", "a")).toEqual({ id: "a", directory: "/a", title: "Final", updatedAt: 9 });
  });
  it("retains empty selected projects and labels alongside later thread writes", async () => {
    const { path, registry } = await fixture();
    await registry.rememberProject({ path: "/empty", label: "My project", updatedAt: 1 });
    await registry.remember({ id: "other", directory: "/other", title: "Other", updatedAt: 2 });
    await registry.remember({ id: "first", directory: "/empty", title: "First", updatedAt: 3 });
    expect(await new LiveThreadRegistry(path).projects()).toEqual([
      { path: "/empty", label: "My project", updatedAt: 3 },
      { path: "/other", label: "other", updatedAt: 2 },
    ]);
    expect(JSON.parse(await readFile(path, "utf8")).version).toBe(2);
  });
  it("migrates legacy history without losing thread ownership", async () => {
    const { path, registry } = await fixture();
    await writeFile(path, JSON.stringify({ version: 1, threads: [{ id: "legacy", directory: "/legacy", title: "Legacy", updatedAt: 1 }] }));
    await registry.rememberProject({ path: "/empty", label: "Empty", updatedAt: 2 });
    expect((await new LiveThreadRegistry(path).require("/legacy", "legacy")).title).toBe("Legacy");
    expect(await registry.directories()).toEqual(["/empty", "/legacy"]);
  });
  it("rejects corrupt project metadata without replacing storage", async () => {
    const { path, registry } = await fixture();
    const raw = JSON.stringify({ version: 2, threads: [], projects: [{ path: "relative", label: "Broken", updatedAt: 0 }] });
    await writeFile(path, raw);
    await expect(registry.rememberProject({ path: "/valid", label: "Valid", updatedAt: 1 })).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(raw);
  });
  it("persists, orders and isolates threads across registry restarts", async () => {
    const { path, registry } = await fixture();
    await Promise.all([
      registry.remember({ id: "a", directory: "/project-a", title: "A", updatedAt: 1 }),
      registry.remember({ id: "b", directory: "/project-b", title: "B", updatedAt: 2 }),
      registry.remember({ id: "c", directory: "/project-a", title: "C", updatedAt: 3 }),
    ]);
    expect((await new LiveThreadRegistry(path).list("/project-a")).map(thread => thread.id)).toEqual(["c", "a"]);
    expect(await new LiveThreadRegistry(path).directories()).toEqual(["/project-a", "/project-b"]);
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
    await expect(registry.directories()).rejects.toThrow();
    await expect(registry.remember({ id: "a", directory: "/a", title: "A", updatedAt: 1 })).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("broken");
  });
});
