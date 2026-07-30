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
  });

  it("keeps route lifecycle and global feedback ownership explicit", () => {
    expect(styles).toContain(
      ".codex-ui-app-route-outlet[data-preserves-content]",
    );
    expect(styles).toContain(".codex-ui-app-route-outlet__state");
    expect(styles).toContain(".codex-ui-app-notification-region");
    expect(styles).toContain("z-index: 1200");
    expect(styles).toContain("@keyframes codex-ui-route-spinner");
  });
});
