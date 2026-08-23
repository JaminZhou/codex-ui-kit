import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("thread summary panel visual contract", () => {
  it("locks the current overlay, section, and row geometry", () => {
    expect(tokens).toContain("--codex-ui-thread-summary-panel-radius: 1.5625rem");
    expect(tokens).toContain("--codex-ui-thread-summary-panel-row-height: 1.8125rem");
    expect(tokens).toContain("--codex-ui-thread-summary-panel-width: 18.75rem");
    expect(styles).toContain(".codex-ui-popover.codex-ui-thread-summary-popover");
    expect(styles).toContain(".codex-ui-thread-summary-dock[data-open=\"true\"]");
    expect(styles).toContain("transform-origin: top right");
    expect(styles).toContain("padding: 0.625rem 0.875rem 0.375rem");
    expect(styles).toContain("height: var(--codex-ui-thread-summary-panel-row-height)");
  });

  it("keeps the current system typography and compact control states", () => {
    const panel = styles.match(
      /\.codex-ui-thread-summary-panel \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(panel).toContain(
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    );
    expect(panel).toContain("font-weight: 445");
    expect(styles).toContain('.codex-ui-thread-summary-toggle[aria-pressed="true"]');
    expect(styles).toContain(".codex-ui-thread-summary-item:disabled");
    expect(styles).toContain('.codex-ui-thread-summary-delta [data-tone="positive"]');
  });
});
