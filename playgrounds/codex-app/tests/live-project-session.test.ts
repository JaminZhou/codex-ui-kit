import { describe, expect, it, vi } from "vitest";
import { LiveProjectSession, resolveLiveProject } from "../electron/live-project-session";

describe("live project routing", () => {
  const projects = new Map([["startup-workspace", "/startup"], ["project:chosen", "/chosen"]]);

  it("resolves only host-issued tokens, not renderer paths or a startup fallback", () => {
    expect(resolveLiveProject({ prompt: " inspect ", projectToken: "project:chosen", cwd: "/other" }, projects))
      .toEqual({ prompt: " inspect ", directory: "/chosen" });
    for (const projectToken of [undefined, null, "", "/chosen", "unknown", 1]) {
      expect(() => resolveLiveProject({ prompt: "inspect", projectToken }, projects))
        .toThrow("Select a local project");
    }
  });

  it("rejects empty prompts and malformed inputs before creating a session", () => {
    for (const input of [null, undefined, "inspect", {}, { prompt: " " }, { prompt: 1 }]) {
      expect(() => resolveLiveProject(input, projects)).toThrow(TypeError);
    }
  });

  it("restores each project thread across A to B to A switches", async () => {
    const session = new LiveProjectSession<string>();
    const create = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second").mockResolvedValueOnce("third");
    expect(await session.select("/startup", create)).toBe("first");
    expect(await session.select("/startup", create)).toBe("first");
    expect(await session.select("/chosen", create)).toBe("second");
    expect(await session.select("/startup", create)).toBe("first");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("does not bind a failed creation to the new project", async () => {
    const session = new LiveProjectSession<string>();
    await session.select("/startup", async () => "first");
    await expect(session.select("/chosen", async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    expect(await session.select("/startup", async () => "unexpected")).toBe("first");
    expect(await session.select("/chosen", async () => "retry")).toBe("retry");
  });

  it("clears project ownership when the host client is closed or reconnected", async () => {
    const session = new LiveProjectSession<string>();
    await session.select("/startup", async () => "first");
    session.clear();
    expect(await session.select("/startup", async () => "fresh")).toBe("fresh");
  });

  it("does not restore a thread that finishes creating after the client closes", async () => {
    const session = new LiveProjectSession<string>();
    let complete!: (thread: string) => void;
    const pending = session.select("/startup", () => new Promise<string>((resolve) => { complete = resolve; }));
    session.clear();
    complete("stale");
    await expect(pending).rejects.toThrow("session was closed");
    expect(await session.select("/startup", async () => "fresh")).toBe("fresh");
  });
});
