import approvalAllowOnceTrace from "../fixtures/traces/approval-allow-once.jsonl?raw";
import approvalCurrent26820FileTrace from "../fixtures/traces/approval-current-26-820-file.jsonl?raw";
import approvalDeniedTrace from "../fixtures/traces/approval-denied.jsonl?raw";
import approvalForSessionTrace from "../fixtures/traces/approval-for-session.jsonl?raw";
import approvalReviewTimeoutTrace from "../fixtures/traces/approval-review-timeout.jsonl?raw";
import approvalSimilarCommandsTrace from "../fixtures/traces/approval-similar-commands.jsonl?raw";
import attachmentLifecycleTrace from "../fixtures/traces/attachment-lifecycle.jsonl?raw";
import compactionTrace from "../fixtures/traces/compaction.jsonl?raw";
import contextSummaryTrace from "../fixtures/traces/context-summary.jsonl?raw";
import currentBasicMessageTrace from "../fixtures/traces/current-basic-message.jsonl?raw";
import currentBrowser26825Trace from "../fixtures/traces/current-browser-26-825.jsonl?raw";
import currentMixedToolThreadTrace from "../fixtures/traces/current-mixed-tool-thread.jsonl?raw";
import currentPlan26825Trace from "../fixtures/traces/current-plan-26-825.jsonl?raw";
import currentSearch26825Trace from "../fixtures/traces/current-search-26-825.jsonl?raw";
import currentReviewRenameTrace from "../fixtures/traces/current-review-rename.jsonl?raw";
import currentReviewFilesTrace from "../fixtures/traces/current-review-files.jsonl?raw";
import commandCurrent26820FailureTrace from "../fixtures/traces/command-current-26-820-failure.jsonl?raw";
import commandCurrent26820InterruptionTrace from "../fixtures/traces/command-current-26-820-interruption.jsonl?raw";
import commandCurrent26820SuccessTrace from "../fixtures/traces/command-current-26-820-success.jsonl?raw";
import commandFailureRecoveryTrace from "../fixtures/traces/command-failure-recovery.jsonl?raw";
import conversationLifecycleTrace from "../fixtures/traces/conversation-lifecycle.jsonl?raw";
import backgroundTerminalTrace from "../fixtures/traces/background-terminal.jsonl?raw";
import interruptionTrace from "../fixtures/traces/interruption.jsonl?raw";
import largeFileReviewTrace from "../fixtures/traces/large-file-review.jsonl?raw";
import longCommandOutputTrace from "../fixtures/traces/long-command-output.jsonl?raw";
import markdownTableActionsTrace from "../fixtures/traces/markdown-table-actions.jsonl?raw";
import markdownStreamingLargeTrace from "../fixtures/traces/markdown-streaming-large.jsonl?raw";
import markdownCurrent26818Trace from "../fixtures/traces/markdown-current-26-818.jsonl?raw";
import markdownCurrent26820MediaTrace from "../fixtures/traces/markdown-current-26-820-media.jsonl?raw";
import markdownCurrent26825Trace from "../fixtures/traces/markdown-current-26-825.jsonl?raw";
import markdownTrace from "../fixtures/traces/markdown.jsonl?raw";
import mcpCurrentIntegrationRecoveryTrace from "../fixtures/traces/mcp-current-integration-recovery.jsonl?raw";
import mcpCurrent26818RecoveryTrace from "../fixtures/traces/mcp-current-26-818-recovery.jsonl?raw";
import mcpCurrent26818SuccessTrace from "../fixtures/traces/mcp-current-26-818-success.jsonl?raw";
import mcpCurrent26820RecoveryTrace from "../fixtures/traces/mcp-current-26-820-recovery.jsonl?raw";
import mcpCurrent26820SuccessTrace from "../fixtures/traces/mcp-current-26-820-success.jsonl?raw";
import mcpCurrentRecoveryTrace from "../fixtures/traces/mcp-current-recovery.jsonl?raw";
import mcpCurrentSuccessTrace from "../fixtures/traces/mcp-current-success.jsonl?raw";
import mcpToolCallTrace from "../fixtures/traces/mcp-tool-call.jsonl?raw";
import mcpRecoveryMixedThreadTrace from "../fixtures/traces/mcp-recovery-mixed-thread.jsonl?raw";
import mixedFileReviewTrace from "../fixtures/traces/mixed-file-review.jsonl?raw";
import multiFileReviewTrace from "../fixtures/traces/multi-file-review.jsonl?raw";
import recoveryTrace from "../fixtures/traces/streaming-recovery.jsonl?raw";
import subagentConcurrencyTrace from "../fixtures/traces/subagent-concurrency.jsonl?raw";
import subagentDelegationTrace from "../fixtures/traces/subagent-delegation.jsonl?raw";
import subagentNestedTrace from "../fixtures/traces/subagent-nested.jsonl?raw";
import subagentRecoveryTrace from "../fixtures/traces/subagent-recovery.jsonl?raw";
import terminalLifecycleTrace from "../fixtures/traces/terminal-lifecycle.jsonl?raw";
import workflowTrace from "../fixtures/traces/workspace-workflow.jsonl?raw";
import type { ProtocolEventRecord } from "./protocol-state";

