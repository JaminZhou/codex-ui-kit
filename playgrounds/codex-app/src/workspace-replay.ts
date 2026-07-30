import type { JsonValue } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";

export interface WorkspaceExecutionSelection {
  environmentId: string;
  projectPath?: string;
  worktreeBranch?: string;
  worktreeId: string;
}

function workspacePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function workspaceExecutionCwd({
  environmentId,
  projectPath,
  worktreeBranch,
  worktreeId,
}: WorkspaceExecutionSelection) {
  const basePath = projectPath ?? "/workspace";
  if (environmentId === "cloud") {
    const project = workspacePathSegment(
      basePath.split("/").filter(Boolean).at(-1) ?? "workspace",
    );
    return `/cloud/${project || "workspace"}`;
  }
  if (environmentId === "worktree") {
    return `${basePath}/.worktrees/new-worktree`;
  }
  if (worktreeId === "main") return basePath;
  const branch = workspacePathSegment(worktreeBranch ?? worktreeId);
  return `${basePath}/.worktrees/${branch || worktreeId}`;
}

function replaceCwd(value: JsonValue, cwd: string): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => replaceCwd(item, cwd));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "cwd"
          ? cwd
          : item === undefined
            ? item
            : replaceCwd(item, cwd),
      ]),
    ) as JsonValue;
  }
  return value;
}

export function contextualizeWorkspaceReplay(
  events: readonly ProtocolEventRecord[],
  cwd: string,
): ProtocolEventRecord[] {
  return events.map((event) => ({
    ...event,
    params: replaceCwd(event.params, cwd),
    response:
      event.response === undefined
        ? undefined
        : replaceCwd(event.response, cwd),
  }));
}
