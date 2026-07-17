import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("interactive primitive visual contract", () => {
  it("locks measured control and overlay foundations into public tokens", () => {
    expect(tokens).toContain(
      "--codex-ui-control-height-toolbar: calc(var(--codex-ui-spacing) * 7)",
    );
    expect(tokens).toContain("--codex-ui-overlay-row-padding-y: 0.3125rem");
    expect(tokens).toContain("--codex-ui-overlay-menu-min-width: 11.25rem");
    expect(tokens).toContain("--codex-ui-overlay-tooltip-max-width: 20rem");
    expect(tokens).toContain("--codex-ui-shadow-overlay:");
  });

  it("keeps disabled controls at the observed opacity and overlays viewport-safe", () => {
    expect(styles).toMatch(
      /\.codex-ui-button:disabled,[\s\S]*?\.codex-ui-icon-button:disabled \{[\s\S]*?opacity: 0\.4;/,
    );
    expect(styles).toContain("max-width: calc(100vw - 1rem)");
    expect(styles).toContain("max-height: var(--codex-ui-overlay-max-height)");
    expect(styles).toContain("backdrop-filter: blur(16px)");
  });

  it("preserves keyboard focus and selected list-row affordances", () => {
    expect(styles).toContain(".codex-ui-menu-item:focus-visible");
    expect(styles).toContain(".codex-ui-select-option[data-selected]");
    expect(styles).toContain("outline: 2px solid var(--codex-ui-focus)");
  });
});
