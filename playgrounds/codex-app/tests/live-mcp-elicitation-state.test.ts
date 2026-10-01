import { describe, expect, it } from "vitest";
import { initialProtocolState, reduceProtocolNotification } from "../src/protocol-state";
import { reduceLiveMcpElicitations, type PendingMcpElicitation } from "../src/live-mcp-elicitation-state";

describe("live MCP elicitation state", () => {
  it("normalizes device verification without requiring the form-only message field", () => {
    const result = reduceLiveMcpElicitations([], {
      id: "verify-1",
      kind: "request",
      method: "mcpServer/elicitation/request",
      params: {
        challenge: "opaque-challenge",
        description: "Confirm this account change.",
        mode: "openai/userVerification",
        serverName: "account-tools",
        threadId: "thread-verification",
        title: "Approve account change",
        turnId: null,
      },
    });

    expect(result).toEqual([{
      challenge: "opaque-challenge",
      description: "Confirm this account change.",
      mode: "openai/userVerification",
      requestId: "verify-1",
      serverName: "account-tools",
      threadId: "thread-verification",
      title: "Approve account change",
      turnId: null,
    }]);
  });

  it("ignores malformed verification requests instead of inventing approval context", () => {
    const state: PendingMcpElicitation[] = [];
    expect(reduceLiveMcpElicitations(state, {
      id: "verify-bad",
      kind: "request",
      method: "mcpServer/elicitation/request",
      params: {
        challenge: "opaque-challenge",
        description: "Confirm this account change.",
        mode: "openai/userVerification",
        serverName: "account-tools",
        threadId: "thread-verification",
      },
    })).toBe(state);
  });

  it("keeps device verification as a distinct replay protocol item", () => {
    const result = reduceProtocolNotification(initialProtocolState, {
      id: 88,
      kind: "request",
      method: "mcpServer/elicitation/request",
      params: {
        challenge: "opaque-challenge",
        description: "Confirm this account change.",
        mode: "openai/userVerification",
        serverName: "account-tools",
        threadId: "thread-verification",
        title: "Approve account change",
        turnId: "turn-verification",
      },
    });

    expect(result.mcpElicitations).toEqual([{
      challenge: "opaque-challenge",
      description: "Confirm this account change.",
      id: "mcp-elicitation:88",
      mode: "openai/userVerification",
      requestId: 88,
      serverName: "account-tools",
      threadId: "thread-verification",
      title: "Approve account change",
      turnId: "turn-verification",
    }]);
  });

  it("normalizes device verification into the transcript replay state", () => {
    const result = reduceProtocolNotification(initialProtocolState, {
      id: 88,
      kind: "request",
      method: "mcpServer/elicitation/request",
      params: {
        challenge: "opaque-challenge",
        description: "Confirm this account change.",
        mode: "openai/userVerification",
        serverName: "account-tools",
        threadId: "thread-verification",
        title: "Approve account change",
        turnId: "turn-verification",
      },
    });

    expect(result.mcpElicitations).toEqual([{
      challenge: "opaque-challenge",
      description: "Confirm this account change.",
      id: "mcp-elicitation:88",
      mode: "openai/userVerification",
      requestId: 88,
      serverName: "account-tools",
      threadId: "thread-verification",
      title: "Approve account change",
      turnId: "turn-verification",
    }]);
  });
});
