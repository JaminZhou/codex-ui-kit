import { describe, expect, it } from "vitest";
import {
  addLiveEnvironment,
  normalizeExecServerUrl,
} from "../electron/live-environment-add";

describe("live environment add", () => {
  it("accepts credential-free websocket endpoints and canonicalizes them", () => {
    expect(normalizeExecServerUrl(" wss://exec.example.test/socket ")).toBe(
      "wss://exec.example.test/socket",
    );
    expect(normalizeExecServerUrl("ws://127.0.0.1:8787")).toBe(
      "ws://127.0.0.1:8787/",
    );
  });

  it("rejects non-websocket, credentialed, and fragment URLs", () => {
    for (const value of [
      "https://exec.example.test",
      "file:///tmp/exec",
      "wss://user:pass@exec.example.test",
      "wss://exec.example.test/#secret",
      "",
      null,
    ]) {
      expect(() => normalizeExecServerUrl(value)).toThrow(/exec server|URL/i);
    }
  });

  it("calls the public environment/add method with the normalized payload", async () => {
    const calls: unknown[][] = [];
    const client = {
      call: async (...args: unknown[]) => {
        calls.push(args);
        return {};
      },
    };
    await expect(
      addLiveEnvironment(client as never, "remote:dev", "wss://exec.test"),
    ).resolves.toEqual({
      environmentId: "remote:dev",
      execServerUrl: "wss://exec.test/",
      status: "added",
    });
    expect(calls).toEqual([
      [
        "environment/add",
        { environmentId: "remote:dev", execServerUrl: "wss://exec.test/" },
      ],
    ]);
  });
});
