import { describe, expect, it } from "vitest";

import { GitBranchOperationQueue } from "../electron/git-branch-operation-queue";

describe("GitBranchOperationQueue", () => {
  it("serializes reads and mutations in invocation order", async () => {
    const queue = new GitBranchOperationQueue();
    const events: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.run(async () => {
      events.push("first:start");
      await firstGate;
      events.push("first:end");
      return "first";
    });
    const second = queue.run(async () => {
      events.push("second:start");
      events.push("second:end");
      return "second";
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("releases the next operation after a failure", async () => {
    const queue = new GitBranchOperationQueue();
    const failed = queue.run(async () => {
      throw new Error("failed");
    });
    const recovered = queue.run(async () => "recovered");

    await expect(failed).rejects.toThrow("failed");
    await expect(recovered).resolves.toBe("recovered");
  });
});
