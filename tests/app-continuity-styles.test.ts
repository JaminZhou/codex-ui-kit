import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const tokens = readFileSync(
  new URL("../src/tokens.css", import.meta.url),
  "utf8",
);

describe("application continuity visual contract", () => {
  it("locks the current titlebar geometry and drag boundaries", () => {
    expect(tokens).toContain(
      "--codex-ui-app-window-chrome-height: 2.875rem",
    );
    expect(tokens).toContain(
      "--codex-ui-app-window-chrome-safe-inset-left: 5.125rem",
    );
    expect(styles).toContain(".codex-ui-app-shell__window-chrome");
    expect(styles).toMatch(
      /\.codex-ui-app-shell\s*\{[^}]*position:\s*relative;/s,
    );
    expect(styles).toContain("-webkit-app-region: drag");
    expect(styles).toContain("-webkit-app-region: no-drag");
    expect(styles).toContain("height: 1.75rem");
    expect(styles).toContain("border-radius: 0.78125rem");
    expect(styles).toMatch(
      /\.codex-ui-app-window-chrome__action:disabled\s*\{[^}]*cursor:\s*default;[^}]*opacity:\s*0\.4;/s,
    );
    expect(styles).toMatch(
      /data-narrow-sidebar-behavior="current-build"\]\[data-sidebar-pinned\][\s\S]*?\.codex-ui-app-shell__sidebar\s*\{[^}]*z-index:\s*10;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-window-chrome:dir\(rtl\)[\s\S]*?\.codex-ui-app-window-chrome__navigation \{[\s\S]*?padding-inline-start: 0;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-window-chrome:dir\(rtl\)[\s\S]*?\.codex-ui-app-window-chrome__end-actions \{[\s\S]*?padding-left: calc\([\s\S]*?--codex-ui-app-window-chrome-safe-inset-left/,
    );
    expect(styles).toMatch(
      /\[data-window-chrome\]\[data-side-panel-open\][\s\S]*?\.codex-ui-app-shell__window-chrome \{[\s\S]*?inset-inline-end: var\(--codex-ui-app-side-panel-width\);/,
    );
    expect(styles).toMatch(
      /@container codex-ui-app-shell \(max-width: 60rem\) \{[\s\S]*?\[data-window-chrome\]\[data-side-panel-open\][\s\S]*?inset-inline-end: 0;/,
    );
  });

  it("keeps route lifecycle and global feedback ownership explicit", () => {
    expect(styles).toContain(
      ".codex-ui-app-route-outlet[data-preserves-content]",
    );
    expect(styles).toContain(".codex-ui-app-route-outlet__state");
    expect(styles).toContain(".codex-ui-app-notification-region");
    expect(styles).toMatch(
      /\.codex-ui-app-notification-region\s*\{[^}]*pointer-events:\s*none;[^}]*position:\s*fixed;[^}]*z-index:\s*60;/s,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-notification-region\[data-codex-ui-dialog-owner\]\s*\{[^}]*z-index:\s*1150;/s,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-notification-region\[data-position="top-center"\],[\s\S]*?inset-block-start:\s*calc\(var\(--codex-ui-app-window-chrome-height\) \+ 0\.125rem\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-notification__alert\s*\{[^}]*border-radius:\s*0\.9375rem;[^}]*box-shadow:\s*0 4px 12px rgb\(0 0 0 \/ 0\.1\);/s,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-notification-region\[data-position="bottom-end"\][\s\S]*?\.codex-ui-app-notification\s*\{[^}]*bottom:\s*0;[^}]*top:\s*auto;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-notification-toaster\[data-expanded="true"\][\s\S]*?\.codex-ui-app-notification\[data-visible="true"\]\s*\{[^}]*position:\s*relative;[^}]*transform:\s*none;/,
    );
    expect(styles).toContain("background: #011c0b");
    expect(styles).toContain("color: #40c977");
    expect(styles).toContain("@keyframes codex-ui-route-spinner");
  });
});
