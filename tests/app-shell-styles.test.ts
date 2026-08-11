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
    expect(tokens).toContain("--codex-ui-app-bottom-panel-height: 17rem");
    expect(styles).toContain("container-name: codex-ui-app-shell");
    expect(styles).toContain(".codex-ui-app-shell__layout");
    expect(styles).toContain("grid-template-columns:");
    expect(styles).toContain("grid-column: 2 / 4");
  });

  it("turns fixed columns into overlays before they can leave the viewport", () => {
    expect(styles).toMatch(
      /@container codex-ui-app-shell \(max-width: 60rem\) \{[\s\S]*?\.codex-ui-app-shell__layout \{/,
    );
    expect(styles).toContain(
      "@container codex-ui-app-shell (max-width: 45rem) {\n  .codex-ui-app-shell__layout {",
    );
    expect(component).toContain("const appShellMediumBreakpointRem = 60");
    expect(component).toContain("const appShellNarrowBreakpointRem = 45");
    expect(tokens).not.toContain("--codex-ui-app-shell-medium-breakpoint");
    expect(tokens).not.toContain("--codex-ui-app-shell-narrow-breakpoint");
    expect(styles).toContain(
      '.codex-ui-app-shell__backdrop[data-backdrop="side-panel"]',
    );
    expect(styles).toContain(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    );
    expect(styles).toContain("max-width: calc(100% - 3rem)");
    expect(styles).toContain(
      ".codex-ui-app-shell[data-side-panel-overlay][data-side-panel-open]",
    );
    expect(styles).toMatch(
      /\[data-side-panel-overlay\]\[data-side-panel-open\][\s\S]*?\.codex-ui-app-shell__layout \{[\s\S]*?--codex-ui-app-shell-side-panel-track: 0rem;/,
    );
    expect(styles).toMatch(
      /@container codex-ui-app-shell \(max-width: 60rem\) \{[\s\S]*?\.codex-ui-app-shell:dir\(rtl\) \.codex-ui-app-shell__side-panel \{[\s\S]*?transform: translateX\(-100%\);[\s\S]*?\.codex-ui-app-shell\[data-side-panel-open\][\s\S]*?\.codex-ui-app-shell__side-panel \{[\s\S]*?transform: translateX\(0\);/,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-app-shell__sidebar,[\s\S]*?\.codex-ui-app-shell__side-panel \{[\s\S]*?transition: none/,
    );
  });

  it("keeps current-build narrow pinning distinct from modal fallback", () => {
    expect(styles).toContain(
      '.codex-ui-app-shell[data-narrow-sidebar-behavior="current-build"][data-sidebar-pinned]',
    );
    expect(styles).toMatch(
      /\[data-narrow-sidebar-behavior="current-build"\]\[data-sidebar-pinned\][\s\S]*?grid-template-columns:[\s\S]*?calc\(100% - 3rem\)[\s\S]*?minmax\(3rem, 1fr\);/,
    );
    expect(styles).not.toContain("data-sidebar-preview-open");
    expect(styles).toMatch(
      /@container codex-ui-app-shell \(max-width: 45rem\) \{[\s\S]*?\.codex-ui-app-shell:dir\(rtl\) \.codex-ui-app-shell__sidebar \{[\s\S]*?transform: translateX\(100%\);[\s\S]*?\.codex-ui-app-shell\[data-sidebar-open\] \.codex-ui-app-shell__sidebar \{[\s\S]*?transform: translateX\(0\);/,
    );
    expect(component).toContain(
      'export type AppShellNarrowSidebarBehavior = "current-build" | "modal"',
    );
    expect(component).not.toContain("inlineStartDistance <= 12");
  });

  it("keeps panel tabs, content, and focus semantics explicit", () => {
    expect(styles).toContain(".codex-ui-workspace-panel__tabs");
    expect(styles).toContain(".codex-ui-workspace-panel__content:focus-visible");
    expect(styles).toContain(".codex-ui-workspace-panel__tab[aria-selected=\"true\"]");
    expect(styles).toContain("-webkit-app-region: drag");
    expect(styles).toContain("-webkit-app-region: no-drag");
  });

  it("locks the current-build navigation resize affordance", () => {
    expect(styles).toMatch(
      /\.codex-ui-app-shell__sidebar-resizer \{[\s\S]*?cursor: col-resize;[\s\S]*?width: 1rem;/,
    );
    expect(styles).toContain(
      ".codex-ui-app-shell__sidebar-resizer:focus-visible",
    );
    expect(component).toContain("sidebarMinWidth = 240");
    expect(component).toContain("sidebarMaxWidth = 520");
    expect(component).toContain("sidebarMinMainWidth = 352");
    expect(component).toContain("responsiveSidebarMinMainWidth");
    expect(component).toContain("persistentSidePanelMinWidth");
    expect(component).toContain('role="separator"');
    expect(component).toContain('aria-orientation="vertical"');
  });

  it("locks the current-build sidebar regions and row geometry", () => {
    expect(tokens).toContain("--codex-ui-app-sidebar-width: 17.125rem");
    expect(styles).toContain(
      ".codex-ui-app-sidebar[data-titlebar-inset]",
    );
    expect(styles).toContain("padding-block-start: 2.875rem");
    expect(styles).toContain("min-height: 4.375rem");
    expect(styles).toContain("min-height: 1.875rem");
    expect(styles).toContain("border-radius: 0.78125rem");
    expect(styles).toContain(
      "background: color-mix(\n    in srgb,\n    var(--codex-ui-text-foreground) 8%",
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__section-toggle",
    );
    expect(styles).toContain(
      '.codex-ui-app-sidebar__section[data-expanded="true"]',
    );
    expect(styles).not.toContain(
      ".codex-ui-app-sidebar__section[data-expanded]\n",
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__items[hidden]",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar__footer \{[^}]*min-height: 2\.875rem;[^}]*\}/,
    );
    expect(styles).not.toMatch(
      /\.codex-ui-app-sidebar__footer \{[^}]*position: absolute;[^}]*\}/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar__navigation \{[^}]*padding: 0;[^}]*\}/,
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__item-actions",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar__item-row \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar__item-actions \{[\s\S]*?grid-column: 2;[\s\S]*?position: relative;/,
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__item-status-spinner",
    );
    expect(styles).toContain("animation: codex-ui-spin 2s linear infinite;");
    expect(styles).toContain(
      ".codex-ui-app-sidebar__item-status-attention",
    );
    expect(styles).toContain(
      "background: var(--codex-ui-app-sidebar-attention, var(--codex-ui-link));",
    );
    expect(styles).toContain(
      '.codex-ui-app-sidebar__item-row[data-has-actions][data-selected][data-status="idle"]',
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__item-row[data-has-actions]:hover",
    );
    expect(styles).not.toContain(
      ".codex-ui-app-sidebar__item-row:hover\n  .codex-ui-app-sidebar__item-status",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar__project-children \{[\s\S]*?gap: 1px;[\s\S]*?padding-block: 2px 8px;/,
    );
    expect(styles).not.toContain(
      ".codex-ui-app-sidebar__item-row[data-has-actions]\n  .codex-ui-app-sidebar__item {\n  padding-inline-end:",
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar-footer__account",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-sidebar-footer__account-control \{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-width: 0;/,
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar-footer__account-control > *",
    );
    expect(styles).toContain(
      ".codex-ui-agent-message__actions,\n  .codex-ui-app-sidebar__item-actions,\n  .codex-ui-app-sidebar__section-chevron {\n    transition: none;",
    );
    expect(component).toContain(
      'kind?: "custom" | "pinned" | "projects" | "threads"',
    );
    expect(component).toContain(
      'export type AppSidebarItemStatus =',
    );
    expect(component).toContain(
      "const canCollapse = collapsible && Boolean(title)",
    );
    expect(component).toContain(
      "hidden={canCollapse && !isExpanded}",
    );
    expect(component).toContain(
      "export function AppSidebarProjectGroup",
    );
    expect(styles).toContain(
      ".codex-ui-app-sidebar__project-group",
    );
  });

  it("locks the current-build workspace resize affordance", () => {
    expect(styles).toContain(
      "--codex-ui-app-shell-side-panel-track: var(\n    --codex-ui-app-side-panel-width\n  );",
    );
    expect(styles).not.toContain(
      "--codex-ui-app-shell-side-panel-track: min(",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-shell__side-panel-resizer \{[\s\S]*?cursor: col-resize;[\s\S]*?width: 1rem;/,
    );
    expect(styles).toContain(
      "inset-block-end: var(--codex-ui-app-shell-bottom-panel-track);",
    );
    expect(styles).toContain(
      ".codex-ui-app-shell__side-panel-resizer:focus-visible",
    );
    expect(component).toContain("sidePanelMinWidth = 320");
    expect(component).toContain("sidePanelMinMainWidth = 352");
    expect(component).toContain('sidePanelResizeLabel = "Resize workspace panel"');
  });

  it("locks the current-build bottom panel resize affordance", () => {
    expect(styles).toContain(
      "max(0px, calc((100% - 1rem) / 2))",
    );
    expect(styles).toMatch(
      /\.codex-ui-app-shell__bottom-panel-resizer \{[\s\S]*?cursor: row-resize;[\s\S]*?height: 1rem;/,
    );
    expect(styles).toContain(
      ".codex-ui-app-shell__bottom-panel-resizer:focus-visible",
    );
    expect(styles).toContain(
      '.codex-ui-workspace-panel[data-placement="bottom"]',
    );
    expect(component).toContain("bottomPanelMinHeight = 152");
    expect(component).toContain("defaultBottomPanelHeight = 272");
    expect(component).toContain(
      'bottomPanelResizeLabel = "Resize bottom panel"',
    );
    expect(component).toContain('aria-orientation="horizontal"');
  });
});
