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
  attachments?: DemoMessageAttachment[];
  compaction?: "running" | "completed";
  id: string;
  interruptionDurationMs?: number | null;
  role: "assistant" | "user";
  status: DemoTurnStatus;
  text: string;
  turnId: string | null;
}

export interface DemoMessageAttachment {
  kind: "image";
  label: string;
  source: string;
  sourceType: "local" | "remote";
}

export function messageAttachmentAccessibleLabel(
  attachment: DemoMessageAttachment,
  index: number,
  count: number,
): string {
  const label = attachment.label.trim() || "User attachment";
  return count > 1 && label === "User attachment"
    ? `${label} ${index + 1}`
    : label;
}

export function messageAttachmentPreviewSource(
  attachment: DemoMessageAttachment,
  fallback: string,
): string {
  if (attachment.sourceType !== "remote") return fallback;
  try {
    const { protocol } = new URL(attachment.source);
    if (
      protocol === "https:" ||
      protocol === "http:" ||
      protocol === "blob:" ||
      (protocol === "data:" && /^data:image\//i.test(attachment.source))
    ) {
      return attachment.source;
    }
  } catch {
    // Replay-local paths and malformed sources use the deterministic fixture.
  }
  return fallback;
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

export interface DemoMcpToolCall {
  appName: string;
  arguments: JsonValue;
  content: JsonValue[];
  durationMs: number | null;
  error: string | null;
  id: string;
  progress: string[];
  server: string;
  status: "completed" | "failed" | "pending" | "running";
  structuredContent: JsonValue | null;
  terminalEventSequence: number | null;
  tool: string;
  toolLabel: string;
  turnId: string | null;
}

export interface DemoSubagent {
  callId: string;
  completedAtMs: number | null;
  id: string;
  message: string | null;
  prompt: string | null;
  startedAtMs: number | null;
  status: "active" | "done" | "waiting";
  threadStatus: string;
  tool: string;
  turnId: string | null;
}

export interface DemoTimelineEntry {
  id: string;
  kind:
    | "approval"
    | "command"
    | "fileChange"
    | "mcpToolCall"
    | "message"
    | "subagent";
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
  mcpToolCalls: DemoMcpToolCall[];
  messages: DemoMessage[];
  retrying: boolean;
  status: DemoTurnStatus;
  subagents: DemoSubagent[];
  threadId: string | null;
  timeline: DemoTimelineEntry[];
  turnDurationMs: number | null;
  turnDurationsMs: Record<string, number>;
}

export interface ApprovedCommandReplaySettlement {
  durationMs?: number;
  messageId: string;
  messageText: string;
  replacedMessageId?: string;
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
  mcpToolCalls: [],
  messages: [],
  retrying: false,
  status: "idle",
  subagents: [],
  threadId: null,
  timeline: [],
  turnDurationMs: null,
  turnDurationsMs: {},
};

export function settleApprovedCommandReplay(
  state: DemoProtocolState,
  requestId: number | string,
  settlement: ApprovedCommandReplaySettlement,
): DemoProtocolState {
  const approval = state.approvals.find(
    (candidate) => candidate.requestId === requestId,
  );
  if (!approval) return state;

  const replacedMessage = settlement.replacedMessageId
    ? state.messages.find(({ id }) => id === settlement.replacedMessageId)
    : undefined;
  const approvedMessage: DemoMessage = {
    id: settlement.messageId,
    role: "assistant",
    status: "completed",
    text: settlement.messageText,
    turnId: approval.turnId,
    ...(replacedMessage
      ? {
          interruptionDurationMs: replacedMessage.interruptionDurationMs,
        }
      : {}),
  };
  const messages = replacedMessage
    ? state.messages.map((message) =>
        message.id === settlement.replacedMessageId
          ? approvedMessage
          : message,
      )
    : [...state.messages, approvedMessage];
  const timeline = replacedMessage
    ? state.timeline.map((entry) =>
        entry.kind === "message" &&
        entry.id === settlement.replacedMessageId
          ? { ...entry, id: settlement.messageId }
          : entry,
      )
    : [...state.timeline, { id: settlement.messageId, kind: "message" as const }];

  return {
    ...state,
    approvals: state.approvals.map((candidate) =>
      candidate.requestId === requestId
        ? { ...candidate, decision: "approved" }
        : candidate,
    ),
    commands: state.commands.map((command) =>
      command.id === approval.itemId
        ? {
            ...command,
            durationMs: settlement.durationMs ?? command.durationMs,
            exitCode: 0,
            status: "completed",
          }
        : command,
    ),
    messages,
    timeline,
  };
}

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

function asJsonValue(value: unknown, fallback: JsonValue = null): JsonValue {
  return value === undefined ? fallback : (value as JsonValue);
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

function terminalEventsFromAggregate(
  command: DemoCommandExecution | undefined,
  aggregatedOutput: string | null,
): DemoTerminalEvent[] {
  const events = command?.terminalEvents ?? [];
  if (aggregatedOutput === null) return events;
  if (events.length === 0) {
    return aggregatedOutput
      ? [{ kind: "stdout", text: aggregatedOutput }]
      : [];
  }
  if (command && aggregatedOutput.startsWith(command.output)) {
    const unobservedOutput = aggregatedOutput.slice(
      command.output.length,
    );
    return unobservedOutput
      ? appendTerminalEvent(events, {
          kind: "stdout",
          text: unobservedOutput,
        })
      : events;
  }
  const preservedInput = events.filter(({ kind }) => kind === "stdin");
  return [
    ...(aggregatedOutput
      ? [{ kind: "stdout" as const, text: aggregatedOutput }]
      : []),
    ...preservedInput,
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

function mcpToolCallStatus(value: unknown): DemoMcpToolCall["status"] {
  if (value === "completed") return "completed";
  if (value === "failed") return "failed";
  if (value === "inProgress") return "running";
  return "pending";
}

function mcpToolLabel(tool: string, actionName: string | null) {
  if (actionName) return actionName;
  return tool
    .split(/[_\-/]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
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
  if (index < 0) index = messages.length - 1;
  if (index < 0) return messages;
  const next = [...messages];
  next[index] = {
    ...next[index],
    compaction,
  };
  return next;
}

function userContentFrom(content: unknown): {
  attachments: DemoMessageAttachment[];
  text: string;
} {
  if (!Array.isArray(content)) return { attachments: [], text: "" };
  const attachments: DemoMessageAttachment[] = [];
  const text: string[] = [];
  for (const entry of content) {
    if (!isRecord(entry)) continue;
    if (entry.type === "text") {
      const value = asString(entry.text);
      if (value) text.push(value);
      continue;
    }
    if (entry.type !== "image" && entry.type !== "localImage") continue;
    const source = asString(
      entry.type === "localImage" ? entry.path : entry.url,
    );
    if (!source) continue;
    const pathLabel = source.split(/[\\/]/).filter(Boolean).at(-1);
    attachments.push({
      kind: "image",
      label: source.startsWith("data:")
        ? "User attachment"
        : (pathLabel ?? "User attachment"),
      source,
      sourceType: entry.type === "localImage" ? "local" : "remote",
    });
  }
  return { attachments, text: text.join("\n") };
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
    ) ||
    state.mcpToolCalls.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId &&
        (status === "pending" || status === "running"),
    ) ||
    state.subagents.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId && status !== "done",
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
      const aggregatedOutput = asString(item.aggregatedOutput);
      const terminalEvents = terminalEventsFromAggregate(
        command,
        aggregatedOutput,
      );
      const commands = upsertById(state.commands, {
        command: asString(item.command) ?? command?.command ?? "",
        cwd: asString(item.cwd) ?? command?.cwd ?? "",
        durationMs: asNumber(item.durationMs),
        exitCode: asNumber(item.exitCode),
        id: itemId,
        output: aggregatedOutput ?? command?.output ?? "",
        processId:
          asString(item.processId) ?? command?.processId ?? null,
        status,
        terminalEvents,
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
    if (itemType === "mcpToolCall") {
      const existing = state.mcpToolCalls.find(({ id }) => id === itemId);
      const appContext = isRecord(item.appContext) ? item.appContext : {};
      const result = isRecord(item.result) ? item.result : {};
      const error = isRecord(item.error) ? item.error : {};
      const server = asString(item.server) ?? existing?.server ?? "mcp";
      const tool = asString(item.tool) ?? existing?.tool ?? "tool";
      const actionName = asString(appContext.actionName);
      const resultContent = Array.isArray(result.content)
        ? result.content.map((value) => asJsonValue(value))
        : (existing?.content ?? []);
      const status = mcpToolCallStatus(item.status);
      return {
        ...next,
        mcpToolCalls: upsertById(state.mcpToolCalls, {
          appName:
            asString(appContext.appName) ?? existing?.appName ?? server,
          arguments: asJsonValue(
            item.arguments,
            existing?.arguments ?? null,
          ),
          content: resultContent,
          durationMs: asNumber(item.durationMs),
          error: asString(error.message),
          id: itemId,
          progress: existing?.progress ?? [],
          server,
          status,
          structuredContent:
            result.structuredContent === undefined
              ? (existing?.structuredContent ?? null)
              : asJsonValue(result.structuredContent),
          terminalEventSequence:
            notification.method === "item/completed" &&
            (status === "completed" || status === "failed")
              ? next.eventCount
              : null,
          tool,
          toolLabel: mcpToolLabel(
            tool,
            actionName ?? existing?.toolLabel ?? null,
          ),
          turnId: itemTurnId,
        }),
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "mcpToolCall",
        }),
      };
    }
    if (itemType === "collabAgentToolCall") {
      const callStatus = asString(item.status) ?? "inProgress";
      const agentStates = isRecord(item.agentsStates)
        ? item.agentsStates
        : {};
      const receiverThreadIds = Array.isArray(item.receiverThreadIds)
        ? item.receiverThreadIds.flatMap((value) => {
            const id = asString(value);
            return id ? [id] : [];
          })
        : [];
      const subagents = receiverThreadIds.reduce((items, id) => {
        const existing = items.find((candidate) => candidate.id === id);
        const agentState = isRecord(agentStates[id]) ? agentStates[id] : {};
        const threadStatus =
          asString(agentState.status) ?? existing?.threadStatus ?? "pendingInit";
        const status =
          threadStatus === "pendingInit"
            ? "waiting"
            : threadStatus === "running"
              ? "active"
              : "done";
        return upsertById(items, {
          callId: itemId,
          completedAtMs:
            asNumber(params.completedAtMs) ??
            existing?.completedAtMs ??
            null,
          id,
          message: asString(agentState.message) ?? existing?.message ?? null,
          prompt: asString(item.prompt) ?? existing?.prompt ?? null,
          startedAtMs:
            asNumber(params.startedAtMs) ??
            existing?.startedAtMs ??
            null,
          status,
          threadStatus,
          tool: asString(item.tool) ?? existing?.tool ?? "spawnAgent",
          turnId: itemTurnId,
        });
      }, state.subagents);
      return {
        ...next,
        status: callStatus === "inProgress" ? "running" : next.status,
        subagents,
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "subagent",
        }),
      };
    }
    if (itemType === "userMessage") {
      const content = userContentFrom(item.content);
      return {
        ...next,
        messages: upsertMessage(state.messages, {
          attachments: content.attachments,
          id: itemId,
          role: "user",
          status: "completed",
          text: content.text,
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

  if (notification.method === "item/mcpToolCall/progress") {
    const itemId = asString(params.itemId);
    const message = asString(params.message);
    if (!itemId || message === null) return next;
    const toolCall = state.mcpToolCalls.find(({ id }) => id === itemId);
    if (!toolCall) return next;
    return {
      ...next,
      mcpToolCalls: upsertById(state.mcpToolCalls, {
        ...toolCall,
        progress: [...toolCall.progress, message],
        status: "running",
      }),
      status: "running",
      timeline: appendTimeline(state.timeline, {
        id: itemId,
        kind: "mcpToolCall",
      }),
    };
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
      turnDurationsMs:
        turnId && durationMs !== null
          ? { ...state.turnDurationsMs, [turnId]: durationMs }
          : state.turnDurationsMs,
    };
  }

  return next;
}

export function reduceProtocolTrace(
  events: readonly ProtocolEventRecord[],
): DemoProtocolState {
  return events.reduce(reduceProtocolNotification, initialProtocolState);
}
