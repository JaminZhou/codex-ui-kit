import { describe, expect, it } from "vitest";
import {
  initialProtocolState,
  reduceProtocolNotification,
  reduceProtocolTrace,
} from "../src/protocol-state";
import { replayScenarios } from "../src/replay";

describe("protocol lifecycle reducer", () => {
  it("keeps streamed text across a retry and reaches a clean completion", () => {
    const scenario = replayScenarios["streaming-recovery"];
    const retryState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames.retrying),
    );
    const finalState = reduceProtocolTrace(scenario.events);

    expect(retryState.status).toBe("retrying");
    expect(retryState.messages.at(-1)?.text).toContain("streaming, recovery");
    expect(finalState.status).toBe("completed");
    expect(finalState.retrying).toBe(false);
    expect(finalState.messages.at(-1)?.text).toContain("across retries");
  });

  it("preserves an interrupted assistant partial and exposes the stop state", () => {
    const state = reduceProtocolTrace(
      replayScenarios.interruption.events,
    );

    expect(state.status).toBe("interrupted");
    expect(state.messages.at(-1)?.text).toContain("Electron acceptance");
  });

  it("moves context compaction from running to completed", () => {
    const scenario = replayScenarios.compaction;
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames.compacting),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.compaction).toBe("running");
    expect(completed.compaction).toBe("completed");
    expect(completed.status).toBe("completed");
  });

  it("keeps unknown notifications observable without corrupting state", () => {
    const state = reduceProtocolNotification(initialProtocolState, {
      method: "future/notification",
      params: { value: true },
    });

    expect(state.eventCount).toBe(1);
    expect(state.lastMethod).toBe("future/notification");
    expect(state.status).toBe("idle");
  });
});
