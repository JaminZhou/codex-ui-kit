import type { LiveInputRequest } from "../electron/live-user-input";

export interface PendingUserInput extends LiveInputRequest {
  requestId: number | string;
}

/** Pending prompts only. Submitted answers never enter protocol history. */
export function reduceLiveInputs(state: PendingUserInput[], event: unknown): PendingUserInput[] {
  if (!event || typeof event !== "object") return state;
  const message = event as Record<string, unknown>;
  if (message.kind === "live-reset") return [];
  const params = message.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) return state;
  const data = params as Record<string, unknown>;
  if (message.method === "serverRequest/resolved") {
    return state.filter((request) => request.threadId !== data.threadId || request.requestId !== data.requestId);
  }
  if (message.method === "turn/completed") {
    const turn = data.turn as { id?: unknown } | undefined;
    return state.filter((request) => request.threadId !== data.threadId || request.turnId !== turn?.id);
  }
  if (message.method !== "item/tool/requestUserInput" || message.kind !== "request" ||
      (typeof message.id !== "number" && typeof message.id !== "string") ||
      typeof data.threadId !== "string" || typeof data.turnId !== "string" || typeof data.itemId !== "string" ||
      typeof data.isBlocking !== "boolean" || !Array.isArray(data.questions)) return state;
  const ids = new Set<string>();
  for (const question of data.questions) {
    if (!question || typeof question !== "object" ||
        typeof question.id !== "string" || ids.has(question.id) ||
        typeof question.header !== "string" || typeof question.question !== "string" ||
        (question.isSecret !== undefined && typeof question.isSecret !== "boolean") ||
        (question.isOther !== undefined && typeof question.isOther !== "boolean")) return state;
    ids.add(question.id);
    if (question.options != null && (!Array.isArray(question.options) || question.options.some(
      (option: unknown) => !option || typeof option !== "object" ||
        typeof (option as { label?: unknown }).label !== "string" ||
        typeof (option as { description?: unknown }).description !== "string",
    ))) return state;
  }
  const request = { ...data, requestId: message.id } as unknown as PendingUserInput;
  return [...state.filter((entry) => entry.requestId !== request.requestId), request];
}
