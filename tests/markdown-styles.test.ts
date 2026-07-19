import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("Markdown visual contract", () => {
  it("keeps the measured chat and code typography", () => {
    expect(tokens).toContain(
      "--codex-ui-font-size-chat: var(--codex-ui-font-size-md)",
    );
    expect(tokens).toContain(
      "--codex-ui-font-size-code: var(--codex-ui-font-size-xs)",
    );
    expect(tokens).toContain(
      "--codex-ui-line-height-chat: calc(var(--codex-ui-font-size-chat) + 0.5rem)",
    );
    expect(tokens).toContain("--codex-ui-line-height-code: 1.25rem");
    expect(styles).toContain("padding: 0.0625rem 0.375rem");
  });

  it("keeps the measured block, quote, code, and table geometry", () => {
    expect(tokens).toContain("--codex-ui-markdown-block-gap: 0.6875rem");
    expect(tokens).toContain("--codex-ui-markdown-table-max-width: 40rem");
    expect(styles).toContain("padding-inline-start: 1.3125rem");
    expect(styles).toContain("padding-inline-start: 1.5rem");
    expect(styles).toContain("width: 0.25rem");
    expect(styles).toContain("margin: 0.875rem 0");
    expect(styles).toContain("padding-inline-end: 1.5rem");
  });

  it("does not rely on a host box-sizing reset for table overhangs", () => {
    expect(styles).toMatch(
      /\.codex-ui-markdown,\s*\.codex-ui-markdown \* \{\s*box-sizing: border-box;/,
    );
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
