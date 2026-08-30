// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentMarkdown,
  CodeBlock,
  stabilizeStreamingMarkdown,
  type CodeHighlighter,
  type MarkdownTableCopyPayload,
} from "../src";

const markdownFixture = `# Result

Use **semantic markup** with \`inline code\` and [a link](https://example.com).

> Keep the implementation independent.

- [x] Parsed GFM
- [ ] Verified states

| Surface | State |
| --- | ---: |
| Code | 3 |

![Preview](https://example.com/preview.png)

\`\`\`ts
const ready = true;
\`\`\``;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AgentMarkdown", () => {
  it("renders the observed semantic and GFM surface", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown linkTarget="_blank">{markdownFixture}</AgentMarkdown>,
    );

    expect(html).toContain('class="codex-ui-markdown"');
    expect(html).toContain("<h1>Result</h1>");
    expect(html).toContain("<strong>semantic markup</strong>");
    expect(html).toContain('class="codex-ui-inline-code"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain("<blockquote>");
    expect(html).toContain('class="contains-task-list"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Completed task"');
    expect(html).toContain('aria-label="Incomplete task"');
    expect(html).toContain('class="codex-ui-markdown__table-scroll"');
    expect(html).toContain('data-markdown-table=""');
    expect(html).toContain('aria-label="Copy table"');
    expect(html).not.toContain('aria-label="Expand table"');
    expect(html).toContain('alt="Preview"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-markdown-copy="code-block"');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('<pre><figure class="codex-ui-code-block"');
    expect(html).toContain('class="codex-ui-code-block__body" dir="ltr" tabindex="0"');
    expect(html).toContain("const ready = true;");
    expect(html).not.toContain("node=");
  });

  it("renders current block math while preserving single-dollar and footnote source text", async () => {
    const { container } = render(
      <AgentMarkdown>{`Inline math: $E = mc^2$.

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$

Footnote reference.[^1]

[^1]: A compact source note.`}</AgentMarkdown>,
    );
    await waitFor(() =>
      expect(container.querySelector(".katex-display")).toBeTruthy(),
    );
    const html = container.innerHTML;

    expect(html).toContain("Inline math: $E = mc^2$.");
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('encoding="application/x-tex"');
    expect(html).toContain("Footnote reference.[^1]");
    expect(html).toContain("[^1]: A compact source note.");
    expect(html).not.toContain("data-footnotes");
  });

  it("exposes compact density and host code-block presentation slots", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown
        codeBlockCopyAriaLabel="Copy"
        codeBlockCopyLabel={<svg data-current-copy-icon="true" />}
        codeBlockLanguageIcon={() => <svg data-current-language-icon="true" />}
        codeBlockLanguageLabels={{ ts: "TypeScript" }}
        codeBlockWrapIcon={<svg data-current-wrap-icon="true" />}
        codeBlockWrapToggleable
        density="compact"
      >
        {"```ts\nconst ready = true;\n```"}
      </AgentMarkdown>,
    );

    expect(html).toContain('data-density="compact"');
    expect(html).toContain('data-current-language-icon="true"');
    expect(html).toContain(">TypeScript</span>");
    expect(html).toContain('data-current-wrap-icon="true"');
    expect(html).toContain('aria-label="Copy"');
    expect(html).toContain('data-current-copy-icon="true"');
  });

  it("renders controlled Markdown image loading and unavailable fallbacks", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown
        allowWideMedia
        imageStatus={(source) =>
          source.includes("loading") ? "loading" : "unavailable"
        }
      >
        {`![Loading preview](https://example.com/loading.png)
![Unavailable preview](https://example.com/missing.png)`}
      </AgentMarkdown>,
    );

    expect(html).toContain('data-markdown-image-grid="true"');
    expect(html).toContain("codex-ui-markdown__media-grid-paragraph");
    expect(html).toContain('data-markdown-image-state="loading"');
    expect(html).toContain('aria-label="Loading preview"');
    expect(html).toContain('data-markdown-image-state="unavailable"');
    expect(html).toContain('aria-label="Unavailable preview"');
    expect(html).toContain('href="https://example.com/missing.png"');
  });

  it("opens an immersive preview from a rendered Markdown image", async () => {
    render(
      <AgentMarkdown>
        {"![Preview](https://example.com/preview.png)"}
      </AgentMarkdown>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByRole("dialog", { name: "Preview" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close image preview" })).toBeTruthy();
  });

  it("offers a retry boundary when a host Markdown component throws", async () => {
    const onRetryRender = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const BrokenParagraph = () => {
      throw new Error("synthetic Markdown render failure");
    };

    render(
      <AgentMarkdown
        components={{ p: BrokenParagraph }}
        onRetryRender={onRetryRender}
      >
        Broken paragraph
      </AgentMarkdown>,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Markdown couldn't render",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onRetryRender).toHaveBeenCalledOnce());
  });

  it("stabilizes incomplete streaming fences and links", () => {
    expect(stabilizeStreamingMarkdown("```ts\nconst value = 1;")).toBe(
      "```ts\nconst value = 1;\n```",
    );
    expect(stabilizeStreamingMarkdown("See [docs](https://example.com")).toBe(
      "See [docs](https://example.com)",
    );
    expect(stabilizeStreamingMarkdown("[]([)](")).toBe("[]([)]()");
    expect(stabilizeStreamingMarkdown("[one](done) [two](done)")).toBe(
      "[one](done) [two](done)",
    );
    expect(stabilizeStreamingMarkdown("````md\n```\ncode")).toBe(
      "````md\n```\ncode\n````",
    );
    expect(stabilizeStreamingMarkdown("~~~ts\nconst value = 1;")).toBe(
      "~~~ts\nconst value = 1;\n~~~",
    );
    expect(stabilizeStreamingMarkdown("````md\ncode\n`````")).toBe(
      "````md\ncode\n`````",
    );

    const manyOpeningBrackets = "[".repeat(100_000);
    expect(stabilizeStreamingMarkdown(manyOpeningBrackets)).toBe(
      manyOpeningBrackets,
    );

    const manyIncompleteLinks = "[](".repeat(25_000);
    expect(stabilizeStreamingMarkdown(manyIncompleteLinks)).toBe(
      `${manyIncompleteLinks})`,
    );

    const html = renderToStaticMarkup(
      <AgentMarkdown streaming>{"```ts\nconst value = 1;"}</AgentMarkdown>,
    );
    expect(html).toContain('data-streaming="true"');
    expect(html).toContain('data-language="ts"');

    const emptyFenceHtml = renderToStaticMarkup(
      <AgentMarkdown streaming>{"```ts\n"}</AgentMarkdown>,
    );
    expect(emptyFenceHtml).toContain('data-language="ts"');
    expect(emptyFenceHtml).toContain('data-markdown-copy-text=""');
    expect(emptyFenceHtml).not.toContain("undefined");
  });

  it("supports protocol-neutral component overrides", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown
        components={{
          a: ({ children, ...props }) => (
            <a data-host-link="true" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {"[Open](https://example.com)"}
      </AgentMarkdown>,
    );

    expect(html).toContain('data-host-link="true"');
  });

  it("preserves pre semantics when a host overrides only fenced code", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown
        components={{
          code: ({ children, node: _node, ...props }) => (
            <code data-host-code="true" {...props}>
              {children}
            </code>
          ),
        }}
      >
        {"```ts\nconst highlighted = true;\n```"}
      </AgentMarkdown>,
    );

    expect(html).toContain('<pre><code data-host-code="true"');
    expect(html).toContain("const highlighted = true;");
  });

  it("preserves copy feedback when an inline host callback updates its parent", async () => {
    function CopyHarness() {
      const [status, setStatus] = useState("ready");

      return (
        <>
          <output>{status}</output>
          <AgentMarkdown
            onCopyCode={(code) => setStatus(`copied ${code.length}`)}
          >
            {"```ts\nconst ready = true;\n```"}
          </AgentMarkdown>
        </>
      );
    }

    render(<CopyHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    await waitFor(() => expect(screen.getByText("copied 19")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Copied" }).querySelector("svg"),
    ).toBeTruthy();
  });

  it("copies the exact source and rendered HTML for a Markdown table", async () => {
    const source = `Before.

| Alpha | Beta |
| :--- | ---: |
| one | two |

After.`;
    const onCopyTable = vi.fn<(payload: MarkdownTableCopyPayload) => void>();
    render(<AgentMarkdown onCopyTable={onCopyTable}>{source}</AgentMarkdown>);

    fireEvent.click(screen.getByRole("button", { name: "Copy table" }));

    await waitFor(() => expect(onCopyTable).toHaveBeenCalledOnce());
    expect(onCopyTable.mock.calls[0][0].markdown).toBe(
      "| Alpha | Beta |\n| :--- | ---: |\n| one | two |",
    );
    expect(onCopyTable.mock.calls[0][0].html).toContain("<table>");
    expect(onCopyTable.mock.calls[0][0].html).toContain(">Alpha</th>");
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it.each([
    {
      expected:
        "| Alpha | Beta |\n| :--- | ---: |\n| one | two |",
      name: "blockquote",
      source:
        "> Context\n>\n> | Alpha | Beta |\n>| :--- | ---: |\n> | one | two |",
    },
    {
      expected:
        "| Alpha | Beta |\n| :--- | ---: |\n| one | two |",
      name: "list continuation",
      source:
        "- Context\n\n  | Alpha | Beta |\n  | :--- | ---: |\n  | one | two |",
    },
    {
      expected: "| Alpha |\n| --- |\n| one |",
      name: "one-column blockquote",
      source: "> | Alpha |\n> | --- |\n> | one |",
    },
  ])(
    "copies a nested $name table as standalone Markdown",
    async ({ expected, source }) => {
      const onCopyTable = vi.fn<(payload: MarkdownTableCopyPayload) => void>();
      render(<AgentMarkdown onCopyTable={onCopyTable}>{source}</AgentMarkdown>);

      fireEvent.click(screen.getByRole("button", { name: "Copy table" }));

      await waitFor(() => expect(onCopyTable).toHaveBeenCalledOnce());
      expect(onCopyTable.mock.calls[0][0].markdown).toBe(expected);
    },
  );

  it("opens a wide table preview and restores the expand trigger", async () => {
    render(
      <AgentMarkdown allowWideTables>
        {"| Alpha | Beta |\n| --- | --- |\n| one | two |"}
      </AgentMarkdown>,
    );
    const expand = screen.getByRole("button", { name: "Expand table" });

    fireEvent.click(expand);

    const dialog = await screen.findByRole("dialog", {
      name: "Table preview",
    });
    expect(dialog).toBeTruthy();
    expect(screen.getAllByRole("table")).toHaveLength(2);
    const previewScroller = dialog.querySelector(
      ".codex-ui-markdown-table-preview__surface",
    ) as HTMLElement;
    expect(previewScroller?.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(previewScroller, { key: "ArrowRight" });
    expect(previewScroller.scrollLeft).toBe(40);
    fireEvent.keyDown(previewScroller, { key: "ArrowLeft" });
    expect(previewScroller.scrollLeft).toBe(0);
    expect(
      screen
        .getByRole("button", { name: "Close table preview" })
        .querySelector('svg[viewBox="0 0 21 21"]'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        "Close table preview",
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close table preview" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(expand);
  });

  it("preserves wide-table state across streaming deltas", async () => {
    const table = "| Alpha | Beta |\n| --- | --- |\n| one | two |";
    const initial = `${table}\n\n\`\`\`ts\nconst stable = true;\n\`\`\``;
    const onCopyCode = vi.fn();
    const onCopyTable = vi.fn();
    const { container, rerender } = render(
      <AgentMarkdown
        allowWideTables
        onCopyCode={onCopyCode}
        onCopyTable={onCopyTable}
        streaming
      >
        {initial}
      </AgentMarkdown>,
    );
    const scroller = container.querySelector(
      ".codex-ui-markdown__table-scroll",
    ) as HTMLElement;
    const codeBlock = container.querySelector(".codex-ui-code-block");
    const expand = screen.getByRole("button", { name: "Expand table" });
    const copy = screen.getByRole("button", { name: "Copy table" });
    const copyCode = screen.getByRole("button", { name: "Copy code" });
    scroller.scrollLeft = 120;
    fireEvent.click(copy);
    await waitFor(() => expect(copy.getAttribute("aria-label")).toBe("Copied"));
    fireEvent.click(copyCode);
    await waitFor(() =>
      expect(copyCode.getAttribute("aria-label")).toBe("Copied"),
    );
    fireEvent.click(expand);
    await screen.findByRole("dialog", { name: "Table preview" });

    rerender(
      <AgentMarkdown
        allowWideTables
        onCopyCode={onCopyCode}
        onCopyTable={onCopyTable}
        streaming
      >
        {`${initial}\n\nA later streaming delta.`}
      </AgentMarkdown>,
    );

    expect(
      container.querySelector(".codex-ui-markdown__table-scroll"),
    ).toBe(scroller);
    expect(container.querySelector(".codex-ui-code-block")).toBe(codeBlock);
    expect(scroller.scrollLeft).toBe(120);
    expect(copy.getAttribute("aria-label")).toBe("Copied");
    expect(copyCode.getAttribute("aria-label")).toBe("Copied");
    expect(expand.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Table preview" })).toBeTruthy();
  });
});

describe("CodeBlock", () => {
  it("preserves custom visible copy labels", () => {
    const html = renderToStaticMarkup(
      <CodeBlock copiedLabel="Copied source" copyLabel="Copy source">
        const ready = true;
      </CodeBlock>,
    );

    expect(html).toContain(">Copy source</button>");
  });

  it("does not opt a custom copy SVG into built-in glyph styling", () => {
    const html = renderToStaticMarkup(
      <CodeBlock
        copyLabel={
          <svg data-custom-copy-icon="true" fill="currentColor" />
        }
      >
        const ready = true;
      </CodeBlock>,
    );

    expect(html).toContain('data-custom-copy-icon="true"');
    expect(html).not.toContain("codex-ui-code-block__copy-icon");
  });

  it("defers highlighting until code is near the viewport", async () => {
    let intersect: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          intersect = callback;
          expect(options?.rootMargin).toBe("600px 0px");
        }

        disconnect = disconnect;
        observe = observe;
        root = null;
        rootMargin = "600px 0px";
        thresholds = [0];
        takeRecords = () => [];
        unobserve = vi.fn();
      },
    );
    const highlighter = vi.fn<CodeHighlighter>((code) => ({
      code,
      html: code,
      language: "typescript",
    }));

    const { container } = render(
      <CodeBlock codeHighlighter={highlighter} language="ts">
        const ready = true;
      </CodeBlock>,
    );

    expect(observe).toHaveBeenCalledWith(container.querySelector("figure"));
    expect(highlighter).not.toHaveBeenCalled();

    intersect?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    await waitFor(() => expect(highlighter).toHaveBeenCalledOnce());
    expect(disconnect).toHaveBeenCalled();
  });

  it("lazy highlights registered languages without turning code into markup", async () => {
    const source = '<button onclick="alert(1)">run</button>';
    const { container } = render(
      <CodeBlock deferHighlightUntilVisible={false} language="html">
        {source}
      </CodeBlock>,
    );
    const code = container.querySelector("code");

    await waitFor(
      () => expect(code?.getAttribute("data-highlighted")).toBe("true"),
      { timeout: 10_000 },
    );

    expect(code?.classList.contains("hljs")).toBe(true);
    expect(code?.querySelector("button")).toBeNull();
    expect(code?.querySelector(".hljs-tag")).toBeTruthy();
    expect(code?.textContent).toBe(source);
  });

  it("keeps a highlighted prefix while streaming content catches up", async () => {
    const pendingHighlight = new Promise<never>(() => undefined);
    const highlighter = vi.fn<CodeHighlighter>((code) => {
      if (code === "const ready") {
        return {
          code,
          html: '<span class="hljs-keyword">const</span> ready',
          language: "typescript",
        };
      }

      return pendingHighlight;
    });
    const { container, rerender } = render(
      <CodeBlock
        codeHighlighter={highlighter}
        deferHighlightUntilVisible={false}
        language="ts"
      >
        const ready
      </CodeBlock>,
    );

    await waitFor(() =>
      expect(
        container.querySelector("code")?.getAttribute("data-highlighted"),
      ).toBe("true"),
    );

    rerender(
      <CodeBlock
        codeHighlighter={highlighter}
        deferHighlightUntilVisible={false}
        language="ts"
      >
        const ready = true
      </CodeBlock>,
    );

    const code = container.querySelector("code");
    expect(code?.querySelector(".hljs-keyword")?.textContent).toBe("const");
    expect(code?.textContent).toBe("const ready = true");
  });

  it("can disable the default highlighter", async () => {
    const { container } = render(
      <CodeBlock
        codeHighlighter={false}
        deferHighlightUntilVisible={false}
        language="ts"
      >
        const ready = true;
      </CodeBlock>,
    );

    await Promise.resolve();
    expect(container.querySelector("code")?.textContent).toBe(
      "const ready = true;",
    );
    expect(
      container.querySelector("code")?.hasAttribute("data-highlighted"),
    ).toBe(false);
  });

  it("falls back to plaintext when a custom highlighter throws", async () => {
    const highlighter = vi.fn<CodeHighlighter>(() => {
      throw new Error("unsupported");
    });
    const { container } = render(
      <CodeBlock
        codeHighlighter={highlighter}
        deferHighlightUntilVisible={false}
        language="unknown"
      >
        plain text
      </CodeBlock>,
    );

    await waitFor(() => expect(highlighter).toHaveBeenCalledOnce());
    expect(container.querySelector("code")?.textContent).toBe("plain text");
    expect(
      container.querySelector("code")?.hasAttribute("data-highlighted"),
    ).toBe(false);
  });

  it("copies normalized code and exposes copied feedback", async () => {
    const onCopy = vi.fn(async () => undefined);

    render(
      <CodeBlock language="tsx" onCopy={onCopy}>
        {"const value = true;\n"}
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    await waitFor(() =>
      expect(onCopy).toHaveBeenCalledWith("const value = true;"),
    );
    expect(
      screen.getByRole("button", { name: "Copied" }).querySelector("svg"),
    ).toBeTruthy();
  });

  it("supports wrapped and non-copyable code states", () => {
    const html = renderToStaticMarkup(
      <CodeBlock copyable={false} language="text" wrap>
        a long line
      </CodeBlock>,
    );

    expect(html).toContain('data-wrap="true"');
    expect(html).not.toContain("Copy code");
  });

  it("toggles code wrapping while preserving the copy action", () => {
    const onWrapChange = vi.fn();
    const { container } = render(
      <CodeBlock onWrapChange={onWrapChange} wrapToggleable>
        a long line
      </CodeBlock>,
    );
    const block = container.querySelector(".codex-ui-code-block");
    const toggle = screen.getByRole("button", { name: "Enable word wrap" });

    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
    fireEvent.click(toggle);
    expect(block?.getAttribute("data-wrap")).toBe("true");
    expect(onWrapChange).toHaveBeenCalledWith(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Disable word wrap" }),
    );
    expect(block?.hasAttribute("data-wrap")).toBe(false);
    expect(onWrapChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps copy feedback idle when a host clipboard bridge rejects", async () => {
    render(
      <CodeBlock onCopy={async () => Promise.reject(new Error("denied"))}>
        const value = true;
      </CodeBlock>,
    );

    const button = screen.getByRole("button", { name: "Copy code" });
    fireEvent.click(button);
    await waitFor(() =>
      expect(button.getAttribute("aria-label")).toBe("Copy code"),
    );
    expect(button.getAttribute("data-copied")).toBeNull();
  });
});
