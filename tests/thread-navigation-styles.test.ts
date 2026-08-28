import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("thread navigation visual contract", () => {
  it("locks measured header and floating-control geometry", () => {
    expect(tokens).toContain("--codex-ui-toolbar-height: calc(var(--codex-ui-spacing) * 12)");
    expect(tokens).toContain("--codex-ui-header-action-gap: calc(var(--codex-ui-spacing) * 1.5)");
    expect(tokens).toContain("--codex-ui-floating-control-size: calc(var(--codex-ui-spacing) * 8)");
    expect(tokens).toContain("--codex-ui-floating-control-composer-offset");
    expect(styles).toContain("height: var(--codex-ui-toolbar-height)");
    expect(styles).toContain("z-index: 42");
  });

  it("protects hidden interaction and reduced-motion behavior", () => {
    expect(styles).toContain(".codex-ui-thread-floating-button[data-show]");
    expect(styles).toContain(".codex-ui-floating-thread-panel[data-open]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation: none");
  });

  it("locks the observed marker and accessible navigation hit geometry", () => {
    expect(tokens).toContain("--codex-ui-message-navigation-row-width: calc(var(--codex-ui-spacing) * 9)");
    expect(tokens).toContain("--codex-ui-message-navigation-row-height: calc(var(--codex-ui-spacing) * 6)");
    expect(tokens).toContain("--codex-ui-message-navigation-marker-width: calc(var(--codex-ui-spacing) * 7.5)");
    expect(tokens).toContain("--codex-ui-message-navigation-marker-height: calc(var(--codex-ui-spacing) * 0.5)");
    expect(styles).toContain(
      "var(--codex-ui-message-navigation-available-height, 100vh)",
    );
    expect(styles).toContain("opacity: 0.4");
    expect(styles).toContain("opacity: 0.6");
    expect(styles).toMatch(
      /\.codex-ui-message-navigation-rail\[data-density="compact"\] \{[\s\S]*?--codex-ui-message-navigation-row-height: 0\.625rem;[\s\S]*?--codex-ui-message-navigation-marker-width: 1\.875rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-message-navigation-rail\[data-density="compact"\][\s\S]*?\.codex-ui-message-navigation-rail__marker \{\s*width: 0\.375rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-message-navigation-rail\[data-density="compact"\][\s\S]*?\.codex-ui-message-navigation-rail__button\[data-active\][\s\S]*?width: 1\.625rem;/,
    );
    expect(styles).toContain("-webkit-line-clamp: 3");
  });
});
