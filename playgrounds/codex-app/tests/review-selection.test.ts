import { describe, expect, it } from "vitest";
import type { DemoFileChange } from "../src/protocol-state";
import { resolveReviewSelection } from "../src/review-selection";

const fileChanges: DemoFileChange[] = [
  {
    changes: [
      {
        diff: "+first",
        kind: "modified",
        path: "FIRST.md",
      },
      {
        diff: "+second",
        kind: "modified",
        path: "SECOND.md",
      },
    ],
    id: "files-one",
    status: "applied",
    turnId: "turn-one",
  },
  {
    changes: [
      {
        diff: "+latest",
        kind: "added",
        path: "LATEST.md",
      },
    ],
    id: "files-two",
    status: "applied",
    turnId: "turn-two",
  },
];

describe("Review selection", () => {
  it("defaults to the newest file-change item as a complete group", () => {
    expect(resolveReviewSelection(fileChanges, null)).toMatchObject({
      fileChange: {
        changes: [{ path: "LATEST.md" }],
      },
      fileChangeId: "files-two",
    });
  });

  it("keeps an exact file focus without dropping sibling diffs", () => {
    expect(
      resolveReviewSelection(fileChanges, {
        fileChangeId: "files-one",
        path: "SECOND.md",
      }),
    ).toMatchObject({
      fileChange: {
        changes: [{ path: "FIRST.md" }, { path: "SECOND.md" }],
      },
      fileChangeId: "files-one",
      selectedPath: "SECOND.md",
    });
  });

  it("ignores a stale path while preserving the selected group", () => {
    expect(
      resolveReviewSelection(fileChanges, {
        fileChangeId: "files-one",
        path: "MISSING.md",
      }),
    ).toEqual({
      fileChange: fileChanges[0],
      fileChangeId: "files-one",
    });
  });
});
