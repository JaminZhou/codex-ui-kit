import compactionTrace from "../fixtures/traces/compaction.jsonl?raw";
import interruptionTrace from "../fixtures/traces/interruption.jsonl?raw";
import recoveryTrace from "../fixtures/traces/streaming-recovery.jsonl?raw";
import type { ProtocolEventRecord } from "./protocol-state";

export type ReplayScenarioId =
  | "streaming-recovery"
  | "interruption"
  | "compaction";

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
};

export function isScenarioId(value: string | null): value is ReplayScenarioId {
  return Boolean(value && value in replayScenarios);
}