export type ReplayScenarioId =
  | "approval-allow-once"
  | "approval-current-26-820-file"
  | "approval-denied"
  | "approval-for-session"
  | "approval-review-timeout"
  | "approval-similar-commands"
  | "attachment-lifecycle"
  | "background-terminal"
  | "command-current-26-820-failure"
  | "command-current-26-820-interruption"
  | "command-current-26-820-success"
  | "command-failure-recovery"
  | "conversation-lifecycle"
  | "streaming-recovery"
  | "subagent-concurrency"
  | "subagent-delegation"
  | "subagent-nested"
  | "subagent-recovery"
  | "terminal-lifecycle"
  | "interruption"
  | "compaction"
  | "context-summary"
  | "current-basic-message"
  | "current-browser-26-825"
  | "current-mixed-tool-thread"
  | "current-plan-26-825"
  | "current-search-26-825"
  | "current-review-rename"
  | "current-review-files"
  | "large-file-review"
  | "long-command-output"
  | "markdown"
  | "markdown-current-26-818"
  | "markdown-current-26-820-media"
  | "markdown-current-26-825"
  | "markdown-table-actions"
  | "markdown-streaming-large"
  | "mcp-current-integration-recovery"
  | "mcp-current-26-818-recovery"
  | "mcp-current-26-818-success"
  | "mcp-current-26-820-recovery"
  | "mcp-current-26-820-success"
  | "mcp-current-recovery"
  | "mcp-current-success"
  | "mcp-tool-call"
  | "mcp-recovery-mixed-thread"
  | "mixed-file-review"
  | "multi-file-review"
  | "workspace-workflow";

export interface ReplayScenario {
  description: string;
  events: ProtocolEventRecord[];
  frames: Record<string, number>;
  id: ReplayScenarioId;
  label: string;
}

function parseTrace(raw: string): ProtocolEventRecord[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProtocolEventRecord);
}

function framesFor(events: readonly ProtocolEventRecord[]) {
  return Object.fromEntries(
    events.flatMap((event, index) =>
      event.frame ? [[event.frame, index + 1] as const] : [],
    ),
  );
}

function scenario(
  id: ReplayScenarioId,
  label: string,
  description: string,
  raw: string,
): ReplayScenario {
  const events = parseTrace(raw);
  return {
    description,
    events,
    frames: framesFor(events),
    id,
    label,
  };
}

