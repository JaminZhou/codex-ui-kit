export type McpElicitationAction = "accept" | "decline" | "cancel";

export interface PendingMcpElicitation {
  elicitationId?: string;
  message: string;
  mode: "form" | "openai/form" | "openaiForm" | "url";
  requestId: number | string;
  requestedSchema?: Record<string, unknown>;
  serverName: string;
  threadId: string;
  turnId?: string | null;
  url?: string;
}

export interface McpElicitationResolution {
  action: McpElicitationAction;
  content?: Record<string, unknown>;
  kind: "mcp-elicitation-resolution";
  requestId: number | string;
  threadId: string;
}

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function validRequest(event: Record<string, unknown>): PendingMcpElicitation | null {
  if (
    event.kind !== "request" ||
    event.method !== "mcpServer/elicitation/request" ||
    (typeof event.id !== "string" && typeof event.id !== "number")
  ) return null;
  const params = record(event.params);
  if (!params || typeof params.threadId !== "string" || typeof params.serverName !== "string" || typeof params.message !== "string") return null;
  if (params.mode !== "form" && params.mode !== "openai/form" && params.mode !== "openaiForm" && params.mode !== "url") return null;
  if (params.mode === "url" && typeof params.url !== "string") return null;
  if (params.mode !== "url" && params.requestedSchema !== undefined && !record(params.requestedSchema)) return null;
  return {
    elicitationId: typeof params.elicitationId === "string" ? params.elicitationId : undefined,
    message: params.message,
    mode: params.mode,
    requestId: event.id,
    requestedSchema: record(params.requestedSchema) ?? undefined,
    serverName: params.serverName,
    threadId: params.threadId,
    turnId: typeof params.turnId === "string" ? params.turnId : null,
    url: typeof params.url === "string" ? params.url : undefined,
  };
}

export function reduceLiveMcpElicitations(
  state: PendingMcpElicitation[],
  event: unknown,
): PendingMcpElicitation[] {
  if (!event || typeof event !== "object") return state;
  const message = event as Record<string, unknown>;
  if (message.kind === "live-reset") return [];
  const params = record(message.params);
  if (message.method === "serverRequest/resolved" && params) {
    return state.filter((request) => request.requestId !== params.requestId || request.threadId !== params.threadId);
  }
  if (message.method === "turn/completed" && params) {
    const turn = record(params.turn);
    return state.filter((request) => request.threadId !== params.threadId || request.turnId !== turn?.id);
  }
  const request = validRequest(message);
  if (!request) return state;
  return [...state.filter((entry) => entry.requestId !== request.requestId), request];
}
