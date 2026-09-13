import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { normalizeEnvironmentId } from "./live-environment-status.js";

export type LiveEnvironmentAddResult = {
  environmentId: string;
  execServerUrl: string;
  status: "added";
};

/** Only websocket exec-server endpoints are accepted by the public protocol. */
export function normalizeExecServerUrl(value: unknown) {
  if (typeof value !== "string") {
    throw new TypeError("An exec server URL is required.");
  }
  const raw = value.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError("The exec server URL is invalid.");
  }
  if (
    (url.protocol !== "ws:" && url.protocol !== "wss:") ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new TypeError(
      "Exec server URLs must be credential-free ws:// or wss:// endpoints.",
    );
  }
  return url.toString();
}

export async function addLiveEnvironment(
  client: Pick<CodexAppServerClient, "call">,
  rawEnvironmentId: unknown,
  rawExecServerUrl: unknown,
): Promise<LiveEnvironmentAddResult> {
  const environmentId = normalizeEnvironmentId(rawEnvironmentId);
  const execServerUrl = normalizeExecServerUrl(rawExecServerUrl);
  await client.call("environment/add", {
    environmentId,
    execServerUrl,
  });
  return { environmentId, execServerUrl, status: "added" };
}
