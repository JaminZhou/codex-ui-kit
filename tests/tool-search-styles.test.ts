import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("tool and search visual contract", () => {
  it("keeps 16px activity icons and measured result caps", () => {
    expect(styles).toMatch(
      /\.codex-ui-tool-call__icon,[\s\S]*?height: 1rem;[\s\S]*?width: 1rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-tool-call__result \{[\s\S]*?max-height: 12rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-search-activity__entries \{[\s\S]*?max-height: 20rem/,
    );
  });

  it("keeps grouped result alignment and 14px favicons", () => {
    expect(styles).toMatch(
      /\.codex-ui-tool-call \.codex-ui-activity__body,[\s\S]*?margin: 0\.25rem 0 0 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-search-activity__entries img,[\s\S]*?height: 0\.875rem;[\s\S]*?width: 0\.875rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-mcp-tool-call-group__calls[\s\S]*?\.codex-ui-activity__body \{[\s\S]*?margin-left: 0/,
    );
    expect(styles).toMatch(
      /\.codex-ui-activity__disclosure:is\([\s\S]*?\[data-disclosure-mode="button"\],[\s\S]*?\[data-disclosure-mode="overlay-button"\][\s\S]*?width: fit-content/,
    );
    expect(styles).toMatch(
      /\.codex-ui-activity__overlay-toggle \{[\s\S]*?inset: 0;[\s\S]*?position: absolute/,
    );
    expect(styles).toMatch(
      /\.codex-ui-activity__button-chevron \{[\s\S]*?flex: 0 0 0\.75rem;[\s\S]*?opacity: 0/,
    );
  });

  it("supports the neutral output treatment used by recovered MCP failures", () => {
    expect(styles).toMatch(
      /\.codex-ui-tool-call__error\[data-presentation="output"\] \{[\s\S]*?background: var\(--codex-ui-code-block-bg\);[\s\S]*?min-height: 4\.25rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-tool-call__error-output \{[\s\S]*?font-family: var\(--codex-ui-font-mono\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-tool-call__error\[data-presentation="output"\][\s\S]*?\+ \.codex-ui-tool-call__raw-output \{[\s\S]*?opacity: 1;[\s\S]*?position: static/,
    );
  });

  it("protects active and disclosure motion under reduced motion", () => {
    expect(styles).toContain("@keyframes codex-ui-tool-activity-pulse");
    expect(styles).toContain("@keyframes codex-ui-tool-activity-enter");
    expect(styles).toContain(".codex-ui-tool-call__label[data-active]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-tool-call[\s\S]*?\.codex-ui-activity__disclosure\[data-open\][\s\S]*?animation: none/,
    );
    const activePulse = styles.match(
      /@keyframes codex-ui-tool-activity-pulse \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(activePulse).toContain(
      "color: var(--codex-ui-text-secondary)",
    );
    expect(activePulse).toContain("color: var(--codex-ui-text)");
    expect(activePulse).not.toContain("opacity");
  });
});
