import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";

type Model = Awaited<ReturnType<CodexAppServerClient["modelList"]>>["data"][number];
export type LiveModelCapability = Pick<Model, "id" | "model" | "displayName" | "description" | "supportedReasoningEfforts" | "defaultReasoningEffort" | "isDefault">;
export type LiveModelSelection = { modelId: string; effort: Model["defaultReasoningEffort"] };

/** Validate renderer input against a freshly read complete public catalog. */
export function resolveLiveModelSelection(raw: unknown, catalog: readonly LiveModelCapability[]) {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Invalid live model selection.");
  const selection = raw as Record<string, unknown>;
  if (typeof selection.modelId !== "string" || typeof selection.effort !== "string") throw new TypeError("Invalid live model selection.");
  const model = catalog.find(row => row.id === selection.modelId);
  if (!model) throw new Error("Selected model is no longer in the visible runtime catalog. Refresh before sending.");
  const option = model.supportedReasoningEfforts.find(option => option.reasoningEffort === selection.effort);
  if (!option) throw new Error("Selected reasoning effort is not supported by this model. Refresh before sending.");
  return { model: model.model, effort: option.reasoningEffort };
}

/** Read-only public catalog, not the installed UI's observed picker fixture. */
export async function readLiveModelCatalog(client: Pick<CodexAppServerClient, "modelList">): Promise<LiveModelCapability[]> {
  const models: LiveModelCapability[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await client.modelList({ includeHidden: false, ...(cursor ? { cursor } : {}) });
    for (const row of page.data) {
      if (row.hidden) continue;
      if (ids.has(row.id)) throw new Error("Model catalog repeated a model across pages; refresh before using it.");
      ids.add(row.id);
      models.push({ id: row.id, model: row.model, displayName: row.displayName, description: row.description,
        supportedReasoningEfforts: row.supportedReasoningEfforts.map(option => ({ ...option })),
        defaultReasoningEffort: row.defaultReasoningEffort, isDefault: row.isDefault });
    }
    if (page.nextCursor === null) break;
    if (!page.nextCursor || cursors.has(page.nextCursor)) throw new Error("Model catalog pagination did not advance.");
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (true);
  return models;
}
