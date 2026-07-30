import type {
  DemoMcpToolCall,
  DemoProtocolState,
} from "./protocol-state";

function mcpResultText(content: readonly unknown[]) {
  return content
    .flatMap((entry) => {
      if (
        typeof entry === "object" &&
        entry !== null &&
        "text" in entry &&
        typeof entry.text === "string"
      ) {
        return [entry.text];
      }
      return [];
    })
    .join("\n");
}

export function mcpToolCallGroupForEntry(
  state: DemoProtocolState,
  entryIndex: number,
) {
  const entry = state.timeline[entryIndex];
  if (entry?.kind !== "mcpToolCall") return null;
  const toolCall = state.mcpToolCalls.find(({ id }) => id === entry.id);
  if (!toolCall) return null;

  const calls = state.timeline.flatMap((candidate) => {
    if (candidate.kind !== "mcpToolCall") return [];
    const call = state.mcpToolCalls.find(({ id }) => id === candidate.id);
    return call?.turnId === toolCall.turnId &&
      call.server === toolCall.server
      ? [call]
      : [];
  });

  return calls[0]?.id === toolCall.id ? calls : null;
}

export function mcpToolCallGroupDurationMs(
  state: DemoProtocolState,
  calls: readonly DemoMcpToolCall[],
) {
  const turnId = calls[0]?.turnId;
  return (
    (turnId ? state.turnDurationsMs[turnId] : undefined) ??
    calls.reduce(
      (total, call) => total + (call.durationMs ?? 0),
      0,
    )
  );
}

export function mcpToolCallGroupStatus(
  calls: readonly DemoMcpToolCall[],
): DemoMcpToolCall["status"] {
  if (
    calls.some(
      ({ status }) => status === "running" || status === "pending",
    )
  ) {
    return "running";
  }
  return calls.at(-1)?.status === "failed" ? "failed" : "completed";
}

export function mcpToolCallPresentation(call: DemoMcpToolCall) {
  const result = mcpResultText(call.content);
  return {
    error: call.error ?? undefined,
    result:
      call.structuredContent === null
        ? (result || undefined)
        : undefined,
    structuredContent: call.structuredContent ?? undefined,
    summary:
      call.status === "running" || call.status === "pending"
        ? call.progress.at(-1)
        : undefined,
  };
}
