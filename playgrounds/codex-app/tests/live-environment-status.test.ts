import { describe, expect, it } from "vitest";
import { normalizeEnvironmentId, readLiveEnvironmentStatus } from "../electron/live-environment-status";

describe("live environment status", () => {
  it("accepts opaque protocol ids but rejects paths, URLs, and empty values", () => {
    expect(normalizeEnvironmentId(" remote:dev_1 ")).toBe("remote:dev_1");
    for (const value of ["", "../other", "https://host", "with space", 1, null]) {
      expect(() => normalizeEnvironmentId(value)).toThrow(/environment/i);
    }
  });

  it("calls only the read-only status method and preserves server status", async () => {
    const calls: unknown[][] = [];
    const client = { call: async (...args: unknown[]) => {
      calls.push(args);
      return { status: "disconnected" as const, error: "offline" };
    } };
    await expect(readLiveEnvironmentStatus(client as never, "remote:dev")).resolves.toEqual({
      environmentId: "remote:dev", status: "disconnected", error: "offline",
    });
    expect(calls).toEqual([["environment/status", { environmentId: "remote:dev" }]]);
  });
});
