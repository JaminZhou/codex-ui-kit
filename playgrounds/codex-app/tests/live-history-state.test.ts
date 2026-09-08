import { describe, expect, it } from "vitest";
import { hydrateLiveHistory } from "../src/live-history-state";
import { initialLiveProjectState, reduceLiveProjectState } from "../src/live-project-state";

const turns = [{ id: "one", status: "completed", items: [
  { type: "userMessage", id: "u", content: [{ type: "text", text: "Question" }] },
  { type: "agentMessage", id: "a", text: "Answer" },
] }];
describe("stored live history", () => {
  it("unbinds archived chats and reloads fresh history after restoration", () => {
    let state = reduceLiveProjectState(initialLiveProjectState, { kind: "live-history", projectToken: "project", threadId: "thread", turns });
    state = reduceLiveProjectState(state, { kind: "live-history", projectToken: "other", threadId: "other-thread", turns });
    state = reduceLiveProjectState(state, { method: "thread/archived", params: { threadId: "thread" } });
    expect(state.projects.project).toBeUndefined();
    expect(state.threads.thread).toBeUndefined();
    expect(state.projects.other).toBe("other-thread");
    state = reduceLiveProjectState(state, { method: "thread/unarchived", params: { threadId: "thread" } });
    expect(state.threads.thread).toBeUndefined();
    state = reduceLiveProjectState(state, { kind: "live-history", projectToken: "project", threadId: "thread", turns });
    expect(state.threads.thread.messages.map(message => message.text)).toEqual(["Question", "Answer"]);
    state = reduceLiveProjectState(state, { kind: "live-archived", threadIds: ["thread"] });
    state = reduceLiveProjectState(state, { kind: "live-history", projectToken: "project", threadId: "thread", turns: [] });
    expect(state.threads.thread.messages).toEqual([]);
    state = reduceLiveProjectState(state, { kind: "live-archived", threadIds: ["thread"] });
    expect(state.currentThread).toBeNull();
  });
  it("hydrates real stored items without treating them as a new live request", () => {
    const state = hydrateLiveHistory("thread", turns);
    expect(state.messages.map(message => message.text)).toEqual(["Question", "Answer"]);
    expect(state.status).toBe("completed");
    expect(state.threadId).toBe("thread");
    expect(state.approvals).toEqual([]);
  });
  it("keeps newer streamed state instead of overwriting it with an older read", () => {
    let state = reduceLiveProjectState(initialLiveProjectState, { kind: "live-history", projectToken: "project", threadId: "thread", turns });
    state = reduceLiveProjectState(state, { method: "item/completed", params: { threadId: "thread", turnId: "two", item: { type: "agentMessage", id: "new", text: "New answer" } } });
    state = reduceLiveProjectState(state, { kind: "live-history", projectToken: "project", threadId: "thread", turns });
    expect(state.threads.thread.messages.map(message => message.text)).toContain("New answer");
    state = reduceLiveProjectState(state, { kind: "live-unbind", projectToken: "project" });
    expect(state.projects.project).toBeUndefined();
    expect(state.threads.thread.messages).toHaveLength(3);
  });
});
