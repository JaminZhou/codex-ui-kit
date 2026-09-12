import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";

export type LiveEnvironmentStatusResult = {
  environmentId: string;
  error?: string;
  status: "ready" | "pending" | "disconnected" | "unknown";
};

/** Environment ids are opaque protocol identifiers, never paths or URLs. */
export function normalizeEnvironmentId(value: unknown) {
  if (typeof value !== "string") {
    throw new TypeError("An environment ID is required.");
  }
  const environmentId = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(environmentId)) {
    throw new TypeError("Environment IDs may use letters, numbers, dots, underscores, colons, and hyphens.");
  }
  return environmentId;
}

/** Read-only public protocol probe: it neither configures nor reconnects an environment. */
export async function readLiveEnvironmentStatus(
  client: Pick<CodexAppServerClient, "call">,
  rawEnvironmentId: unknown,
): Promise<LiveEnvironmentStatusResult> {
  const environmentId = normalizeEnvironmentId(rawEnvironmentId);
  const response = await client.call("environment/status", { environmentId });
  return {
    environmentId,
    status: response.status,
    ...(response.error ? { error: response.error } : {}),
  };
}
