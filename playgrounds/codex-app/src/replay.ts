import approvalAllowOnceTrace from "../fixtures/traces/approval-allow-once.jsonl?raw";
import approvalDeniedTrace from "../fixtures/traces/approval-denied.jsonl?raw";
import approvalForSessionTrace from "../fixtures/traces/approval-for-session.jsonl?raw";
import approvalReviewTimeoutTrace from "../fixtures/traces/approval-review-timeout.jsonl?raw";
import approvalSimilarCommandsTrace from "../fixtures/traces/approval-similar-commands.jsonl?raw";
import attachmentLifecycleTrace from "../fixtures/traces/attachment-lifecycle.jsonl?raw";
import compactionTrace from "../fixtures/traces/compaction.jsonl?raw";
import contextSummaryTrace from "../fixtures/traces/context-summary.jsonl?raw";
import currentBasicMessageTrace from "../fixtures/traces/current-basic-message.jsonl?raw";
import currentMixedToolThreadTrace from "../fixtures/traces/current-mixed-tool-thread.jsonl?raw";
import currentReviewRenameTrace from "../fixtures/traces/current-review-rename.jsonl?raw";
import currentReviewFilesTrace from "../fixtures/traces/current-review-files.jsonl?raw";
import commandFailureRecoveryTrace from "../fixtures/traces/command-failure-recovery.jsonl?raw";
import conversationLifecycleTrace from "../fixtures/traces/conversation-lifecycle.jsonl?raw";
import backgroundTerminalTrace from "../fixtures/traces/background-terminal.jsonl?raw";
import interruptionTrace from "../fixtures/traces/interruption.jsonl?raw";
import largeFileReviewTrace from "../fixtures/traces/large-file-review.jsonl?raw";
import longCommandOutputTrace from "../fixtures/traces/long-command-output.jsonl?raw";
import markdownTableActionsTrace from "../fixtures/traces/markdown-table-actions.jsonl?raw";
import markdownStreamingLargeTrace from "../fixtures/traces/markdown-streaming-large.jsonl?raw";
import markdownTrace from "../fixtures/traces/markdown.jsonl?raw";
import mcpCurrentIntegrationRecoveryTrace from "../fixtures/traces/mcp-current-integration-recovery.jsonl?raw";
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
  | "approval-denied"
  | "approval-for-session"
  | "approval-review-timeout"
  | "approval-similar-commands"
  | "attachment-lifecycle"
  | "background-terminal"
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
  | "current-mixed-tool-thread"
  | "current-review-rename"
  | "current-review-files"
  | "large-file-review"
  | "long-command-output"
  | "markdown"
  | "markdown-table-actions"
  | "markdown-streaming-large"
  | "mcp-current-integration-recovery"
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
    "A current stdout/stderr command exits 7, expands into its bounded reverse-tail shell, and accepts a clean follow-up turn.",
    commandFailureRecoveryTrace,
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
    "A current long-running command is stopped, retains its settled background-terminal row, and accepts a clean same-thread follow-up.",
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
  "current-review-rename": scenario(
    "current-review-rename",
    "Rename current review probe",
    "The current product presents a rename as separate marker-backed source and destination diffs while preserving the public move-path replay independently.",
    currentReviewRenameTrace,
  ),
  "current-review-files": scenario(
    "current-review-files",
    "Update current Review probe files",
    "The current 26.810 Review workspace covers added, modified, and deleted files, toolbar and file-tree interactions, compact overlay behavior, and the observed Undo failure boundary.",
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
  "markdown-table-actions": scenario(
    "markdown-table-actions",
    "Inspect a wide Markdown table",
    "A current 18-column table exposes hover-only Copy and Expand actions, preserves the raw Markdown clipboard payload, and opens the full-screen table preview.",
    markdownTableActionsTrace,
  ),
  "markdown-streaming-large": scenario(
    "markdown-streaming-large",
    "Stream a large Markdown response",
    "Protocol deltas mutate an incomplete link and code fence before a multi-column table and twelve-section response exercise long-content scrolling.",
    markdownStreamingLargeTrace,
  ),
  "mcp-current-success": scenario(
    "mcp-current-success",
    "Find current Codex MCP guidance",
    "The current 26.810 product sequence uses one Search call followed by one successful Fetch for the canonical Codex MCP page.",
    mcpCurrentSuccessTrace,
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
