import { describe, expect, it } from "vitest";
import { changeStats, reviewContent } from "../src/diff-lines";
import {
  initialProtocolState,
  reduceLiveProtocolNotification,
  reduceProtocolNotification,
  type ProtocolEventRecord,
} from "../src/protocol-state";

function addition(diff: string): ProtocolEventRecord {
  return {
    atMs: 0,
    method: "item/completed",
    params: {
      threadId: "live-thread",
      turnId: "live-turn",
      item: {
        type: "fileChange",
        id: "edit",
        status: "completed",
        changes: [{ kind: { type: "add" }, path: "sum.mjs", diff }],
      },
    },
  };
}

describe("live added-file content", () => {
  it("counts the real raw add event without mutating the protocol evidence", () => {
    const text = "export const add = (a, b) => a + b;\n";
    const event = addition(text);
    const original = JSON.stringify(event);
    const state = reduceLiveProtocolNotification(initialProtocolState, event);
    expect(JSON.stringify(event)).toBe(original);
    expect(changeStats(state.fileChanges[0]!.changes[0]!)).toEqual({
      additions: 1,
      deletions: 0,
      lines: [{ content: text.trimEnd(), kind: "addition", newLineNumber: 1 }],
    });
  });

  it("preserves diff-looking code, indentation, blank lines and line numbers", () => {
    const lines = ["@@ -0,0 +1 @@", "+literal", "-literal", "  indented", "", ""];
    const state = reduceLiveProtocolNotification(initialProtocolState, addition(lines.join("\r\n")));
    const stats = changeStats(state.fileChanges[0]!.changes[0]!);
    expect(stats.additions).toBe(5);
    expect(stats.lines.map(line => line.content)).toEqual(lines.slice(0, -1));
    expect(stats.lines.map(line => line.newLineNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles empty files and a final line without a newline", () => {
    for (const [diff, count] of [["", 0], ["\n", 1], ["last line", 1]] as const) {
      const state = reduceLiveProtocolNotification(initialProtocolState, addition(diff));
      expect(changeStats(state.fileChanges[0]!.changes[0]!).additions).toBe(count);
    }
  });

  it("does not misclassify literal file content as a binary patch", () => {
    const state = reduceLiveProtocolNotification(initialProtocolState, addition("Binary files a and b differ\n"));
    expect(reviewContent(state.fileChanges[0]!.changes[0]!).kind).toBe("diff");
  });

  it("retains historical unified-patch replay semantics", () => {
    const state = reduceProtocolNotification(initialProtocolState, addition("@@ -0,0 +1 @@\n+original\n"));
    expect(state.fileChanges[0]!.changes[0]!.diffFormat).toBeUndefined();
    expect(changeStats(state.fileChanges[0]!.changes[0]!)).toMatchObject({ additions: 1, deletions: 0 });
  });

  it("retains content ownership through patch updates and unrelated notifications", () => {
    let state = reduceLiveProtocolNotification(initialProtocolState, addition("first\n"));
    state = reduceLiveProtocolNotification(state, {
      method: "item/fileChange/patchUpdated",
      params: { itemId: "edit", changes: [{ path: "sum.mjs", kind: { type: "add" }, diff: "second\n\n" }] },
    });
    const changes = state.fileChanges;
    state = reduceLiveProtocolNotification(state, { method: "turn/started", params: { threadId: "live-thread", turn: { id: "next" } } });
    expect(state.fileChanges).toBe(changes);
    expect(changeStats(state.fileChanges[0]!.changes[0]!).additions).toBe(2);
  });
});
