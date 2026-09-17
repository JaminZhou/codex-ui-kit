import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";

export interface LiveAppNotification {
  description?: string;
  heading: string;
  id: string;
  tone: "info" | "neutral" | "success" | "warning";
}

export type LiveNotificationEvent =
  | { kind: "live-reset" }
  | { kind: "dismiss"; id: string }
  | { command?: string; kind: "background-terminal-stopped"; processId: string }
  | JsonRpcNotification
  | ProtocolEventRecord;

const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

function appendNotification(
  notifications: readonly LiveAppNotification[],
  notification: LiveAppNotification,
): LiveAppNotification[] {
  const existingIndex = notifications.findIndex(({ id }) => id === notification.id);
  if (existingIndex >= 0) {
    return notifications.map((entry, index) =>
      index === existingIndex ? notification : entry,
    );
  }
  return [...notifications, notification].slice(-4);
}

function requestId(event: LiveNotificationEvent, params: Record<string, unknown>): unknown {
  return params.requestId ?? params.id ?? ("id" in event ? event.id : undefined) ?? "unknown";
}

function removeRequestNotification(
  notifications: readonly LiveAppNotification[],
  id: unknown,
): LiveAppNotification[] {
  const suffix = `:${typeof id}:${String(id)}`;
  return notifications.filter(
    ({ id: notificationId }) =>
      !(notificationId.startsWith("live-approval:") || notificationId.startsWith("live-input:")) ||
      !notificationId.endsWith(suffix),
  );
}

function removeTurnRecoveryNotifications(
  notifications: readonly LiveAppNotification[],
  turnId: string,
): LiveAppNotification[] {
  return notifications.filter(
    ({ id }) =>
      id !== `live-reconnecting:${turnId}` && id !== `live-error:${turnId}`,
  );
}

export function reduceLiveAppNotifications(
  notifications: readonly LiveAppNotification[],
  event: LiveNotificationEvent,
): LiveAppNotification[] {
  if ("kind" in event) {
    if (event.kind === "live-reset") return [];
    if (event.kind === "dismiss") {
      return notifications.filter(({ id }) => id !== event.id);
    }
    if (event.kind === "background-terminal-stopped") {
      return appendNotification(notifications, {
        description: event.command ?? "The background terminal was stopped.",
        heading: "Background task stopped",
        id: `live-background-terminal:${event.processId}:stopped`,
        tone: "info",
      });
    }
  }
  const params = object("params" in event ? event.params : undefined);
  const method = "method" in event ? event.method : "";

  if (method === "serverRequest/resolved") {
    const resolvedId = params.requestId ?? params.id;
    return resolvedId === undefined
      ? [...notifications]
      : removeRequestNotification(notifications, resolvedId);
  }

  if (method === "error") {
    const error = object(params.error);
    const message =
      typeof error.message === "string" && error.message.trim().length > 0
        ? error.message
        : "The turn failed.";
    const turnId = String(params.turnId ?? "unknown");
    const retrying = params.willRetry === true;
    return appendNotification(notifications, {
      description: message,
      heading: retrying ? "Reconnecting" : "Turn error",
      id: retrying
        ? `live-reconnecting:${turnId}`
        : `live-error:${turnId}`,
      tone: retrying ? "info" : "warning",
    });
  }

  if (method === "thread/compacted") {
    const threadId = String(params.threadId ?? "unknown");
    const turnId = String(params.turnId ?? "unknown");
    return appendNotification(notifications, {
      description: "Earlier context was compacted for this conversation.",
      heading: "Context compacted",
      id: `live-compaction:${threadId}:${turnId}`,
      tone: "info",
    });
  }

  if (
    method === "item/commandExecution/requestApproval" ||
    method === "item/fileChange/requestApproval" ||
    method === "item/permissions/requestApproval"
  ) {
    const id = requestId(event, params);
    return appendNotification(notifications, {
      description:
        method === "item/fileChange/requestApproval"
          ? "A file change is waiting for approval."
          : "A local action is waiting for approval.",
      heading: "Permission required",
      id: `live-approval:${typeof id}:${String(id)}`,
      tone: "warning",
    });
  }

  if (
    method === "item/tool/requestUserInput" ||
    method === "mcpServer/elicitation/request"
  ) {
    const id = requestId(event, params);
    return appendNotification(notifications, {
      description: "Codex is waiting for your answer.",
      heading: "Input required",
      id: `live-input:${typeof id}:${String(id)}`,
      tone: "warning",
    });
  }

  if (method !== "turn/completed") return [...notifications];
  const turn = object(params.turn);
  const threadId = String(params.threadId ?? "unknown");
  const turnId = String(turn.id ?? params.turnId ?? "unknown");
  const status = String(turn.status ?? "");
  const settledNotifications = removeTurnRecoveryNotifications(
    notifications,
    turnId,
  );
  if (status === "interrupted") {
    return appendNotification(settledNotifications, {
      description: "The active turn was stopped.",
      heading: "Turn stopped",
      id: `live-turn:${threadId}:${turnId}:interrupted`,
      tone: "info",
    });
  }
  if (status === "failed") {
    return appendNotification(settledNotifications, {
      description: "Codex could not finish the active turn.",
      heading: "Turn failed",
      id: `live-turn:${threadId}:${turnId}:failed`,
      tone: "warning",
    });
  }
  return [...settledNotifications];
}
