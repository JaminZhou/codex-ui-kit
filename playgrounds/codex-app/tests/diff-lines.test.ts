import { describe, expect, it } from "vitest";
import { changeStats, reviewContent } from "../src/diff-lines";
import type { DemoFileUpdateChange } from "../src/protocol-state";

function change(diff: string): DemoFileUpdateChange {
  return {
    diff,
    kind: "modified",
    path: "demo.cpp",
  };
}

describe("diff lines", () => {
  it("keeps actual file headers as metadata", () => {
    const result = changeStats(
      change(
        [
          "--- a/demo.cpp",
          "+++ b/demo.cpp",
          "@@ -1 +1 @@",
          "-before",
          "+after",
        ].join("\n"),
      ),
    );

    expect(result.lines.map(({ kind }) => kind)).toEqual([
      "meta",
      "meta",
      "hunk",
      "deletion",
      "addition",
    ]);
  });

  it("counts code lines beginning with double plus or minus", () => {
    const result = changeStats(
      change(
        [
          "--- a/demo.cpp",
          "+++ b/demo.cpp",
          "@@ -10,2 +10,2 @@",
          "---index",
          "+++index",
          " unchanged",
        ].join("\n"),
      ),
    );

    expect(result).toMatchObject({
      additions: 1,
      deletions: 1,
    });
    expect(result.lines[3]).toMatchObject({
      content: "--index",
      kind: "deletion",
      oldLineNumber: 10,
    });
    expect(result.lines[4]).toMatchObject({
      content: "++index",
      kind: "addition",
      newLineNumber: 10,
    });
    expect(result.lines[5]).toMatchObject({
      newLineNumber: 11,
      oldLineNumber: 11,
    });
  });

  it("classifies binary patch text as an explicit non-text review", () => {
    expect(
      reviewContent(
        change("Binary files a/assets/logo.png and b/assets/logo.png differ"),
      ),
    ).toMatchObject({
      kind: "binary",
      title: "Binary file changed",
    });
  });

  it("classifies conflict markers as a host-derived conflict review", () => {
    expect(
      reviewContent(
        change(
          [
            "@@ -1 +1,5 @@",
            "+<<<<<<< HEAD",
            "+const source = 'main';",
            "+=======",
            "+const source = 'branch';",
            "+>>>>>>> feat/review",
          ].join("\n"),
        ),
      ),
    ).toMatchObject({
      kind: "conflict",
      title: "Merge conflict detected",
    });
  });

  it("does not treat a standalone separator line as a merge conflict", () => {
    expect(
      reviewContent(
        change(["@@ -1 +1 @@", "-=======", "+updated"].join("\n")),
      ).kind,
    ).toBe("diff");
  });

  it("does not report conflict markers that the patch removes", () => {
    expect(
      reviewContent(
        change(
          [
            "@@ -1,5 +1 @@",
            "-<<<<<<< HEAD",
            "-const source = 'main';",
            "-=======",
            "-const source = 'branch';",
            "->>>>>>> feat/review",
            "+const source = 'resolved';",
          ].join("\n"),
        ),
      ).kind,
    ).toBe("diff");
  });
});
