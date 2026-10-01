export type McpElicitationAction = "accept" | "decline" | "cancel";

interface PendingMcpElicitationContext {
  requestId: number | string;
  serverName: string;
  threadId: string;
  turnId?: string | null;
}

export type PendingMcpElicitation = PendingMcpElicitationContext & (
  | {
      challenge: string;
      description: string;
      mode: "openai/userVerification";
      title: string;
    }
  | {
      message: string;
      mode: "form" | "openai/form" | "openaiForm";
      requestedSchema?: Record<string, unknown>;
    }
  | {
      elicitationId?: string;
      message: string;
      mode: "url";
      url: string;
    }
);

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
  if (!params || typeof params.threadId !== "string" || typeof params.serverName !== "string") return null;
  const context = {
    requestId: event.id,
    serverName: params.serverName,
    threadId: params.threadId,
    turnId: typeof params.turnId === "string" ? params.turnId : null,
  };
  if (
    params.mode === "openai/userVerification" &&
    typeof params.challenge === "string" &&
    typeof params.title === "string" &&
    typeof params.description === "string"
  ) {
    return {
      ...context,
      challenge: params.challenge,
      description: params.description,
      mode: "openai/userVerification",
      title: params.title,
    };
  }
  if (typeof params.message !== "string") return null;
  if (params.mode === "url" && typeof params.url === "string") {
    return {
      ...context,
      elicitationId: typeof params.elicitationId === "string" ? params.elicitationId : undefined,
      message: params.message,
      mode: "url",
      url: params.url,
    };
  }
  if (params.mode === "form" || params.mode === "openai/form" || params.mode === "openaiForm") {
    if (params.requestedSchema !== undefined && !record(params.requestedSchema)) return null;
    return {
      ...context,
      message: params.message,
      mode: params.mode,
      requestedSchema: record(params.requestedSchema) ?? undefined,
    };
  }
  return null;
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
