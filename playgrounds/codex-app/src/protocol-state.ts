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
  responseDecision?: DemoApprovalResponseDecision;
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
  decisionScope?: "once" | "session" | "similar";
  itemId: string;
  kind: "command" | "file";
  reason: string | null;
  requestId: number | string;
  responseDecision?: DemoApprovalResponseDecision;
  turnId: string | null;
}

export type DemoApprovalResponseDecision =
  | "accept"
  | "acceptForSession"
  | "acceptWithExecpolicyAmendment"
  | "cancel"
  | "decline";

export type DemoAutomaticApprovalReviewStatus =
  | "aborted"
  | "approved"
  | "denied"
  | "inProgress"
  | "timedOut";

export interface DemoAutomaticApprovalReview {
  actionLabel: string;
  completedAtMs: number | null;
  id: string;
  rationale: string | null;
  riskLevel: string | null;
  startedAtMs: number;
  status: DemoAutomaticApprovalReviewStatus;
  targetItemId: string | null;
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
  browserUrl: string | null;
  browserUse: boolean;
  content: JsonValue[];
  durationMs: number | null;
  error: string | null;
  id: string;
  progress: string[];
  readOnlyHint: boolean;
  server: string;
  status: "completed" | "failed" | "pending" | "running";
  structuredContent: JsonValue | null;
  terminalEventSequence: number | null;
  tool: string;
  toolLabel: string;
  turnId: string | null;
}

export type DemoWebSearchAction =
  | "findInPage"
  | "openPage"
  | "other"
  | "search";

export interface DemoWebSearchResult {
  detail: string;
  id: string;
  url: string | null;
}

export interface DemoWebSearch {
  action: DemoWebSearchAction;
  id: string;
  query: string;
  results: DemoWebSearchResult[];
  status: "completed" | "running";
  target: string | null;
  turnId: string | null;
}

export interface DemoSubagent {
  activityKind?: "interacted";
  agentPath: string | null;
  callId: string;
  completedAtMs: number | null;
  controlCallIds: string[];
  id: string;
  message: string | null;
  name: string | null;
  prompt: string | null;
  provisional: boolean;
  senderThreadId: string | null;
  startedAtMs: number | null;
  status: "active" | "done" | "waiting";
  threadStatus: string;
  tool: string;
  turnId: string | null;
}

export interface DemoStreamError {
  additionalDetails: string | null;
  content: string;
  errorInfo: JsonValue;
  id: string;
  reconnectAttempt: number | null;
  reconnectMaxAttempts: number | null;
  serverBusy: boolean;
  turnId: string | null;
}

export interface DemoSystemError {
  content: string;
  errorInfo: JsonValue;
  id: string;
  turnId: string | null;
}

export interface DemoTurnPlanStep {
  status: "completed" | "in_progress" | "pending";
  step: string;
}

function subagentName(agentPath: string | null, id: string) {
  const candidate = agentPath?.split("/").filter(Boolean).at(-1) ?? id;
  if (!candidate || candidate === "root") return null;
  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(candidate)) {
    return null;
  }
  const words = candidate
    .split(/[-_\s]+/)
    .filter(Boolean)
    .join(" ");
  return `${words[0]?.toUpperCase() ?? ""}${words.slice(1)}`;
}

export interface DemoTimelineEntry {
  id: string;
  kind:
    | "approval"
    | "automaticApprovalReview"
    | "command"
    | "fileChange"
    | "mcpToolCall"
    | "message"
    | "streamError"
    | "subagent"
    | "systemError"
    | "webSearch";
}

export interface DemoProtocolState {
  approvals: DemoApprovalRequest[];
  automaticApprovalReviews: DemoAutomaticApprovalReview[];
  commands: DemoCommandExecution[];
  compaction: "idle" | "running" | "completed";
  currentTurnId: string | null;
  error: string | null;
  eventCount: number;
  fileChanges: DemoFileChange[];
  lastMethod: string | null;
  mcpToolCalls: DemoMcpToolCall[];
  messages: DemoMessage[];
  plan: DemoTurnPlanStep[];
  planExplanation: string | null;
  planTurnId: string | null;
  retrying: boolean;
  status: DemoTurnStatus;
  streamErrors: DemoStreamError[];
  subagentLifecycles: DemoSubagent[];
  subagents: DemoSubagent[];
  systemErrors: DemoSystemError[];
  threadId: string | null;
  timeline: DemoTimelineEntry[];
  turnDurationMs: number | null;
  turnDurationsMs: Record<string, number>;
  webSearches: DemoWebSearch[];
}

