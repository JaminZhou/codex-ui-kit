import { describe, expect, it } from "vitest";
import { readLiveEnvironmentInfo } from "../electron/live-environment-info";

describe("live environment info", () => {
  it("reads the public shell and cwd information for one normalized ID", async () => {
    const calls: unknown[][] = [];
    const client = {
      call: async (...args: unknown[]) => {
        calls.push(args);
        return { cwd: "file:///workspace/demo", shell: { name: "zsh", path: "/bin/zsh" } };
      },
    };

    await expect(readLiveEnvironmentInfo(client as never, " remote:dev ")).resolves.toEqual({
      environmentId: "remote:dev",
      cwd: "file:///workspace/demo",
      shell: { name: "zsh", path: "/bin/zsh" },
    });
    expect(calls).toEqual([["environment/info", { environmentId: "remote:dev" }]]);
  });

  it("keeps a missing cwd explicit and rejects malformed shell data", async () => {
    const missingCwd = { call: async () => ({ cwd: null, shell: { name: "sh", path: "sh" } }) };
    await expect(readLiveEnvironmentInfo(missingCwd as never, "local")).resolves.toMatchObject({ cwd: null });

    const malformed = { call: async () => ({ cwd: null, shell: { name: "", path: "/bin/sh" } }) };
    await expect(readLiveEnvironmentInfo(malformed as never, "local")).rejects.toThrow(/shell name/);
  });
});
