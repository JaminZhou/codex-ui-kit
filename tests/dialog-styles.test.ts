import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("dialog visual contract", () => {
  it("locks compact modal and choice-row foundations into public tokens", () => {
    expect(tokens).toContain("--codex-ui-dialog-width-compact: 25rem");
    expect(tokens).toContain("--codex-ui-dialog-edge-inset:");
    expect(tokens).toContain("--codex-ui-dialog-choice-gap:");
    expect(styles).toContain("background: rgb(0 0 0 / 0.45)");
    expect(styles).toContain("z-index: 1100");
    expect(styles).toContain(
      '.codex-ui-popover[data-codex-ui-overlay-layer="dialog"]',
    );
    expect(styles).toContain("z-index: 1150");
    expect(styles).toContain("min-height: 3.5rem");
  });

  it("keeps modal focus and reduced-motion behavior explicit", () => {
    expect(styles).toContain(".codex-ui-dialog-choice:focus-visible");
    expect(styles).toContain("@keyframes codex-ui-dialog-enter");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.codex-ui-dialog__surface/,
    );
  });
});
