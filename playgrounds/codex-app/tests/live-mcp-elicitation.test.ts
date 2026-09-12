import { describe, expect, it } from "vitest";
import { LiveMcpElicitationGate, type LiveMcpElicitationRequest } from "../electron/live-mcp-elicitation";

const request: LiveMcpElicitationRequest = {
  message: "Choose a project before the server continues.",
  mode: "form",
  requestedSchema: {
    type: "object",
    properties: {
      project: { type: "string", enum: ["codex-ui-kit", "app-server"] },
      owner: { type: "string" },
      notify: { type: "boolean" },
    },
    required: ["project", "owner"],
  },
  serverName: "workspace-tools",
  threadId: "thread-a",
  turnId: "turn-a",
};

describe("live MCP elicitation gate", () => {
  it("delivers validated form content once and keeps ownership at the thread boundary", async () => {
    const gate = new LiveMcpElicitationGate();
    const pending = gate.request(77, request);

    expect(() => gate.respond(77, "thread-b", "accept", {
      project: "codex-ui-kit",
      owner: "Jamin",
      notify: true,
    })).toThrow("another thread");
    for (const invalid of [
      { project: "codex-ui-kit", notify: true },
      { project: "unknown", owner: "Jamin", notify: true },
      { project: "codex-ui-kit", owner: "Jamin", notify: "yes" },
      { project: "codex-ui-kit", owner: "Jamin", notify: true, extra: "no" },
    ]) {
      expect(() => gate.respond(77, "thread-a", "accept", invalid)).toThrow(TypeError);
    }

    expect(gate.respond(77, "thread-a", "accept", {
      project: "codex-ui-kit",
      owner: "Jamin",
      notify: true,
    })).toBe(true);
    await expect(pending).resolves.toEqual({
      _meta: null,
      action: "accept",
      content: { project: "codex-ui-kit", owner: "Jamin", notify: true },
    });
    expect(gate.respond(77, "thread-a", "accept", {})).toBe(false);
  });

  it("cancels URL-mode requests without echoing a URL or answer", async () => {
    const gate = new LiveMcpElicitationGate();
    const pending = gate.request("oauth", {
      message: "Authorize the connected account.",
      mode: "url",
      serverName: "github",
      threadId: "thread-a",
      url: "https://example.com/authorize",
    });

    expect(gate.cancel("oauth", "thread-a")).toBe(true);
    await expect(pending).resolves.toEqual({ _meta: null, action: "cancel", content: null });
    expect(gate.cancel("oauth", "thread-a")).toBe(false);
  });

  it("settles replaced and cleared requests as cancellation", async () => {
    const gate = new LiveMcpElicitationGate();
    const first = gate.request(1, request);
    const second = gate.request(1, request);
    await expect(first).resolves.toEqual({ _meta: null, action: "cancel", content: null });
    gate.clearTurn("thread-a", "turn-a");
    await expect(second).resolves.toEqual({ _meta: null, action: "cancel", content: null });
  });
});
