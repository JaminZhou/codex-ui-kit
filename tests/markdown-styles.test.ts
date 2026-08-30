import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const buildConfig = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);

describe("Markdown visual contract", () => {
  it("keeps the measured chat and code typography", () => {
    expect(tokens).toContain(
      "--codex-ui-markdown-font-size: var(--codex-ui-font-size-sm)",
    );
    expect(tokens).toContain("--codex-ui-markdown-line-height: 1.375rem");
    expect(tokens).toContain(
      "--codex-ui-markdown-code-font-size: var(--codex-ui-font-size-sm)",
    );
    expect(tokens).toContain(
      "--codex-ui-markdown-code-line-height: 1.375rem",
    );
    expect(styles).toContain("padding: 0.0625rem 0.375rem");
  });

  it("keeps the measured block, quote, code, and table geometry", () => {
    expect(tokens).toContain("--codex-ui-markdown-block-gap: 0.6875rem");
    expect(tokens).toContain("--codex-ui-markdown-table-max-width: 40rem");
    expect(tokens).toContain(
      "--codex-ui-markdown-code-block-radius: 0.78125rem",
    );
    expect(tokens).toContain(
      "--codex-ui-markdown-code-block-header-height: 1.875rem",
    );
    expect(styles).toContain("padding-inline-start: 1.3125rem");
    expect(styles).toContain("padding-inline-start: 1.5rem");
    expect(styles).toContain("width: 0.25rem");
    expect(styles).toContain("margin: 0.875rem 0");
    expect(styles).toContain("padding-inline-end: 1.5rem");
  });

  it("ships the current compact Markdown density as an opt-in contract", () => {
    expect(styles).toContain('.codex-ui-markdown[data-density="compact"]');
    expect(styles).toContain("line-height: 1.421875rem");
    expect(styles).toContain("font-size: 1.3125rem");
    expect(styles).toContain("font-size: 1.09375rem");
    expect(styles).toContain("line-height: 1.53125rem");
    expect(styles).toContain("border-radius: 1.25rem");
    expect(styles).toContain("height: 3rem");
    expect(styles).toContain("font-size: 0.75rem");
    expect(styles).toContain("inset-inline-end: -2rem");
    expect(styles).toContain(
      "padding: 0.546875rem 1.3125rem 0.546875rem 0",
    );
    expect(styles).toMatch(
      /tbody\s+tr:last-child\s+td \{\s+padding-bottom: 1\.3125rem;/,
    );
  });

  it("keeps links identifiable and lets custom copy labels size to content", () => {
    expect(styles).toContain("text-decoration: underline");
    expect(styles).toContain("font: inherit");
    expect(styles).toContain("min-width: 1.375rem");
    expect(styles).toContain("padding: 0 0.1875rem");
    expect(styles).toContain(".codex-ui-code-block__copy-icon");
    expect(styles).not.toContain(".codex-ui-code-block__copy svg");
  });

  it("ships current KaTeX, media preview, and unavailable-state styling", () => {
    expect(styles).toContain('@import "katex/dist/katex.min.css"');
    expect(buildConfig).toContain("katex/dist/katex.min.css");
    expect(buildConfig).toContain('fileName: `fonts/${fileName}`');
    expect(styles).toContain(".codex-ui-markdown .katex-display");
    expect(styles).toContain(".codex-ui-markdown-image__trigger");
    expect(styles).toContain("cursor: zoom-in");
    expect(styles).toContain("max-height: 12.5rem");
    expect(styles).toContain("max-width: 12.5rem");
    expect(styles).toContain(".codex-ui-markdown-image__fallback");
    expect(styles).toContain("min-height: 6rem");
    expect(styles).toContain(".codex-ui-markdown__render-error");
  });

  it("resets only a top-level final code block margin", () => {
    expect(styles).toContain(
      ".codex-ui-markdown > pre:last-child > .codex-ui-code-block:only-child",
    );
    expect(styles).not.toContain(
      ".codex-ui-markdown .codex-ui-code-block:last-child",
    );
  });

  it("does not rely on a host box-sizing reset for table overhangs", () => {
    expect(styles).toMatch(
      /\.codex-ui-markdown,\s*\.codex-ui-markdown \* \{\s*box-sizing: border-box;/,
    );
  });

  it("locks the current wide-table actions and preview geometry", () => {
    expect(styles).toContain("overflow-wrap: break-word");
    expect(styles).toContain("padding-inline-start: 0");
    expect(styles).toContain(".codex-ui-markdown__table-actions");
    expect(styles).toContain(
      "inset-inline-end: var(--codex-ui-markdown-inline-overhang)",
    );
    expect(styles).toContain(
      "container-name: codex-ui-conversation-thread-shell",
    );
    expect(styles).toContain(
      "@container codex-ui-conversation-thread-shell (min-width: 53rem)",
    );
    expect(styles).not.toContain(
      "@container codex-ui-app-shell (min-width: 73rem)",
    );
    expect(styles).toContain("inset-inline-end: -2rem");
    expect(styles).toMatch(
      /\.codex-ui-markdown__table-actions \{[^}]*pointer-events: none;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-markdown__table-actions button \{[^}]*pointer-events: auto;/,
    );
    expect(styles).toContain("height: 1.5rem");
    expect(styles).toContain("background: rgb(0 0 0 / 0.8)");
    expect(styles).toContain("padding: 3rem 2rem 3.25rem");
    expect(styles).toContain("background: var(--codex-ui-background-thread-summary)");
    expect(styles).toContain("border-radius: 1.25rem");
    expect(styles).toContain("flex: 0 0 80%");
    expect(styles).toContain("max-height: 100%");
    expect(styles).toContain("padding: 2rem");
  });

  it("maps independently contrast-safe light and dark highlight roles", () => {
    expect(tokens).toContain(
      "--codex-ui-code-syntax-light-keyword: #a626a4",
    );
    expect(tokens).toContain(
      "--codex-ui-code-syntax-dark-keyword: #2e95d3",
    );
    expect(tokens).toContain(
      "--codex-ui-code-syntax-light-string: #3f7f3e",
    );
    expect(tokens).toContain(
      "--codex-ui-code-syntax-dark-string: #00a67d",
    );
    expect(styles).toContain(".codex-ui-code-block__body .hljs-keyword");
    expect(styles).toContain("var(--codex-ui-code-syntax-variable)");
  });

  it("disables streaming motion when the host requests reduced motion", () => {
    expect(styles).toContain("@keyframes codex-ui-markdown-stream-enter");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation: none");
  });
});
