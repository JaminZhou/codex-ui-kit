import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileChange, FileDiff, type FileDiffLine } from "../src";

const lines: FileDiffLine[] = [
  {
    content: "@@ -1,2 +1,2 @@",
    kind: "hunk",
  },
  {
    content: "const status = 'old';",
    kind: "deletion",
    oldLineNumber: 1,
  },
  {
    content: "const status = 'ready';",
    kind: "addition",
    newLineNumber: 1,
  },
];

describe("FileChange", () => {
  it("renders path, change type, stats, and structured diff lines", () => {
    const html = renderToStaticMarkup(
      <FileChange
        additions={1}
        change="modified"
        defaultOpen
        deletions={1}
        path="src/status.ts"
      >
        <FileDiff lines={lines} />
      </FileChange>,
    );

    expect(html).toContain('data-kind="file-change"');
    expect(html).toContain('data-change="modified"');
    expect(html).toContain("src/status.ts");
    expect(html).toContain("Modified");
    expect(html).toContain("+1");
    expect(html).toContain("−1");
    expect(html).toContain('aria-label="File diff"');
    expect(html).toContain('data-line-kind="addition"');
    expect(html).toContain('data-line-kind="deletion"');
  });

  it("renders renamed paths without requiring diff detail", () => {
    const html = renderToStaticMarkup(
      <FileChange
        change="renamed"
        path="src/new-name.ts"
        previousPath="src/old-name.ts"
      />,
    );

    expect(html).toContain("src/old-name.ts");
    expect(html).toContain("src/new-name.ts");
    expect(html).toContain("Renamed");
    expect(html).not.toContain("<details");
  });

  it("renders a useful empty diff state", () => {
    const html = renderToStaticMarkup(<FileDiff lines={[]} />);

    expect(html).toContain("No diff lines");
    expect(html).toContain('role="list"');
  });
});
