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

  it("requires a main-process device proof before accepting user verification", async () => {
    const gate = new LiveMcpElicitationGate();
    const verificationRequest: LiveMcpElicitationRequest = {
      challenge: "opaque-challenge",
      description: "Confirm this account change.",
      mode: "openai/userVerification",
      serverName: "account-tools",
      threadId: "thread-verification",
      title: "Approve account change",
      turnId: "turn-verification",
    };
    const pending = gate.request("verify-1", verificationRequest);

    expect(gate.userVerificationRequest("verify-1", "thread-verification")).toEqual(verificationRequest);
    expect(() => gate.userVerificationRequest("verify-1", "thread-other")).toThrow("another thread");
    expect(() => gate.respond("verify-1", "thread-verification", "accept", {
      credentialId: "renderer-controlled",
      signature: "renderer-controlled",
    })).toThrow("local app-server");

    expect(gate.setUserVerificationRequestId("verify-1", "thread-verification", 501)).toBe(true);
    expect(gate.pendingUserVerificationRequests("thread-verification", "turn-verification")).toEqual([{
      elicitationRequestId: "verify-1",
      threadId: "thread-verification",
      verificationRequestId: 501,
    }]);
    expect(gate.setUserVerificationRequestId("verify-1", "thread-verification", 502)).toBe(false);
    expect(() => gate.respondWithUserVerificationProof("verify-1", "thread-other", {
      credentialId: "credential",
      signature: "signature",
    })).toThrow("another thread");
    expect(() => gate.respondWithUserVerificationProof("verify-1", "thread-verification", {
      credentialId: "credential",
    })).toThrow("invalid verification proof");

    expect(gate.respondWithUserVerificationProof("verify-1", "thread-verification", {
      credentialId: "credential",
      signature: "signed-challenge",
    })).toBe(true);
    await expect(pending).resolves.toEqual({
      _meta: null,
      action: "accept",
      content: { credentialId: "credential", signature: "signed-challenge" },
    });
    expect(gate.clearUserVerificationRequestId("verify-1", "thread-verification")).toBe(false);
  });

  it("cancels the outstanding local verification request when the elicitation is declined", async () => {
    const gate = new LiveMcpElicitationGate();
    const pending = gate.request("verify-cancel", {
      challenge: "opaque-challenge",
      description: "Confirm this account change.",
      mode: "openai/userVerification",
      serverName: "account-tools",
      threadId: "thread-verification",
      title: "Approve account change",
    });
    expect(gate.setUserVerificationRequestId("verify-cancel", "thread-verification", 700)).toBe(true);
    expect(gate.userVerificationRequestId("verify-cancel", "thread-verification")).toBe(700);
    expect(gate.respond("verify-cancel", "thread-verification", "decline")).toBe(true);
    await expect(pending).resolves.toEqual({ _meta: null, action: "decline", content: null });
    expect(gate.userVerificationRequestId("verify-cancel", "thread-verification")).toBeNull();
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
