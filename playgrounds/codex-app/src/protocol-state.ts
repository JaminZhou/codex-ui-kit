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
  id?: number | string;
  kind?: "notification" | "request";
  method: string;
  params: JsonValue;
  response?: JsonValue;
}

export interface ProtocolApprovalResolution {
  decision: "approved" | "rejected";
  kind: "approval-resolution";
  requestId: number | string;
}

export interface DemoMessage {
  compaction?: "running" | "completed";
  id: string;
  interruptionDurationMs?: number | null;
  role: "assistant" | "user";
  status: DemoTurnStatus;
  text: string;
  turnId: string | null;
}

export interface DemoCommandExecution {
  command: string;
  cwd: string;
  durationMs: number | null;
  exitCode: number | null;
  id: string;
  output: string;
  processId: string | null;
  status: "completed" | "failed" | "pending" | "running";
  terminalEvents: DemoTerminalEvent[];
  terminalInput: string;
  turnId: string | null;
}

export interface DemoTerminalEvent {
  kind: "stdin" | "stdout";
  text: string;
}

export function terminalTranscriptEvents(
  events: readonly DemoTerminalEvent[],
): DemoTerminalEvent[] {
  return events.reduce<DemoTerminalEvent[]>((transcript, event) => {
    const previous = transcript.at(-1);
    if (!previous || previous.text.endsWith("\n")) {
      return [...transcript, { ...event }];
    }
    return [
      ...transcript.slice(0, -1),
      {
        kind: previous.kind,
        text: `${previous.text}${event.text}`,
      },
    ];
  }, []);
}

export interface DemoApprovalRequest {
  command: string;
  decision: "approved" | "pending" | "rejected";
  itemId: string;
  kind: "command" | "file";
  reason: string | null;
  requestId: number | string;
  responseDecision?: "approved" | "rejected";
  turnId: string | null;
}

export interface DemoFileUpdateChange {
  diff: string;
  kind: "added" | "deleted" | "modified" | "renamed";
  path: string;
  previousPath?: string;
}

export interface DemoFileChange {
  changes: DemoFileUpdateChange[];
  id: string;
  status: "applied" | "rejected" | "streaming";
  turnId: string | null;
}

export interface DemoTimelineEntry {
  id: string;
  kind: "approval" | "command" | "fileChange" | "message";
}

export interface DemoProtocolState {
  approvals: DemoApprovalRequest[];
  commands: DemoCommandExecution[];
  compaction: "idle" | "running" | "completed";
  currentTurnId: string | null;
  error: string | null;
  eventCount: number;
  fileChanges: DemoFileChange[];
  lastMethod: string | null;
  messages: DemoMessage[];
  retrying: boolean;
  status: DemoTurnStatus;
  threadId: string | null;
  timeline: DemoTimelineEntry[];
  turnDurationMs: number | null;
}

export const initialProtocolState: DemoProtocolState = {
  approvals: [],
  commands: [],
  compaction: "idle",
  currentTurnId: null,
  error: null,
  eventCount: 0,
  fileChanges: [],
  lastMethod: null,
  messages: [],
  retrying: false,
  status: "idle",
  threadId: null,
  timeline: [],
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

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex(({ id }) => id === item.id);
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = { ...next[index], ...item };
  return next;
}

function upsertApproval(
  approvals: DemoApprovalRequest[],
  approval: DemoApprovalRequest,
): DemoApprovalRequest[] {
  const index = approvals.findIndex(
    ({ requestId }) => requestId === approval.requestId,
  );
  if (index === -1) return [...approvals, approval];
  const next = [...approvals];
  next[index] = { ...next[index], ...approval };
  return next;
}

function approvalTimelineId(requestId: number | string) {
  return `${typeof requestId}:${requestId}`;
}

function appendTimeline(
  timeline: DemoTimelineEntry[],
  entry: DemoTimelineEntry,
): DemoTimelineEntry[] {
  return timeline.some(
    ({ id, kind }) => id === entry.id && kind === entry.kind,
  )
    ? timeline
    : [...timeline, entry];
}

function appendTerminalEvent(
  events: DemoTerminalEvent[],
  event: DemoTerminalEvent,
): DemoTerminalEvent[] {
  const previous = events.at(-1);
  if (!previous || previous.kind !== event.kind) {
    return [...events, event];
  }
  return [
    ...events.slice(0, -1),
    {
      kind: previous.kind,
      text: `${previous.text}${event.text}`,
    },
  ];
}

