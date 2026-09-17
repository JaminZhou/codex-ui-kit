import { describe, expect, it } from "vitest";
import {
  reduceLiveAppNotifications,
  type LiveAppNotification,
} from "../src/live-notification-state";

describe("live app notifications", () => {
  it("surfaces approval and input requests with stable deduplication", () => {
    const approval = {
      id: 4,
      kind: "request",
      method: "item/commandExecution/requestApproval",
      params: {},
    } as const;
    const withApproval = reduceLiveAppNotifications([], approval);
    expect(withApproval).toEqual([
      {
        description: "A local action is waiting for approval.",
        heading: "Permission required",
        id: "live-approval:number:4",
        tone: "warning",
      },
    ]);
    expect(reduceLiveAppNotifications(withApproval, approval)).toEqual(
      withApproval,
    );
    expect(
      reduceLiveAppNotifications([], {
        id: "question-1",
        kind: "request",
        method: "item/tool/requestUserInput",
        params: {},
      }),
    ).toMatchObject([
      {
        heading: "Input required",
        id: "live-input:string:question-1",
        tone: "warning",
      },
    ]);
    expect(
      reduceLiveAppNotifications(withApproval, {
        method: "serverRequest/resolved",
        params: { requestId: 4 },
      }),
    ).toEqual([]);
  });

  it("keeps the latest four actionable turn outcomes and can dismiss one", () => {
    let notifications: LiveAppNotification[] = [];
    for (let index = 1; index <= 5; index += 1) {
      notifications = reduceLiveAppNotifications(notifications, {
        method: "turn/completed",
        params: {
          threadId: "thread-1",
          turn: { id: `turn-${index}`, status: "failed" },
        },
      });
    }
    expect(notifications).toHaveLength(4);
    expect(notifications[0]?.id).toBe("live-turn:thread-1:turn-2:failed");
    expect(notifications.at(-1)?.heading).toBe("Turn failed");
    expect(
      reduceLiveAppNotifications(notifications, {
        kind: "dismiss",
        id: "live-turn:thread-1:turn-3:failed",
      }),
    ).toHaveLength(3);
    expect(
      reduceLiveAppNotifications([], {
        method: "turn/completed",
        params: {
          threadId: "thread-1",
          turn: { id: "turn-success", status: "completed" },
        },
      }),
    ).toEqual([]);
  });

  it("distinguishes interrupted and failed turns and resets on live close", () => {
    const interrupted = reduceLiveAppNotifications([], {
      method: "turn/completed",
      params: {
        threadId: "thread-1",
        turn: { id: "turn-stop", status: "interrupted" },
      },
    });
    const failed = reduceLiveAppNotifications(interrupted, {
      method: "turn/completed",
      params: {
        threadId: "thread-1",
        turn: { id: "turn-failed", status: "failed" },
      },
    });
    expect(failed.map(({ heading }) => heading)).toEqual([
      "Turn stopped",
      "Turn failed",
    ]);
    expect(
      reduceLiveAppNotifications(failed, { kind: "live-reset" }),
    ).toEqual([]);
  });

  it("shows retry recovery and compaction, then settles transient errors", () => {
    const reconnecting = reduceLiveAppNotifications([], {
      method: "error",
      params: {
        error: { message: "Network unavailable" },
        threadId: "thread-1",
        turnId: "turn-1",
        willRetry: true,
      },
    });
    expect(reconnecting).toMatchObject([
      {
        description: "Network unavailable",
        heading: "Reconnecting",
        id: "live-reconnecting:turn-1",
        tone: "info",
      },
    ]);
    const withFailure = reduceLiveAppNotifications(reconnecting, {
      method: "error",
      params: {
        error: { message: "The turn failed." },
        turnId: "turn-1",
        willRetry: false,
      },
    });
    const settled = reduceLiveAppNotifications(withFailure, {
      method: "turn/completed",
      params: {
        threadId: "thread-1",
        turn: { id: "turn-1", status: "failed" },
      },
    });
    expect(settled.map(({ heading }) => heading)).toEqual(["Turn failed"]);
    expect(
      reduceLiveAppNotifications(settled, {
        method: "thread/compacted",
        params: { threadId: "thread-1", turnId: "turn-2" },
      }),
    ).toMatchObject([
      { heading: "Turn failed" },
      { heading: "Context compacted", tone: "info" },
    ]);
  });

  it("surfaces only confirmed background-terminal stops", () => {
    const stopped = reduceLiveAppNotifications([], {
      command: "npm run dev",
      kind: "background-terminal-stopped",
      processId: "process-1",
    });
    expect(stopped).toEqual([
      {
        description: "npm run dev",
        heading: "Background task stopped",
        id: "live-background-terminal:process-1:stopped",
        tone: "info",
      },
    ]);
    expect(
      reduceLiveAppNotifications(stopped, {
        command: "npm run dev",
        kind: "background-terminal-stopped",
        processId: "process-1",
      }),
    ).toEqual(stopped);
  });
});
