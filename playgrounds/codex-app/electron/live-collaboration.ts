import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";

type ThreadSettings = Pick<Awaited<ReturnType<CodexAppServerClient["threadStart"]>>, "model" | "reasoningEffort">;

export function resolveLiveMode(raw: unknown): "default" | "plan" {
  if (raw === undefined || raw === "default") return "default";
  if (raw === "plan") return "plan";
  throw new TypeError("Choose Default or Plan for the live turn.");
}

export function liveCollaborationMode(mode: "default" | "plan", settings: ThreadSettings) {
  return {
    mode,
    settings: {
      model: settings.model,
      reasoning_effort: settings.reasoningEffort,
      developer_instructions: null,
    },
  };
}
