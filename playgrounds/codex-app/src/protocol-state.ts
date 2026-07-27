import type {
  JsonRpcNotification,
  JsonValue,
} from "@jaminzhou/codex-app-server-client";

export type DemoTurnStatus =
  | "idle"
  | "running"
  | "retrying"
  | "completed"
  | "interrupted"
  | "failed";

export interface ProtocolEventRecord {
  atMs: number;
  frame?: string;
  method: string;
  params: JsonValue;
}

export interface DemoMessage {
  id: string;
  role: "assistant" | "user";
  status: DemoTurnStatus;
  text: string;
}

export interface DemoProtocolState {
  compaction: "idle" | "running" | "completed";
  currentTurnId: string | null;
  error: string | null;
  eventCount: number;
  lastMethod: string | null;
  messages: DemoMessage[];
  retrying: boolean;
  status: DemoTurnStatus;
  threadId: string | null;
  turnDurationMs: number | null;
}

export const initialProtocolState: DemoProtocolState = {
  compaction: "idle",
  currentTurnId: null,
  error: null,
  eventCount: 0,
  lastMethod: null,
  messages: [],
  retrying: false,
  status: "idle",
  threadId: null,
  turnDurationMs: null,
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function notificationParams(
  notification: JsonRpcNotification | ProtocolEventRecord,
): RecordValue {
  return isRecord(notification.params) ? notification.params : {};
}

function upsertMessage(
  messages: DemoMessage[],
  message: DemoMessage,
): DemoMessage[] {
  const index = messages.findIndex(({ id }) => id === message.id);
  if (index === -1) return [...messages, message];
  const next = [...messages];
  next[index] = { ...next[index], ...message };
  return next;
}

function appendAssistantDelta(
  messages: DemoMessage[],
  itemId: string,
  delta: string,
): DemoMessage[] {
  const existing = messages.find(({ id }) => id === itemId);
  return upsertMessage(messages, {
    id: itemId,
    role: "assistant",
    status: "running",
    text: `${existing?.text ?? ""}${delta}`,
  });
}

function finalizeRunningMessages(
  messages: DemoMessage[],
  status: "completed" | "failed" | "interrupted",
): DemoMessage[] {
  return messages.map((message) =>
    message.status === "running" ? { ...message, status } : message,
  );
}

function textFromUserContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((entry) => {
      if (!isRecord(entry) || entry.type !== "text") return "";
      return asString(entry.text) ?? "";
    })
    .filter(Boolean)
    .join("\n");
}

function turnStatus(
  value: unknown,
): "completed" | "failed" | "interrupted" | "running" {
  if (value === "completed") return "completed";
  if (value === "interrupted") return "interrupted";
  if (value === "failed") return "failed";
  return "running";
}

export function isTurnActive(status: DemoTurnStatus): boolean {
  return status === "running" || status === "retrying";
}

export function reduceProtocolNotification(
  state: DemoProtocolState,
  notification: JsonRpcNotification | ProtocolEventRecord,
): DemoProtocolState {
  const params = notificationParams(notification);
  const next: DemoProtocolState = {
    ...state,
    eventCount: state.eventCount + 1,
    lastMethod: notification.method,
  };

  if (notification.method === "thread/started") {
    const thread = isRecord(params.thread) ? params.thread : {};
    const threadId = asString(thread.id);
    if (threadId && state.threadId && threadId !== state.threadId) {
      return {
        ...initialProtocolState,
        eventCount: next.eventCount,
        lastMethod: next.lastMethod,
        threadId,
      };
    }
    return {
      ...next,
      threadId,
    };
  }

  if (notification.method === "turn/started") {
    const turn = isRecord(params.turn) ? params.turn : {};
    return {
      ...next,
      currentTurnId: asString(turn.id),
      error: null,
      retrying: false,
      status: "running",
      threadId: asString(params.threadId) ?? state.threadId,
      turnDurationMs: null,
    };
  }

  if (
    notification.method === "item/started" ||
    notification.method === "item/completed"
  ) {
    const item = isRecord(params.item) ? params.item : {};
    const itemId = asString(item.id);
    const itemType = asString(item.type);
    if (itemType === "contextCompaction") {
      return {
        ...next,
        compaction:
          notification.method === "item/completed"
            ? "completed"
            : "running",
      };
    }
    if (!itemId) return next;
    if (itemType === "userMessage") {
      return {
        ...next,
        messages: upsertMessage(state.messages, {
          id: itemId,
          role: "user",
          status: "completed",
          text: textFromUserContent(item.content),
        }),
      };
    }
    if (itemType === "agentMessage") {
      return {
        ...next,
        messages: upsertMessage(state.messages, {
          id: itemId,
          role: "assistant",
          status:
            notification.method === "item/completed"
              ? "completed"
              : "running",
          text: asString(item.text) ?? "",
        }),
      };
    }
    return next;
  }

  if (notification.method === "item/agentMessage/delta") {
    const itemId = asString(params.itemId);
    const delta = asString(params.delta);
    if (!itemId || delta === null) return next;
    return {
      ...next,
      messages: appendAssistantDelta(state.messages, itemId, delta),
      status: "running",
    };
  }

  if (notification.method === "thread/compacted") {
    return {
      ...next,
      compaction: "completed",
    };
  }

  if (notification.method === "error") {
    const error = isRecord(params.error) ? params.error : {};
    const retrying = params.willRetry === true;
    return {
      ...next,
      error: asString(error.message) ?? "The turn failed.",
      messages: retrying
        ? state.messages
        : finalizeRunningMessages(state.messages, "failed"),
      retrying,
      status: retrying ? "retrying" : "failed",
    };
  }

  if (notification.method === "turn/completed") {
    const turn = isRecord(params.turn) ? params.turn : {};
    const status = turnStatus(turn.status);
    const turnError = isRecord(turn.error) ? turn.error : {};
    return {
      ...next,
      error:
        status === "failed"
          ? asString(turnError.message) ?? state.error ?? "The turn failed."
          : null,
      currentTurnId: null,
      messages:
        status === "running"
          ? state.messages
          : finalizeRunningMessages(state.messages, status),
      retrying: false,
      status,
      turnDurationMs: asNumber(turn.durationMs),
    };
  }

  return next;
}

export function reduceProtocolTrace(
  events: readonly ProtocolEventRecord[],
): DemoProtocolState {
  return events.reduce(reduceProtocolNotification, initialProtocolState);
}
