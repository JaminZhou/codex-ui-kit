export type McpElicitationAction = "accept" | "decline" | "cancel";
export type McpElicitationRequestId = string | number;

// The current client package keeps the response type inside its generated
// protocol map instead of exporting it from the root entry point. Keep the
// bridge's boundary type structurally identical to that JSON-only response so
// the renderer remains decoupled from generated aliases.
type McpJsonValue =
  | number
  | string
  | boolean
  | McpJsonValue[]
  | { [key: string]: McpJsonValue | undefined }
  | null;

export interface LiveMcpElicitationRequest {
  elicitationId?: string;
  message: string;
  mode: "form" | "openai/form" | "openaiForm" | "url";
  requestedSchema?: unknown;
  serverName: string;
  threadId: string;
  turnId?: string | null;
  url?: string;
}

export interface LiveMcpElicitationResponse {
  action: McpElicitationAction;
  content: McpJsonValue | null;
  _meta: null;
}

type Pending = {
  finish: (response: LiveMcpElicitationResponse) => void;
  request: LiveMcpElicitationRequest;
};

const key = (id: McpElicitationRequestId) => `${typeof id}:${id}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaProperties(request: LiveMcpElicitationRequest) {
  const schema = isRecord(request.requestedSchema) ? request.requestedSchema : {};
  const properties = schema.properties;
  return isRecord(properties) ? properties : {};
}

function validateContent(request: LiveMcpElicitationRequest, raw: unknown) {
  if (request.mode === "url") {
    if (raw !== undefined && !isRecord(raw)) throw new TypeError("Elicitation content must be an object.");
    return raw === undefined ? undefined : raw;
  }
  if (!isRecord(raw)) throw new TypeError("Elicitation content must be an object.");
  const properties = schemaProperties(request);
  const schema = isRecord(request.requestedSchema) ? request.requestedSchema : {};
  const required = Array.isArray(schema.required)
    ? schema.required.filter((entry): entry is string => typeof entry === "string")
    : [];
  if (Object.keys(raw).some((name) => !Object.hasOwn(properties, name))) {
    throw new TypeError("Elicitation content contains an unknown field.");
  }
  for (const name of required) {
    if (!Object.hasOwn(raw, name)) throw new TypeError("Every required field needs an answer.");
  }
  for (const [name, value] of Object.entries(raw)) {
    const schema = isRecord(properties[name]) ? properties[name] : {};
    const type = schema.type;
    if (type === "boolean" && typeof value !== "boolean") throw new TypeError(`Invalid boolean field: ${name}.`);
    if ((type === "number" || type === "integer") && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new TypeError(`Invalid numeric field: ${name}.`);
    }
    if (type === "string" && (typeof value !== "string" || !value.trim())) {
      throw new TypeError(`Invalid string field: ${name}.`);
    }
    const allowed = Array.isArray(schema.enum) ? schema.enum : undefined;
    if (allowed && !allowed.includes(value)) throw new TypeError(`Invalid choice for field: ${name}.`);
  }
  return { ...raw };
}

/** Owns only pending MCP elicitation requests; answers are discarded after delivery. */
export class LiveMcpElicitationGate {
  private pending = new Map<string, Pending>();

  request(id: McpElicitationRequestId, request: LiveMcpElicitationRequest): Promise<LiveMcpElicitationResponse> {
    this.cancel(id);
    return new Promise((finish) => this.pending.set(key(id), { finish, request }));
  }

  respond(
    id: McpElicitationRequestId,
    threadId: string,
    action: McpElicitationAction,
    content?: unknown,
  ): boolean {
    const pending = this.pending.get(key(id));
    if (!pending) return false;
    if (pending.request.threadId !== threadId) throw new Error("The elicitation belongs to another thread.");
    if (action === "accept") {
      const validated = validateContent(pending.request, content);
      pending.finish({ _meta: null, action, content: (validated as McpJsonValue) ?? null });
    } else {
      pending.finish({ _meta: null, action, content: null });
    }
    this.pending.delete(key(id));
    return true;
  }

  cancel(id: McpElicitationRequestId, threadId?: string): boolean {
    const pending = this.pending.get(key(id));
    if (!pending || (threadId !== undefined && pending.request.threadId !== threadId)) return false;
    this.pending.delete(key(id));
    pending.finish({ _meta: null, action: "cancel", content: null });
    return true;
  }

  clear(threadId?: string) {
    for (const [id, pending] of this.pending) {
      if (threadId !== undefined && pending.request.threadId !== threadId) continue;
      this.pending.delete(id);
      pending.finish({ _meta: null, action: "cancel", content: null });
    }
  }

  clearTurn(threadId: string, turnId: string) {
    for (const [id, pending] of this.pending) {
      if (pending.request.threadId !== threadId || pending.request.turnId !== turnId) continue;
      this.pending.delete(id);
      pending.finish({ _meta: null, action: "cancel", content: null });
    }
  }
}