export interface ApprovedCommandReplaySettlement {
  durationMs?: number;
  messageId: string;
  messageText: string;
  replacedMessageId?: string;
}

export const initialProtocolState: DemoProtocolState = {
  approvals: [],
  automaticApprovalReviews: [],
  commands: [],
  compaction: "idle",
  currentTurnId: null,
  error: null,
  eventCount: 0,
  fileChanges: [],
  lastMethod: null,
  mcpToolCalls: [],
  messages: [],
  plan: [],
  planExplanation: null,
  planTurnId: null,
  retrying: false,
  status: "idle",
  streamErrors: [],
  subagentLifecycles: [],
  subagents: [],
  systemErrors: [],
  threadId: null,
  timeline: [],
  turnDurationMs: null,
  turnDurationsMs: {},
  webSearches: [],
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

export function settleRejectedFileReplay(
  state: DemoProtocolState,
  requestId: number | string,
): DemoProtocolState {
  const approval = state.approvals.find(
    (candidate) => candidate.requestId === requestId,
  );
  if (!approval || approval.kind !== "file") return state;

  return {
    ...state,
    currentTurnId: null,
    error: null,
    fileChanges: state.fileChanges.map((fileChange) =>
      fileChange.id === approval.itemId
        ? { ...fileChange, status: "rejected" }
        : fileChange,
    ),
    retrying: false,
    status: "completed",
    turnDurationMs: null,
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

const reconnectProgressPattern =
  /^Reconnecting(?:\.\.\.)?\s+(\d+)\/(\d+)$/;

function reconnectProgress(message: string) {
  const match = reconnectProgressPattern.exec(message.trim());
  if (!match) {
    return { attempt: null, content: message, maxAttempts: null };
  }
  const attempt = Number(match[1]);
  const maxAttempts = Number(match[2]);
  if (
    !Number.isSafeInteger(attempt) ||
    !Number.isSafeInteger(maxAttempts) ||
    attempt < 0 ||
    maxAttempts < 1
  ) {
    return { attempt: null, content: message, maxAttempts: null };
  }
  return {
    attempt,
    content: `Reconnecting ${attempt}/${maxAttempts}`,
    maxAttempts,
  };
}

function isServerBusyError(errorInfo: JsonValue): boolean {
  if (errorInfo === "serverOverloaded") return true;
  if (!isRecord(errorInfo)) return false;
  const disconnected = errorInfo.responseStreamDisconnected;
  return (
    isRecord(disconnected) && disconnected.httpStatusCode === 429
  );
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

function upsertSubagentLifecycle(
  items: DemoSubagent[],
  item: DemoSubagent,
): DemoSubagent[] {
  const index = items.findIndex(
    ({ callId, id }) => callId === item.callId && id === item.id,
  );
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = { ...next[index], ...item };
  return next;
}

function rekeyOrUpsertSubagentLifecycle(
  items: DemoSubagent[],
  item: DemoSubagent,
  provisionalIds: Set<string>,
): DemoSubagent[] {
  const provisionalIndex = items.findIndex(
    ({ callId, id, provisional, turnId }) =>
      provisional &&
      id === item.id &&
      turnId === item.turnId &&
      provisionalIds.has(callId),
  );
  if (provisionalIndex === -1) {
    return upsertSubagentLifecycle(items, item);
  }
  const next = [...items];
  next[provisionalIndex] = item;
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

function insertSubagentTimeline(
  timeline: DemoTimelineEntry[],
  entry: DemoTimelineEntry,
  parentCallId: string | null,
): DemoTimelineEntry[] {
  if (
    timeline.some(
      ({ id, kind }) => id === entry.id && kind === entry.kind,
    )
  ) {
    return timeline;
  }
  const parentIndex = parentCallId
    ? timeline.findIndex(
        ({ id, kind }) => id === parentCallId && kind === "subagent",
      )
    : -1;
  return parentIndex === -1
    ? [...timeline, entry]
    : [
        ...timeline.slice(0, parentIndex),
        entry,
        ...timeline.slice(parentIndex),
      ];
}

function rekeySubagentTimeline(
  timeline: DemoTimelineEntry[],
  provisionalIds: Set<string>,
  callId: string,
): DemoTimelineEntry[] {
  if (provisionalIds.size === 0) return timeline;
  const firstAffectedIndex = timeline.findIndex(
    ({ id, kind }) =>
      kind === "subagent" && (provisionalIds.has(id) || id === callId),
  );
  const filtered = timeline.filter(
    ({ id, kind }) =>
      kind !== "subagent" || (!provisionalIds.has(id) && id !== callId),
  );
  if (firstAffectedIndex === -1) return filtered;
  const insertionIndex = timeline
    .slice(0, firstAffectedIndex)
    .filter(
      ({ id, kind }) =>
        kind !== "subagent" || (!provisionalIds.has(id) && id !== callId),
    ).length;
  return [
    ...filtered.slice(0, insertionIndex),
    { id: callId, kind: "subagent" },
    ...filtered.slice(insertionIndex),
  ];
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

function turnPlanStepStatus(
  value: unknown,
): DemoTurnPlanStep["status"] | null {
  if (value === "completed" || value === "pending") return value;
  return value === "inProgress" ? "in_progress" : null;
}

function turnPlanSteps(value: unknown): DemoTurnPlanStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const step = asString(entry.step);
    const status = turnPlanStepStatus(entry.status);
    return step && status ? [{ status, step }] : [];
  });
}

function webSearchActionFrom(value: unknown): {
  action: DemoWebSearchAction;
  target: string | null;
} {
  if (!isRecord(value)) return { action: "other", target: null };
  if (value.type === "search") {
    const query =
      asString(value.query) ??
      (Array.isArray(value.queries)
        ? value.queries.flatMap((entry) => asString(entry) ?? []).at(0) ??
          null
        : null);
    return { action: "search", target: query };
  }
  if (value.type === "openPage") {
    return { action: "openPage", target: asString(value.url) };
  }
  if (value.type === "findInPage") {
    const pattern = asString(value.pattern);
    const url = asString(value.url);
    return {
      action: "findInPage",
      target:
        pattern && url
          ? `${pattern} in ${url}`
          : (pattern ?? url),
    };
  }
  return { action: "other", target: null };
}

function webSearchResultsFrom(
  value: unknown,
  itemId: string,
): DemoWebSearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === "string") {
      return [{ detail: entry, id: `${itemId}:result:${index}`, url: null }];
    }
    if (!isRecord(entry)) return [];
    const url = asString(entry.url);
    const detail =
      asString(entry.title) ??
      asString(entry.name) ??
      url ??
      asString(entry.snippet);
    return detail
      ? [{ detail, id: `${itemId}:result:${index}`, url }]
      : [];
  });
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
): DemoApprovalResponseDecision | undefined {
  if (!isRecord(value)) return undefined;
  const decision = value.decision;
  if (
    decision === "accept" ||
    decision === "acceptForSession" ||
    decision === "decline" ||
    decision === "cancel"
  ) {
    return decision;
  }
  if (
    isRecord(decision) &&
    isRecord(decision.acceptWithExecpolicyAmendment)
  ) {
    return "acceptWithExecpolicyAmendment";
  }
  return undefined;
}

