import { describe, expect, it } from "vitest";
import { LiveUserInputGate, type LiveInputRequest } from "../electron/live-user-input";

const request: LiveInputRequest = {
  threadId: "a", turnId: "turn-a", itemId: "input", isBlocking: true,
  questions: [{ id: "direction", header: "Direction", question: "Which direction?", options: [{ label: "North", description: "Go north" }] }],
};
describe("live user input ownership", () => {
  it("delivers answers once in the public response shape", async () => {
    const gate = new LiveUserInputGate();
    const pending = gate.request(1, request);
    expect(gate.respond(1, "a", { direction: ["North"] })).toBe(true);
    await expect(pending).resolves.toEqual({ answers: { direction: { answers: ["North"] } } });
    expect(gate.respond(1, "a", { direction: ["North"] })).toBe(false);
  });
  it("rejects wrong-thread, malformed, missing and unknown answers without losing the request", async () => {
    const gate = new LiveUserInputGate();
    const pending = gate.request(1, request);
    expect(() => gate.respond(1, "b", { direction: ["North"] })).toThrow("another thread");
    for (const invalid of [null, [], {}, { direction: [] }, { direction: [1] }, { direction: [" "] }, { direction: ["South"] }, { other: ["North"] }]) {
      expect(() => gate.respond(1, "a", invalid)).toThrow(TypeError);
    }
    expect(gate.respond(1, "a", { direction: ["North"] })).toBe(true);
    await pending;
  });
  it("supports free-form and sensitive answers without storing completed responses", async () => {
    const gate = new LiveUserInputGate();
    const pending = gate.request("free", { ...request, questions: [
      { id: "free", header: "Free", question: "Explain", options: null },
      { id: "secret", header: "Secret", question: "Value", isSecret: true },
      { ...request.questions[0], isOther: true },
    ] });
    gate.respond("free", "a", { free: ["A description"], secret: ["test-only-secret"], direction: ["Elsewhere"] });
    await expect(pending).resolves.toMatchObject({ answers: { direction: { answers: ["Elsewhere"] } } });
    expect(gate.cancel("free")).toBe(false);
  });
  it("keeps numeric and string request IDs distinct and clears only the selected thread", async () => {
    const gate = new LiveUserInputGate();
    const a = gate.request(1, request);
    const b = gate.request("1", { ...request, threadId: "b" });
    expect(gate.cancel(1, "b")).toBe(false);
    gate.clear("a");
    await expect(a).resolves.toEqual({ answers: {} });
    expect(gate.respond("1", "b", { direction: ["North"] })).toBe(true);
    await b;
  });
  it("settles replaced requests and shutdown without fabricated answers", async () => {
    const gate = new LiveUserInputGate();
    const first = gate.request("same", request);
    const second = gate.request("same", request);
    await expect(first).resolves.toEqual({ answers: {} });
    gate.clear();
    await expect(second).resolves.toEqual({ answers: {} });
  });
  it("expires only questions from the completed turn", async () => {
    const gate = new LiveUserInputGate();
    const first = gate.request(1, request);
    const next = gate.request(2, { ...request, turnId: "turn-next" });
    gate.clearTurn("b", "turn-a");
    gate.clearTurn("a", "turn-a");
    await expect(first).resolves.toEqual({ answers: {} });
    expect(gate.respond(1, "a", { direction: ["North"] })).toBe(false);
    expect(gate.respond(2, "a", { direction: ["North"] })).toBe(true);
    await next;
  });
});
