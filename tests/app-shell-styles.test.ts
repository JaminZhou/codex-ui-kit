import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const component = readFileSync(
  new URL("../src/components/AppShell.tsx", import.meta.url),
  "utf8",
);

describe("application shell visual contract", () => {
  it("locks the observed wide shell and workspace panel geometry", () => {
    expect(tokens).toContain("--codex-ui-app-sidebar-width: 17.125rem");
    expect(tokens).toContain("--codex-ui-app-side-panel-width: 41.6875rem");
    expect(tokens).toContain("--codex-ui-app-bottom-panel-height: 15rem");
    expect(styles).toContain("container-name: codex-ui-app-shell");
    expect(styles).toContain(".codex-ui-app-shell__layout");
    expect(styles).toContain("grid-template-columns:");
    expect(styles).toContain("grid-column: 2 / 4");
  });

  it("turns fixed columns into overlays before they can leave the viewport", () => {
    expect(styles).toContain(
      "@container codex-ui-app-shell (max-width: 92rem) {\n  .codex-ui-app-shell__layout {",
    );
    expect(styles).toContain(
      "@container codex-ui-app-shell (max-width: 52rem) {\n  .codex-ui-app-shell__layout {",
    );
    expect(component).toContain("const appShellMediumBreakpointRem = 92");
    expect(component).toContain("const appShellNarrowBreakpointRem = 52");
    expect(tokens).not.toContain("--codex-ui-app-shell-medium-breakpoint");
    expect(tokens).not.toContain("--codex-ui-app-shell-narrow-breakpoint");
    expect(styles).toContain(
      '.codex-ui-app-shell__backdrop[data-backdrop="side-panel"]',
    );
    expect(styles).toContain(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    );
    expect(styles).toContain("max-width: calc(100% - 3rem)");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-app-shell__sidebar,[\s\S]*?\.codex-ui-app-shell__side-panel \{[\s\S]*?transition: none/,
    );
  });

  it("keeps panel tabs, content, and focus semantics explicit", () => {
    expect(styles).toContain(".codex-ui-workspace-panel__tabs");
    expect(styles).toContain(".codex-ui-workspace-panel__content:focus-visible");
    expect(styles).toContain(".codex-ui-workspace-panel__tab[aria-selected=\"true\"]");
    expect(styles).toContain("-webkit-app-region: drag");
    expect(styles).toContain("-webkit-app-region: no-drag");
  });
});
