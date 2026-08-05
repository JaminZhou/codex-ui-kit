import approvalDeniedTrace from "../fixtures/traces/approval-denied.jsonl?raw";
import compactionTrace from "../fixtures/traces/compaction.jsonl?raw";
import conversationLifecycleTrace from "../fixtures/traces/conversation-lifecycle.jsonl?raw";
import backgroundTerminalTrace from "../fixtures/traces/background-terminal.jsonl?raw";
import interruptionTrace from "../fixtures/traces/interruption.jsonl?raw";
import largeFileReviewTrace from "../fixtures/traces/large-file-review.jsonl?raw";
import longCommandOutputTrace from "../fixtures/traces/long-command-output.jsonl?raw";
import markdownTrace from "../fixtures/traces/markdown.jsonl?raw";
import mcpToolCallTrace from "../fixtures/traces/mcp-tool-call.jsonl?raw";
import mcpRecoveryMixedThreadTrace from "../fixtures/traces/mcp-recovery-mixed-thread.jsonl?raw";
import mixedFileReviewTrace from "../fixtures/traces/mixed-file-review.jsonl?raw";
import multiFileReviewTrace from "../fixtures/traces/multi-file-review.jsonl?raw";
import recoveryTrace from "../fixtures/traces/streaming-recovery.jsonl?raw";
import terminalLifecycleTrace from "../fixtures/traces/terminal-lifecycle.jsonl?raw";
import workflowTrace from "../fixtures/traces/workspace-workflow.jsonl?raw";
import type { ProtocolEventRecord } from "./protocol-state";

export type ReplayScenarioId =
  | "approval-denied"
  | "background-terminal"
  | "conversation-lifecycle"
  | "streaming-recovery"
  | "terminal-lifecycle"
  | "interruption"
  | "compaction"
  | "large-file-review"
  | "long-command-output"
  | "markdown"
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
  "approval-denied": scenario(
    "approval-denied",
    "Approval denied",
    "A current command approval is denied, the command is not executed, and the turn completes.",
    approvalDeniedTrace,
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
  "terminal-lifecycle": scenario(
    "terminal-lifecycle",
    "Terminal session lifecycle",
    "Multiple terminal tabs, running/failed/exited processes, close, restore, and compact behavior.",
    terminalLifecycleTrace,
  ),
  "streaming-recovery": scenario(
    "streaming-recovery",
    "Streaming and retry",
    "Incremental reply, transient error, retry, and recovery.",
    recoveryTrace,
  ),
  interruption: scenario(
    "interruption",
    "Stop and summary",
    "A running response interrupted by the user and summarized.",
    interruptionTrace,
  ),
  compaction: scenario(
    "compaction",
    "Context compaction",
    "Context optimization transitions from running to completed.",
    compactionTrace,
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
};

export function isScenarioId(value: string | null): value is ReplayScenarioId {
  return Boolean(value && value in replayScenarios);
}
