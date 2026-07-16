// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileChange,
  FileDiff,
  fileDiffToText,
  type FileDiffLine,
} from "../src";

const lines: FileDiffLine[] = [
  { content: "@@ -1,2 +1,2 @@", kind: "hunk" },
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
  {
    content: "No newline at end of file",
    kind: "meta",
  },
];

afterEach(cleanup);

describe("FileChange", () => {
  it("uses the path-bearing applied summary while collapsed", () => {
    const html = renderToStaticMarkup(
      <FileChange
        additions={1}
        change="modified"
        deletions={1}
        path="src/status.ts"
      >
        <FileDiff lines={lines} />
      </FileChange>,
    );

    expect(html).toContain('data-kind="file-change"');
    expect(html).toContain('data-change="modified"');
    expect(html).toContain('data-file-status="applied"');
    expect(html).toContain("Edited");
    expect(html).toContain("src/status.ts");
    expect(html).toContain("+1");
    expect(html).toContain("−1");
    expect(html).not.toContain("Edited file");
  });

  it("moves the path and stats into the diff header while expanded", () => {
    const { container } = render(
      <FileChange
        additions={1}
        change="modified"
        defaultOpen
        deletions={1}
        diffText={fileDiffToText(lines)}
        path="src/status.ts"
      >
        <FileDiff lines={lines} />
      </FileChange>,
    );

    expect(container.querySelector("details")?.open).toBe(true);
    expect(
      container.querySelector(".codex-ui-activity__summary")?.textContent,
    ).toBe("Edited file");
    expect(
      container.querySelector(".codex-ui-file-change__shell-identity")
        ?.textContent,
    ).toBe("src/status.ts+1−1");
    expect(screen.getByRole("button", { name: "Copy diff" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "File diff" })).toBeTruthy();
  });

  it.each([
    ["added", "streaming", "Creating", "added"],
    ["added", "stopped", "Stopped creating", "added"],
    ["modified", "rejected", "Rejected", undefined],
    ["deleted", "streaming", "Deleting", "deleted"],
    ["renamed", "applied", "Renamed", undefined],
  ] as const)(
    "renders %s/%s state language and change decoration",
    (change, status, label, dot) => {
      const { container } = render(
        <FileChange change={change} path="src/state.ts" status={status} />,
      );

      expect(
        container.querySelector(".codex-ui-activity__summary")?.textContent,
      ).toContain(label);
      expect(
        container
          .querySelector(".codex-ui-file-change")
          ?.getAttribute("data-file-status"),
      ).toBe(status);
      const decoration = container.querySelector("[data-dot]");
      expect(decoration?.getAttribute("data-dot")).toBe(dot);
    },
  );

  it("keeps a controlled disclosure stable", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <FileChange
        change="modified"
        onOpenChange={onOpenChange}
        open={false}
        path="src/status.ts"
      />,
    );

    fireEvent.click(container.querySelector("summary")!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("delegates file-open and diff-copy actions", () => {
    const onCopyDiff = vi.fn();
    const onOpenFile = vi.fn();
    render(
      <FileChange
        change="modified"
        defaultOpen
        diffText="@@ diff"
        onCopyDiff={onCopyDiff}
        onOpenFile={onOpenFile}
        path="src/status.ts"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "src/status.ts" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy diff" }));

    expect(onOpenFile).toHaveBeenCalledWith("src/status.ts");
    expect(onCopyDiff).toHaveBeenCalledWith("@@ diff");
  });

  it("uses protocol-shaped empty states for deleted and renamed files", () => {
    const deleted = renderToStaticMarkup(
      <FileChange change="deleted" defaultOpen path="src/removed.ts" />,
    );
    const renamed = renderToStaticMarkup(
      <FileChange
        change="renamed"
        defaultOpen
        path="src/new-name.ts"
        previousPath="src/old-name.ts"
      />,
    );

    expect(deleted).toContain("Contents deleted");
    expect(renamed).toContain("File renamed without changes");
    expect(renamed).toContain("src/new-name.ts");
    expect(renamed).not.toContain("src/old-name.ts");
    expect(renamed).toContain("Renamed file");
  });

  it("can render a non-expandable host summary", () => {
    const html = renderToStaticMarkup(
      <FileChange
        change="modified"
        path="src/hidden.ts"
        showDiffDetails={false}
      />,
    );

    expect(html).toContain("Edited");
    expect(html).not.toContain("<details");
  });
});

describe("FileDiff", () => {
  it("serializes structured lines with unified-diff prefixes", () => {
    expect(fileDiffToText(lines)).toBe(
      "@@ -1,2 +1,2 @@\n-const status = 'old';\n+const status = 'ready';\n\\ No newline at end of file",
    );
  });

  it("exposes line kinds, labels, and line numbers", () => {
    const html = renderToStaticMarkup(<FileDiff lines={lines} />);

    expect(html).toContain('aria-label="File diff"');
    expect(html).toContain('data-line-kind="addition"');
    expect(html).toContain('data-line-kind="deletion"');
    expect(html).toContain('data-line-kind="hunk"');
    expect(html).toContain('data-line-kind="meta"');
    expect(html).toContain("Added line: const status = &#x27;ready&#x27;;");
  });

  it("supports renderer-supplied syntax tokens", () => {
    const tokenLines: FileDiffLine[] = [
      {
        content: "const answer = 42;",
        kind: "addition",
        newLineNumber: 1,
        tokens: <mark>const answer = 42;</mark>,
      },
    ];
    const tokenHtml = renderToStaticMarkup(<FileDiff lines={tokenLines} />);
    const renderedHtml = renderToStaticMarkup(
      <FileDiff
        lines={tokenLines}
        renderContent={(line) => <strong>{line.content}</strong>}
      />,
    );

    expect(tokenHtml).toContain("<mark>const answer = 42;</mark>");
    expect(renderedHtml).toContain("<strong>const answer = 42;</strong>");
    expect(renderedHtml).not.toContain("<mark>");
  });

  it("exposes short, fallback, and wrapped rendering modes", () => {
    const short = renderToStaticMarkup(
      <FileDiff lines={lines} size="short" wrapLines />,
    );
    const fallback = renderToStaticMarkup(
      <FileDiff lines={lines} size="fallback" />,
    );

    expect(short).toContain('data-size="short"');
    expect(short).toContain('data-wrap="true"');
    expect(fallback).toContain('data-size="fallback"');
  });

  it("renders a useful empty diff state", () => {
    const html = renderToStaticMarkup(<FileDiff lines={[]} />);

    expect(html).toContain("No diff lines");
    expect(html).toContain('role="list"');
    expect(html).toContain('role="listitem"');
  });
});
