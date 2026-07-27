import { describe, expect, it } from "vitest";
import { LiveTurnStartGate } from "../electron/live-turn-start-gate";

describe("LiveTurnStartGate", () => {
  it("rejects a second start while the first asynchronous start is pending", async () => {
    const gate = new LiveTurnStartGate();
    let releaseFirst: (() => void) | undefined;
    const first = gate.run(
      () => false,
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        }),
    );

    await expect(
      gate.run(
        () => false,
        async () => undefined,
      ),
    ).rejects.toThrow("A live turn is already running.");

    releaseFirst?.();
    await first;
    await expect(
      gate.run(
        () => false,
        async () => "started",
      ),
    ).resolves.toBe("started");
  });

  it("releases the start reservation when setup fails", async () => {
    const gate = new LiveTurnStartGate();

    await expect(
      gate.run(
        () => false,
        async () => {
          throw new Error("connection failed");
        },
      ),
    ).rejects.toThrow("connection failed");

    await expect(
      gate.run(
        () => false,
        async () => "retry",
      ),
    ).resolves.toBe("retry");
  });

  it("rejects a start while a turn is already active", async () => {
    const gate = new LiveTurnStartGate();

    await expect(
      gate.run(
        () => true,
        async () => undefined,
      ),
    ).rejects.toThrow("A live turn is already running.");
  });
});
