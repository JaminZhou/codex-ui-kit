import { initialProtocolState, reduceLiveProtocolNotification, type DemoProtocolState } from "./protocol-state";
import { hydrateLiveHistory, type StoredLiveTurn } from "./live-history-state";

export type LiveSessionEvent =
  | { kind: "live-reset" }
  | { kind: "live-archived"; threadIds: string[] }
  | { kind: "live-unbind"; projectToken: string }
  | { kind: "live-history"; projectToken: string; threadId: string; turns: StoredLiveTurn[] }
  | { kind: "live-bind"; projectToken: string; threadId: string };
type ProtocolEvent = Parameters<typeof reduceLiveProtocolNotification>[1];
export interface LiveProjectState {
  projects: Record<string, string>;
  threads: Record<string, DemoProtocolState>;
  currentThread: string | null;
}
export const initialLiveProjectState: LiveProjectState = {
  projects: {}, threads: {}, currentThread: null,
};
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {};

export function liveProjectState(store: LiveProjectState, projectToken?: string): DemoProtocolState {
  const threadId = projectToken ? store.projects[projectToken] : undefined;
  return threadId ? store.threads[threadId] ?? initialProtocolState : initialProtocolState;
}

/** Notifications may arrive for a background project or a child thread. Neither
 * is allowed to select the visible project or replace its transcript. */
export function reduceLiveProjectState(store: LiveProjectState, event: ProtocolEvent | LiveSessionEvent): LiveProjectState {
  const archivedIds = "kind" in event && event.kind === "live-archived" ? event.threadIds
    : "method" in event && event.method === "thread/archived" && typeof object(event.params).threadId === "string"
      ? [object(event.params).threadId as string] : [];
  if (archivedIds.length) {
    const threads = { ...store.threads };
    for (const id of archivedIds) delete threads[id];
    return { projects: Object.fromEntries(Object.entries(store.projects).filter(([, id]) => !archivedIds.includes(id))),
      threads, currentThread: store.currentThread && archivedIds.includes(store.currentThread) ? null : store.currentThread };
  }
  if ("kind" in event && event.kind === "live-archived") return store;
  // Restoration is metadata, not a hydrated transcript. Do not create an empty
  // cache entry that would shadow the subsequent explicit stored-history read.
  if ("method" in event && event.method === "thread/unarchived") return store;
  if ("kind" in event && event.kind === "live-reset") return initialLiveProjectState;
  if ("kind" in event && event.kind === "live-unbind") {
    const projects = { ...store.projects };
    delete projects[event.projectToken];
    return { ...store, projects };
  }
  if ("kind" in event && event.kind === "live-history") {
    return { ...store, projects: { ...store.projects, [event.projectToken]: event.threadId }, currentThread: event.threadId,
      threads: { ...store.threads, [event.threadId]: store.threads[event.threadId] ?? hydrateLiveHistory(event.threadId, event.turns) } };
  }
  if ("kind" in event && event.kind === "live-bind") {
    return { ...store, projects: { ...store.projects, [event.projectToken]: event.threadId }, currentThread: event.threadId };
  }
  const params = "params" in event ? object(event.params) : {};
  const thread = object(params.thread);
  const explicitThread = typeof params.threadId === "string" ? params.threadId
    : "method" in event && event.method === "thread/started" && typeof thread.id === "string" ? thread.id : undefined;
  const requestId = "kind" in event && event.kind === "approval-resolution" ? event.requestId
    : "method" in event && event.method === "serverRequest/resolved" ? params.requestId : undefined;
  const approvalThread = requestId === undefined ? undefined : Object.keys(store.threads).find(
    (id) => store.threads[id].approvals.some((approval) => approval.requestId === requestId),
  );
  const threadId = explicitThread ?? approvalThread ?? store.currentThread;
  if (!threadId) return store;
  const previous = store.threads[threadId] ?? { ...initialProtocolState, threadId };
  return { ...store, threads: { ...store.threads, [threadId]: reduceLiveProtocolNotification(previous, event) } };
}
