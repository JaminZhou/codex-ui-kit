import { describe, expect, it } from "vitest";
import { initialLiveProjectState, liveProjectState, reduceLiveProjectState, type LiveProjectState } from "../src/live-project-state";

const bind = (store: LiveProjectState, projectToken: string, threadId: string) =>
  reduceLiveProjectState(store, { kind: "live-bind", projectToken, threadId });
const message = (store: LiveProjectState, threadId: string, text: string) =>
  reduceLiveProjectState(store, { method: "item/completed", params: {
    threadId, turnId: `${threadId}-turn`, item: { type: "agentMessage", id: text, text },
  } });

describe("live project transcript ownership", () => {
  it("restores A after B without mixing messages and buffers events before binding", () => {
    let store = message(initialLiveProjectState, "a", "A response");
    expect(liveProjectState(store, "project-a").messages).toEqual([]);
    store = bind(store, "project-a", "a");
    store = bind(store, "project-b", "b");
    store = message(store, "b", "B response");
    store = message(store, "a", "A background response");
    expect(liveProjectState(store, "project-b").messages.map((item) => item.text)).toEqual(["B response"]);
    store = bind(store, "project-a", "a");
    expect(liveProjectState(store, "project-a").messages.map((item) => item.text)).toEqual(["A response", "A background response"]);
    expect(liveProjectState(store, "unknown").messages).toEqual([]);
  });

  it("does not select a child thread when it starts or emits messages", () => {
    let store = message(bind(initialLiveProjectState, "project-a", "a"), "a", "Parent");
    store = reduceLiveProjectState(store, { method: "thread/started", params: { thread: { id: "child" } } });
    store = message(store, "child", "Child");
    expect(store.currentThread).toBe("a");
    expect(liveProjectState(store, "project-a").messages.map((item) => item.text)).toEqual(["Parent"]);
  });

  it("routes delayed local approval responses to the owning thread, not the last selected one", () => {
    let store = bind(initialLiveProjectState, "project-a", "a");
    store = reduceLiveProjectState(store, { atMs: 0, kind: "request", id: "approval-a", method: "item/fileChange/requestApproval", params: { threadId: "a", turnId: "turn-a", itemId: "file-a" } });
    store = bind(store, "project-b", "b");
    store = reduceLiveProjectState(store, { kind: "approval-resolution", requestId: "approval-a", decision: "approved", responseDecision: "accept" });
    expect(liveProjectState(store, "project-a").approvals[0].decision).toBe("approved");
    expect(liveProjectState(store, "project-b").approvals).toEqual([]);
  });

  it("clears every binding and transcript on client reset", () => {
    let store = message(bind(initialLiveProjectState, "project-a", "a"), "a", "Old");
    store = bind(store, "project-b", "b");
    expect(reduceLiveProjectState(store, { kind: "live-reset" })).toEqual(initialLiveProjectState);
  });
});
