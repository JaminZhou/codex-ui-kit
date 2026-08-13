import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("settings visual contract", () => {
  it("locks the observed 322.91px Settings rail and 768px content column", () => {
    expect(styles).toContain(
      "--codex-ui-settings-sidebar-width: 20.181875rem",
    );
    expect(styles).toMatch(
      /\.codex-ui-git-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?padding: 4\.125rem 0 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__search \{[\s\S]*?height: 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__navigation-scroll \{[\s\S]*?overflow: auto;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-settings-shell__main \{[\s\S]*?scrollbar-width: none;/,
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
});
