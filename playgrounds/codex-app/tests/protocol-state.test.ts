import { describe, expect, it } from "vitest";
import {
  agentMessageStatus,
  hasActiveTurnWork,
  initialProtocolState,
  isTurnActive,
  messageAttachmentAccessibleLabel,
  messageAttachmentPreviewSource,
  reduceProtocolNotification,
  reduceProtocolTrace,
  settleApprovedCommandReplay,
  terminalTranscriptEvents,
} from "../src/protocol-state";
import { replayScenarios } from "../src/replay";

describe("protocol lifecycle reducer", () => {
  it("settles an approved command replay with completed work and a final response", () => {
    const scenario = replayScenarios["approval-denied"];
    const completed = reduceProtocolTrace(scenario.events);
    const settled = settleApprovedCommandReplay(
      completed,
      "approval-open-calculator",
      {
        durationMs: 23_000,
        messageId: "assistant-approval-approved",
        messageText:
          "Approval was granted, and the command completed successfully.",
        replacedMessageId: "assistant-approval-denied",
      },
    );

    expect(settled.approvals).toEqual([
      expect.objectContaining({ decision: "approved" }),
    ]);
    expect(settled.commands).toEqual([
      expect.objectContaining({
        durationMs: 23_000,
        exitCode: 0,
        status: "completed",
      }),
    ]);
    expect(settled.messages.at(-1)).toMatchObject({
      id: "assistant-approval-approved",
      status: "completed",
      text: "Approval was granted, and the command completed successfully.",
    });
    expect(settled.timeline.at(-1)).toEqual({
      id: "assistant-approval-approved",
      kind: "message",
    });
    expect(settled.timeline).toContainEqual({
      id: "command-open-calculator",
      kind: "command",
    });
  });

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

  it("preserves public image inputs with the submitted user message", () => {
    const scenario = replayScenarios["attachment-lifecycle"];
    const submitted = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["attachment-submitted"]),
    );
    const completed = reduceProtocolTrace(scenario.events);
    const user = completed.messages.find(
      ({ id }) => id === "user-attachment-lifecycle",
    );

    expect(submitted.messages[0]?.attachments).toEqual([
      expect.objectContaining({
        kind: "image",
        label: "User attachment",
        sourceType: "remote",
      }),
    ]);
    expect(user?.text).toContain("describing this test");
    expect(user?.attachments?.[0]?.source).toMatch(/^data:image\/png;base64,/);
    expect(completed.messages.at(-1)?.text).toBe(
      "ATTACHMENT LIFECYCLE COMPLETE.",
    );
    expect(completed.turnDurationMs).toBe(7_409);
  });

  it("keeps safe remote image sources and falls back for local or unsafe inputs", () => {
    const remote = {
      kind: "image" as const,
      label: "Evidence",
      sourceType: "remote" as const,
    };

    for (const source of [
      "https://example.com/evidence.png",
      "http://127.0.0.1:3000/evidence.png",
      "blob:https://example.com/attachment-id",
      "data:image/png;base64,fixture",
    ]) {
      expect(
        messageAttachmentPreviewSource({ ...remote, source }, "fallback"),
      ).toBe(source);
    }
    expect(
      messageAttachmentPreviewSource(
        { ...remote, source: "javascript:alert(1)" },
        "fallback",
      ),
    ).toBe("fallback");
    expect(
      messageAttachmentPreviewSource(
        {
          kind: "image",
          label: "local.png",
          source: "/tmp/local.png",
          sourceType: "local",
        },
        "fallback",
      ),
    ).toBe("fallback");
  });

  it("preserves attachment names and disambiguates generic image labels", () => {
    const generic = {
      kind: "image" as const,
      label: "User attachment",
      source: "data:image/png;base64,fixture",
      sourceType: "remote" as const,
    };
    const named = { ...generic, label: "architecture.png" };

    expect(messageAttachmentAccessibleLabel(named, 0, 2)).toBe(
      "architecture.png",
    );
    expect(messageAttachmentAccessibleLabel(generic, 0, 2)).toBe(
      "User attachment 1",
    );
    expect(messageAttachmentAccessibleLabel(generic, 1, 2)).toBe(
      "User attachment 2",
    );
    expect(messageAttachmentAccessibleLabel(generic, 0, 1)).toBe(
      "User attachment",
    );
  });

  it("replays a successful public MCP integration lifecycle", () => {
    const scenario = replayScenarios["mcp-tool-call"];
    const runningState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["mcp-progress"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(runningState.status).toBe("running");
    expect(runningState.mcpToolCalls).toEqual([
      expect.objectContaining({
        appName: "OpenAI Developer Docs",
        progress: ["Searching official OpenAI documentation"],
        server: "openaiDeveloperDocs",
        status: "running",
        toolLabel: "Search OpenAI docs",
      }),
    ]);
    expect(hasActiveTurnWork(runningState)).toBe(true);
    expect(completed.mcpToolCalls).toHaveLength(2);
    expect(completed.mcpToolCalls.every(({ status }) => status === "completed"))
      .toBe(true);
    expect(completed.mcpToolCalls[0]).toMatchObject({
      durationMs: 520,
      structuredContent: {
        title: "Model Context Protocol",
        url: "https://learn.chatgpt.com/docs/extend/mcp",
      },
    });
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "message",
      "mcpToolCall",
      "mcpToolCall",
      "message",
    ]);
    expect(completed.turnDurationMs).toBe(31_000);
    expect(completed.turnDurationsMs["turn-mcp"]).toBe(31_000);
    expect(completed.messages.at(-1)?.text).toContain(
      "https://learn.chatgpt.com/docs/extend/mcp",
    );
    expect(hasActiveTurnWork(completed)).toBe(false);
  });

  it("replays MCP failure recovery followed by a mixed workflow turn", () => {
    const scenario = replayScenarios["mcp-recovery-mixed-thread"];
    const failed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["mcp-recovery-failed"]),
    );
    const retrying = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["mcp-recovery-retrying"]),
    );
    const recovered = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["mcp-recovery-completed"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(failed.mcpToolCalls).toEqual([
      expect.objectContaining({
        error: "Invalid URL",
        status: "failed",
        toolLabel: "Fetch OpenAI doc",
      }),
    ]);
    expect(retrying.mcpToolCalls).toEqual([
      expect.objectContaining({ status: "failed" }),
      expect.objectContaining({
        progress: ["Searching official OpenAI documentation"],
        status: "running",
        toolLabel: "Search OpenAI docs",
      }),
    ]);
    expect(hasActiveTurnWork(retrying)).toBe(true);
    expect(recovered.status).toBe("completed");
    expect(recovered.mcpToolCalls.map(({ status }) => status)).toEqual([
      "failed",
      "completed",
      "completed",
      "completed",
      "completed",
    ]);
    expect(recovered.turnDurationsMs["turn-recovery"]).toBe(51_000);
    expect(recovered.messages.at(-1)?.text).toContain("恢复测试成功");

    expect(completed.status).toBe("completed");
    expect(completed.commands).toHaveLength(2);
    expect(completed.commands[0]).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(completed.approvals).toEqual([
      expect.objectContaining({
        decision: "approved",
        itemId: "command-recovery-note",
      }),
    ]);
    expect(completed.fileChanges).toEqual([
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            kind: "added",
            path: "RECOVERY.md",
          }),
        ],
        status: "applied",
      }),
    ]);
    expect(completed.turnDurationsMs).toMatchObject({
      "turn-recovery": 51_000,
      "turn-workflow": 1_520,
    });
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "message",
      "mcpToolCall",
      "message",
      "mcpToolCall",
      "mcpToolCall",
      "mcpToolCall",
      "mcpToolCall",
      "message",
      "message",
      "command",
      "command",
      "approval",
      "fileChange",
      "message",
    ]);
  });

  it("preserves a failed stdout/stderr command and recovers in the next turn", () => {
    const scenario = replayScenarios["command-failure-recovery"];
    const running = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["command-failure-output-running"],
      ),
    );
    const failed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["command-failure-failed"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.status).toBe("running");
    expect(running.commands).toEqual([
      expect.objectContaining({
        exitCode: null,
        output: expect.stringContaining("stderr-001\nstdout-001"),
        status: "running",
      }),
    ]);
    expect(failed.commands).toEqual([
      expect.objectContaining({ exitCode: 7, status: "failed" }),
    ]);
    expect(failed.commands[0]?.output).toContain("stdout-080\nstderr-080\n");
    expect(failed.commands[0]?.output.split("\n")).toHaveLength(161);
    expect(completed.status).toBe("completed");
    expect(completed.turnDurationsMs).toMatchObject({
      "turn-command-failure": 12_857,
      "turn-command-follow-up": 1_400,
    });
    expect(completed.messages.at(-1)).toMatchObject({
      id: "assistant-command-follow-up",
      text: "Recovery follow-up accepted.",
    });
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "command",
      "message",
      "message",
      "message",
    ]);
  });

  it("replays current command Stop, settlement, and same-thread recovery", () => {
    const scenario = replayScenarios.interruption;
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["command-interruption-running"]),
    );
    const stopping = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["command-interruption-stopping"],
      ),
    );
    const settled = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["command-interruption-settled"]),
    );
    const recovered = reduceProtocolTrace(scenario.events);

    expect(running.status).toBe("running");
    expect(running.commands).toEqual([
      expect.objectContaining({
        id: "command-interruption",
        status: "running",
      }),
    ]);
    expect(stopping.status).toBe("interrupted");
    expect(stopping.commands[0]).toMatchObject({ status: "running" });
    expect(
      stopping.messages.find(({ id }) => id === "user-command-interruption")
        ?.interruptionDurationMs,
    ).toBe(95_000);
    expect(settled.status).toBe("interrupted");
    expect(settled.commands[0]).toMatchObject({
      durationMs: 113_000,
      exitCode: 0,
      status: "completed",
    });
    expect(recovered.status).toBe("completed");
    expect(recovered.turnDurationsMs).toMatchObject({
      "turn-command-interruption": 95_000,
      "turn-command-interruption-recovery": 1_500,
    });
    expect(recovered.messages.at(-1)).toMatchObject({
      id: "assistant-command-interruption-recovery",
      text: "INTERRUPTION RECOVERY ACCEPTED",
    });
    expect(
      recovered.messages.find(({ id }) => id === "user-command-interruption")
        ?.interruptionDurationMs,
    ).toBe(95_000);
    expect(recovered.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "command",
      "message",
      "message",
    ]);
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
    expect(secondThread.mcpToolCalls).toEqual([]);
    expect(secondThread.timeline).toEqual([]);
    expect(secondThread.status).toBe("idle");
    expect(secondThread.eventCount).toBe(3);
  });

  it("replays current manual context compaction and same-thread recovery", () => {
    const scenario = replayScenarios.compaction;
    const running = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["context-compaction-running"],
      ),
    );
    const completed = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["context-compaction-completed"],
      ),
    );
    const recovered = reduceProtocolTrace(scenario.events);

    expect(running.compaction).toBe("running");
    expect(completed.compaction).toBe("completed");
    expect(completed.status).toBe("completed");
    expect(running.messages.at(-1)).toMatchObject({
      compaction: "running",
      id: "assistant-compaction-baseline",
    });
    expect(completed.messages.at(-1)).toMatchObject({
      compaction: "completed",
      id: "assistant-compaction-baseline",
    });
    expect(recovered.messages.at(-1)).toMatchObject({
      id: "assistant-context-compaction-recovery",
      text: "COMPACTION RECOVERY ACCEPTED",
    });
    expect(recovered.messages.at(-1)?.compaction).toBeUndefined();
    expect(recovered.turnDurationsMs).toMatchObject({
      "turn-compaction-baseline": 1_500,
      "turn-context-compaction": 8_000,
      "turn-context-compaction-recovery": 1_500,
    });
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

  it("reduces the current denied approval without executing the command", () => {
    const scenario = replayScenarios["approval-denied"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-pending"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(pending.approvals[0]).toMatchObject({
      command: "open -a Calculator",
      decision: "pending",
      itemId: "command-open-calculator",
      kind: "command",
    });
    expect(pending.commands[0]).toMatchObject({
      command: "open -a Calculator",
      output: "",
      status: "running",
    });
    expect(completed.approvals[0]?.decision).toBe("rejected");
    expect(completed.commands[0]).toMatchObject({
      exitCode: null,
      output: "",
      status: "failed",
    });
    expect(completed.messages.at(-1)?.text).toBe(
      "Approval was not granted, so the command was not run.",
    );
    expect(completed.status).toBe("completed");
  });

  it("reduces the current allow-once approval through command completion", () => {
    const scenario = replayScenarios["approval-allow-once"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-allow-once-pending"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(pending.approvals[0]).toMatchObject({
      command: "open -a Calculator",
      decision: "pending",
      itemId: "command-open-calculator-once",
      kind: "command",
      responseDecision: "approved",
    });
    expect(pending.commands[0]).toMatchObject({
      command: "open -a Calculator",
      output: "",
      status: "running",
    });
    expect(completed.approvals[0]?.decision).toBe("approved");
    expect(completed.commands[0]).toMatchObject({
      durationMs: 288_400,
      exitCode: 0,
      output: "",
      status: "completed",
    });
    expect(completed.messages.at(-1)?.text).toBe(
      "ALLOW ONCE COMPLETE.",
    );
    expect(completed.status).toBe("completed");
    expect(completed.turnDurationMs).toBe(290_000);
  });

  it("persists a matching command rule without a second approval", () => {
    const scenario = replayScenarios["approval-similar-commands"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-similar-pending"],
      ),
    );
    const firstCompleted = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-similar-first-completed"],
      ),
    );
    const repeatedCompleted = reduceProtocolTrace(scenario.events);

    expect(pending.approvals).toHaveLength(1);
    expect(pending.approvals[0]).toMatchObject({
      command: "open -a Calculator",
      decision: "pending",
      itemId: "command-open-calculator-similar-first",
      responseDecision: "approved",
    });
    expect(firstCompleted.approvals).toHaveLength(1);
    expect(firstCompleted.approvals[0]?.decision).toBe("approved");
    expect(firstCompleted.commands).toHaveLength(1);
    expect(firstCompleted.commands[0]).toMatchObject({
      durationMs: 99_900,
      exitCode: 0,
      status: "completed",
    });
    expect(firstCompleted.messages.at(-1)?.text).toBe(
      "SESSION APPROVAL FIRST COMPLETE.",
    );
    expect(firstCompleted.turnDurationsMs).toEqual({
      "turn-approval-similar-first": 101_000,
    });

    expect(repeatedCompleted.approvals).toHaveLength(1);
    expect(repeatedCompleted.commands).toHaveLength(2);
    expect(
      repeatedCompleted.commands.every(
        ({ exitCode, status }) => exitCode === 0 && status === "completed",
      ),
    ).toBe(true);
    expect(repeatedCompleted.messages.at(-1)?.text).toBe(
      "SESSION APPROVAL SECOND COMPLETE.",
    );
    expect(repeatedCompleted.turnDurationsMs).toEqual({
      "turn-approval-similar-first": 101_000,
      "turn-approval-similar-second": 7_000,
    });
  });

  it("preserves rename, delete, binary, and conflict patch evidence", () => {
    const state = reduceProtocolTrace(
      replayScenarios["mixed-file-review"].events,
    );

    expect(state.fileChanges).toHaveLength(1);
    expect(state.fileChanges[0]).toMatchObject({
      changes: [
        {
          kind: "renamed",
          path: ".research/mixed-review/new-name.ts",
          previousPath: ".research/mixed-review/old-name.ts",
        },
        {
          kind: "deleted",
          path: ".research/mixed-review/obsolete.ts",
        },
        {
          kind: "modified",
          path: ".research/mixed-review/preview.png",
        },
        {
          kind: "modified",
          path: ".research/mixed-review/conflicted.ts",
        },
      ],
      status: "applied",
    });
    expect(state.fileChanges[0]?.changes[2]?.diff).toContain("Binary files");
    expect(state.fileChanges[0]?.changes[3]?.diff).toContain("<<<<<<< HEAD");
  });

  it("preserves the current marker-backed rename presentation", () => {
    const state = reduceProtocolTrace(
      replayScenarios["current-review-rename"].events,
    );

    expect(state.fileChanges).toHaveLength(1);
    expect(state.fileChanges[0]).toMatchObject({
      changes: [
        {
          kind: "modified",
          path: ".research/current-review-probe/rename-only.txt",
        },
        {
          kind: "modified",
          path: ".research/current-review-probe/renamed-only.txt",
        },
      ],
      status: "applied",
    });
    expect(state.fileChanges[0]?.changes[0]?.diff).toContain(
      "+__CODEX_TEMP_RENAME_MARKER__",
    );
    expect(state.fileChanges[0]?.changes[1]?.diff).toContain(
      "-__CODEX_TEMP_RENAME_MARKER__",
    );
    expect(state.messages.at(-1)?.text).toBe("Rename probe complete.");
    expect(state.turnDurationsMs).toEqual({
      "turn-current-review-rename": 52_000,
    });
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

  it("replays running, failed, and exited terminal processes independently", () => {
    const scenario = replayScenarios["terminal-lifecycle"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["terminal-running"]),
    );
    const failed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["terminal-failed"]),
    );
    const multiTab = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["terminal-multi-tab"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.commands).toMatchObject([
      {
        id: "command-terminal-dev",
        processId: "process-terminal-dev",
        status: "running",
      },
    ]);
    expect(failed.commands).toMatchObject([
      { id: "command-terminal-dev", status: "running" },
      {
        exitCode: 1,
        id: "command-terminal-test",
        status: "failed",
      },
    ]);
    expect(multiTab.commands).toMatchObject([
      { id: "command-terminal-dev", status: "running" },
      { id: "command-terminal-test", status: "failed" },
      { id: "command-terminal-docs", status: "completed" },
    ]);
    expect(completed.commands).toMatchObject([
      {
        id: "command-terminal-dev",
        status: "completed",
        terminalInput: "q\n",
      },
      { id: "command-terminal-test", status: "failed" },
      { id: "command-terminal-docs", status: "completed" },
    ]);
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
    const scenario = replayScenarios.compaction;
    const compacted = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["context-compaction-completed"],
      ),
    );
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
    expect(
      withFollowUpMessage.messages.find(
        ({ id }) => id === "assistant-compaction-baseline",
      )?.compaction,
    ).toBe("completed");
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
