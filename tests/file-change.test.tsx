// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileChange,
  FileChangeGroup,
  FileDiff,
  FileRevertErrorDialog,
  FileReview,
  FileReviewWorkspace,
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

  it("accepts a host-owned leading indicator", () => {
    const html = renderToStaticMarkup(
      <FileChange
        change="modified"
        indicator={<span data-file-indicator>file</span>}
        path="src/status.ts"
        showDiffDetails={false}
      />,
    );

    expect(html).toContain("data-file-indicator");
    expect(html).toContain(">file</span>");
  });
});

describe("FileChangeGroup", () => {
  const changes = [
    {
      additions: 1,
      change: "added" as const,
      deletions: 0,
      path: ".research/probe/alpha.txt",
    },
    {
      additions: 1,
      change: "added" as const,
      deletions: 0,
      path: ".research/probe/beta.txt",
    },
  ];

  it("aggregates one protocol item into a single changed-files card", () => {
    const html = renderToStaticMarkup(
      <FileChangeGroup changes={changes} status="applied" />,
    );

    expect(html).toContain('data-kind="file-change-group"');
    expect(html).toContain('data-file-count="2"');
    expect(html).toContain("Edited 2 files");
    expect(html).toContain("Review changes");
    expect(html).toContain(".research/probe/alpha.txt");
    expect(html).toContain(".research/probe/beta.txt");
    expect(html.match(/role="listitem"/g)).toHaveLength(2);
  });

  it("exposes each file as an independent host-owned action", () => {
    const onOpenFile = vi.fn();
    render(
      <FileChangeGroup changes={changes} onOpenFile={onOpenFile} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open .research/probe/beta.txt",
      }),
    );

    expect(onOpenFile).toHaveBeenCalledWith(changes[1], 1);
  });

  it("renders streaming and rejected group language", () => {
    const streaming = renderToStaticMarkup(
      <FileChangeGroup changes={changes} status="streaming" />,
    );
    const rejected = renderToStaticMarkup(
      <FileChangeGroup changes={changes} status="rejected" />,
    );

    expect(streaming).toContain("Editing 2 files");
    expect(streaming).not.toContain("Review changes");
    expect(rejected).toContain("Rejected 2 files");
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
    expect(html).toContain('tabindex="0"');
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

  it("pairs deleted and added content into distinct split panes", () => {
    const { container } = render(<FileDiff layout="split" lines={lines} />);
    const diff = screen.getByRole("list", { name: "File diff" });
    const changedRow = screen.getByRole("listitem", {
      name: "Deleted line: const status = 'old';; Added line: const status = 'ready';",
    });

    expect(diff.getAttribute("data-layout")).toBe("split");
    expect(
      changedRow.querySelector('[data-side="old"] code')?.textContent,
    ).toBe("const status = 'old';");
    expect(
      changedRow.querySelector('[data-side="new"] code')?.textContent,
    ).toBe("const status = 'ready';");
    expect(
      container.querySelector(
        '.codex-ui-file-diff__split-row[data-line-kind="hunk"] .codex-ui-file-diff__split-spanning',
      ),
    ).toBeTruthy();
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

  it("updates edge fades without replacing a caller scroll handler", () => {
    const onScroll = vi.fn();
    const { container } = render(<FileDiff lines={lines} onScroll={onScroll} />);
    const diff = container.querySelector(".codex-ui-file-diff") as HTMLDivElement;
    Object.defineProperties(diff, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 240 },
    });
    diff.scrollTop = 40;

    fireEvent.scroll(diff);

    expect(onScroll).toHaveBeenCalledOnce();
    expect(diff.hasAttribute("data-fade-top")).toBe(true);
    expect(diff.hasAttribute("data-fade-bottom")).toBe(true);
  });

  it("allows a caller to remove the default keyboard scroll target", () => {
    const html = renderToStaticMarkup(<FileDiff lines={lines} tabIndex={-1} />);

    expect(html).toContain('tabindex="-1"');
  });

  it("renders a useful empty diff state", () => {
    const html = renderToStaticMarkup(<FileDiff lines={[]} />);

    expect(html).toContain("No diff lines");
    expect(html).toContain('role="list"');
    expect(html).toContain('role="listitem"');
  });
});

