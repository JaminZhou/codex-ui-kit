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
  interruptionDurationMs?: number | null;
  role: "assistant" | "user";
  status: DemoTurnStatus;
  text: string;
  turnId: string | null;
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
  turnId: string | null,
): DemoMessage[] {
  const existing = messages.find(({ id }) => id === itemId);
  return upsertMessage(messages, {
    id: itemId,
    role: "assistant",
    status: "running",
    text: `${existing?.text ?? ""}${delta}`,
    turnId,
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

function recordTurnInterruption(
  messages: DemoMessage[],
  turnId: string | null,
  durationMs: number | null,
): DemoMessage[] {
  if (!turnId) return messages;
  let index = messages.length - 1;
  while (index >= 0 && messages[index]?.turnId !== turnId) index -= 1;
  if (index < 0) return messages;
  const next = [...messages];
  next[index] = {
    ...next[index],
    interruptionDurationMs: durationMs,
  };
  return next;
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
    const itemTurnId = asString(params.turnId) ?? state.currentTurnId;
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
          turnId: itemTurnId,
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
          turnId: itemTurnId,
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
      messages: appendAssistantDelta(
        state.messages,
        itemId,
        delta,
        asString(params.turnId) ?? state.currentTurnId,
      ),
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
    const turnId = asString(turn.id) ?? state.currentTurnId;
    const durationMs = asNumber(turn.durationMs);
    const finalizedMessages =
      status === "running"
        ? state.messages
        : finalizeRunningMessages(state.messages, status);
    return {
      ...next,
      error:
        status === "failed"
          ? asString(turnError.message) ?? state.error ?? "The turn failed."
          : null,
      currentTurnId: null,
      messages:
        status === "interrupted"
          ? recordTurnInterruption(finalizedMessages, turnId, durationMs)
          : finalizedMessages,
      retrying: false,
      status,
      turnDurationMs: durationMs,
    };
  }

  return next;
}

export function reduceProtocolTrace(
  events: readonly ProtocolEventRecord[],
): DemoProtocolState {
  return events.reduce(reduceProtocolNotification, initialProtocolState);
}
