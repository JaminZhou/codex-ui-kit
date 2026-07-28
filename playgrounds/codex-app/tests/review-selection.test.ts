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
  it("defaults to the newest file-change item's first file", () => {
    expect(resolveReviewSelection(fileChanges, null)).toMatchObject({
      change: { path: "LATEST.md" },
      fileChangeId: "files-two",
    });
  });

  it("keeps the exact file selected from an older multi-file item", () => {
    expect(
      resolveReviewSelection(fileChanges, {
        fileChangeId: "files-one",
        path: "SECOND.md",
      }),
    ).toMatchObject({
      change: { path: "SECOND.md" },
      fileChangeId: "files-one",
    });
  });
});
