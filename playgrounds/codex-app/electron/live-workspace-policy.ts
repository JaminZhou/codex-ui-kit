import type { CodexThread } from "@jaminzhou/codex-app-server-client";
import { isAbsolute } from "node:path";

type SandboxPolicy = NonNullable<Parameters<CodexThread["startTurn"]>[1]>["sandboxPolicy"];

/** Write access is a host startup choice, never a renderer IPC field. */
export function liveWorkspacePolicy(directory: string, hostWriteOptIn?: string) {
  if (!isAbsolute(directory)) {
    throw new TypeError("A live workspace must have an absolute path.");
  }
  const writable = hostWriteOptIn === "1";
  const sandboxPolicy: SandboxPolicy = writable
    ? {
        type: "workspaceWrite",
        writableRoots: [directory],
        networkAccess: false,
        excludeTmpdirEnvVar: true,
        excludeSlashTmp: true,
      }
    : { type: "readOnly", networkAccess: false };
  return {
    approvalPolicy: "on-request" as const,
    sandbox: writable ? "workspace-write" as const : "read-only" as const,
    sandboxPolicy,
  };
}
