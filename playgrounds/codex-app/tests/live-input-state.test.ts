import { describe, expect, it } from "vitest";
import { reduceLiveInputs } from "../src/live-input-state";

const request = (id: number | string, threadId = "a") => ({
  kind: "request", id, method: "item/tool/requestUserInput", params: {
    threadId, turnId: `${threadId}-turn`, itemId: "input", isBlocking: true,
    questions: [{ id: "choice", header: "Choice", question: "Which?", options: [{ label: "A", description: "First" }] }],
  },
});

describe("pending live questions", () => {
  it("retains separate requests and clears only the matching owning thread", () => {
    let state = reduceLiveInputs([], request(1));
    state = reduceLiveInputs(state, request("1", "b"));
    expect(state).toHaveLength(2);
    expect(reduceLiveInputs(state, { method: "serverRequest/resolved", params: { threadId: "b", requestId: 1 } })).toEqual(state);
    state = reduceLiveInputs(state, { method: "serverRequest/resolved", params: { threadId: "a", requestId: 1 } });
    expect(state.map((entry) => entry.threadId)).toEqual(["b"]);
    expect(reduceLiveInputs(state, { kind: "live-reset" })).toEqual([]);
  });
  it("clears completed turn questions without losing other pending turns", () => {
    const state = reduceLiveInputs(reduceLiveInputs([], request(1)), request(2, "b"));
    expect(reduceLiveInputs(state, { method: "turn/completed", params: { threadId: "a", turn: { id: "wrong" } } })).toEqual(state);
    expect(reduceLiveInputs(state, { method: "turn/completed", params: { threadId: "a", turn: { id: "a-turn" } } }).map((entry) => entry.threadId)).toEqual(["b"]);
  });
  it("ignores malformed input and does not store response answers", () => {
    const event = request(1);
    expect(reduceLiveInputs([], { ...event, params: { ...event.params, questions: [{ id: "bad" }] } })).toEqual([]);
    const state = reduceLiveInputs([], event);
    expect(reduceLiveInputs(state, { kind: "response", method: "item/tool/requestUserInput", params: { answers: { secret: ["hidden"] } } })).toEqual(state);
  });
});
