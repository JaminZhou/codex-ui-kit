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
    expect(html).toContain('alt="Preview"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-markdown-copy="code-block"');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('class="codex-ui-code-block__body" dir="ltr" tabindex="0"');
    expect(html).toContain("const ready = true;");
    expect(html).not.toContain("node=");
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
    expect(screen.getByRole("button", { name: "Copied" }).textContent).toBe(
      "Copied",
    );
  });
});

describe("CodeBlock", () => {
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
    expect(screen.getByRole("button", { name: "Copied" }).textContent).toBe(
      "Copied",
    );
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

  it("keeps copy feedback idle when a host clipboard bridge rejects", async () => {
    render(
      <CodeBlock onCopy={async () => Promise.reject(new Error("denied"))}>
        const value = true;
      </CodeBlock>,
    );

    const button = screen.getByRole("button", { name: "Copy code" });
    fireEvent.click(button);
    await waitFor(() => expect(button.textContent).toBe("Copy code"));
    expect(button.getAttribute("data-copied")).toBeNull();
  });
});
