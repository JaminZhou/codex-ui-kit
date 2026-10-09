import { describe, expect, it, vi } from "vitest";
import { LiveConnectionGate } from "../electron/live-connection-gate";

describe("live connection initialization and shutdown", () => {
  it("shares simultaneous initialization and permits a failed connection retry", async () => {
    const gate = new LiveConnectionGate<string>();
    const failure = vi.fn().mockRejectedValue(new Error("offline"));
    const first = gate.connect(failure), second = gate.connect(failure);
    expect(first).toBe(second);
    await expect(first).rejects.toThrow("offline");
    expect(failure).toHaveBeenCalledTimes(1);
    await expect(gate.connect(async () => "connected")).resolves.toBe("connected");
  });
  it("waits for initialization before close and for close before reconnect", async () => {
    const gate = new LiveConnectionGate<string>();
    const events: string[] = [];
    let connected!: (value: string) => void;
    let disposed!: () => void;
    const first = gate.connect(() => { events.push("connect"); return new Promise(resolve => { connected = resolve; }); });
    await Promise.resolve();
    const close = gate.close(() => { events.push("close"); return new Promise(resolve => { disposed = resolve; }); });
    const duplicateClose = gate.close(async () => { events.push("duplicate-close"); });
    expect(close).toBe(duplicateClose);
    const next = gate.connect(async () => { events.push("reconnect"); return "new"; });
    expect(events).toEqual(["connect"]);
    connected("old"); await first;
    await vi.waitFor(() => expect(events).toEqual(["connect", "close"]));
    disposed(); await close;
    await expect(next).resolves.toBe("new");
    expect(events).toEqual(["connect", "close", "reconnect"]);
  });
  it("propagates disposal failure without leaving a permanent gate", async () => {
    const gate = new LiveConnectionGate<string>();
    await expect(gate.close(async () => { throw new Error("close failed"); })).rejects.toThrow("close failed");
    await expect(gate.connect(async () => "retry")).resolves.toBe("retry");
  });
});