function approvalDecision(
  responseDecision: DemoApprovalResponseDecision | undefined,
): "approved" | "rejected" | undefined {
  if (!responseDecision) return undefined;
  return responseDecision === "decline" || responseDecision === "cancel"
    ? "rejected"
    : "approved";
}

function approvalDecisionScope(
  responseDecision: DemoApprovalResponseDecision | undefined,
): DemoApprovalRequest["decisionScope"] {
  if (responseDecision === "accept") return "once";
  if (responseDecision === "acceptForSession") return "session";
  if (responseDecision === "acceptWithExecpolicyAmendment") return "similar";
  return undefined;
}

function automaticApprovalReviewStatus(
  value: unknown,
): DemoAutomaticApprovalReviewStatus {
  if (
    value === "approved" ||
    value === "denied" ||
    value === "timedOut" ||
    value === "aborted"
  ) {
    return value;
  }
  return "inProgress";
}

export function automaticApprovalReviewActionLabel(value: unknown): string {
  if (!isRecord(value)) return "Reviewing request";
  if (value.type === "command") {
    return asString(value.command) ?? "Reviewing command";
  }
  if (value.type === "execve") {
    const program = asString(value.program) ?? "command";
    const argv = Array.isArray(value.argv)
      ? value.argv.flatMap((entry) => {
          const argument = asString(entry);
          return argument ? [argument] : [];
        })
      : [];
    return [program, ...argv].join(" ");
  }
  if (value.type === "applyPatch") {
    const files = Array.isArray(value.files)
      ? value.files.flatMap((entry) => {
          const file = asString(entry);
          return file ? [file] : [];
        })
      : [];
    if (files.length === 1) return `Editing ${files[0]}`;
    if (files.length > 1) return `Editing ${files.length} files`;
    return "Editing files";
  }
  if (value.type === "networkAccess") {
    return `Network access to ${asString(value.target) ?? asString(value.host) ?? "requested host"}`;
  }
  if (value.type === "mcpToolCall") {
    const connector =
      asString(value.connectorName) ?? asString(value.server) ?? "MCP";
    return `MCP ${asString(value.toolTitle) ?? asString(value.toolName) ?? "tool"} on ${connector}`;
  }
  if (value.type === "requestPermissions") {
    return asString(value.reason) ?? "Permission request";
  }
  return "Reviewing request";
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

export function isCurrentTurnGroupActive(
  state: Pick<DemoProtocolState, "currentTurnId" | "status">,
  groupTurnId: string | null,
): boolean {
  return (
    groupTurnId !== null &&
    groupTurnId === state.currentTurnId &&
    isTurnActive(state.status)
  );
}

export function subagentLifecycleGroup(
  state: Pick<DemoProtocolState, "subagentLifecycles">,
  callId: string,
): DemoSubagent[] {
  const entrySubagent = state.subagentLifecycles.find(
    (subagent) => subagent.callId === callId,
  );
  if (!entrySubagent) return [];
  return state.subagentLifecycles.filter((subagent) =>
    entrySubagent.turnId === null
      ? subagent.callId === entrySubagent.callId
      : subagent.turnId === entrySubagent.turnId,
  );
}

export function latestSubagentLifecyclesById(
  subagents: DemoSubagent[],
): DemoSubagent[] {
  return subagents.reduce<DemoSubagent[]>((latest, subagent) => {
    const index = latest.findIndex(({ id }) => id === subagent.id);
    if (index === -1) return [...latest, subagent];
    const next = [...latest];
    next[index] = subagent;
    return next;
  }, []);
}

export interface SubagentTimelinePresentation {
  active: boolean;
  anchor: DemoSubagent;
  completedAtMs: number | undefined;
  lifecycles: DemoSubagent[];
  rows: DemoSubagent[];
  startedAtMs: number | undefined;
  turnId: string | null;
}

export function subagentTimelinePresentation(
  state: Pick<
    DemoProtocolState,
    | "currentTurnId"
    | "status"
    | "subagentLifecycles"
    | "threadId"
  >,
  callId: string,
): SubagentTimelinePresentation | null {
  const entrySubagent = state.subagentLifecycles.find(
    (subagent) => subagent.callId === callId,
  );
  if (!entrySubagent) return null;
  const turnId = entrySubagent.turnId;
  const active = isCurrentTurnGroupActive(state, turnId);
  const turnSubagents = subagentLifecycleGroup(state, callId);
  const lifecycles = active
    ? turnSubagents.filter(
        (subagent) =>
          subagent.senderThreadId === entrySubagent.senderThreadId,
      )
    : turnSubagents;
  const anchor = active
    ? lifecycles[0]
    : lifecycles.find(
        ({ senderThreadId }) =>
          senderThreadId === null || senderThreadId === state.threadId,
      ) ?? lifecycles[0];
  if (!anchor) return null;
  return {
    active,
    anchor,
    completedAtMs: lifecycles
      .flatMap(({ completedAtMs }) =>
        completedAtMs === null ? [] : [completedAtMs],
      )
      .sort((left, right) => right - left)[0],
    lifecycles,
    rows: latestSubagentLifecyclesById(lifecycles),
    startedAtMs: lifecycles
      .flatMap(({ startedAtMs }) =>
        startedAtMs === null ? [] : [startedAtMs],
      )
      .sort((left, right) => left - right)[0],
    turnId,
  };
}

function subagentLifecycleForActivity(
  state: Pick<DemoProtocolState, "subagentLifecycles" | "subagents">,
  agentThreadId: string,
  turnId: string | null,
  startedAtMs: number | null,
): DemoSubagent | undefined {
  const currentSubagent = state.subagents.find(
    ({ id }) => id === agentThreadId,
  );
  if (
    currentSubagent?.turnId === turnId &&
    (startedAtMs === null ||
      currentSubagent.startedAtMs === null ||
      startedAtMs >= currentSubagent.startedAtMs)
  ) {
    return currentSubagent;
  }
  const candidates = state.subagentLifecycles.filter(
    ({ id, turnId: lifecycleTurnId }) =>
      id === agentThreadId && lifecycleTurnId === turnId,
  );
  if (startedAtMs === null) return candidates.at(-1);
  const startedCandidates = candidates.filter(
    ({ startedAtMs: lifecycleStartedAtMs }) =>
      lifecycleStartedAtMs === null || lifecycleStartedAtMs <= startedAtMs,
  );
  return (
    startedCandidates
      .filter(
        ({ completedAtMs }) =>
          completedAtMs === null || startedAtMs <= completedAtMs,
      )
      .at(-1) ??
    startedCandidates.at(-1) ??
    candidates[0]
  );
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
    state.webSearches.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId && status === "running",
    ) ||
    state.automaticApprovalReviews.some(
      ({ status, turnId }) =>
        turnId === state.currentTurnId && status === "inProgress",
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
          ? {
              ...approval,
              decision: notification.decision,
              decisionScope: approvalDecisionScope(
                notification.responseDecision,
              ),
              responseDecision:
                notification.responseDecision ?? approval.responseDecision,
            }
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
    notification.method === "item/autoApprovalReview/started" ||
    notification.method === "item/autoApprovalReview/completed"
  ) {
    const reviewId = asString(params.reviewId);
    const review = isRecord(params.review) ? params.review : {};
    if (!reviewId) return next;
    const existing = state.automaticApprovalReviews.find(
      ({ id }) => id === reviewId,
    );
    const completedAtMs = asNumber(params.completedAtMs);
    return {
      ...next,
      automaticApprovalReviews: upsertById(
        state.automaticApprovalReviews,
        {
          actionLabel:
            automaticApprovalReviewActionLabel(params.action) ||
            existing?.actionLabel ||
            "Reviewing request",
          completedAtMs:
            notification.method === "item/autoApprovalReview/completed"
              ? completedAtMs
              : (existing?.completedAtMs ?? null),
          id: reviewId,
          rationale:
            asString(review.rationale) ?? existing?.rationale ?? null,
          riskLevel:
            asString(review.riskLevel) ?? existing?.riskLevel ?? null,
          startedAtMs:
            asNumber(params.startedAtMs) ?? existing?.startedAtMs ?? 0,
          status: automaticApprovalReviewStatus(review.status),
          targetItemId:
            asString(params.targetItemId) ?? existing?.targetItemId ?? null,
          turnId: asString(params.turnId) ?? existing?.turnId ?? null,
        },
      ),
      timeline: appendTimeline(state.timeline, {
        id: reviewId,
        kind: "automaticApprovalReview",
      }),
    };
  }

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
    const responseDecision = approvalResponseDecision(notification.response);
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
        decisionScope: approvalDecisionScope(responseDecision),
        responseDecision,
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
      plan: [],
      planExplanation: null,
      planTurnId: null,
      retrying: false,
      status: "running",
      threadId: asString(params.threadId) ?? state.threadId,
      turnDurationMs: null,
    };
  }

  if (notification.method === "turn/plan/updated") {
    const turnId = asString(params.turnId) ?? state.currentTurnId;
    if (!turnId || turnId !== state.currentTurnId) {
      return next;
    }
    return {
      ...next,
      plan: turnPlanSteps(params.plan),
      planExplanation: asString(params.explanation),
      planTurnId: turnId,
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
      const resultMeta = isRecord(result._meta) ? result._meta : {};
      const browserUseMeta = isRecord(resultMeta.browser_use)
        ? resultMeta.browser_use
        : {};
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
          browserUrl:
            asString(browserUseMeta.url) ?? existing?.browserUrl ?? null,
          browserUse:
            resultMeta["codex/browserUse"] === true ||
            existing?.browserUse === true,
          content: resultContent,
          durationMs: asNumber(item.durationMs),
          error: asString(error.message),
          id: itemId,
          progress: existing?.progress ?? [],
          readOnlyHint:
            item.readOnlyHint === true || existing?.readOnlyHint === true,
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
    if (itemType === "webSearch") {
      const existing = state.webSearches.find(({ id }) => id === itemId);
      const parsedAction = webSearchActionFrom(item.action);
      const action = isRecord(item.action)
        ? parsedAction.action
        : (existing?.action ?? parsedAction.action);
      const target = isRecord(item.action)
        ? parsedAction.target
        : (existing?.target ?? parsedAction.target);
      const results = webSearchResultsFrom(item.results, itemId);
      return {
        ...next,
        timeline: appendTimeline(state.timeline, {
          id: itemId,
          kind: "webSearch",
        }),
        webSearches: upsertById(state.webSearches, {
          action,
          id: itemId,
          query: asString(item.query) ?? existing?.query ?? target ?? "",
          results: results.length > 0 ? results : (existing?.results ?? []),
          status:
            notification.method === "item/completed"
              ? "completed"
              : "running",
          target: target ?? existing?.target ?? null,
          turnId: itemTurnId,
        }),
      };
    }
    if (itemType === "collabAgentToolCall") {
      const callStatus = asString(item.status) ?? "inProgress";
      const reportedTool = asString(item.tool);
      const agentStates = isRecord(item.agentsStates)
        ? item.agentsStates
        : {};
      const receiverThreadIds = Array.isArray(item.receiverThreadIds)
        ? item.receiverThreadIds.flatMap((value) => {
            const id = asString(value);
            return id ? [id] : [];
        })
        : [];
      const reportedStartedAtMs = asNumber(params.startedAtMs);
      const reportedCompletedAtMs = asNumber(params.completedAtMs);
      const updates = receiverThreadIds.map((id) => {
        const currentSubagent = state.subagents.find(
          (candidate) => candidate.id === id,
        );
        const exactLifecycle = state.subagentLifecycles.find(
          (candidate) =>
            candidate.id === id &&
            (candidate.callId === itemId ||
              candidate.controlCallIds.includes(itemId)),
        );
        const sameTurnLifecycle = [...state.subagentLifecycles]
          .reverse()
          .find(
            (candidate) =>
              candidate.id === id && candidate.turnId === itemTurnId,
          );
        const existing =
          exactLifecycle ??
          (currentSubagent?.turnId === itemTurnId
            ? currentSubagent
            : sameTurnLifecycle) ??
          currentSubagent;
        const targetsHistoricalLifecycle =
          existing !== undefined &&
          currentSubagent !== undefined &&
          existing.callId !== currentSubagent.callId &&
          (exactLifecycle !== undefined ||
            existing.turnId !== currentSubagent.turnId);
        const agentState = isRecord(agentStates[id]) ? agentStates[id] : {};
        const rekeysProvisionalLifecycle =
          !targetsHistoricalLifecycle &&
          currentSubagent?.provisional === true &&
          currentSubagent.turnId === itemTurnId;
        const startsNewLifecycle =
          !targetsHistoricalLifecycle &&
          itemTurnId === state.currentTurnId &&
          existing?.callId !== itemId &&
          (reportedTool === "resumeAgent" ||
            existing?.turnId !== itemTurnId ||
            (reportedTool === "sendInput" && existing?.status === "done")) &&
          !rekeysProvisionalLifecycle;
        const reportedThreadStatus =
          asString(agentState.status) ??
          (startsNewLifecycle ? null : existing?.threadStatus) ??
          "pendingInit";
        const reportedStatus =
          reportedThreadStatus === "pendingInit"
            ? "waiting"
            : reportedThreadStatus === "running"
              ? "active"
              : "done";
        const status =
          existing?.status === "done" &&
          reportedStatus !== "done" &&
          !startsNewLifecycle &&
          !rekeysProvisionalLifecycle
            ? "done"
            : reportedStatus;
        const threadStatus =
          status === "done" && reportedStatus !== "done"
            ? existing?.threadStatus ?? reportedThreadStatus
            : reportedThreadStatus;
        const startedAtMs = startsNewLifecycle
          ? reportedStartedAtMs
          : existing?.startedAtMs === null ||
              existing?.startedAtMs === undefined
            ? reportedStartedAtMs
            : reportedStartedAtMs === null
              ? existing.startedAtMs
              : Math.min(existing.startedAtMs, reportedStartedAtMs);
        const completedAtMs = startsNewLifecycle
          ? reportedStatus === "done"
            ? reportedCompletedAtMs
            : null
          : rekeysProvisionalLifecycle
            ? reportedStatus === "done"
              ? existing?.completedAtMs ?? reportedCompletedAtMs
              : null
          : existing?.completedAtMs ??
            (reportedStatus === "done" ? reportedCompletedAtMs : null);
        const subagent: DemoSubagent = {
          ...(!startsNewLifecycle && existing?.activityKind
            ? { activityKind: existing.activityKind }
            : {}),
          agentPath: existing?.agentPath ?? null,
          callId: startsNewLifecycle || rekeysProvisionalLifecycle
            ? itemId
            : existing?.callId ?? itemId,
          completedAtMs,
          controlCallIds:
            startsNewLifecycle
              ? [itemId]
              : Array.from(
                  new Set([
                    ...(existing?.controlCallIds ??
                      (existing ? [existing.callId] : [])),
                    itemId,
                  ]),
                ),
          id,
          message: startsNewLifecycle
            ? asString(agentState.message)
            : asString(agentState.message) ?? existing?.message ?? null,
          name:
            existing?.name ??
            subagentName(existing?.agentPath ?? null, id),
          prompt: startsNewLifecycle
            ? asString(item.prompt) ?? existing?.prompt ?? null
            : existing?.prompt ?? asString(item.prompt) ?? null,
          provisional: false,
          senderThreadId:
            asString(item.senderThreadId) ??
            existing?.senderThreadId ??
            null,
          startedAtMs,
          status,
          threadStatus,
          tool:
            startsNewLifecycle || rekeysProvisionalLifecycle
              ? reportedTool ?? "spawnAgent"
              : existing?.tool ?? reportedTool ?? "spawnAgent",
          turnId:
            startsNewLifecycle || rekeysProvisionalLifecycle
              ? itemTurnId
              : existing?.turnId ?? itemTurnId,
        };
        return {
          rekeysProvisionalLifecycle,
          subagent,
          targetsHistoricalLifecycle,
        };
      });
      const subagents = updates.reduce(
        (items, { subagent, targetsHistoricalLifecycle }) =>
          targetsHistoricalLifecycle
            ? items
            : upsertById(items, subagent),
        state.subagents,
      );
      const provisionalLifecycleIds = new Set(
        updates.flatMap(({ rekeysProvisionalLifecycle, subagent }) => {
          if (!rekeysProvisionalLifecycle) return [];
          const existing = state.subagents.find(
            (candidate) => candidate.id === subagent.id,
          );
          return existing ? [existing.callId] : [];
        }),
      );
      const subagentLifecycles = updates.reduce(
        (items, { subagent }) =>
          rekeyOrUpsertSubagentLifecycle(
            items,
            subagent,
            provisionalLifecycleIds,
          ),
        state.subagentLifecycles,
      );
      const senderThreadId = asString(item.senderThreadId);
      const timelineId = updates
        .map(({ subagent }) => subagent.callId)
        .find((id): id is string => Boolean(id)) ?? itemId;
      const parentCallId = senderThreadId
        ? subagents.find(({ id }) => id === senderThreadId)?.callId ?? null
        : null;
      const hasReportedActiveSubagent = receiverThreadIds.some(
        (id) => subagents.find((candidate) => candidate.id === id)?.status !== "done",
      );
      return {
        ...next,
        status:
          itemTurnId === state.currentTurnId &&
          callStatus === "inProgress" &&
          hasReportedActiveSubagent
            ? "running"
            : next.status,
        subagentLifecycles,
        subagents,
        timeline: insertSubagentTimeline(
          rekeySubagentTimeline(
            state.timeline,
            provisionalLifecycleIds,
            timelineId,
          ),
          { id: timelineId, kind: "subagent" },
          parentCallId,
        ),
      };
    }
    if (itemType === "subAgentActivity") {
      const agentThreadId = asString(item.agentThreadId);
      if (!agentThreadId) return next;
      const agentPath = asString(item.agentPath);
      const currentSubagent = state.subagents.find(
        ({ id }) => id === agentThreadId,
      );
      const kind = asString(item.kind) ?? "started";
      const sourceThreadId = asString(params.threadId);
      const reportedStartedAtMs = asNumber(params.startedAtMs);
      const reportedCompletedAtMs = asNumber(params.completedAtMs);
      const existing = subagentLifecycleForActivity(
        state,
        agentThreadId,
        itemTurnId,
        reportedStartedAtMs ?? reportedCompletedAtMs,
      );
      const callId = existing?.callId ?? itemId;
      const isDone = kind === "interrupted" || existing?.status === "done";
      const activitySubagent: DemoSubagent = {
        ...(kind === "interacted" ? { activityKind: "interacted" } : {}),
        agentPath: agentPath ?? existing?.agentPath ?? null,
        callId,
        completedAtMs:
          existing?.completedAtMs ??
          (kind === "interrupted" ? reportedCompletedAtMs : null),
        controlCallIds: existing?.controlCallIds ?? [callId],
        id: agentThreadId,
        message: existing?.message ?? null,
        name:
          subagentName(agentPath ?? existing?.agentPath ?? null, agentThreadId) ??
          existing?.name ??
          null,
        prompt: existing?.prompt ?? null,
        provisional: existing?.provisional ?? existing === undefined,
        senderThreadId: existing?.senderThreadId ?? sourceThreadId,
        startedAtMs:
          existing?.startedAtMs === null ||
          existing?.startedAtMs === undefined
            ? reportedStartedAtMs
            : reportedStartedAtMs === null
              ? existing.startedAtMs
              : Math.min(existing.startedAtMs, reportedStartedAtMs),
        status: isDone ? "done" : "active",
        threadStatus:
          kind === "interrupted"
            ? "interrupted"
            : isDone
              ? existing?.threadStatus ?? "completed"
              : "running",
        tool: existing?.tool ?? "spawnAgent",
        turnId: itemTurnId,
      };
      const updatesCurrentSubagent =
        currentSubagent === undefined ||
        currentSubagent.callId === activitySubagent.callId ||
        (existing === undefined && itemTurnId === state.currentTurnId);
      const subagents = updatesCurrentSubagent
        ? upsertById(state.subagents, activitySubagent)
        : state.subagents;
      const subagentLifecycles = upsertSubagentLifecycle(
        state.subagentLifecycles,
        activitySubagent,
      );
      const parentCallId = sourceThreadId
        ? [...subagentLifecycles]
            .reverse()
            .find(
              ({ id, turnId }) =>
                id === sourceThreadId && turnId === itemTurnId,
            )?.callId ??
          subagents.find(({ id }) => id === sourceThreadId)?.callId ??
          null
        : null;
      return {
        ...next,
        status:
          itemTurnId === state.currentTurnId &&
          updatesCurrentSubagent &&
          !isDone
            ? "running"
            : next.status,
        subagentLifecycles,
        subagents,
        timeline: insertSubagentTimeline(
          state.timeline,
          { id: callId, kind: "subagent" },
          parentCallId,
        ),
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
              decision:
                approvalDecision(approval.responseDecision) ?? "rejected",
              decisionScope: approvalDecisionScope(
                approval.responseDecision,
              ),
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
    const message = asString(error.message) ?? "The turn failed.";
    const errorInfo = asJsonValue(error.codexErrorInfo);
    const turnId = asString(params.turnId) ?? state.currentTurnId;
    if (retrying) {
      const progress = reconnectProgress(message);
      const previousTimelineEntry = state.timeline.at(-1);
      const previousStreamError =
        previousTimelineEntry?.kind === "streamError"
          ? state.streamErrors.find(
              ({ id }) => id === previousTimelineEntry.id,
            )
          : undefined;
      const updatesPreviousProgress = Boolean(
        previousStreamError &&
          previousStreamError.reconnectAttempt !== null &&
          progress.attempt !== null &&
          previousStreamError.turnId === turnId,
      );
      const id = updatesPreviousProgress
        ? previousStreamError!.id
        : `stream-error:${turnId ?? "unknown"}:${state.streamErrors.length + 1}`;
      const streamError: DemoStreamError = {
        additionalDetails: asString(error.additionalDetails),
        content: progress.content,
        errorInfo,
        id,
        reconnectAttempt: progress.attempt,
        reconnectMaxAttempts: progress.maxAttempts,
        serverBusy: isServerBusyError(errorInfo),
        turnId,
      };
      return {
        ...next,
        error: message,
        messages: state.messages,
        retrying: true,
        status: "retrying",
        streamErrors: upsertById(state.streamErrors, streamError),
        timeline: appendTimeline(state.timeline, {
          id,
          kind: "streamError",
        }),
      };
    }
    const id = `system-error:${turnId ?? "unknown"}:${state.systemErrors.length + 1}`;
    const systemError: DemoSystemError = {
      content: message,
      errorInfo,
      id,
      turnId,
    };
    return {
      ...next,
      error: message,
      messages: finalizeRunningMessages(state.messages, "failed"),
      retrying: false,
      status: "failed",
      systemErrors: upsertById(state.systemErrors, systemError),
      timeline: appendTimeline(state.timeline, {
        id,
        kind: "systemError",
      }),
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
      plan: [],
      planExplanation: null,
      planTurnId: null,
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
