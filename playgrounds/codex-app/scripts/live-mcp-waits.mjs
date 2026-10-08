// These self-contained predicates are serialized into the Renderer by Playwright.
// A retry notification is not success: keep waiting for evidence or a terminal
// outcome under the caller's existing timeout.
export function mcpToolEvidenceReady(expectedCount) {
  const events = window.__liveMcpEvidence ?? [];
  return events.filter(
    (event) => event.method === "item/completed" &&
      event.params?.item?.type === "mcpToolCall",
  ).length >= expectedCount || events.some(
    (event) => (event.method === "error" && event.params?.willRetry !== true) ||
      (event.method === "turn/completed" && event.params?.turn?.status !== "completed"),
  );
}

export function mcpTurnEvidenceReady() {
  return (window.__liveMcpEvidence ?? []).some(
    (event) => (event.method === "error" && event.params?.willRetry !== true) ||
      event.method === "turn/completed",
  );
}

export function firstTerminalMcpError(events) {
  return events.find(
    (event) => event.method === "error" && event.params?.willRetry !== true,
  );
}
