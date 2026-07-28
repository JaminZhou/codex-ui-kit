import { describe, expect, it } from "vitest";
import {
  agentMessageStatus,
  hasActiveTurnWork,
  initialProtocolState,
  isTurnActive,
  reduceProtocolNotification,
  reduceProtocolTrace,
  terminalTranscriptEvents,
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

  it("replays the fixed Markdown response from public protocol messages", () => {
    const scenario = replayScenarios.markdown;
    const runningState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-started"]),
    );
    const state = reduceProtocolTrace(scenario.events);
    const assistant = state.messages.find(
      ({ id }) => id === "assistant-markdown",
    );

    expect(runningState.status).toBe("running");
    expect(
      runningState.messages.find(({ id }) => id === "assistant-markdown")
        ?.status,
    ).toBe("running");
    expect(state.status).toBe("completed");
    expect(assistant?.status).toBe("completed");
    expect(assistant?.text).toContain("# Current-build Markdown sample");
    expect(assistant?.text).toContain("| Markdown | Ready |");
    expect(assistant?.text).toContain("```ts");
    expect(scenario.frames["markdown-complete"]).toBe(scenario.events.length);
  });

  it("preserves an interrupted assistant partial and exposes the stop state", () => {
    const state = reduceProtocolTrace(
      replayScenarios.interruption.events,
    );

    expect(state.status).toBe("interrupted");
    expect(state.messages.at(-1)?.text).toContain("Electron acceptance");
    expect(state.messages.at(-1)?.status).toBe("interrupted");
    expect(state.messages.at(-1)?.interruptionDurationMs).toBe(18_400);
    expect(state.turnDurationMs).toBe(18_400);
  });

  it("preserves an interruption summary after a follow-up turn completes", () => {
    const interrupted = reduceProtocolTrace(
      replayScenarios.interruption.events,
    );
    const followUpEvents = [
      {
        method: "turn/started",
        params: {
          threadId: "thread-demo",
          turn: { id: "turn-follow-up" },
        },
      },
      {
        method: "item/started",
        params: {
          item: {
            id: "assistant-follow-up",
            phase: "final_answer",
            text: "",
            type: "agentMessage",
          },
          threadId: "thread-demo",
          turnId: "turn-follow-up",
        },
      },
      {
        method: "item/completed",
        params: {
          item: {
            id: "assistant-follow-up",
            phase: "final_answer",
            text: "Follow-up complete.",
            type: "agentMessage",
          },
          threadId: "thread-demo",
          turnId: "turn-follow-up",
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
    ] as const;
    const completed = followUpEvents.reduce(
      reduceProtocolNotification,
      interrupted,
    );

    expect(completed.status).toBe("completed");
    expect(
      completed.messages.find(({ id }) => id === "assistant-interrupt")
        ?.interruptionDurationMs,
    ).toBe(18_400);
    expect(completed.messages.at(-1)?.text).toBe("Follow-up complete.");
  });

  it("treats retrying as an active turn so Stop remains available", () => {
    expect(isTurnActive("running")).toBe(true);
    expect(isTurnActive("retrying")).toBe(true);
    expect(isTurnActive("completed")).toBe(false);
  });

  it("preserves failed rendering after a follow-up turn starts", () => {
    const running = [
      {
        method: "turn/started",
        params: { threadId: "thread-demo", turn: { id: "turn-failed" } },
      },
      {
        method: "item/started",
        params: {
          item: {
            id: "assistant-failed",
            phase: "final_answer",
            text: "Partial response",
            type: "agentMessage",
          },
          threadId: "thread-demo",
          turnId: "turn-failed",
        },
      },
    ].reduce(reduceProtocolNotification, initialProtocolState);
    const failed = reduceProtocolNotification(running, {
      method: "error",
      params: {
        error: { message: "Turn failed." },
        threadId: "thread-demo",
        turnId: "turn-failed",
        willRetry: false,
      },
    });
    const followUp = reduceProtocolNotification(failed, {
      method: "turn/started",
      params: {
        threadId: "thread-demo",
        turn: { id: "turn-follow-up" },
      },
    });
    const failedMessage = followUp.messages.find(
      ({ id }) => id === "assistant-failed",
    );

    expect(failedMessage?.status).toBe("failed");
    expect(agentMessageStatus(failedMessage?.status ?? "idle")).toBe("failed");
  });

  it("resets the transcript when notifications switch to a new thread", () => {
    const firstThread = reduceProtocolNotification(initialProtocolState, {
      method: "thread/started",
      params: { thread: { id: "thread-one" } },
    });
    const withMessage = reduceProtocolNotification(firstThread, {
      method: "item/started",
      params: {
        item: {
          content: [{ text: "First thread", type: "text" }],
          id: "user-one",
          type: "userMessage",
        },
      },
    });
    const secondThread = reduceProtocolNotification(withMessage, {
      method: "thread/started",
      params: { thread: { id: "thread-two" } },
    });

    expect(secondThread.threadId).toBe("thread-two");
    expect(secondThread.messages).toEqual([]);
    expect(secondThread.commands).toEqual([]);
    expect(secondThread.approvals).toEqual([]);
    expect(secondThread.fileChanges).toEqual([]);
    expect(secondThread.timeline).toEqual([]);
    expect(secondThread.status).toBe("idle");
    expect(secondThread.eventCount).toBe(3);
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
    expect(running.messages[0]?.compaction).toBe("running");
    expect(completed.messages[0]?.compaction).toBe("completed");
    expect(completed.messages.at(-1)?.compaction).toBeUndefined();
  });

  it("reduces command output, approval requests, and file patches", () => {
    const scenario = replayScenarios["workspace-workflow"];
    const commandRunning = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["command-running"]),
    );
    const approvalPending = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["approval-pending"]),
    );
    const fileChanging = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["file-changing"]),
    );
    const fileApplied = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["file-applied"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(commandRunning.commands[0]).toMatchObject({
      output: "✓ protocol-state.test.ts (10 tests)\n",
      processId: "process-check",
      status: "running",
      terminalEvents: [
        {
          kind: "stdout",
          text: "✓ protocol-state.test.ts (10 tests)\n",
        },
      ],
      terminalInput: "",
    });
    expect(approvalPending.approvals[0]).toMatchObject({
      command: "apply_patch WORKFLOW.md",
      decision: "pending",
      itemId: "command-write",
      kind: "command",
    });
    expect(fileChanging.approvals[0]?.decision).toBe("approved");
    expect(hasActiveTurnWork(fileChanging)).toBe(true);
    expect(fileApplied.status).toBe("running");
    expect(hasActiveTurnWork(fileApplied)).toBe(false);
    expect(fileChanging.fileChanges[0]).toMatchObject({
      changes: [
        {
          kind: "modified",
          path: "WORKFLOW.md",
        },
        {
          kind: "added",
          path: "CHECKS.md",
        },
      ],
      status: "streaming",
    });
    expect(completed.fileChanges[0]?.status).toBe("applied");
    expect(completed.status).toBe("completed");
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "command",
      "command",
      "approval",
      "fileChange",
    ]);
  });

  it("keeps terminal interaction attached to the matching process", () => {
    const scenario = replayScenarios["background-terminal"];
    const terminalOpen = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["terminal-open"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(terminalOpen.commands).toHaveLength(1);
    expect(terminalOpen.commands[0]).toMatchObject({
      command: "pnpm dev",
      cwd: "/workspace/codex-ui-kit",
      output: "VITE ready in 438 ms\nLocal: http://localhost:5173/\n",
      processId: "process-dev",
      status: "running",
      terminalEvents: [
        {
          kind: "stdout",
          text: "VITE ready in 438 ms\nLocal: http://localhost:5173/\n",
        },
        {
          kind: "stdin",
          text: "q\n",
        },
      ],
      terminalInput: "q\n",
    });
    expect(completed.commands[0]).toMatchObject({
      exitCode: 0,
      output:
        "VITE ready in 438 ms\nLocal: http://localhost:5173/\nServer stopped.\n",
      status: "completed",
      terminalEvents: [
        {
          kind: "stdout",
          text: "VITE ready in 438 ms\nLocal: http://localhost:5173/\n",
        },
        {
          kind: "stdin",
          text: "q\n",
        },
        {
          kind: "stdout",
          text: "Server stopped.\n",
        },
      ],
      terminalInput: "q\n",
    });
  });

  it("coalesces adjacent terminal chunks without crossing stdin boundaries", () => {
    const started = reduceProtocolNotification(initialProtocolState, {
      method: "item/started",
      params: {
        item: {
          aggregatedOutput: null,
          command: "pnpm dev",
          cwd: "/workspace/codex-ui-kit",
          id: "command-dev",
          processId: "process-dev",
          status: "inProgress",
          type: "commandExecution",
        },
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });
    const events = [
      {
        method: "item/commandExecution/outputDelta",
        params: {
          delta: "foo",
          itemId: "command-dev",
          threadId: "thread-demo",
          turnId: "turn-terminal",
        },
      },
      {
        method: "item/commandExecution/outputDelta",
        params: {
          delta: "bar\n",
          itemId: "command-dev",
          threadId: "thread-demo",
          turnId: "turn-terminal",
        },
      },
      {
        method: "item/commandExecution/terminalInteraction",
        params: {
          itemId: "command-dev",
          processId: "process-dev",
          stdin: "q\n",
          threadId: "thread-demo",
          turnId: "turn-terminal",
        },
      },
      {
        method: "item/commandExecution/outputDelta",
        params: {
          delta: "stopped\n",
          itemId: "command-dev",
          threadId: "thread-demo",
          turnId: "turn-terminal",
        },
      },
    ] as const;
    const state = events.reduce(reduceProtocolNotification, started);

    expect(state.commands[0]?.output).toBe("foobar\nstopped\n");
    expect(state.commands[0]?.terminalEvents).toEqual([
      { kind: "stdout", text: "foobar\n" },
      { kind: "stdin", text: "q\n" },
      { kind: "stdout", text: "stopped\n" },
    ]);
    expect(
      terminalTranscriptEvents([
        { kind: "stdout", text: "Choice: " },
        { kind: "stdin", text: "q\n" },
        { kind: "stdout", text: "Stopped.\n" },
      ]),
    ).toEqual([
      { kind: "stdout", text: "Choice: q\n" },
      { kind: "stdout", text: "Stopped.\n" },
    ]);
  });

  it("seeds resumed terminal output before appending live deltas", () => {
    const started = reduceProtocolNotification(initialProtocolState, {
      method: "item/started",
      params: {
        item: {
          aggregatedOutput: "existing\n",
          command: "pnpm dev",
          id: "command-resumed",
          processId: "process-resumed",
          status: "inProgress",
          type: "commandExecution",
        },
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });
    const withDelta = reduceProtocolNotification(started, {
      method: "item/commandExecution/outputDelta",
      params: {
        delta: "new\n",
        itemId: "command-resumed",
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });
    const completed = reduceProtocolNotification(withDelta, {
      method: "item/completed",
      params: {
        item: {
          aggregatedOutput: "existing\nnew\nfinished\n",
          command: "pnpm dev",
          id: "command-resumed",
          processId: "process-resumed",
          status: "completed",
          type: "commandExecution",
        },
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });

    expect(withDelta.commands[0]?.output).toBe("existing\nnew\n");
    expect(withDelta.commands[0]?.terminalEvents).toEqual([
      { kind: "stdout", text: "existing\nnew\n" },
    ]);
    expect(completed.commands[0]?.output).toBe(
      "existing\nnew\nfinished\n",
    );
    expect(completed.commands[0]?.terminalEvents).toEqual([
      { kind: "stdout", text: "existing\nnew\nfinished\n" },
    ]);

    const withInput = reduceProtocolNotification(completed, {
      method: "item/commandExecution/terminalInteraction",
      params: {
        itemId: "command-resumed",
        processId: "process-resumed",
        stdin: "q\n",
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });
    const reconnected = reduceProtocolNotification(withInput, {
      method: "item/completed",
      params: {
        item: {
          aggregatedOutput: "authoritative after reconnect\n",
          command: "pnpm dev",
          id: "command-resumed",
          processId: "process-resumed",
          status: "completed",
          type: "commandExecution",
        },
        threadId: "thread-demo",
        turnId: "turn-terminal",
      },
    });
    expect(reconnected.commands[0]?.terminalEvents).toEqual([
      {
        kind: "stdout",
        text: "authoritative after reconnect\n",
      },
      { kind: "stdin", text: "q\n" },
    ]);
  });

  it("preserves both files in the dedicated multi-file review trace", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["multi-file-review"].events,
    );

    expect(completed.status).toBe("completed");
    expect(completed.fileChanges).toHaveLength(1);
    expect(completed.fileChanges[0]).toMatchObject({
      changes: [
        {
          kind: "added",
          path: ".research/ui-kit-multifile-probe/alpha.txt",
        },
        {
          kind: "added",
          path: ".research/ui-kit-multifile-probe/beta.txt",
        },
      ],
      status: "applied",
    });
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "message",
      "fileChange",
    ]);
  });

  it("does not treat historical command and file items as active turn work", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["workspace-workflow"].events,
    );
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-demo",
        turn: { id: "turn-follow-up" },
      },
    });

    expect(hasActiveTurnWork(completed)).toBe(false);
    expect(hasActiveTurnWork(followUp)).toBe(false);
    expect(followUp.commands.length).toBeGreaterThan(0);
    expect(followUp.fileChanges.length).toBeGreaterThan(0);
  });

  it("applies an explicit renderer approval resolution in live state", () => {
    const scenario = replayScenarios["workspace-workflow"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["approval-pending"]),
    );
    const resolved = reduceProtocolNotification(pending, {
      decision: "rejected",
      kind: "approval-resolution",
      requestId: "approval-command-write",
    });

    expect(resolved.approvals[0]?.decision).toBe("rejected");
  });

  it("rejects a pending live approval when the server request resolves", () => {
    const pending = reduceProtocolNotification(initialProtocolState, {
      atMs: 10,
      id: "live-approval",
      kind: "request",
      method: "item/fileChange/requestApproval",
      params: {
        itemId: "file-racing-with-stop",
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });
    const resolved = reduceProtocolNotification(pending, {
      method: "serverRequest/resolved",
      params: {
        requestId: "live-approval",
        threadId: "thread-live",
      },
    });
    const explicitlyApproved = reduceProtocolNotification(pending, {
      decision: "approved",
      kind: "approval-resolution",
      requestId: "live-approval",
    });
    const resolvedAfterApproval = reduceProtocolNotification(
      explicitlyApproved,
      {
        method: "serverRequest/resolved",
        params: {
          requestId: "live-approval",
          threadId: "thread-live",
        },
      },
    );

    expect(resolved.approvals[0]?.decision).toBe("rejected");
    expect(resolvedAfterApproval.approvals[0]?.decision).toBe("approved");
  });

  it("renders file approval requests and resolves them with file lifecycle", () => {
    const started = reduceProtocolNotification(initialProtocolState, {
      method: "item/started",
      params: {
        item: {
          changes: [
            {
              diff: "+new line",
              kind: { type: "update" },
              path: "WORKFLOW.md",
            },
          ],
          id: "file-live",
          status: "inProgress",
          type: "fileChange",
        },
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });
    const pending = reduceProtocolNotification(started, {
      atMs: 10,
      id: "file-approval",
      kind: "request",
      method: "item/fileChange/requestApproval",
      params: {
        itemId: "file-live",
        reason: "Apply the patch.",
        startedAtMs: 10,
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });
    const accepted = reduceProtocolNotification(pending, {
      decision: "approved",
      kind: "approval-resolution",
      requestId: "file-approval",
    });
    const completed = reduceProtocolNotification(accepted, {
      method: "item/completed",
      params: {
        item: {
          changes: [
            {
              diff: "+new line",
              kind: { type: "update" },
              path: "WORKFLOW.md",
            },
          ],
          id: "file-live",
          status: "completed",
          type: "fileChange",
        },
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });

    expect(pending.approvals[0]).toMatchObject({
      command: "WORKFLOW.md",
      decision: "pending",
      kind: "file",
    });
    expect(completed.approvals[0]?.decision).toBe("approved");
  });

  it("falls back when a file approval has no known paths", () => {
    const started = reduceProtocolNotification(initialProtocolState, {
      method: "item/started",
      params: {
        item: {
          changes: [],
          id: "file-without-paths",
          status: "inProgress",
          type: "fileChange",
        },
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });
    const pending = reduceProtocolNotification(started, {
      atMs: 10,
      id: "file-approval-without-paths",
      kind: "request",
      method: "item/fileChange/requestApproval",
      params: {
        itemId: "file-without-paths",
        reason: "Apply the patch.",
        startedAtMs: 10,
        threadId: "thread-live",
        turnId: "turn-live",
      },
    });

    expect(pending.approvals[0]?.command).toBe("File changes");
  });

  it("keeps completed compaction at its historical position on a follow-up turn", () => {
    const compacted = reduceProtocolTrace(replayScenarios.compaction.events);
    const followUp = reduceProtocolNotification(compacted, {
      method: "turn/started",
      params: {
        threadId: "thread-demo",
        turn: { id: "turn-after-compaction" },
      },
    });
    const withFollowUpMessage = reduceProtocolNotification(followUp, {
      method: "item/completed",
      params: {
        item: {
          id: "assistant-after-compaction",
          phase: "final_answer",
          text: "Continued after compaction.",
          type: "agentMessage",
        },
        threadId: "thread-demo",
        turnId: "turn-after-compaction",
      },
    });

    expect(withFollowUpMessage.compaction).toBe("idle");
    expect(withFollowUpMessage.messages[0]?.compaction).toBe("completed");
    expect(withFollowUpMessage.messages.at(-1)?.compaction).toBeUndefined();
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
