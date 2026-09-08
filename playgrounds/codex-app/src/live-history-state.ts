import type { JsonValue } from "@jaminzhou/codex-app-server-client";
import { initialProtocolState, reduceLiveProtocolNotification, type DemoProtocolState } from "./protocol-state";

export interface StoredLiveTurn {
  id: string;
  status: string;
  items: JsonValue[];
  error?: JsonValue;
}

/** Decode a stored snapshot explicitly; these are not new runtime events. */
export function hydrateLiveHistory(threadId: string, turns: StoredLiveTurn[]) {
  let state: DemoProtocolState = { ...initialProtocolState, threadId };
  for (const turn of turns) {
    state = reduceLiveProtocolNotification(state, { method: "turn/started", params: { threadId, turn: { id: turn.id, status: "inProgress" } } });
    for (const item of turn.items) {
      state = reduceLiveProtocolNotification(state, { method: "item/completed", params: { threadId, turnId: turn.id, item } });
    }
    if (turn.status !== "inProgress") state = reduceLiveProtocolNotification(state, {
      method: "turn/completed", params: { threadId, turn: { id: turn.id, status: turn.status, error: turn.error ?? null } },
    });
  }
  return state;
}
