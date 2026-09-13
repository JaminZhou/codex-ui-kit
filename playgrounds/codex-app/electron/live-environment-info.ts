import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { normalizeEnvironmentId } from "./live-environment-status.js";

export type LiveEnvironmentInfoResult = {
  environmentId: string;
  cwd: string | null;
  shell: {
    name: string;
    path: string;
  };
};

function readString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`The environment ${label} is missing.`);
  }
  return value;
}

function readCwd(value: unknown) {
  if (value === null || value === undefined) return null;
  return readString(value, "cwd");
}

export async function readLiveEnvironmentInfo(
  client: Pick<CodexAppServerClient, "call">,
  rawEnvironmentId: unknown,
): Promise<LiveEnvironmentInfoResult> {
  const environmentId = normalizeEnvironmentId(rawEnvironmentId);
  const response = await client.call("environment/info", { environmentId });
  if (!response || typeof response !== "object") {
    throw new Error("The environment info response is invalid.");
  }
  const shell = (response as { shell?: unknown }).shell;
  if (!shell || typeof shell !== "object") {
    throw new Error("The environment info response has no shell.");
  }
  return {
    environmentId,
    cwd: readCwd((response as { cwd?: unknown }).cwd),
    shell: {
      name: readString((shell as { name?: unknown }).name, "shell name"),
      path: readString((shell as { path?: unknown }).path, "shell path"),
    },
  };
}
