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

interface LiveMcpElicitationRequestContext {
  serverName: string;
  threadId: string;
  turnId?: string | null;
}

export type LiveMcpElicitationRequest = LiveMcpElicitationRequestContext & (
  | {
      challenge: string;
      description: string;
      mode: "openai/userVerification";
      title: string;
    }
  | {
      message: string;
      mode: "form" | "openai/form" | "openaiForm";
      requestedSchema?: unknown;
    }
  | {
      elicitationId?: string;
      message: string;
      mode: "url";
      url: string;
    }
);

export interface LiveUserVerificationProof {
  credentialId: string;
  signature: string;
}

export interface LiveMcpElicitationResponse {
  action: McpElicitationAction;
  content: McpJsonValue | null;
  _meta: null;
}

type Pending = {
  finish: (response: LiveMcpElicitationResponse) => void;
  id: McpElicitationRequestId;
  request: LiveMcpElicitationRequest;
  verificationRequestId?: McpElicitationRequestId;
};

const key = (id: McpElicitationRequestId) => `${typeof id}:${id}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaProperties(request: LiveMcpElicitationRequest) {
  const requestedSchema = "requestedSchema" in request ? request.requestedSchema : undefined;
  const schema = isRecord(requestedSchema) ? requestedSchema : {};
  const properties = schema.properties;
  return isRecord(properties) ? properties : {};
}

function validateContent(request: LiveMcpElicitationRequest, raw: unknown) {
  if (request.mode === "url") {
    if (raw !== undefined && !isRecord(raw)) throw new TypeError("Elicitation content must be an object.");
    return raw === undefined ? undefined : raw;
  }
  if (request.mode === "openai/userVerification") {
    throw new Error("Device verification must be completed by the local app-server.");
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
    return new Promise((finish) => this.pending.set(key(id), { finish, id, request }));
  }

  userVerificationRequest(
    id: McpElicitationRequestId,
    threadId: string,
  ): Extract<LiveMcpElicitationRequest, { mode: "openai/userVerification" }> | null {
    const pending = this.pending.get(key(id));
    if (!pending) return null;
    if (pending.request.threadId !== threadId) throw new Error("The elicitation belongs to another thread.");
    return pending.request.mode === "openai/userVerification" ? pending.request : null;
  }

  setUserVerificationRequestId(
    id: McpElicitationRequestId,
    threadId: string,
    verificationRequestId: McpElicitationRequestId,
  ): boolean {
    const pending = this.pending.get(key(id));
    if (!pending) return false;
    if (pending.request.threadId !== threadId) throw new Error("The elicitation belongs to another thread.");
    if (pending.request.mode !== "openai/userVerification" || pending.verificationRequestId !== undefined) return false;
    pending.verificationRequestId = verificationRequestId;
    return true;
  }

  userVerificationRequestId(
    id: McpElicitationRequestId,
    threadId: string,
  ): McpElicitationRequestId | null {
    const pending = this.pending.get(key(id));
    if (!pending) return null;
    if (pending.request.threadId !== threadId) throw new Error("The elicitation belongs to another thread.");
    return pending.verificationRequestId ?? null;
  }

  pendingUserVerificationRequests(
    threadId?: string,
    turnId?: string,
  ): Array<{ elicitationRequestId: McpElicitationRequestId; threadId: string; verificationRequestId: McpElicitationRequestId }> {
    return [...this.pending.values()].flatMap((pending) => {
      if (pending.request.mode !== "openai/userVerification" || pending.verificationRequestId === undefined) return [];
      if (threadId !== undefined && pending.request.threadId !== threadId) return [];
      if (turnId !== undefined && pending.request.turnId !== turnId) return [];
      return [{ elicitationRequestId: pending.id, threadId: pending.request.threadId, verificationRequestId: pending.verificationRequestId }];
    });
  }

  clearUserVerificationRequestId(id: McpElicitationRequestId, threadId: string) {
    const pending = this.pending.get(key(id));
    if (!pending || pending.request.threadId !== threadId) return false;
    pending.verificationRequestId = undefined;
    return true;
  }

  respondWithUserVerificationProof(
    id: McpElicitationRequestId,
    threadId: string,
    rawProof: unknown,
  ): boolean {
    const pending = this.pending.get(key(id));
    if (!pending) return false;
    if (pending.request.threadId !== threadId) throw new Error("The elicitation belongs to another thread.");
    if (pending.request.mode !== "openai/userVerification") {
      throw new Error("The pending elicitation does not require device verification.");
    }
    if (
      !isRecord(rawProof) ||
      typeof rawProof.credentialId !== "string" || rawProof.credentialId.length === 0 ||
      typeof rawProof.signature !== "string" || rawProof.signature.length === 0
    ) throw new TypeError("The local app-server returned an invalid verification proof.");
    const proof: LiveUserVerificationProof = {
      credentialId: rawProof.credentialId,
      signature: rawProof.signature,
    };
    this.pending.delete(key(id));
    pending.finish({ _meta: null, action: "accept", content: proof as unknown as McpJsonValue });
    return true;
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
