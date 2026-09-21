import { access } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const { launch } = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("playwright-core", () => ({ _electron: { launch } }));
const { launchIsolatedElectron } = await import("../scripts/electron-session.mjs");

describe("isolated Electron sessions", () => {
  it("gives concurrent sessions separate profiles and removes each only after close", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    launch.mockImplementation(async ({ env }) => ({ directory: env.CODEX_UI_KIT_TEST_USER_DATA_DIR, close }));
    const sessions = await Promise.all([1, 2].map(() => launchIsolatedElectron({ env: {} }, async (app) => app)));
    try {
      expect(sessions[0].directory).not.toBe(sessions[1].directory);
      await Promise.all(sessions.map(({ directory }) => access(directory)));
      await sessions[0].close();
      await expect(access(sessions[0].directory)).rejects.toThrow();
      await access(sessions[1].directory);
      await sessions[0].close();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      await Promise.all(sessions.map((app) => app.close()));
    }
  });

  it("closes the owned process and removes its profile when scene preparation fails", async () => {
    let directory;
    const close = vi.fn().mockResolvedValue(undefined);
    launch.mockImplementation(async ({ env }) => {
      directory = env.CODEX_UI_KIT_TEST_USER_DATA_DIR;
      return { close };
    });
    const failure = new Error("scene never became ready");
    await expect(launchIsolatedElectron({ env: {} }, async () => { throw failure; })).rejects.toBe(failure);
    expect(close).toHaveBeenCalledOnce();
    await expect(access(directory)).rejects.toThrow();
  });

  it("removes an unused profile when Electron fails to launch", async () => {
    let directory;
    const failure = new Error("debugger connection failed");
    launch.mockImplementation(async ({ env }) => {
      directory = env.CODEX_UI_KIT_TEST_USER_DATA_DIR;
      throw failure;
    });
    await expect(launchIsolatedElectron({ env: {} }, async (app) => app)).rejects.toBe(failure);
    await expect(access(directory)).rejects.toThrow();
  });
});
