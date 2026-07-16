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

afterEach(cleanup);

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
    expect(html).toContain('class="codex-ui-markdown__table-scroll"');
    expect(html).toContain('alt="Preview"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-markdown-copy="code-block"');
    expect(html).toContain('data-language="ts"');
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
    expect(stabilizeStreamingMarkdown("````md\n```\ncode")).toBe(
      "````md\n```\ncode\n````",
    );
    expect(stabilizeStreamingMarkdown("~~~ts\nconst value = 1;")).toBe(
      "~~~ts\nconst value = 1;\n~~~",
    );
    expect(stabilizeStreamingMarkdown("````md\ncode\n`````")).toBe(
      "````md\ncode\n`````",
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