export const replayScenarios: Record<ReplayScenarioId, ReplayScenario> = {
  "attachment-lifecycle": scenario(
    "attachment-lifecycle",
    "Complete attachment lifecycle test",
    "A current image attachment can be removed, added again, submitted, rendered with the user message, and cleared from the restored Composer.",
    attachmentLifecycleTrace,
  ),
  "approval-allow-once": scenario(
    "approval-allow-once",
    "Approval allowed once",
    "A current command pauses in the Composer dock, is allowed exactly once, completes, and restores the unchanged approval policy.",
    approvalAllowOnceTrace,
  ),
  "approval-current-26-820-file": scenario(
    "approval-current-26-820-file",
    "Observe approval denial",
    "The runtime-observed 26.820 external-file edit pauses in the current Permissions card, exposes one-time and conversation-scoped choices, preserves a denied no-write result, and completes an independently allowed write.",
    approvalCurrent26820FileTrace,
  ),
  "approval-denied": scenario(
    "approval-denied",
    "Approval denied",
    "A current command approval is denied, the command is not executed, and the turn completes.",
    approvalDeniedTrace,
  ),
  "approval-similar-commands": scenario(
    "approval-similar-commands",
    "Allow similar commands",
    "A current command installs a matching approval rule, then the same command completes again without another prompt.",
    approvalSimilarCommandsTrace,
  ),
  "conversation-lifecycle": scenario(
    "conversation-lifecycle",
    "Conversation and Composer lifecycle",
    "Long-thread navigation, follow recovery, Composer growth, queueing, interruption, automatic continuation, and legacy paused-queue compatibility.",
    conversationLifecycleTrace,
  ),
  "background-terminal": scenario(
    "background-terminal",
    "Background terminal",
    "Process output, terminal interaction, resize, close, and restore.",
    backgroundTerminalTrace,
  ),
  "approval-for-session": scenario(
    "approval-for-session",
    "Allow all edits for session",
    "A current file approval is accepted for the session, then a second file edit completes without another prompt.",
    approvalForSessionTrace,
  ),
  "approval-review-timeout": scenario(
    "approval-review-timeout",
    "Automatic approval review timeout",
    "The current automatic reviewer transitions from in-progress to timed out without running the reviewed network request.",
    approvalReviewTimeoutTrace,
  ),
  "command-failure-recovery": scenario(
    "command-failure-recovery",
    "Recover from command failure",
    "The current installed Codex stdout/stderr probe exits 7, preserves its exact shell card, and accepts the observed same-thread recovery response.",
    commandFailureRecoveryTrace,
  ),
  "command-current-26-820-success": scenario(
    "command-current-26-820-success",
    "Observe long-running shell command",
    "The runtime-observed 26.820 product keeps a successful long-running command as a regular-weight, noninteractive command row inside the expandable activity timeline while retaining protocol output outside the visible thread.",
    commandCurrent26820SuccessTrace,
  ),
  "command-current-26-820-failure": scenario(
    "command-current-26-820-failure",
    "Observe command failure",
    "The runtime-observed 26.820 product keeps an exit-7 command as a noninteractive Ran row without exposing stdout, stderr, or an exit-code card, then accepts a same-thread recovery.",
    commandCurrent26820FailureTrace,
  ),
  "command-current-26-820-interruption": scenario(
    "command-current-26-820-interruption",
    "监控 CURRENT 26.820 中断",
    "The runtime-observed 26.820 product moves from a running terminal row through an immediate zero-second stop to a settled sixteen-second stop and same-thread recovery.",
    commandCurrent26820InterruptionTrace,
  ),
  "terminal-lifecycle": scenario(
    "terminal-lifecycle",
    "Terminal session lifecycle",
    "Multiple terminal tabs, running/failed/exited processes, close, restore, and compact behavior.",
    terminalLifecycleTrace,
  ),
  "streaming-recovery": scenario(
    "streaming-recovery",
    "Streaming retry, failure, and recovery",
    "Incremental reply, in-place retry progress, successful recovery, final failure, and a successful same-thread follow-up.",
    recoveryTrace,
  ),
  "subagent-delegation": scenario(
    "subagent-delegation",
    "Delegate single subagent probe",
    "A current real subagent moves from working activity through the thread summary into the Subagents panel and nested transcript.",
    subagentDelegationTrace,
  ),
  "subagent-concurrency": scenario(
    "subagent-concurrency",
    "Delegate concurrent subagents",
    "Two current real sibling subagents aggregate across running, mixed, completed, summary, panel, and independent transcript states.",
    subagentConcurrencyTrace,
  ),
  "subagent-nested": scenario(
    "subagent-nested",
    "Run nested subagent probe",
    "A current real Parent delegates Child; public agent paths preserve the hierarchy while the current panel presents both agents in one flat lifecycle list.",
    subagentNestedTrace,
  ),
  "subagent-recovery": scenario(
    "subagent-recovery",
    "Recover mixed subagent lifecycles",
    "Twelve protocol-backed subagents cover waiting, streamed progress, terminal failure and interruption states, the current 4/10 panel pagination, and a recovered parent response.",
    subagentRecoveryTrace,
  ),
  interruption: scenario(
    "interruption",
    "Run interrupt probe",
    "The current installed Codex long-running command is stopped after 58 seconds, retains its settled background-terminal row, and accepts the observed same-thread recovery response.",
    interruptionTrace,
  ),
  compaction: scenario(
    "compaction",
    "Acknowledge compaction baseline",
    "The current manual /compact command transitions from running to completed and accepts a clean same-thread follow-up.",
    compactionTrace,
  ),
  "context-summary": scenario(
    "context-summary",
    "Probe context summary panel",
    "The current thread summary toggle opens the compact environment and Git workflow overlay.",
    contextSummaryTrace,
  ),
  "current-mixed-tool-thread": scenario(
    "current-mixed-tool-thread",
    "Run a mixed tool workflow",
    "A current-style multi-turn composition of web search, Browser, MCP, command approval, file review, and subagent work backed by public protocol events.",
    currentMixedToolThreadTrace,
  ),
  "current-browser-26-825": scenario(
    "current-browser-26-825",
    "查找 Codex 页面 desktop",
    "The runtime-observed 26.825 Browser lifecycle groups read-only MCP activity in the thread and opens the one-tab in-app Browser workspace shell.",
    currentBrowser26825Trace,
  ),
  "current-plan-26-825": scenario(
    "current-plan-26-825",
    "创建八步只读探测计划",
    "The runtime-observed 26.825 Plan lifecycle anchors Step n / total above the Composer, exposes the full status list in a tooltip, and removes the surface after completion.",
    currentPlan26825Trace,
  ),
  "current-search-26-825": scenario(
    "current-search-26-825",
    "Search Codex desktop page",
    "The runtime-observed 26.825 Web Search lifecycle groups two completed public search actions under one expandable thread activity.",
    currentSearch26825Trace,
  ),
  "current-review-rename": scenario(
    "current-review-rename",
    "Rename current review probe",
    "The current product presents a rename as separate marker-backed source and destination diffs while preserving the public move-path replay independently.",
    currentReviewRenameTrace,
  ),
  "current-review-files": scenario(
    "current-review-files",
    "Update current Review probe files",
    "The current 26.820 Review workspace covers added, modified, and deleted files, toolbar and file-tree interactions, compact overlay behavior, and the observed latest-turn selection boundary.",
    currentReviewFilesTrace,
  ),
  "multi-file-review": scenario(
    "multi-file-review",
    "Create ignored probe files",
    "One aggregated file card and a stacked two-file Review panel.",
    multiFileReviewTrace,
  ),
  "mixed-file-review": scenario(
    "mixed-file-review",
    "Mixed file Review",
    "Rename, delete, binary, and host-inferred conflict presentation with synchronized Review selection.",
    mixedFileReviewTrace,
  ),
  "workspace-workflow": scenario(
    "workspace-workflow",
    "Command to review",
    "Command execution, approval, file change, and the Review panel.",
    workflowTrace,
  ),
  "large-file-review": scenario(
    "large-file-review",
    "Large Review workspace",
    "Eight files and long diffs exercise panel scrolling and exact file reveal.",
    largeFileReviewTrace,
  ),
  "long-command-output": scenario(
    "long-command-output",
    "Run command output probe",
    "A current completed command expands from its work summary into a 400-line, bottom-following shell output card.",
    longCommandOutputTrace,
  ),
  markdown: scenario(
    "markdown",
    "Markdown response",
    "Heading, inline semantics, quote, list, table, code, and response actions.",
    markdownTrace,
  ),
  "markdown-current-26-818": scenario(
    "markdown-current-26-818",
    "Current 26.818 Markdown response",
    "The runtime-observed 26.818 heading, inline semantics, quote, list, full-width narrow table, code block, and source-owned external URL text.",
    markdownCurrent26818Trace,
  ),
  "markdown-current-26-820-media": scenario(
    "markdown-current-26-820-media",
    "Current 26.820 Markdown media",
    "The runtime-observed 26.820 block math and source-preservation boundary plus package-observed image preview, grid, loading, and unavailable states.",
    markdownCurrent26820MediaTrace,
  ),
  "markdown-current-26-825": scenario(
    "markdown-current-26-825",
    "Render Markdown sample",
    "The current 26.825 heading, inline semantics, link, quote, list, table, code block, inline-math preservation, and block-math rendering boundary.",
    markdownCurrent26825Trace,
  ),
  "markdown-table-actions": scenario(
    "markdown-table-actions",
    "Inspect a wide Markdown table",
    "A current 18-column table exposes hover-only Copy and Expand actions, preserves the raw Markdown clipboard payload, and opens the full-screen table preview.",
    markdownTableActionsTrace,
  ),
  "markdown-streaming-large": scenario(
    "markdown-streaming-large",
    "Stream the current rich Markdown response",
    "Current 26.825 protocol deltas mount a link, task list, empty-to-filled code card, seven-column table, and thirty-six-section response before completion.",
    markdownStreamingLargeTrace,
  ),
  "mcp-current-success": scenario(
    "mcp-current-success",
    "Find current Codex MCP guidance",
    "The current 26.810 product sequence uses one Search call followed by one successful Fetch for the canonical Codex MCP page.",
    mcpCurrentSuccessTrace,
  ),
  "mcp-current-26-818-success": scenario(
    "mcp-current-26-818-success",
    "Find current 26.818 Codex MCP guidance",
    "The runtime-observed 26.818 product searches and fetches the current learn.chatgpt.com MCP page, then opens the pinned Outputs and Sources summary.",
    mcpCurrent26818SuccessTrace,
  ),
  "mcp-current-integration-recovery": scenario(
    "mcp-current-integration-recovery",
    "Recover an unavailable integration",
    "The current 26.803 product reports an unavailable GitHub integration, then recovers in the same thread through OpenAI Developer Docs Search and Fetch calls.",
    mcpCurrentIntegrationRecoveryTrace,
  ),
  "mcp-current-recovery": scenario(
    "mcp-current-recovery",
    "Recover current Codex MCP lookup",
    "The current 26.810 product keeps failed Fetch, recovery Search, and successful Fetch inside one integration group.",
    mcpCurrentRecoveryTrace,
  ),
  "mcp-current-26-818-recovery": scenario(
    "mcp-current-26-818-recovery",
    "Recover current 26.818 Codex MCP lookup",
    "The runtime-observed 26.818 product keeps an Invalid URL failure, recovery Search, and successful Fetch in one expanded integration group.",
    mcpCurrent26818RecoveryTrace,
  ),
  "mcp-current-26-820-success": scenario(
    "mcp-current-26-820-success",
    "查找 MCP 官方文档",
    "The runtime-observed 26.820 product searches and fetches the current learn.chatgpt.com MCP page with regular-weight, non-expandable call rows.",
    mcpCurrent26820SuccessTrace,
  ),
  "mcp-current-26-820-recovery": scenario(
    "mcp-current-26-820-recovery",
    "查找 MCP 官方文档",
    "The runtime-observed 26.820 product first shows an ungrouped failed Fetch row, then a captured same-turn Search and Fetch recovery sequence without an error-output card.",
    mcpCurrent26820RecoveryTrace,
  ),
  "mcp-tool-call": scenario(
    "mcp-tool-call",
    "Find Codex MCP guidance",
    "A current public docs integration sequence with successful Search and Fetch calls.",
    mcpToolCallTrace,
  ),
  "mcp-recovery-mixed-thread": scenario(
    "mcp-recovery-mixed-thread",
    "Recover Codex MCP docs lookup",
    "A failed fetch recovers through search, then a second turn runs a command, approval, and file review.",
    mcpRecoveryMixedThreadTrace,
  ),
  "current-basic-message": scenario(
    "current-basic-message",
    "Reply with exactly CURRENT BASIC MESSAGE.",
    "A current 26.818 plain-text user and assistant turn with the completed response actions and restored Composer.",
    currentBasicMessageTrace,
  ),
};

export function isScenarioId(value: string | null): value is ReplayScenarioId {
  return Boolean(value && value in replayScenarios);
}
