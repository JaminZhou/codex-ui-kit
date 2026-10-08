import { afterEach, describe, expect, it, vi } from "vitest";
import { firstTerminalMcpError, mcpToolEvidenceReady, mcpTurnEvidenceReady } from "../scripts/live-mcp-waits.mjs";

const retry = { method: "error", params: { willRetry: true } };
const tool = { method: "item/completed", params: { item: { type: "mcpToolCall" } } };
const turn = (status) => ({ method: "turn/completed", params: { turn: { status } } });
const evidence = (events) => vi.stubGlobal("window", { __liveMcpEvidence: events });
afterEach(() => vi.unstubAllGlobals());

describe("live MCP acceptance wait predicates", () => {
  it("keeps waiting for explicit retry notices rather than passing or failing", () => {
    evidence([retry]);
    expect(mcpToolEvidenceReady(1)).toBe(false);
    expect(mcpTurnEvidenceReady()).toBe(false);
    expect(firstTerminalMcpError([retry])).toBeUndefined();
  });
  it("requires the requested tool count and a completed turn after recovery", () => {
    evidence([retry, tool]);
    expect(mcpToolEvidenceReady(1)).toBe(true);
    expect(mcpToolEvidenceReady(2)).toBe(false);
    expect(mcpTurnEvidenceReady()).toBe(false);
    evidence([retry, tool, turn("completed")]);
    expect(mcpTurnEvidenceReady()).toBe(true);
    expect(firstTerminalMcpError([retry, tool, turn("completed")])).toBeUndefined();
  });
  it.each([false, undefined, "true"])("retains terminal errors with willRetry=%s", (willRetry) => {
    const terminal = { method: "error", params: { willRetry } };
    evidence([retry, terminal]);
    expect(mcpToolEvidenceReady(1)).toBe(true);
    expect(mcpTurnEvidenceReady()).toBe(true);
    expect(firstTerminalMcpError([retry, terminal])).toBe(terminal);
  });
  it.each(["failed", "interrupted"])("retains terminal %s turns", (status) => {
    evidence([retry, turn(status)]);
    expect(mcpToolEvidenceReady(1)).toBe(true);
    expect(mcpTurnEvidenceReady()).toBe(true);
  });
  it("does not count a successful turn without the required tool as a pass", () => {
    evidence([retry, turn("completed")]);
    expect(mcpToolEvidenceReady(1)).toBe(false);
    expect(mcpTurnEvidenceReady()).toBe(true);
  });
});
