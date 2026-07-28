import { describe, expect, it } from "vitest";
import { LiveApprovalSubmissionGate } from "../src/live-approval-submission-gate";

describe("live approval submission gate", () => {
  it("deduplicates a request while keeping string and number IDs distinct", () => {
    const gate = new LiveApprovalSubmissionGate();

    expect(gate.begin("1")).toBe(true);
    expect(gate.begin("1")).toBe(false);
    expect(gate.begin(1)).toBe(true);
  });

  it("releases failed and no-longer-pending requests", () => {
    const gate = new LiveApprovalSubmissionGate();

    gate.begin("failed");
    gate.finish("failed");
    expect(gate.begin("failed")).toBe(true);

    gate.begin("resolved");
    gate.retainPending(["failed"]);
    expect(gate.begin("resolved")).toBe(true);
    expect(gate.begin("failed")).toBe(false);
  });
});
