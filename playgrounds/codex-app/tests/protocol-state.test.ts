import { describe, expect, it } from "vitest";
import {
  agentMessageStatus,
  hasActiveTurnWork,
  initialProtocolState,
  isCurrentTurnGroupActive,
  isTurnActive,
  latestSubagentLifecyclesById,
  messageAttachmentAccessibleLabel,
  messageAttachmentPreviewSource,
  reduceProtocolNotification,
  reduceProtocolTrace,
  settleApprovedCommandReplay,
  settleRejectedFileReplay,
  subagentLifecycleGroup,
  subagentTimelinePresentation,
  terminalTranscriptEvents,
} from "../src/protocol-state";
import { replayScenarios } from "../src/replay";

describe("protocol lifecycle reducer", () => {
  it("replays current 26.825 search and Browser tool evidence", () => {
    const searchScenario = replayScenarios["current-search-26-825"];
    const search = reduceProtocolTrace(searchScenario.events);
    expect(searchScenario.frames).toEqual({
      "conversation-search-current-26-825": 8,
      "conversation-search-current-26-825-open": 10,
      "conversation-search-current-26-825-worked-open": 9,
    });
    expect(search.webSearches).toEqual([
      expect.objectContaining({
        query: "Codex app desktop",
        status: "completed",
      }),
      expect.objectContaining({ query: '\"desktop\"', status: "completed" }),
    ]);

    const browserScenario = replayScenarios["current-browser-26-825"];
    const browser = reduceProtocolTrace(browserScenario.events);
    expect(browserScenario.frames).toEqual({
      "conversation-browser-current-26-825": 8,
      "conversation-browser-current-26-825-open": 10,
      "conversation-browser-current-26-825-worked-open": 9,
    });
    expect(browser.mcpToolCalls).toEqual([
      expect.objectContaining({
        browserUse: false,
        readOnlyHint: true,
      }),
      expect.objectContaining({
        browserUrl: "https://openai.com/codex/",
        browserUse: true,
        readOnlyHint: true,
      }),
    ]);
  });

  it("tracks the current Plan updates only for the active turn", () => {
    const scenario = replayScenarios["current-plan-26-825"];
    const active = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["conversation-plan-current-26-825"],
      ),
    );
    const progressed = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["conversation-plan-current-26-825-progress"],
      ),
    );
    const allComplete = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["conversation-plan-current-26-825-all-complete"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(active.status).toBe("running");
    expect(active.planTurnId).toBe("turn-current-plan-26-825");
    expect(active.plan).toEqual([
      { status: "in_progress", step: "确认目标" },
      { status: "pending", step: "确认范围" },
      { status: "pending", step: "识别约束" },
      { status: "pending", step: "排列步骤" },
      { status: "pending", step: "检查状态" },
      { status: "pending", step: "验证顺序" },
      { status: "pending", step: "总结观察" },
      { status: "pending", step: "报告完成" },
    ]);
    expect(progressed.plan[4]).toEqual({
      status: "in_progress",
      step: "检查状态",
    });
    expect(progressed.planExplanation).toBe(
      "前四步已完成，继续核对状态。",
    );
    expect(
      allComplete.plan.every(({ status }) => status === "completed"),
    ).toBe(true);
    expect(completed.status).toBe("completed");
    expect(completed.plan).toEqual([]);
    expect(completed.planTurnId).toBeNull();

    const lateUpdate = reduceProtocolNotification(completed, {
      method: "turn/plan/updated",
      params: {
        explanation: null,
        plan: [{ status: "inProgress", step: "Late step" }],
        threadId: "thread-current-plan-26-825",
        turnId: "turn-current-plan-26-825",
      },
    });
    expect(lateUpdate.plan).toEqual([]);
  });

  it("replays the current fixed basic turn to a clean completion", () => {
    const scenario = replayScenarios["current-basic-message"];
    const completed = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "current-basic-completed": 5,
    });
    expect(completed.status).toBe("completed");
    expect(
      completed.messages.map(({ id, status, text }) => ({
        id,
        status,
        text,
      })),
    ).toEqual([
      {
        id: "user-current-basic",
        status: "completed",
        text: "Reply with exactly CURRENT BASIC MESSAGE.",
      },
      {
        id: "assistant-current-basic",
        status: "completed",
        text: "CURRENT BASIC MESSAGE.",
      },
    ]);
  });

  it("replays the current 26.825 basic turn without changing its exact reply", () => {
    const scenario = replayScenarios["current-basic-message-26-825"];
    const completed = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "current-basic-26-825-completed": 5,
    });
    expect(completed.status).toBe("completed");
    expect(
      completed.messages.map(({ id, status, text }) => ({
        id,
        status,
        text,
      })),
    ).toEqual([
      {
        id: "user-current-basic-26-825",
        status: "completed",
        text: "Reply with exactly CURRENT BASIC MESSAGE.",
      },
      {
        id: "assistant-current-basic-26-825",
        status: "completed",
        text: "CURRENT BASIC MESSAGE",
      },
    ]);
  });

  it("replays the current 26.825 citation response to a stable completed frame", () => {
    const scenario = replayScenarios["current-citations-26-825"];
    const completed = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "citations-current-26-825-completed": 5,
    });
    expect(completed.status).toBe("completed");
    expect(completed.messages.at(-1)).toEqual(
      expect.objectContaining({
        id: "assistant-current-citations-26-825",
        status: "completed",
        text: "CITATION_SOURCES_READY",
      }),
    );
  });

  it("settles an approved command replay with completed work and a final response", () => {
    const scenario = replayScenarios["approval-denied"];
    const completed = reduceProtocolTrace(scenario.events);
    const settled = settleApprovedCommandReplay(
      completed,
      "approval-create-sentinel",
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
      id: "command-create-approval-sentinel",
      kind: "command",
    });
  });

  it("keeps streamed text across a retry and reaches a clean completion", () => {
    const scenario = replayScenarios["streaming-recovery"];
    const retryState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames.retrying),
    );
    const recoveredState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames.recovered),
    );
    const finalState = reduceProtocolTrace(scenario.events);

    expect(retryState.status).toBe("retrying");
    expect(retryState.messages.at(-1)?.text).toContain("streaming, recovery");
    expect(retryState.streamErrors).toEqual([
      expect.objectContaining({
        content: "Reconnecting 1/5",
        reconnectAttempt: 1,
        reconnectMaxAttempts: 5,
      }),
    ]);
    expect(retryState.timeline.at(-1)?.kind).toBe("streamError");
    expect(recoveredState.status).toBe("completed");
    expect(recoveredState.retrying).toBe(false);
    expect(recoveredState.messages.at(-1)?.text).toContain("across retries");
    expect(finalState.status).toBe("completed");
    expect(finalState.messages.at(-1)?.text).toContain("prior recovery history");
  });

  it("keeps one progress row through retry updates, final failure, and follow-up", () => {
    const scenario = replayScenarios["streaming-recovery"];
    const progress = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["retrying-progress"]),
    );
    const failed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["transport-failed"]),
    );
    const retrySubmitted = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["transport-retry-submitted"]),
    );
    const retried = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["transport-retried"]),
    );

    expect(progress.streamErrors).toEqual([
      expect.objectContaining({
        content: "Reconnecting 2/5",
        reconnectAttempt: 2,
        serverBusy: true,
      }),
    ]);
    expect(progress.timeline.filter(({ kind }) => kind === "streamError")).toHaveLength(1);
    expect(failed.status).toBe("failed");
    expect(failed.systemErrors).toEqual([
      expect.objectContaining({
        content: "Response stream disconnected before completion.",
        turnId: "turn-final-failure",
      }),
    ]);
    expect(retrySubmitted.error).toBeNull();
    expect(retried.error).toBeNull();
    expect(retried.status).toBe("completed");
    expect(retried.timeline.filter(({ kind }) => kind === "systemError")).toHaveLength(1);
    expect(retried.messages.at(-1)).toMatchObject({
      id: "assistant-after-failure",
      status: "completed",
    });
  });

  it("updates consecutive reconnect progress in place and preserves details", () => {
    const first = reduceProtocolNotification(initialProtocolState, {
      method: "error",
      params: {
        error: {
          additionalDetails: "upstream closed early",
          codexErrorInfo: "serverOverloaded",
          message: "Reconnecting... 1/5",
        },
        threadId: "thread-demo",
        turnId: "turn-retry",
        willRetry: true,
      },
    });
    const second = reduceProtocolNotification(first, {
      method: "error",
      params: {
        error: {
          additionalDetails: "second attempt",
          codexErrorInfo: {
            responseStreamDisconnected: { httpStatusCode: 429 },
          },
          message: "Reconnecting 2/5",
        },
        threadId: "thread-demo",
        turnId: "turn-retry",
        willRetry: true,
      },
    });

    expect(second.streamErrors).toHaveLength(1);
    expect(second.timeline.filter(({ kind }) => kind === "streamError")).toHaveLength(1);
    expect(second.streamErrors[0]).toMatchObject({
      additionalDetails: "second attempt",
      content: "Reconnecting 2/5",
      reconnectAttempt: 2,
      reconnectMaxAttempts: 5,
      serverBusy: true,
    });
  });

  it("retains a final system error after the next turn starts", () => {
    const failed = reduceProtocolNotification(initialProtocolState, {
      method: "error",
      params: {
        error: {
          additionalDetails: null,
          codexErrorInfo: "internalServerError",
          message: "The turn failed.",
        },
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

    expect(followUp.error).toBeNull();
    expect(followUp.systemErrors).toEqual([
      expect.objectContaining({
        content: "The turn failed.",
        turnId: "turn-failed",
      }),
    ]);
    expect(followUp.timeline.at(-1)?.kind).toBe("systemError");
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

  it("replays the current wide Markdown table fixture exactly", () => {
    const scenario = replayScenarios["markdown-table-actions"];
    const state = reduceProtocolTrace(scenario.events);
    const assistant = state.messages.find(
      ({ id }) => id === "assistant-markdown-table-actions",
    );
    const lines = assistant?.text.split("\n") ?? [];

    expect(state.status).toBe("completed");
    expect(assistant?.status).toBe("completed");
    expect(lines).toHaveLength(5);
    expect(lines[0].match(/PROBE-COL-/g)).toHaveLength(18);
    expect(lines[2].match(/row-1-value-/g)).toHaveLength(18);
    expect(lines[4]).toContain("row-3-value-18-abcdefghij");
    expect(scenario.frames["markdown-table-complete"]).toBe(
      scenario.events.length,
    );
  });

  it("replays the current 26.818 Markdown sample exactly", () => {
    const scenario = replayScenarios["markdown-current-26-818"];
    const state = reduceProtocolTrace(scenario.events);
    const assistant = state.messages.find(
      ({ id }) => id === "assistant-markdown",
    );

    expect(scenario.frames).toEqual({
      "markdown-current-26-818-complete": scenario.events.length,
      "markdown-current-26-818-started": 3,
    });
    expect(state.status).toBe("completed");
    expect(assistant).toMatchObject({
      status: "completed",
      text: expect.stringContaining("| Markdown | Ready |"),
    });
    expect(assistant?.text).toContain("a public link.");
    expect(assistant?.text).not.toContain("https://example.com");
  });

  it("replays the current 26.820 Markdown media states exactly", () => {
    const scenario = replayScenarios["markdown-current-26-820-media"];
    const state = reduceProtocolTrace(scenario.events);
    const assistant = state.messages.find(
      ({ id }) => id === "assistant-markdown-media",
    );

    expect(scenario.frames).toEqual({
      "markdown-current-26-820-media-complete": scenario.events.length,
      "markdown-current-26-820-media-started": 3,
    });
    expect(state.status).toBe("completed");
    expect(assistant).toMatchObject({
      status: "completed",
      text: expect.stringContaining("$$"),
    });
    expect(assistant?.text).toContain("$E = mc^2$");
    expect(assistant?.text).toContain("[^1]");
    expect(assistant?.text).toContain("current-markdown-preview.png");
    expect(assistant?.text).toContain("codex-ui-kit-missing.png");
  });

  it("replays the current 26.825 loaded and unavailable Markdown media turns exactly", () => {
    const scenario = replayScenarios["markdown-current-26-825-media"];
    const loadedState = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["markdown-current-26-825-media-loaded"],
      ),
    );
    const state = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "markdown-current-26-825-media-loaded": 5,
      "markdown-current-26-825-media-unavailable": scenario.events.length,
    });
    expect(loadedState.messages.at(-1)).toMatchObject({
      id: "assistant-markdown-current-26-825-media-loaded",
      status: "completed",
      text: expect.stringContaining("https://openai.com/favicon.ico"),
    });
    expect(state.status).toBe("completed");
    expect(state.messages.at(-1)).toMatchObject({
      id: "assistant-markdown-current-26-825-media-unavailable",
      status: "completed",
      text: expect.stringContaining(
        "https://example.invalid/codex-ui-kit-current-media.png",
      ),
    });
  });

  it("preserves streaming Markdown mutations before a large completion", () => {
    const scenario = replayScenarios["markdown-streaming-large"];
    const linkState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-stream-link"]),
    );
    const fenceState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-stream-fence"]),
    );
    const tableState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-stream-table"]),
    );
    const largeState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-stream-large"]),
    );
    const tailState = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["markdown-stream-tail"]),
    );
    const completedState = reduceProtocolTrace(scenario.events);
    const message = (state: typeof linkState) =>
      state.messages.find(
        ({ id }) => id === "assistant-markdown-streaming-large",
      );

    expect(message(linkState)?.text).toBe(
      "# Current 26.825 rich Markdown stream\n\nThis paragraph contains **strong text**, `inline code`, and a [public Codex link](https://openai.com/codex/).",
    );
    expect(message(fenceState)?.text).toContain("- [x] Verify rendered chunks");
    expect(message(fenceState)?.text).toMatch(/```ts\n$/);
    expect(message(fenceState)?.status).toBe("running");
    expect(message(tableState)?.text).toContain(
      'const chunks = ["link", "code", "table"];',
    );
    expect(message(tableState)?.text).toContain(
      "| Width A | Width B | Width C |",
    );
    expect(message(largeState)?.text).toContain("## Section 19");
    expect(message(largeState)?.text).not.toContain("## Section 20");
    expect(message(tailState)?.text).toContain("## Section 36");
    expect(message(tailState)?.text).toContain("CURRENT RICH STREAM DONE");
    expect(message(tailState)?.status).toBe("running");
    expect(message(completedState)?.status).toBe("completed");
    expect(message(completedState)?.text).toBe(message(tailState)?.text);
    expect(completedState.status).toBe("completed");
    expect(scenario.frames["markdown-stream-complete"]).toBe(
      scenario.events.length,
    );
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

  it("replays the current two-call MCP success sequence", () => {
    const scenario = replayScenarios["mcp-current-success"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["mcp-current-running"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.mcpToolCalls).toEqual([
      expect.objectContaining({
        status: "running",
        toolLabel: "Search OpenAI docs",
      }),
    ]);
    expect(completed.mcpToolCalls.map(({ toolLabel }) => toolLabel)).toEqual([
      "Search OpenAI docs",
      "Fetch OpenAI doc",
    ]);
    expect(completed.mcpToolCalls.every(({ status }) => status === "completed"))
      .toBe(true);
    expect(completed.turnDurationsMs["turn-current-mcp-success"]).toBe(
      25_000,
    );
    expect(completed.messages.at(-1)?.text).toContain(
      "https://developers.openai.com/codex/mcp",
    );
  });

  it("recovers from a current unavailable integration in the same thread", () => {
    const scenario =
      replayScenarios["mcp-current-integration-recovery"];
    const unavailable = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["mcp-current-integration-unavailable"],
      ),
    );
    const recovering = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["mcp-current-integration-recovering"],
      ),
    );
    const recovered = reduceProtocolTrace(scenario.events);

    expect(unavailable.mcpToolCalls).toHaveLength(0);
    expect(unavailable.messages.at(-1)).toMatchObject({
      id: "assistant-current-integration-unavailable",
      status: "completed",
      text: "GitHub MCP integration is unavailable.",
    });
    expect(
      unavailable.turnDurationsMs["turn-current-integration-unavailable"],
    ).toBe(16_000);
    expect(recovering.mcpToolCalls).toEqual([
      expect.objectContaining({
        server: "openaiDeveloperDocs",
        status: "running",
        toolLabel: "Search OpenAI docs",
      }),
    ]);
    expect(isCurrentTurnGroupActive(
      recovering,
      "turn-current-integration-recovery",
    )).toBe(true);
    expect(recovered.mcpToolCalls.map(({ status, toolLabel }) => ({
      status,
      toolLabel,
    }))).toEqual([
      { status: "completed", toolLabel: "Search OpenAI docs" },
      { status: "completed", toolLabel: "Fetch OpenAI doc" },
    ]);
    expect(
      recovered.turnDurationsMs["turn-current-integration-recovery"],
    ).toBe(34_000);
    expect(recovered.messages.at(-1)?.text).toContain(
      "Recovery complete: Model Context Protocol",
    );
    expect(hasActiveTurnWork(recovered)).toBe(false);
  });

  it("keeps the current failed fetch inside its recovered MCP group", () => {
    const scenario = replayScenarios["mcp-current-recovery"];
    const failed = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["mcp-current-recovery-failed"],
      ),
    );
    const retrying = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["mcp-current-recovery-retrying"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(failed.mcpToolCalls).toEqual([
      expect.objectContaining({
        error: "Invalid URL",
        status: "failed",
        toolLabel: "Fetch OpenAI doc",
      }),
    ]);
    expect(retrying.mcpToolCalls.map(({ status }) => status)).toEqual([
      "failed",
      "running",
    ]);
    expect(completed.mcpToolCalls.map(({ toolLabel, status }) => ({
      status,
      toolLabel,
    }))).toEqual([
      { status: "failed", toolLabel: "Fetch OpenAI doc" },
      { status: "completed", toolLabel: "Search OpenAI docs" },
      { status: "completed", toolLabel: "Fetch OpenAI doc" },
    ]);
    expect(completed.turnDurationsMs["turn-current-mcp-recovery"]).toBe(
      18_000,
    );
    expect(completed.messages.at(-1)?.text).toContain("Recovery complete");
  });

  it("replays the observed 26.825 MCP success and recovery turns", () => {
    const scenario = replayScenarios["mcp-current-26-825-lifecycle"];
    const success = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["mcp-current-26-825-success"],
      ),
    );
    const recovered = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "mcp-current-26-825-recovery": 21,
      "mcp-current-26-825-success": 10,
    });
    expect(success.mcpToolCalls.map(({ status, toolLabel }) => ({
      status,
      toolLabel,
    }))).toEqual([
      { status: "completed", toolLabel: "Search OpenAI docs" },
      { status: "completed", toolLabel: "Fetch OpenAI doc" },
    ]);
    expect(recovered.mcpToolCalls.map(({ status, toolLabel, turnId }) => ({
      status,
      toolLabel,
      turnId,
    }))).toEqual([
      {
        status: "completed",
        toolLabel: "Search OpenAI docs",
        turnId: "turn-current-mcp-26-825-success",
      },
      {
        status: "completed",
        toolLabel: "Fetch OpenAI doc",
        turnId: "turn-current-mcp-26-825-success",
      },
      {
        status: "failed",
        toolLabel: "Fetch OpenAI doc",
        turnId: "turn-current-mcp-26-825-recovery",
      },
      {
        status: "completed",
        toolLabel: "Search OpenAI docs",
        turnId: "turn-current-mcp-26-825-recovery",
      },
      {
        status: "completed",
        toolLabel: "Fetch OpenAI doc",
        turnId: "turn-current-mcp-26-825-recovery",
      },
    ]);
    expect(recovered.turnDurationsMs).toMatchObject({
      "turn-current-mcp-26-825-recovery": 10_000,
      "turn-current-mcp-26-825-success": 20_000,
    });
    expect(recovered.messages.at(-1)?.text).toBe(
      "CURRENT MCP 26.825 RECOVERY — Model Context Protocol — https://learn.chatgpt.com/docs/extend/mcp",
    );
    expect(hasActiveTurnWork(recovered)).toBe(false);
  });

  it("composes the current mixed web, MCP, approval, file, and subagent turns", () => {
    const scenario = replayScenarios["current-mixed-tool-thread"];
    const researchRunning = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["current-mixed-research-running"],
      ),
    );
    const researchCompleted = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["current-mixed-research-completed"],
      ),
    );
    const mcpRunning = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["current-mixed-mcp-running"]),
    );
    const mcpCompleted = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["current-mixed-mcp-completed"],
      ),
    );
    const approvalPending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["current-mixed-approval-pending"],
      ),
    );
    const reviewOpen = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["current-mixed-review-open"]),
    );
    const subagentRunning = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["current-mixed-subagent-running"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(researchRunning.webSearches).toEqual([
      expect.objectContaining({
        action: "search",
        query: "official Codex MCP documentation",
        status: "running",
      }),
    ]);
    expect(hasActiveTurnWork(researchRunning)).toBe(true);
    expect(
      researchCompleted.webSearches.map(({ action, status }) => ({
        action,
        status,
      })),
    ).toEqual([
      { action: "search", status: "completed" },
      { action: "openPage", status: "completed" },
      { action: "findInPage", status: "completed" },
    ]);
    expect(researchCompleted.webSearches[0]?.results).toEqual([
      expect.objectContaining({
        detail: "Model Context Protocol",
        url: "https://learn.chatgpt.com/docs/extend/mcp",
      }),
    ]);
    expect(
      researchCompleted.turnDurationsMs["turn-current-mixed-research"],
    ).toBe(22_000);

    expect(mcpRunning.mcpToolCalls).toEqual([
      expect.objectContaining({
        status: "running",
        toolLabel: "Search OpenAI docs",
      }),
    ]);
    expect(mcpCompleted.mcpToolCalls.map(({ status, toolLabel }) => ({
      status,
      toolLabel,
    }))).toEqual([
      { status: "completed", toolLabel: "Search OpenAI docs" },
      { status: "completed", toolLabel: "Fetch OpenAI doc" },
    ]);

    expect(approvalPending.approvals).toEqual([
      expect.objectContaining({
        decision: "pending",
        itemId: "command-current-mixed-note",
      }),
    ]);
    expect(hasActiveTurnWork(approvalPending)).toBe(true);
    expect(reviewOpen.approvals[0]?.decision).toBe("approved");
    expect(reviewOpen.fileChanges).toEqual([
      expect.objectContaining({
        changes: [
          expect.objectContaining({
            kind: "added",
            path: "research/MIXED_TOOL_THREAD.md",
          }),
        ],
        status: "applied",
      }),
    ]);

    expect(subagentRunning.subagents).toEqual([
      expect.objectContaining({
        id: "mixed-audit",
        name: "Mixed audit",
        status: "active",
      }),
    ]);
    expect(hasActiveTurnWork(subagentRunning)).toBe(true);
    expect(completed.subagents).toEqual([
      expect.objectContaining({
        id: "mixed-audit",
        message: "All listed mixed-tool surfaces are represented.",
        status: "done",
      }),
    ]);
    expect(completed.messages.at(-1)?.text).toContain(
      "Mixed workflow complete",
    );
    expect(hasActiveTurnWork(completed)).toBe(false);
    expect(completed.status).toBe("completed");
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
        output:
          "CURRENT FAILURE STDOUT\nCURRENT FAILURE STDERR\n",
        status: "running",
      }),
    ]);
    expect(failed.commands).toEqual([
      expect.objectContaining({ exitCode: 7, status: "failed" }),
    ]);
    expect(failed.commands[0]?.output).toBe(
      "CURRENT FAILURE STDOUT\nCURRENT FAILURE STDERR\n",
    );
    expect(failed.commands[0]?.output.split("\n")).toHaveLength(3);
    expect(completed.status).toBe("completed");
    expect(completed.turnDurationsMs).toMatchObject({
      "turn-command-failure": 10_000,
      "turn-command-follow-up": 1_400,
    });
    expect(completed.messages.at(-1)).toMatchObject({
      id: "assistant-command-follow-up",
      text: "CURRENT COMMAND RECOVERY ACCEPTED",
    });
    expect(completed.timeline.map(({ kind }) => kind)).toEqual([
      "message",
      "command",
      "message",
      "message",
      "message",
    ]);
  });

  it("preserves current command output while the thread uses compact rows", () => {
    const success = replayScenarios["command-current-26-820-success"];
    const failure = replayScenarios["command-current-26-825-failure"];
    const completedSuccess = reduceProtocolTrace(success.events);
    const completedFailure = reduceProtocolTrace(failure.events);

    expect(completedSuccess.commands[0]).toMatchObject({
      durationMs: 12_000,
      exitCode: 0,
      status: "completed",
    });
    expect(completedSuccess.commands[0]?.output).toContain(
      "CURRENT 26.820 SUCCESS 012",
    );
    expect(completedSuccess.turnDurationsMs).toMatchObject({
      "turn-command-current-26-820-success": 22_000,
    });
    expect(completedFailure.commands[0]).toMatchObject({
      exitCode: 7,
      output:
        "CURRENT 26.825 FAILURE STDOUT\nCURRENT 26.825 FAILURE STDERR\n",
      status: "failed",
    });
    expect(completedFailure.messages.at(-1)).toMatchObject({
      id: "assistant-command-current-26-825-failure-recovery",
      text: "CURRENT 26.825 COMMAND RECOVERY ACCEPTED",
    });
    expect(completedFailure.turnDurationsMs).toMatchObject({
      "turn-command-current-26-825-failure": 15_000,
      "turn-command-current-26-825-failure-recovery": 1_400,
    });
  });

  it("replays the current 26.825 uuidgen command without exposing output cards", () => {
    const scenario = replayScenarios["command-current-26-825-success"];
    const completed = reduceProtocolTrace(scenario.events);

    expect(completed.commands[0]).toMatchObject({
      command: "/usr/bin/uuidgen",
      durationMs: 100,
      exitCode: 0,
      output: "00000000-0000-4000-8000-000000000000\n",
      status: "completed",
    });
    expect(completed.turnDurationsMs).toMatchObject({
      "turn-command-current-26-825-success": 8_000,
    });
    expect(completed.messages.at(-1)).toMatchObject({
      id: "assistant-command-current-26-825-success",
      text: "00000000-0000-4000-8000-000000000000",
    });
  });

  it("replays the current 26.825 immediate and settled interruption durations", () => {
    const scenario = replayScenarios[
      "command-current-26-825-interruption"
    ];
    const immediate = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames[
          "command-current-26-825-interruption-stopped-immediate"
        ],
      ),
    );
    const settled = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["command-current-26-825-interruption-settled"],
      ),
    );
    const recovered = reduceProtocolTrace(scenario.events);
    const interruptionDuration = (state: typeof immediate) =>
      state.messages.find(
        ({ id }) => id === "user-command-current-26-825-interruption",
      )?.interruptionDurationMs;

    expect(immediate.status).toBe("interrupted");
    expect(interruptionDuration(immediate)).toBe(0);
    expect(settled.status).toBe("interrupted");
    expect(settled.commands[0]).toMatchObject({
      durationMs: 20_000,
      exitCode: 0,
      status: "completed",
    });
    expect(interruptionDuration(settled)).toBe(20_000);
    expect(recovered.status).toBe("completed");
    expect(interruptionDuration(recovered)).toBe(20_000);
    expect(recovered.messages.at(-1)?.text).toBe(
      "CURRENT 26.825 INTERRUPTION RECOVERY ACCEPTED",
    );
  });

  it("replays current command Stop, persistent stopped row, and recovery", () => {
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
    ).toBe(58_000);
    expect(settled.status).toBe("interrupted");
    expect(settled.commands[0]).toMatchObject({
      durationMs: 58_000,
      exitCode: 0,
      status: "completed",
    });
    expect(recovered.status).toBe("completed");
    expect(recovered.turnDurationsMs).toMatchObject({
      "turn-command-interruption": 58_000,
      "turn-command-interruption-recovery": 1_500,
    });
    expect(recovered.messages.at(-1)).toMatchObject({
      id: "assistant-command-interruption-recovery",
      text: "CURRENT INTERRUPTION RECOVERY ACCEPTED",
    });
    expect(
      recovered.messages.find(({ id }) => id === "user-command-interruption")
        ?.interruptionDurationMs,
    ).toBe(58_000);
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

    expect(failed.currentTurnId).toBe("turn-failed");
    expect(isCurrentTurnGroupActive(failed, "turn-failed")).toBe(false);
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
      command: "touch /outside/project/approval-sentinel",
      decision: "pending",
      itemId: "command-create-approval-sentinel",
      kind: "command",
    });
    expect(pending.commands[0]).toMatchObject({
      command: "touch /outside/project/approval-sentinel",
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
      "未获批准，命令未执行。",
    );
    expect(completed.status).toBe("completed");
    expect(completed.turnDurationMs).toBe(113_000);
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
      decisionScope: "once",
      responseDecision: "accept",
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
      decisionScope: "similar",
      responseDecision: "acceptWithExecpolicyAmendment",
    });
    expect(firstCompleted.approvals).toHaveLength(1);
    expect(firstCompleted.approvals[0]?.decision).toBe("approved");
    expect(firstCompleted.approvals[0]?.decisionScope).toBe("similar");
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

  it("preserves a file approval for the session without a second request", () => {
    const scenario = replayScenarios["approval-for-session"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-session-pending"],
      ),
    );
    const firstCompleted = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-session-first-completed"],
      ),
    );
    const repeatedCompleted = reduceProtocolTrace(scenario.events);

    expect(pending.approvals).toEqual([
      expect.objectContaining({
        decision: "pending",
        decisionScope: "session",
        itemId: "file-approval-session-first",
        kind: "file",
        responseDecision: "acceptForSession",
      }),
    ]);
    expect(firstCompleted.approvals[0]).toMatchObject({
      decision: "approved",
      decisionScope: "session",
      responseDecision: "acceptForSession",
    });
    expect(firstCompleted.fileChanges).toHaveLength(1);
    expect(repeatedCompleted.fileChanges).toHaveLength(2);
    expect(repeatedCompleted.approvals).toHaveLength(1);
    expect(repeatedCompleted.messages.at(-1)?.text).toBe(
      "SESSION FILE APPROVAL SECOND COMPLETE.",
    );
  });

  it("settles a rejected session file approval without applying the file", () => {
    const scenario = replayScenarios["approval-for-session"];
    const pending = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["approval-current-session-pending"],
      ),
    );
    const rejected = reduceProtocolNotification(pending, {
      decision: "rejected",
      kind: "approval-resolution",
      requestId: "approval-file-session-first",
    });
    const settled = settleRejectedFileReplay(
      rejected,
      "approval-file-session-first",
    );

    expect(settled.approvals[0]?.decision).toBe("rejected");
    expect(settled.currentTurnId).toBeNull();
    expect(settled.fileChanges[0]?.status).toBe("rejected");
    expect(settled.messages).toHaveLength(1);
    expect(settled.status).toBe("completed");
  });

  it("preserves automatic approval review progress and timeout semantics", () => {
    const scenario = replayScenarios["approval-review-timeout"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["approval-review-running"]),
    );
    const timedOut = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["approval-review-timeout"]),
    );

    expect(running.automaticApprovalReviews).toEqual([
      expect.objectContaining({
        actionLabel: "Network access to https://example.com/health",
        completedAtMs: null,
        id: "auto-review-network-health",
        startedAtMs: 2080,
        status: "inProgress",
        targetItemId: null,
      }),
    ]);
    expect(hasActiveTurnWork(running)).toBe(true);
    expect(timedOut.automaticApprovalReviews[0]).toMatchObject({
      completedAtMs: 17080,
      startedAtMs: 2080,
      status: "timedOut",
    });
    expect(timedOut.timeline).toContainEqual({
      id: "auto-review-network-health",
      kind: "automaticApprovalReview",
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
          path: "rename-source.txt",
        },
        {
          kind: "modified",
          path: "rename-destination.txt",
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

  it("preserves the current 26.825 Review raw delete/add replacement evidence", () => {
    const scenario = replayScenarios["current-review-26-825-files"];
    const state = reduceProtocolTrace(scenario.events);

    expect(scenario.frames).toEqual({
      "current-review-26-825-file-card": 7,
      "current-review-26-825-open": 8,
    });
    expect(state.fileChanges).toHaveLength(1);
    expect(state.fileChanges[0]).toMatchObject({
      changes: [
        {
          kind: "added",
          path: "research/current-review-26-825-probe/added.txt",
        },
        {
          kind: "deleted",
          path: "research/current-review-26-825-probe/alpha.txt",
        },
        {
          kind: "added",
          path: "research/current-review-26-825-probe/alpha.txt",
        },
        {
          kind: "deleted",
          path: "research/current-review-26-825-probe/obsolete.txt",
        },
      ],
      status: "applied",
    });
    expect(state.messages.at(-1)?.text).toBe(
      "CURRENT REVIEW 26.825 COMPLETE.",
    );
    expect(state.turnDurationsMs).toEqual({
      "turn-current-review-26-825-files": 20_000,
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

  it("tracks a protocol-backed subagent from running to completed", () => {
    const scenario = replayScenarios["subagent-delegation"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-current-running"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.status).toBe("running");
    expect(running.subagents).toEqual([
      expect.objectContaining({
        callId: "collab-subagent-long",
        id: "long-probe",
        message: null,
        startedAtMs: 1100,
        status: "active",
        threadStatus: "running",
        tool: "spawnAgent",
      }),
    ]);
    expect(running.timeline.at(-1)).toEqual({
      id: "collab-subagent-long",
      kind: "subagent",
    });
    expect(completed.status).toBe("completed");
    expect(completed.subagents).toEqual([
      expect.objectContaining({
        message: "SUBAGENT LONG PROBE DONE",
        completedAtMs: 46000,
        startedAtMs: 1100,
        status: "done",
        threadStatus: "completed",
      }),
    ]);
    expect(completed.messages.at(-1)).toMatchObject({
      id: "assistant-subagent-delegation",
      status: "completed",
      text: "SUBAGENT LONG PROBE COMPLETE.",
    });
  });

  it("preserves waiting, streamed progress, and mixed terminal subagent outcomes", () => {
    const scenario = replayScenarios["subagent-recovery"];
    const waiting = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-recovery-waiting"]),
    );
    const streaming = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["subagent-recovery-panel-streaming"],
      ),
    );
    const terminal = reduceProtocolTrace(
      scenario.events.slice(
        0,
        scenario.frames["subagent-recovery-panel-terminal"],
      ),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(waiting.subagents).toHaveLength(12);
    expect(waiting.subagents.find(({ id }) => id === "planner")).toMatchObject({
      status: "waiting",
      threadStatus: "pendingInit",
    });
    expect(
      streaming.subagents.find(({ id }) => id === "streamer"),
    ).toMatchObject({
      activityKind: "interacted",
      message: "Parsed 4 of 12 lifecycle events.",
      status: "active",
      threadStatus: "running",
    });
    expect(terminal.status).toBe("running");
    expect(terminal.subagents).toHaveLength(12);
    expect(
      terminal.subagents.map(({ status }) => status),
    ).toEqual(Array.from({ length: 12 }, () => "done"));
    expect(
      terminal.subagents.find(({ id }) => id === "validator"),
    ).toMatchObject({
      message: "Validation failed: fixture mismatch.",
      threadStatus: "errored",
    });
    expect(
      terminal.subagents.find(({ id }) => id === "reviewer"),
    ).toMatchObject({
      message: "Review interrupted by parent.",
      threadStatus: "interrupted",
    });
    expect(
      terminal.subagents.find(({ id }) => id === "tester"),
    ).toMatchObject({ threadStatus: "shutdown" });
    expect(
      terminal.subagents.find(({ id }) => id === "reporter"),
    ).toMatchObject({ threadStatus: "notFound" });
    expect(completed.status).toBe("completed");
    expect(completed.messages.at(-1)).toMatchObject({
      id: "assistant-subagent-recovery",
      status: "completed",
      text: "RECOVERY MATRIX COMPLETE: 8 completed, 1 errored, 1 interrupted, 1 shutdown, and 1 unavailable.",
    });
  });

  it("aggregates concurrent sibling subagents through a mixed state", () => {
    const scenario = replayScenarios["subagent-concurrency"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-concurrent-running"]),
    );
    const mixed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-concurrent-mixed"]),
    );
    const completed = reduceProtocolTrace(scenario.events);

    expect(running.subagents).toEqual([
      expect.objectContaining({
        agentPath: "/root/alpha",
        id: "alpha",
        name: "Alpha",
        senderThreadId: "thread-subagent-concurrency",
        status: "active",
      }),
      expect.objectContaining({
        agentPath: "/root/beta",
        id: "beta",
        name: "Beta",
        senderThreadId: "thread-subagent-concurrency",
        status: "active",
      }),
    ]);
    expect(mixed.subagents).toEqual([
      expect.objectContaining({
        id: "alpha",
        message: "ALPHA SUBAGENT DONE",
        status: "done",
      }),
      expect.objectContaining({
        id: "beta",
        message: "clarifying command execution constraints",
        status: "active",
      }),
    ]);
    expect(completed.subagents).toEqual([
      expect.objectContaining({ id: "alpha", status: "done" }),
      expect.objectContaining({ id: "beta", status: "done" }),
    ]);
    expect(completed.turnDurationMs).toBe(79_000);
  });

  it("preserves spawn identity and start time when a wait call reports the agent", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-wait",
        turn: { id: "turn-wait" },
      },
    });
    const spawned = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-spawn-alpha",
          prompt: "Run the Alpha probe.",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-wait",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-wait",
        turnId: "turn-wait",
      },
    });
    const waited = reduceProtocolNotification(spawned, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-wait-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-wait",
          status: "inProgress",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        startedAtMs: 5_000,
        threadId: "thread-wait",
        turnId: "turn-wait",
      },
    });

    expect(waited.subagents).toEqual([
      expect.objectContaining({
        callId: "collab-spawn-alpha",
        id: "alpha",
        prompt: "Run the Alpha probe.",
        startedAtMs: 1_000,
        tool: "spawnAgent",
      }),
    ]);
  });

  it("keeps each agent's first terminal timestamp across later wait calls", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-wait-completion",
        turn: { id: "turn-wait-completion" },
      },
    });
    const spawned = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: {
            alpha: { status: "running" },
            beta: { status: "running" },
          },
          id: "collab-spawn-pair",
          receiverThreadIds: ["alpha", "beta"],
          senderThreadId: "thread-wait-completion",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-wait-completion",
        turnId: "turn-wait-completion",
      },
    });
    const firstWait = reduceProtocolNotification(spawned, {
      method: "item/completed",
      params: {
        completedAtMs: 5_000,
        item: {
          agentsStates: {
            alpha: { status: "completed" },
            beta: { status: "running" },
          },
          id: "collab-wait-first",
          receiverThreadIds: ["alpha", "beta"],
          senderThreadId: "thread-wait-completion",
          status: "completed",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        threadId: "thread-wait-completion",
        turnId: "turn-wait-completion",
      },
    });
    const secondWait = reduceProtocolNotification(firstWait, {
      method: "item/completed",
      params: {
        completedAtMs: 8_000,
        item: {
          agentsStates: {
            alpha: { status: "completed" },
            beta: { status: "completed" },
          },
          id: "collab-wait-second",
          receiverThreadIds: ["alpha", "beta"],
          senderThreadId: "thread-wait-completion",
          status: "completed",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        threadId: "thread-wait-completion",
        turnId: "turn-wait-completion",
      },
    });

    expect(firstWait.subagents).toEqual([
      expect.objectContaining({ id: "alpha", completedAtMs: 5_000 }),
      expect.objectContaining({ id: "beta", completedAtMs: null }),
    ]);
    expect(secondWait.subagents).toEqual([
      expect.objectContaining({
        id: "alpha",
        completedAtMs: 5_000,
        startedAtMs: 1_000,
        tool: "spawnAgent",
      }),
      expect.objectContaining({
        id: "beta",
        completedAtMs: 8_000,
        startedAtMs: 1_000,
        tool: "spawnAgent",
      }),
    ]);
    expect(
      [...secondWait.subagents]
        .sort(
          (left, right) =>
            (right.completedAtMs ?? 0) - (left.completedAtMs ?? 0),
        )
        .map(({ id }) => id),
    ).toEqual(["beta", "alpha"]);
  });

  it("starts a fresh active lifecycle when a completed agent is resumed", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-resume-alpha" },
      },
    });
    const resumed = reduceProtocolNotification(followUp, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha",
          prompt: "Continue the Alpha probe.",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 100_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-resume-alpha",
      },
    });
    const settled = reduceProtocolNotification(resumed, {
      method: "item/completed",
      params: {
        completedAtMs: 105_000,
        item: {
          agentsStates: {
            alpha: {
              message: "ALPHA RESUMED DONE",
              status: "completed",
            },
          },
          id: "collab-resume-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "completed",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        threadId: "thread-subagent-concurrency",
        turnId: "turn-resume-alpha",
      },
    });

    expect(
      resumed.subagents.find(({ id }) => id === "alpha"),
    ).toMatchObject({
      callId: "collab-resume-alpha",
      completedAtMs: null,
      message: null,
      startedAtMs: 100_000,
      status: "active",
      threadStatus: "running",
      tool: "resumeAgent",
      turnId: "turn-resume-alpha",
    });
    expect(
      settled.subagents.find(({ id }) => id === "alpha"),
    ).toMatchObject({
      callId: "collab-resume-alpha",
      completedAtMs: 105_000,
      message: "ALPHA RESUMED DONE",
      startedAtMs: 100_000,
      status: "done",
      tool: "resumeAgent",
    });
    expect(
      settled.subagentLifecycles.filter(({ id }) => id === "alpha"),
    ).toEqual([
      expect.objectContaining({
        callId: "collab-subagent-alpha",
        completedAtMs: 32_000,
        message: "ALPHA SUBAGENT DONE",
        turnId: "turn-subagent-concurrency",
      }),
      expect.objectContaining({
        callId: "collab-resume-alpha",
        completedAtMs: 105_000,
        message: "ALPHA RESUMED DONE",
        turnId: "turn-resume-alpha",
      }),
    ]);
    expect(
      subagentLifecycleGroup(settled, "collab-subagent-alpha").map(
        ({ id }) => id,
      ),
    ).toEqual(["alpha", "beta"]);
    expect(
      subagentLifecycleGroup(settled, "collab-resume-alpha").map(
        ({ id }) => id,
      ),
    ).toEqual(["alpha"]);
    expect(settled.timeline).toEqual(
      expect.arrayContaining([
        { id: "collab-subagent-alpha", kind: "subagent" },
        { id: "collab-resume-alpha", kind: "subagent" },
      ]),
    );
  });

  it("keeps a resumed lifecycle active when old-turn activity arrives late", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-resume-alpha-late-activity" },
      },
    });
    const resumed = reduceProtocolNotification(followUp, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha-late-activity",
          prompt: "Continue the Alpha probe.",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 100_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-resume-alpha-late-activity",
      },
    });
    const afterLateActivity = reduceProtocolNotification(resumed, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-subagent-alpha-late-after-resume",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 1_200,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(afterLateActivity.status).toBe("running");
    expect(hasActiveTurnWork(afterLateActivity)).toBe(true);
    expect(
      afterLateActivity.subagents.find(({ id }) => id === "alpha"),
    ).toMatchObject({
      callId: "collab-resume-alpha-late-activity",
      startedAtMs: 100_000,
      status: "active",
      turnId: "turn-resume-alpha-late-activity",
    });
    expect(
      afterLateActivity.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-subagent-alpha" && id === "alpha",
      ),
    ).toMatchObject({
      completedAtMs: 32_000,
      startedAtMs: 1_100,
      status: "done",
      turnId: "turn-subagent-concurrency",
    });
    expect(
      afterLateActivity.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-resume-alpha-late-activity" && id === "alpha",
      ),
    ).toMatchObject({
      startedAtMs: 100_000,
      status: "active",
      turnId: "turn-resume-alpha-late-activity",
    });
  });

  it("routes same-turn activity to the current resumed lifecycle", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });
    const resumed = reduceProtocolNotification(activeTurn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha-same-turn",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 90_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });
    const withActivity = reduceProtocolNotification(resumed, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-alpha-same-turn-resume",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 90_100,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(withActivity.status).toBe("running");
    expect(hasActiveTurnWork(withActivity)).toBe(true);
    expect(withActivity.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-resume-alpha-same-turn",
        startedAtMs: 90_000,
        status: "active",
        tool: "resumeAgent",
      });
  });

  it("keeps same-turn late activity on the earlier lifecycle", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });
    const resumed = reduceProtocolNotification(activeTurn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha-before-old-activity",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 90_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });
    const afterLateActivity = reduceProtocolNotification(resumed, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-alpha-old-same-turn",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 1_200,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(hasActiveTurnWork(afterLateActivity)).toBe(true);
    expect(afterLateActivity.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-resume-alpha-before-old-activity",
        startedAtMs: 90_000,
        status: "active",
      });
    expect(
      afterLateActivity.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-subagent-alpha" && id === "alpha",
      ),
    ).toMatchObject({
      completedAtMs: 32_000,
      startedAtMs: 1_100,
      status: "done",
    });
  });

  it("routes same-turn late interrupted completion by its completion time", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });
    const resumed = reduceProtocolNotification(activeTurn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-before-late-interruption",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 90_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });
    const afterLateInterruption = reduceProtocolNotification(resumed, {
      method: "item/completed",
      params: {
        completedAtMs: 33_000,
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-alpha-old-interrupted",
          kind: "interrupted",
          type: "subAgentActivity",
        },
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(hasActiveTurnWork(afterLateInterruption)).toBe(true);
    expect(afterLateInterruption.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-resume-before-late-interruption",
        completedAtMs: null,
        startedAtMs: 90_000,
        status: "active",
        threadStatus: "running",
      });
    expect(
      afterLateInterruption.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-subagent-alpha" && id === "alpha",
      ),
    ).toMatchObject({
      completedAtMs: 32_000,
      startedAtMs: 1_100,
      status: "done",
      threadStatus: "interrupted",
    });
  });

  it("starts another resume lifecycle within the same turn", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });
    const firstResume = reduceProtocolNotification(activeTurn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha-first",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 90_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });
    const firstSettled = reduceProtocolNotification(firstResume, {
      method: "item/completed",
      params: {
        completedAtMs: 91_000,
        item: {
          agentsStates: { alpha: { status: "completed" } },
          id: "collab-resume-alpha-first",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "completed",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });
    const secondResume = reduceProtocolNotification(firstSettled, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-resume-alpha-second",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 92_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(hasActiveTurnWork(secondResume)).toBe(true);
    expect(secondResume.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-resume-alpha-second",
        completedAtMs: null,
        startedAtMs: 92_000,
        status: "active",
      });
    expect(
      secondResume.subagentLifecycles
        .filter(({ id, tool }) => id === "alpha" && tool === "resumeAgent")
        .map(({ callId, status }) => ({ callId, status })),
    ).toEqual([
      { callId: "collab-resume-alpha-first", status: "done" },
      { callId: "collab-resume-alpha-second", status: "active" },
    ]);
    expect(
      latestSubagentLifecyclesById(
        subagentLifecycleGroup(
          secondResume,
          "collab-resume-alpha-second",
        ),
      ).map(({ callId, id }) => ({ callId, id })),
    ).toEqual([
      { callId: "collab-resume-alpha-second", id: "alpha" },
      { callId: "collab-subagent-beta", id: "beta" },
    ]);
    expect(
      subagentTimelinePresentation(
        secondResume,
        "collab-subagent-alpha",
      ),
    ).toMatchObject({
      active: true,
      anchor: { callId: "collab-subagent-alpha" },
      rows: [
        { callId: "collab-resume-alpha-second", id: "alpha" },
        { callId: "collab-subagent-beta", id: "beta" },
      ],
      startedAtMs: 1_100,
      turnId: "turn-subagent-concurrency",
    });
    expect(
      subagentTimelinePresentation(
        secondResume,
        "collab-resume-alpha-second",
      )?.anchor.callId,
    ).toBe("collab-subagent-alpha");
  });

  it("starts a new same-turn lifecycle when input wakes a done agent", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });
    const sentInput = reduceProtocolNotification(activeTurn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-send-alpha-followup",
          prompt: "Run the follow-up probe.",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "sendInput",
          type: "collabAgentToolCall",
        },
        startedAtMs: 90_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(hasActiveTurnWork(sentInput)).toBe(true);
    expect(sentInput.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-send-alpha-followup",
        completedAtMs: null,
        startedAtMs: 90_000,
        status: "active",
        tool: "sendInput",
      });
    expect(
      sentInput.subagentLifecycles
        .filter(({ id }) => id === "alpha")
        .map(({ callId, status, tool }) => ({ callId, status, tool })),
    ).toEqual([
      {
        callId: "collab-subagent-alpha",
        status: "done",
        tool: "spawnAgent",
      },
      {
        callId: "collab-send-alpha-followup",
        status: "active",
        tool: "sendInput",
      },
    ]);
  });

  it("keeps new control lifecycles nonterminal while agent state is pending", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const activeTurn = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-subagent-concurrency" },
      },
    });

    for (const tool of ["sendInput", "resumeAgent"] as const) {
      const controlled = reduceProtocolNotification(activeTurn, {
        method: "item/started",
        params: {
          item: {
            agentsStates: {},
            id: `collab-${tool}-pending-alpha`,
            receiverThreadIds: ["alpha"],
            senderThreadId: "thread-subagent-concurrency",
            status: "inProgress",
            tool,
            type: "collabAgentToolCall",
          },
          startedAtMs: 90_000,
          threadId: "thread-subagent-concurrency",
          turnId: "turn-subagent-concurrency",
        },
      });

      expect(hasActiveTurnWork(controlled)).toBe(true);
      expect(controlled.subagents.find(({ id }) => id === "alpha"))
        .toMatchObject({
          callId: `collab-${tool}-pending-alpha`,
          completedAtMs: null,
          status: "waiting",
          threadStatus: "pendingInit",
          tool,
        });
    }
  });

  it("keeps old summaries when a new root turn waits on an agent", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-cross-turn-wait" },
      },
    });
    const waited = reduceProtocolNotification(followUp, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-cross-turn-wait",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        startedAtMs: 100_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-cross-turn-wait",
      },
    });

    expect(waited.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-cross-turn-wait",
        startedAtMs: 100_000,
        status: "active",
        tool: "wait",
        turnId: "turn-cross-turn-wait",
      });
    expect(
      waited.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-subagent-alpha" && id === "alpha",
      ),
    ).toMatchObject({
      status: "done",
      turnId: "turn-subagent-concurrency",
    });
    expect(waited.timeline).toEqual(
      expect.arrayContaining([
        { id: "collab-subagent-alpha", kind: "subagent" },
        { id: "collab-cross-turn-wait", kind: "subagent" },
      ]),
    );
  });

  it("routes an old root-turn completion to its historical call", () => {
    const turnOne = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-late-collab-completion",
        turn: { id: "turn-late-collab-one" },
      },
    });
    const spawned = reduceProtocolNotification(turnOne, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-late-spawn-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-late-collab-completion",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-late-collab-completion",
        turnId: "turn-late-collab-one",
      },
    });
    const turnOneCompleted = reduceProtocolNotification(spawned, {
      method: "turn/completed",
      params: {
        threadId: "thread-late-collab-completion",
        turn: {
          durationMs: 1_000,
          id: "turn-late-collab-one",
          status: "completed",
        },
      },
    });
    const turnTwo = reduceProtocolNotification(turnOneCompleted, {
      method: "turn/started",
      params: {
        threadId: "thread-late-collab-completion",
        turn: { id: "turn-late-collab-two" },
      },
    });
    const resumed = reduceProtocolNotification(turnTwo, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-current-resume-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-late-collab-completion",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 3_000,
        threadId: "thread-late-collab-completion",
        turnId: "turn-late-collab-two",
      },
    });
    const afterOldCompletion = reduceProtocolNotification(resumed, {
      method: "item/completed",
      params: {
        completedAtMs: 2_000,
        item: {
          agentsStates: { alpha: { status: "completed" } },
          id: "collab-late-spawn-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-late-collab-completion",
          status: "completed",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        threadId: "thread-late-collab-completion",
        turnId: "turn-late-collab-one",
      },
    });

    expect(hasActiveTurnWork(afterOldCompletion)).toBe(true);
    expect(afterOldCompletion.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-current-resume-alpha",
        completedAtMs: null,
        startedAtMs: 3_000,
        status: "active",
        turnId: "turn-late-collab-two",
      });
    expect(
      afterOldCompletion.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-late-spawn-alpha" && id === "alpha",
      ),
    ).toMatchObject({
      completedAtMs: 2_000,
      startedAtMs: 1_000,
      status: "done",
      turnId: "turn-late-collab-one",
    });
  });

  it("routes a late same-turn control completion through its call alias", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-control-alias",
        turn: { id: "turn-control-alias" },
      },
    });
    const spawned = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-alias-spawn",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-control-alias",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-control-alias",
        turnId: "turn-control-alias",
      },
    });
    const waited = reduceProtocolNotification(spawned, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-alias-wait",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-control-alias",
          status: "inProgress",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_500,
        threadId: "thread-control-alias",
        turnId: "turn-control-alias",
      },
    });
    const resumed = reduceProtocolNotification(waited, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-alias-resume",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-control-alias",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 3_000,
        threadId: "thread-control-alias",
        turnId: "turn-control-alias",
      },
    });
    const afterLateWait = reduceProtocolNotification(resumed, {
      method: "item/completed",
      params: {
        completedAtMs: 2_000,
        item: {
          agentsStates: { alpha: { status: "completed" } },
          id: "collab-alias-wait",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-control-alias",
          status: "completed",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        threadId: "thread-control-alias",
        turnId: "turn-control-alias",
      },
    });

    expect(hasActiveTurnWork(afterLateWait)).toBe(true);
    expect(afterLateWait.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-alias-resume",
        startedAtMs: 3_000,
        status: "active",
      });
    expect(
      afterLateWait.subagentLifecycles.find(
        ({ callId, id }) =>
          callId === "collab-alias-spawn" && id === "alpha",
      ),
    ).toMatchObject({
      completedAtMs: 2_000,
      controlCallIds: ["collab-alias-spawn", "collab-alias-wait"],
      status: "done",
    });
  });

  it("does not reactivate a completed root turn from background activity", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-background-activity",
        turn: { id: "turn-background-activity" },
      },
    });
    const spawned = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-background-alpha",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-background-activity",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-background-activity",
        turnId: "turn-background-activity",
      },
    });
    const rootCompleted = reduceProtocolNotification(spawned, {
      method: "turn/completed",
      params: {
        threadId: "thread-background-activity",
        turn: {
          durationMs: 1_000,
          id: "turn-background-activity",
          status: "completed",
        },
      },
    });
    const withBackgroundActivity = reduceProtocolNotification(rootCompleted, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-background-alpha",
          kind: "interacted",
          type: "subAgentActivity",
        },
        startedAtMs: 1_200,
        threadId: "thread-background-activity",
        turnId: "turn-background-activity",
      },
    });

    expect(withBackgroundActivity.currentTurnId).toBeNull();
    expect(withBackgroundActivity.status).toBe("completed");
    expect(hasActiveTurnWork(withBackgroundActivity)).toBe(false);
    expect(
      withBackgroundActivity.subagents.find(({ id }) => id === "alpha"),
    ).toMatchObject({ status: "active", threadStatus: "running" });
  });

  it("keeps the earliest anchor for mixed existing and provisional wait", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-mixed-provisional-wait",
        turn: { id: "turn-mixed-provisional-wait" },
      },
    });
    const betaSpawn = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { beta: { status: "running" } },
          id: "collab-beta-before-message",
          receiverThreadIds: ["beta"],
          senderThreadId: "thread-mixed-provisional-wait",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-mixed-provisional-wait",
        turnId: "turn-mixed-provisional-wait",
      },
    });
    const withMessage = reduceProtocolNotification(betaSpawn, {
      method: "item/completed",
      params: {
        item: {
          id: "assistant-between-subagents",
          phase: "final_answer",
          text: "Intermediate result.",
          type: "agentMessage",
        },
        threadId: "thread-mixed-provisional-wait",
        turnId: "turn-mixed-provisional-wait",
      },
    });
    const alphaActivity = reduceProtocolNotification(withMessage, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-alpha-after-message",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 1_100,
        threadId: "thread-mixed-provisional-wait",
        turnId: "turn-mixed-provisional-wait",
      },
    });
    const waited = reduceProtocolNotification(alphaActivity, {
      method: "item/started",
      params: {
        item: {
          agentsStates: {
            alpha: { status: "running" },
            beta: { status: "running" },
          },
          id: "collab-wait-existing-and-provisional",
          receiverThreadIds: ["beta", "alpha"],
          senderThreadId: "thread-mixed-provisional-wait",
          status: "inProgress",
          tool: "wait",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_200,
        threadId: "thread-mixed-provisional-wait",
        turnId: "turn-mixed-provisional-wait",
      },
    });

    expect(waited.timeline).toEqual([
      { id: "collab-beta-before-message", kind: "subagent" },
      { id: "assistant-between-subagents", kind: "message" },
    ]);
    expect(
      subagentTimelinePresentation(
        waited,
        "collab-beta-before-message",
      ),
    ).toMatchObject({
      anchor: { id: "beta" },
      rows: [{ id: "beta" }, { id: "alpha" }],
      startedAtMs: 1_000,
    });
  });

  it("rekeys activity-first resume state into the reported collab call", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-concurrency",
        turn: { id: "turn-activity-first-resume" },
      },
    });
    const activityFirst = reduceProtocolNotification(followUp, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-before-resume",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 100_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-activity-first-resume",
      },
    });
    const resumed = reduceProtocolNotification(activityFirst, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-activity-first-resume",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-subagent-concurrency",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 100_100,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-activity-first-resume",
      },
    });

    expect(activityFirst.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "activity-before-resume",
        provisional: true,
      });
    expect(resumed.subagents.find(({ id }) => id === "alpha"))
      .toMatchObject({
        callId: "collab-activity-first-resume",
        provisional: false,
        startedAtMs: 100_000,
        status: "active",
        tool: "resumeAgent",
      });
    expect(
      resumed.subagentLifecycles.filter(
        ({ id, turnId }) =>
          id === "alpha" && turnId === "turn-activity-first-resume",
      ),
    ).toEqual([
      expect.objectContaining({
        callId: "collab-activity-first-resume",
        provisional: false,
      }),
    ]);
    expect(
      resumed.timeline.filter(
        ({ id, kind }) =>
          kind === "subagent" &&
          (id === "activity-before-resume" ||
            id === "collab-activity-first-resume"),
      ),
    ).toEqual([
      { id: "collab-activity-first-resume", kind: "subagent" },
    ]);
  });

  it("preserves concurrent row order when an activity-first agent is rekeyed", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-concurrent-provisional",
        turn: { id: "turn-concurrent-provisional" },
      },
    });
    const alphaActivity = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-alpha-provisional",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 1_000,
        threadId: "thread-concurrent-provisional",
        turnId: "turn-concurrent-provisional",
      },
    });
    const betaSpawn = reduceProtocolNotification(alphaActivity, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { beta: { status: "running" } },
          id: "collab-beta-spawn",
          receiverThreadIds: ["beta"],
          senderThreadId: "thread-concurrent-provisional",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_100,
        threadId: "thread-concurrent-provisional",
        turnId: "turn-concurrent-provisional",
      },
    });
    const alphaSpawn = reduceProtocolNotification(betaSpawn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { alpha: { status: "running" } },
          id: "collab-alpha-spawn",
          receiverThreadIds: ["alpha"],
          senderThreadId: "thread-concurrent-provisional",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_200,
        threadId: "thread-concurrent-provisional",
        turnId: "turn-concurrent-provisional",
      },
    });
    const presentation = subagentTimelinePresentation(
      alphaSpawn,
      "collab-alpha-spawn",
    );

    expect(
      alphaSpawn.subagentLifecycles.map(({ callId, id }) => ({ callId, id })),
    ).toEqual([
      { callId: "collab-alpha-spawn", id: "alpha" },
      { callId: "collab-beta-spawn", id: "beta" },
    ]);
    expect(alphaSpawn.timeline).toEqual([
      { id: "collab-alpha-spawn", kind: "subagent" },
      { id: "collab-beta-spawn", kind: "subagent" },
    ]);
    expect(presentation).toMatchObject({
      anchor: { callId: "collab-alpha-spawn", id: "alpha" },
      rows: [{ id: "alpha" }, { id: "beta" }],
      startedAtMs: 1_000,
    });
  });

  it("places nested activity before the latest same-turn parent lifecycle", () => {
    const turn = reduceProtocolNotification(initialProtocolState, {
      method: "turn/started",
      params: {
        threadId: "thread-parent-lifecycle",
        turn: { id: "turn-parent-lifecycle" },
      },
    });
    const parentStarted = reduceProtocolNotification(turn, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { parent: { status: "running" } },
          id: "collab-parent-spawn",
          receiverThreadIds: ["parent"],
          senderThreadId: "thread-parent-lifecycle",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 1_000,
        threadId: "thread-parent-lifecycle",
        turnId: "turn-parent-lifecycle",
      },
    });
    const parentCompleted = reduceProtocolNotification(parentStarted, {
      method: "item/completed",
      params: {
        completedAtMs: 2_000,
        item: {
          agentsStates: { parent: { status: "completed" } },
          id: "collab-parent-spawn",
          receiverThreadIds: ["parent"],
          senderThreadId: "thread-parent-lifecycle",
          status: "completed",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        threadId: "thread-parent-lifecycle",
        turnId: "turn-parent-lifecycle",
      },
    });
    const parentResumed = reduceProtocolNotification(parentCompleted, {
      method: "item/started",
      params: {
        item: {
          agentsStates: { parent: { status: "running" } },
          id: "collab-parent-resume",
          receiverThreadIds: ["parent"],
          senderThreadId: "thread-parent-lifecycle",
          status: "inProgress",
          tool: "resumeAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs: 3_000,
        threadId: "thread-parent-lifecycle",
        turnId: "turn-parent-lifecycle",
      },
    });
    const childActivity = reduceProtocolNotification(parentResumed, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/parent/child",
          agentThreadId: "child",
          id: "activity-child-after-parent-resume",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 3_100,
        threadId: "parent",
        turnId: "turn-parent-lifecycle",
      },
    });

    expect(childActivity.timeline).toEqual([
      { id: "collab-parent-spawn", kind: "subagent" },
      { id: "activity-child-after-parent-resume", kind: "subagent" },
      { id: "collab-parent-resume", kind: "subagent" },
    ]);
  });

  it("does not reactivate a completed subagent from a late activity event", () => {
    const completed = reduceProtocolTrace(
      replayScenarios["subagent-concurrency"].events,
    );
    const afterLateActivity = reduceProtocolNotification(completed, {
      method: "item/started",
      params: {
        item: {
          agentPath: "/root/alpha",
          agentThreadId: "alpha",
          id: "activity-subagent-alpha-late",
          kind: "started",
          type: "subAgentActivity",
        },
        startedAtMs: 80_000,
        threadId: "thread-subagent-concurrency",
        turnId: "turn-subagent-concurrency",
      },
    });

    expect(afterLateActivity.status).toBe("completed");
    expect(
      afterLateActivity.subagents.find(({ id }) => id === "alpha"),
    ).toMatchObject({
      completedAtMs: 32_000,
      message: "ALPHA SUBAGENT DONE",
      startedAtMs: 1_100,
      status: "done",
      threadStatus: "completed",
    });
  });

  it("keeps nested paths and does not reactivate them in a follow-up turn", () => {
    const scenario = replayScenarios["subagent-nested"];
    const running = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-nested-running"]),
    );
    const mixed = reduceProtocolTrace(
      scenario.events.slice(0, scenario.frames["subagent-nested-mixed"]),
    );
    const completed = reduceProtocolTrace(scenario.events);
    const followUp = reduceProtocolNotification(completed, {
      method: "turn/started",
      params: {
        threadId: "thread-subagent-nested",
        turn: { id: "turn-subagent-follow-up" },
      },
    });

    expect(running.subagents).toEqual([
      expect.objectContaining({
        agentPath: "/root/parent",
        id: "parent",
        name: "Parent",
        senderThreadId: "thread-subagent-nested",
      }),
      expect.objectContaining({
        agentPath: "/root/parent/child",
        id: "child",
        name: "Child",
        senderThreadId: "parent",
      }),
    ]);
    expect(running.timeline.filter(({ kind }) => kind === "subagent")).toEqual([
      { id: "collab-subagent-child", kind: "subagent" },
      { id: "collab-subagent-parent", kind: "subagent" },
    ]);
    expect(mixed.subagents).toEqual([
      expect.objectContaining({ id: "parent", status: "active" }),
      expect.objectContaining({
        id: "child",
        message: "CHILD SUBAGENT DONE",
        status: "done",
      }),
    ]);
    expect(completed.subagents).toEqual([
      expect.objectContaining({ id: "parent", status: "done" }),
      expect.objectContaining({ id: "child", status: "done" }),
    ]);
    expect(
      isCurrentTurnGroupActive(running, "turn-subagent-nested"),
    ).toBe(true);
    expect(
      isCurrentTurnGroupActive(followUp, "turn-subagent-nested"),
    ).toBe(false);
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
