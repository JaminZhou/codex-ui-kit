import compactionTrace from "../fixtures/traces/compaction.jsonl?raw";
import backgroundTerminalTrace from "../fixtures/traces/background-terminal.jsonl?raw";
import interruptionTrace from "../fixtures/traces/interruption.jsonl?raw";
import largeFileReviewTrace from "../fixtures/traces/large-file-review.jsonl?raw";
import markdownTrace from "../fixtures/traces/markdown.jsonl?raw";
import mcpToolCallTrace from "../fixtures/traces/mcp-tool-call.jsonl?raw";
import multiFileReviewTrace from "../fixtures/traces/multi-file-review.jsonl?raw";
import recoveryTrace from "../fixtures/traces/streaming-recovery.jsonl?raw";
import workflowTrace from "../fixtures/traces/workspace-workflow.jsonl?raw";
import type { ProtocolEventRecord } from "./protocol-state";

export type ReplayScenarioId =
  | "background-terminal"
  | "streaming-recovery"
  | "interruption"
  | "compaction"
  | "large-file-review"
  | "markdown"
  | "mcp-tool-call"
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
  "background-terminal": scenario(
    "background-terminal",
    "Background terminal",
    "Process output, terminal interaction, resize, close, and restore.",
    backgroundTerminalTrace,
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
  markdown: scenario(
    "markdown",
    "Markdown response",
    "Heading, inline semantics, quote, list, table, code, and response actions.",
    markdownTrace,
  ),
  "mcp-tool-call": scenario(
    "mcp-tool-call",
    "Find Codex MCP support docs",
    "A real public docs integration sequence with five successful MCP calls.",
    mcpToolCallTrace,
  ),
};

export function isScenarioId(value: string | null): value is ReplayScenarioId {
  return Boolean(value && value in replayScenarios);
}