function commandStatus(
  value: unknown,
): DemoCommandExecution["status"] {
  if (value === "completed") return "completed";
  if (value === "failed" || value === "declined") return "failed";
  if (value === "inProgress") return "running";
  return "pending";
}

function fileChangeStatus(value: unknown): DemoFileChange["status"] {
  if (value === "completed") return "applied";
  if (value === "failed" || value === "declined") return "rejected";
  return "streaming";
}

function patchKind(value: unknown): DemoFileUpdateChange["kind"] {
  if (!isRecord(value)) return "modified";
  if (value.type === "add") return "added";
  if (value.type === "delete") return "deleted";
  if (value.type === "update" && typeof value.move_path === "string") {
    return "renamed";
  }
  return "modified";
}

function fileChangesFrom(value: unknown): DemoFileUpdateChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const path = asString(entry.path);
    const diff = asString(entry.diff);
    if (!path || diff === null) return [];
    const kind = patchKind(entry.kind);
    const patchChange = isRecord(entry.kind) ? entry.kind : {};
    const movedPath =
      kind === "renamed" ? asString(patchChange.move_path) : null;
    return [
      {
        diff,
        kind,
        path: movedPath ?? path,
        ...(movedPath ? { previousPath: path } : {}),
      },
    ];
  });
}

