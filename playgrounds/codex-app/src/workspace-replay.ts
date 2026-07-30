import type { JsonValue } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";

export interface WorkspaceExecutionSelection {
  environmentId: string;
  projectPath?: string;
  worktreeBranch?: string;
  worktreeId: string;
}

function workspacePathSegment(value: string) {
  const characters: string[] = [];
  let replacingInvalidRun = false;
  for (const character of value.trim()) {
    const codePoint = character.codePointAt(0) ?? -1;
    const allowed =
      (codePoint >= 48 && codePoint <= 57) ||
      (codePoint >= 65 && codePoint <= 90) ||
      (codePoint >= 97 && codePoint <= 122) ||
      character === "." ||
      character === "_" ||
      character === "-";
    if (allowed) {
      characters.push(character);
      replacingInvalidRun = false;
    } else if (!replacingInvalidRun) {
      characters.push("-");
      replacingInvalidRun = true;
    }
  }

  let start = 0;
  let end = characters.length;
  while (start < end && characters[start] === "-") start += 1;
  while (end > start && characters[end - 1] === "-") end -= 1;
  return characters.slice(start, end).join("");
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
    const cloudProjectPath = `/cloud/${project || "workspace"}`;
    if (worktreeId === "main") return cloudProjectPath;
    const branch = workspacePathSegment(worktreeBranch ?? worktreeId);
    return `${cloudProjectPath}/.worktrees/${branch || worktreeId}`;
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

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function replaceWorkspacePrompt(value: JsonValue, prompt: string): JsonValue {
  if (!isJsonObject(value)) return value;
  const item = value.item;
  if (
    !isJsonObject(item) ||
    item.type !== "userMessage" ||
    !Array.isArray(item.content)
  ) {
    return value;
  }

  let replaced = false;
  const content = item.content.map((part) => {
    if (
      replaced ||
      !isJsonObject(part) ||
      part.type !== "text"
    ) {
      return part;
    }
    replaced = true;
    return {
      ...part,
      text: prompt,
    };
  });
  return replaced
    ? {
        ...value,
        item: {
          ...item,
          content,
        },
      }
    : value;
}

export function contextualizeWorkspaceReplay(
  events: readonly ProtocolEventRecord[],
  cwd: string,
  prompt?: string,
): ProtocolEventRecord[] {
  return events.map((event) => {
    const params = replaceCwd(event.params, cwd);
    return {
      ...event,
      params:
        prompt === undefined
          ? params
          : replaceWorkspacePrompt(params, prompt),
      response:
        event.response === undefined
          ? undefined
          : replaceCwd(event.response, cwd),
    };
  });
}
