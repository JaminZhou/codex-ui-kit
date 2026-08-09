import { describe, expect, it } from "vitest";
import { LiveApprovalGate } from "../electron/live-approval-gate";

describe("live approval gate", () => {
  it("keeps string and number request IDs distinct", async () => {
    const gate = new LiveApprovalGate();
    const stringRequest = gate.request("1");
    const numberRequest = gate.request(1);

    expect(gate.resolve("1", "accept")).toBe(true);
    expect(gate.resolve(1, "decline")).toBe(true);
    await expect(stringRequest).resolves.toEqual({ decision: "accept" });
    await expect(numberRequest).resolves.toEqual({ decision: "decline" });
  });

  it("declines a replaced request and resolves the latest request", async () => {
    const gate = new LiveApprovalGate();
    const first = gate.request("duplicate");
    const second = gate.request("duplicate");

    await expect(first).resolves.toEqual({ decision: "decline" });
    expect(gate.resolve("duplicate", "accept")).toBe(true);
    await expect(second).resolves.toEqual({ decision: "accept" });
  });

  it("preserves a session-scoped approval decision", async () => {
    const gate = new LiveApprovalGate();
    const request = gate.request("file-session");

    expect(gate.resolve("file-session", "acceptForSession")).toBe(true);
    await expect(request).resolves.toEqual({
      decision: "acceptForSession",
    });
  });

  it("declines every pending request on shutdown", async () => {
    const gate = new LiveApprovalGate();
    const first = gate.request("first");
    const second = gate.request("second");

    gate.declineAll();

    await expect(first).resolves.toEqual({ decision: "decline" });
    await expect(second).resolves.toEqual({ decision: "decline" });
    expect(gate.resolve("first", "accept")).toBe(false);
  });
});