describe("FileReview", () => {
  const files = [
    {
      additions: 1,
      change: "added" as const,
      deletions: 0,
      lines: [
        {
          content: "alpha probe",
          kind: "addition" as const,
          newLineNumber: 1,
        },
      ],
      path: ".research/probe/alpha.txt",
    },
    {
      additions: 1,
      change: "added" as const,
      deletions: 0,
      lines: [
        {
          content: "beta probe",
          kind: "addition" as const,
          newLineNumber: 1,
        },
      ],
      path: ".research/probe/beta.txt",
    },
  ];

  it("stacks every file and gives each diff a distinct accessible name", () => {
    render(<FileReview files={files} selectedPath={files[1].path} />);

    expect(screen.getByRole("list", { name: "File review" })).toBeTruthy();
    expect(
      screen.getByRole("list", {
        name: "Review diff for .research/probe/alpha.txt",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("list", {
        name: "Review diff for .research/probe/beta.txt",
      }),
    ).toBeTruthy();
    const selectedFile = screen.getByRole("listitem", {
      name: "Review file .research/probe/beta.txt",
    });
    expect(selectedFile.hasAttribute("data-selected")).toBe(true);
    expect(selectedFile.getAttribute("aria-current")).toBe("true");
  });

  it("renders explicit binary and conflict review content", () => {
    render(
      <FileReview
        files={[
          {
            change: "modified",
            content: { kind: "binary" },
            path: "assets/screenshot.png",
          },
          {
            change: "modified",
            content: {
              description: "Choose the intended branch content.",
              kind: "conflict",
            },
            path: "src/conflicted.ts",
          },
        ]}
      />,
    );

    expect(
      screen
        .getByRole("group", {
          name: "Review binary change for assets/screenshot.png",
        })
        .getAttribute("data-kind"),
    ).toBe("binary");
    expect(
      screen.getByRole("group", {
        name: "Review conflict change for src/conflicted.ts",
      }).textContent,
    ).toContain("Choose the intended branch content.");
    expect(screen.queryByRole("list", { name: /Review diff for/ })).toBeNull();
  });

  it("uses the current-build empty Review label for text changes", () => {
    render(
      <FileReview
        files={[
          {
            change: "renamed",
            lines: [],
            path: "src/new-name.ts",
            previousPath: "src/old-name.ts",
          },
        ]}
      />,
    );

    expect(screen.getByText("No content")).toBeTruthy();
  });

  it("reports review-header selection without hiding sibling files", () => {
    const onSelectFile = vi.fn();
    render(<FileReview files={files} onSelectFile={onSelectFile} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Select review for .research/probe/beta.txt",
      }),
    );

    expect(onSelectFile).toHaveBeenCalledWith(files[1], 1);
    expect(
      screen.getByRole("list", {
        name: "Review diff for .research/probe/alpha.txt",
      }),
    ).toBeTruthy();
  });

  it("scrolls a newly selected file into the visible review region", () => {
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { rerender } = render(
        <FileReview
          files={files}
          selectedPath={files[0].path}
          selectionKey={0}
        />,
      );
      scrollIntoView.mockClear();

      rerender(
        <FileReview
          files={files}
          selectedPath={files[1].path}
          selectionKey={1}
        />,
      );

      const selectedFile = screen.getByRole("listitem", {
        name: "Review file .research/probe/beta.txt",
      });
      expect(scrollIntoView).toHaveBeenCalledOnce();
      expect(scrollIntoView.mock.instances[0]).toBe(selectedFile);
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });

      scrollIntoView.mockClear();
      rerender(
        <FileReview
          files={files}
          selectedPath={files[1].path}
          selectionKey={2}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledOnce();
      expect(scrollIntoView.mock.instances[0]).toBe(selectedFile);

      scrollIntoView.mockClear();
      rerender(
        <FileReview
          files={[files[1], files[0]]}
          selectedPath={files[1].path}
          selectionKey={2}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledOnce();
      expect(scrollIntoView.mock.instances[0]).toBe(selectedFile);

      scrollIntoView.mockClear();
      rerender(
        <FileReview
          files={[files[1], files[0]]}
          selectedPath={files[1].path}
          selectionKey={2}
        />,
      );

      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          originalScrollIntoView,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("memoizes the selected-file layout signature across unrelated renders", () => {
    const stringify = vi.spyOn(JSON, "stringify");

    try {
      const { rerender } = render(
        <FileReview
          className="before"
          files={files}
          selectedPath={files[1].path}
        />,
      );
      const initialCalls = stringify.mock.calls.length;
      expect(initialCalls).toBeGreaterThan(0);

      rerender(
        <FileReview
          className="after"
          files={files}
          selectedPath={files[1].path}
        />,
      );

      expect(stringify).toHaveBeenCalledTimes(initialCalls);
    } finally {
      stringify.mockRestore();
    }
  });
});

describe("FileReviewWorkspace", () => {
  const files = [
    {
      additions: 1,
      change: "added" as const,
      deletions: 0,
      lines: [{ content: "added", kind: "addition" as const }],
      path: "probe/added.txt",
    },
    {
      additions: 1,
      change: "modified" as const,
      deletions: 2,
      lines: [
        { content: "old", kind: "deletion" as const },
        { content: "new", kind: "addition" as const },
      ],
      path: "probe/alpha.txt",
    },
    {
      additions: 0,
      change: "deleted" as const,
      deletions: 2,
      lines: [{ content: "obsolete", kind: "deletion" as const }],
      path: "probe/obsolete.txt",
    },
  ];

  it("covers the current Review toolbar, scope, filter, and layout states", () => {
    const onScopeChange = vi.fn();
    const { container } = render(
      <FileReviewWorkspace files={files} onScopeChange={onScopeChange} />,
    );

    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.getByText("−4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Last Turn" }));
    expect(screen.getByRole("menu", { name: "Review scope" })).toBeTruthy();
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Uncommitted" }));
    expect(onScopeChange).toHaveBeenCalledWith("Uncommitted");

    fireEvent.change(screen.getByPlaceholderText("Filter files…"), {
      target: { value: "alpha" },
    });
    expect(screen.getAllByRole("treeitem")).toHaveLength(1);
    expect(screen.getByRole("treeitem").textContent).toContain("alpha.txt");

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse all diffs" }),
    );
    expect(screen.queryByRole("list", { name: /Review diff for/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand all diffs" }));
    expect(
      screen.getByRole("list", { name: "Review diff for probe/alpha.txt" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch to split diff" }));
    expect(
      container.querySelector(".codex-ui-file-review-workspace")?.getAttribute(
        "data-layout",
      ),
    ).toBe("split");
    expect(
      screen
        .getByRole("list", { name: "Review diff for probe/alpha.txt" })
        .getAttribute("data-layout"),
    ).toBe("split");
    expect(
      screen.getByRole("listitem", {
        name: "Deleted line: old; Added line: new",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide files" }));
    expect(screen.queryByRole("complementary", { name: "Changed files" })).toBeNull();
  });

  it("exposes all changed files through the jump listbox", async () => {
    render(<FileReviewWorkspace files={files} />);

    const jump = screen.getByRole("button", { name: "Jump to file" });
    fireEvent.click(jump);

    expect(screen.getByRole("listbox", { name: "Changed files" })).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute("aria-selected")).toBe("true");

    options[2].focus();
    fireEvent.keyDown(options[2], { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Changed files" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(jump));
  });

  it("tracks changed file collections without selector escaping", () => {
    const { rerender } = render(<FileReviewWorkspace files={files} />);
    fireEvent.click(screen.getByRole("treeitem", { name: /alpha\.txt/ }));

    const nextFiles = [
      {
        additions: 1,
        change: "added" as const,
        deletions: 0,
        lines: [{ content: "new", kind: "addition" as const }],
        path: 'probe/[new] "quoted".txt',
      },
    ];
    rerender(<FileReviewWorkspace files={nextFiles} />);

    expect(
      screen
        .getByRole("treeitem", { name: /quoted/ })
      .getAttribute("data-selected"),
    ).toBe("true");
  });

  it("prunes collapsed paths when the file collection is replaced", () => {
    const { rerender } = render(<FileReviewWorkspace files={files} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse all diffs" }),
    );
    expect(screen.queryByRole("list", { name: /Review diff for/ })).toBeNull();

    const replacementFiles = files.map((file, index) => ({
      ...file,
      path: `replacement/file-${index}.txt`,
    }));
    rerender(<FileReviewWorkspace files={replacementFiles} />);

    expect(
      screen.getByRole("button", { name: "Collapse all diffs" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("list", { name: /Review diff for/ }),
    ).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse all diffs" }),
    );
    expect(screen.queryByRole("list", { name: /Review diff for/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Expand all diffs" }),
    ).toBeTruthy();
  });
});

describe("FileRevertErrorDialog", () => {
  it("renders the observed Git apply failure and closes from its full-width action", () => {
    const onOpenChange = vi.fn();
    render(
      <FileRevertErrorDialog onOpenChange={onOpenChange} open />,
    );

    expect(
      screen.getByRole("dialog", { name: "Failed to revert changes" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Git apply error: error: patch with only garbage at line 4",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
