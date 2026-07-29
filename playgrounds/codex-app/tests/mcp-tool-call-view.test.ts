import { describe, expect, it } from "vitest";
import {
  mcpToolCallGroupDurationMs,
  mcpToolCallGroupForEntry,
  mcpToolCallPresentation,
} from "../src/mcp-tool-call-view";
import {
  reduceProtocolNotification,
  reduceProtocolTrace,
} from "../src/protocol-state";
import { replayScenarios } from "../src/replay";

describe("MCP tool-call view model", () => {
  it("renders a turn/server group only at its first matching timeline entry", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["mcp-tool-call"].events,
    );
    const [user, firstCall, secondCall, ...tail] = completed.timeline;
    const assistant = tail.at(-1);
    const interleaved = {
      ...completed,
      timeline: [
        user,
        firstCall,
        assistant,
        secondCall,
        ...tail.slice(0, -1),
      ].filter((entry) => entry !== undefined),
    };

    expect(mcpToolCallGroupForEntry(interleaved, 1)).toHaveLength(5);
    expect(mcpToolCallGroupForEntry(interleaved, 3)).toBeNull();
  });

  it("keeps a historical group duration scoped to its own turn", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["mcp-tool-call"].events,
    );
    const afterFollowUp = [
      {
        method: "turn/started",
        params: {
          threadId: "thread-demo",
          turn: { id: "turn-follow-up" },
        },
      },
      {
        method: "turn/completed",
        params: {
          threadId: "thread-demo",
          turn: {
            durationMs: 900,
            id: "turn-follow-up",
            status: "completed",
          },
        },
      },
    ].reduce(reduceProtocolNotification, completed);
    const calls = mcpToolCallGroupForEntry(afterFollowUp, 1);

    expect(calls).not.toBeNull();
    expect(mcpToolCallGroupDurationMs(afterFollowUp, calls!)).toBe(54_000);
    expect(afterFollowUp.turnDurationMs).toBe(900);
    expect(afterFollowUp.turnDurationsMs).toMatchObject({
      "turn-follow-up": 900,
      "turn-mcp": 54_000,
    });
  });

  it("passes a failed MCP diagnostic through to the tool card", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["mcp-tool-call"].events,
    );
    const call = completed.mcpToolCalls[0];
    expect(call).toBeDefined();

    expect(
      mcpToolCallPresentation({
        ...call!,
        content: [],
        error: "MCP request timed out",
        status: "failed",
        structuredContent: null,
      }),
    ).toEqual({
      error: "MCP request timed out",
      result: undefined,
      structuredContent: undefined,
      summary: undefined,
    });
  });
});
