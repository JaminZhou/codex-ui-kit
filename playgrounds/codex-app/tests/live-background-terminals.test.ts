import { describe, expect, it } from "vitest";
import {
  normalizeLiveBackgroundTerminal,
  normalizeLiveBackgroundTerminals,
} from "../electron/live-background-terminals";

describe("live background terminal normalization", () => {
  it("keeps the App Server process identity and converts bigint metrics", () => {
    expect(
      normalizeLiveBackgroundTerminal({
        command: "sleep 30",
        cpuPercent: 1.5,
        cwd: "/tmp/project",
        itemId: "item-command",
        osPid: 42,
        processId: "process-command",
        rssKb: 2048n,
      }),
    ).toEqual({
      command: "sleep 30",
      cpuPercent: 1.5,
      cwd: "/tmp/project",
      itemId: "item-command",
      osPid: 42,
      processId: "process-command",
      rssKb: 2048,
    });
  });

  it("fails closed for malformed rows and non-finite metrics", () => {
    expect(
      normalizeLiveBackgroundTerminal({
        command: "sleep 30",
        cpuPercent: Number.NaN,
        cwd: "/tmp/project",
        itemId: "item-command",
        osPid: Number.POSITIVE_INFINITY,
        processId: "process-command",
        rssKb: "2048",
      }),
    ).toMatchObject({
      cpuPercent: null,
      osPid: null,
      rssKb: null,
    });
    expect(normalizeLiveBackgroundTerminal({ itemId: "missing-process" })).toBe(
      null,
    );
  });

  it("drops malformed list entries without changing valid order", () => {
    expect(
      normalizeLiveBackgroundTerminals([
        { itemId: "first", processId: "p1", command: "one", cwd: "/tmp/one" },
        null,
        { itemId: "missing-process" },
        { itemId: "second", processId: "p2", command: "two", cwd: "/tmp/two" },
      ]),
    ).toEqual([
      {
        command: "one",
        cpuPercent: null,
        cwd: "/tmp/one",
        itemId: "first",
        osPid: null,
        processId: "p1",
        rssKb: null,
      },
      {
        command: "two",
        cpuPercent: null,
        cwd: "/tmp/two",
        itemId: "second",
        osPid: null,
        processId: "p2",
        rssKb: null,
      },
    ]);
  });
});