function approvalResponseDecision(
  value: unknown,
): "approved" | "rejected" | undefined {
  if (!isRecord(value)) return undefined;
  if (value.decision === "decline" || value.decision === "cancel") {
    return "rejected";
  }
  if (value.decision !== undefined) return "approved";
  return undefined;
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

function recordTurnCompaction(
  messages: DemoMessage[],
  turnId: string | null,
  compaction: "running" | "completed",
): DemoMessage[] {
  if (!turnId) return messages;
  let index = messages.length - 1;
  while (index >= 0 && messages[index]?.turnId !== turnId) index -= 1;
  if (index < 0) return messages;
  const next = [...messages];
  next[index] = {
    ...next[index],
    compaction,
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

export function agentMessageStatus(
  status: DemoTurnStatus,
): "completed" | "failed" | "running" {
  if (status === "running" || status === "failed") return status;
  return "completed";
}

export function hasActiveTurnWork(state: DemoProtocolState) {
  if (!state.currentTurnId) return false;
  return (
    state.commands.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId &&
        (status === "pending" || status === "running"),
    ) ||
    state.fileChanges.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId && status === "streaming",
    )
  );
}

export function reduceProtocolNotification(
  state: DemoProtocolState,
  notification:
    | JsonRpcNotification
    | ProtocolApprovalResolution
    | ProtocolEventRecord,
): DemoProtocolState {
  if (
    "kind" in notification &&
    notification.kind === "approval-resolution"
  ) {
    return {
      ...state,
      approvals: state.approvals.map((approval) =>
        approval.requestId === notification.requestId
          ? { ...approval, decision: notification.decision }
          : approval,
      ),
      eventCount: state.eventCount + 1,
    };
  }

  const params = notificationParams(notification);
  const next: DemoProtocolState = {
    ...state,
    eventCount: state.eventCount + 1,
    lastMethod: notification.method,
  };

  if (
    "kind" in notification &&
    notification.kind === "request" &&
    (notification.method === "item/commandExecution/requestApproval" ||
      notification.method === "item/fileChange/requestApproval")
  ) {
    const requestId = notification.id;
    const itemId = asString(params.itemId);
    if (requestId === undefined || !itemId) return next;
    const command = state.commands.find(({ id }) => id === itemId);
    const fileChange = state.fileChanges.find(({ id }) => id === itemId);
    const fileChangePaths = fileChange?.changes
      .map(({ path }) => path)
      .filter(Boolean)
      .join(", ");
    const kind =
      notification.method === "item/fileChange/requestApproval"
        ? "file"
        : "command";
    return {
      ...next,
      approvals: upsertApproval(state.approvals, {
        command:
          asString(params.command) ??
          command?.command ??
          (fileChangePaths || "File changes"),
        decision: "pending",
        itemId,
        kind,
        reason: asString(params.reason),
        requestId,
        responseDecision: approvalResponseDecision(notification.response),
        turnId: asString(params.turnId) ?? state.currentTurnId,
      }),
      timeline: appendTimeline(state.timeline, {
        id: approvalTimelineId(requestId),
        kind: "approval",
      }),
    };
  }

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
      compaction: "idle",
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
      const compaction =
        notification.method === "item/completed" ? "completed" : "running";
      return {
        ...next,
        compaction,
        messages: recordTurnCompaction(
          state.messages,
          itemTurnId,
          compaction,
        ),
      };
    }
    if (!itemId) return next;
    if (itemType === "commandExecution") {
      const status = commandStatus(item.status);
      const command = state.commands.find(({ id }) => id === itemId);
      const commands = upsertById(state.commands, {
        command: asString(item.command) ?? command?.command ?? "",
        cwd: asString(item.cwd) ?? command?.cwd ?? "",
        durationMs: asNumber(item.durationMs),
        exitCode: asNumber(item.exitCode),
        id: itemId,
        output:
          asString(item.aggregatedOutput) ?? command?.output ?? "",
        processId:
          asString(item.processId) ?? command?.processId ?? null,
        status,
        terminalEvents: command?.terminalEvents ?? [],
        terminalInput: command?.terminalInput ?? "",
        turnId: itemTurnId,
      });
      return {
        ...next,
        commands,
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "command",
        }),
      };
    }
    if (itemType === "fileChange") {
      const fileChange = state.fileChanges.find(({ id }) => id === itemId);
      const changes = fileChangesFrom(item.changes);
      const status = fileChangeStatus(item.status);
      return {
        ...next,
        fileChanges: upsertById(state.fileChanges, {
          changes: changes.length > 0 ? changes : (fileChange?.changes ?? []),
          id: itemId,
          status,
          turnId: itemTurnId,
        }),
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "fileChange",
        }),
      };
    }
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
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "message",
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
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "message",
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
      timeline: appendTimeline(state.timeline, {
        id: itemId,
        kind: "message",
      }),
    };
  }

  if (notification.method === "item/commandExecution/outputDelta") {
    const itemId = asString(params.itemId);
    const delta = asString(params.delta);
    if (!itemId || delta === null) return next;
    const command = state.commands.find(({ id }) => id === itemId);
    if (!command) return next;
    return {
      ...next,
      commands: upsertById(state.commands, {
        ...command,
        output: `${command.output}${delta}`,
        status: "running",
        terminalEvents: appendTerminalEvent(command.terminalEvents, {
          kind: "stdout",
          text: delta,
        }),
      }),
      status: "running",
      timeline: appendTimeline(state.timeline, {
        id: itemId,
        kind: "command",
      }),
    };
  }

  if (
    notification.method ===
    "item/commandExecution/terminalInteraction"
  ) {
    const itemId = asString(params.itemId);
    const processId = asString(params.processId);
    const stdin = asString(params.stdin);
    if (!itemId || !processId || stdin === null) return next;
    const command = state.commands.find(({ id }) => id === itemId);
    if (!command || command.processId !== processId) return next;
    return {
      ...next,
      commands: upsertById(state.commands, {
        ...command,
        terminalEvents: appendTerminalEvent(command.terminalEvents, {
          kind: "stdin",
          text: stdin,
        }),
        terminalInput: `${command.terminalInput}${stdin}`,
      }),
      timeline: appendTimeline(state.timeline, {
        id: itemId,
        kind: "command",
      }),
    };
  }

  if (notification.method === "item/fileChange/patchUpdated") {
    const itemId = asString(params.itemId);
    if (!itemId) return next;
    const fileChange = state.fileChanges.find(({ id }) => id === itemId);
    if (!fileChange) return next;
    const changes = fileChangesFrom(params.changes);
    return {
      ...next,
      fileChanges: upsertById(state.fileChanges, {
        ...fileChange,
        changes: changes.length > 0 ? changes : fileChange.changes,
        status: "streaming",
      }),
      status: "running",
      timeline: appendTimeline(state.timeline, {
        id: itemId,
        kind: "fileChange",
      }),
    };
  }

  if (notification.method === "serverRequest/resolved") {
    const requestId = params.requestId;
    if (typeof requestId !== "string" && typeof requestId !== "number") {
      return next;
    }
    return {
      ...next,
      approvals: state.approvals.map((approval) =>
        approval.requestId === requestId && approval.decision === "pending"
          ? {
              ...approval,
              decision: approval.responseDecision ?? "rejected",
            }
          : approval,
      ),
    };
  }

  if (notification.method === "thread/compacted") {
    return {
      ...next,
      compaction: "completed",
      messages: recordTurnCompaction(
        state.messages,
        asString(params.turnId) ?? state.currentTurnId,
        "completed",
      ),
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
