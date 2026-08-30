import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("settings visual contract", () => {
  it("locks the observed 321.88px Settings rail and 768px content column", () => {
    expect(styles).toContain(
      "--codex-ui-settings-sidebar-width: 20.1171875rem",
    );
    expect(styles).toMatch(
      /\.codex-ui-git-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?padding: 1\.25rem 0 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__search \{[\s\S]*?height: 1\.8125rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__navigation-scroll \{[\s\S]*?overflow: auto;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__main \{[\s\S]*?scrollbar-width: none;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__main \{[\s\S]*?margin-top: 2\.875rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__main::\-webkit-scrollbar \{[\s\S]*?display: none;/,
    );
  });

  it("retains current Git control geometry and compact overflow safety", () => {
    expect(styles).toMatch(
      /\.codex-ui-git-settings__row > input \{[\s\S]*?flex: 0 0 14rem;[\s\S]*?height: 2\.1875rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-git-settings__switch \{[\s\S]*?height: 1\.25rem;[\s\S]*?width: 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-git-settings__instructions textarea \{[\s\S]*?height: 8\.09375rem;/,
    );
    expect(styles).toContain("grid-template-columns: var(--codex-ui-settings-sidebar-width) minmax(0, 1fr)");
  });

  it("uses theme-aware paints while preserving the observed dark values", () => {
    expect(styles).toContain("--codex-ui-settings-sidebar-background: light-dark(");
    expect(styles).toContain("--codex-ui-settings-main-background: light-dark(");
    expect(styles).toContain("--codex-ui-settings-card-background: light-dark(");
    expect(styles).toContain("--codex-ui-settings-control-background: light-dark(");
    expect(styles).not.toContain("background: #242424");
    expect(styles).not.toContain("background: #202020");
    expect(styles).not.toContain("background: #2b2b2b");
  });

  it("locks the current Appearance preview, editor, and Preferences geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?padding: 1\.25rem 0 1\.3125rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__theme-options \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__theme-preview \{[\s\S]*?aspect-ratio: 248 \/ 175;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__diff-preview \{[\s\S]*?height: 6\.875rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__editor,[\s\S]*?border-radius: 1\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__switch \{[\s\S]*?height: 1\.25rem;[\s\S]*?width: 2rem;/,
    );
  });

  it("projects keyboard focus from clipped radios onto visible choices", () => {
    expect(styles).toMatch(
      /\.codex-ui-appearance-settings__theme-choice[\s\S]*?> input:focus-visible[\s\S]*?\+ \.codex-ui-appearance-settings__theme-preview,[\s\S]*?\.codex-ui-appearance-settings__dock-icons[\s\S]*?> input:focus-visible[\s\S]*?\+ span \{[\s\S]*?outline: 2px solid var\(--codex-ui-focus\);[\s\S]*?outline-offset: 2px;/,
    );
  });

  it("locks the current General cards, row rhythm, and compact column", () => {
    expect(styles).toMatch(
      /\.codex-ui-general-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?padding: 1\.25rem 0 1\.3125rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-general-settings__card \{[\s\S]*?border-radius: 1\.25rem;[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-general-settings__row \{[\s\S]*?padding: 0\.75rem 1rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-general-settings__switch \{[\s\S]*?height: 1\.25rem;[\s\S]*?width: 2rem;/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 50rem\)[\s\S]*?\.codex-ui-general-settings \{[\s\S]*?width: calc\(100% - 2\.5rem\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 50rem\)[\s\S]*?\.codex-ui-general-settings__hotkey-capture \{[\s\S]*?align-items: flex-end;[\s\S]*?flex-direction: column;/,
    );
  });

  it("disables Hooks and Code review progress motion when requested", () => {
    const spinnerDeclaration = styles.indexOf(
      ".codex-ui-hooks-settings__loading > span:first-child,",
    );
    const reducedMotionOverride = styles.indexOf(
      "@media (prefers-reduced-motion: reduce)",
      spinnerDeclaration,
    );

    expect(spinnerDeclaration).toBeGreaterThan(-1);
    expect(reducedMotionOverride).toBeGreaterThan(spinnerDeclaration);
    expect(styles.slice(reducedMotionOverride)).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-hooks-settings\[data-refreshing="true"\][\s\S]*?\.codex-ui-hooks-settings__reload[\s\S]*?\.codex-ui-hooks-settings__loading > span:first-child,[\s\S]*?\.codex-ui-code-review-settings__loading > span:first-child \{[\s\S]*?animation: none;/,
    );
  });
});
