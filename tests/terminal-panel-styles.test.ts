import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("terminal panel visual contract", () => {
  it("keeps transcript and prompt bounded inside the bottom panel", () => {
    expect(styles).toContain(".codex-ui-terminal-session");
    expect(styles).toContain(".codex-ui-terminal-panel__tab-label");
    expect(styles).toContain(".codex-ui-terminal-process-list");
    expect(styles).toContain(".codex-ui-terminal-transcript");
    expect(styles).toContain("overscroll-behavior: contain");
    expect(styles).toContain(".codex-ui-terminal-prompt");
    expect(styles).toContain("font-family: var(--codex-ui-font-mono)");
    expect(styles).toContain(
      '.codex-ui-terminal-transcript__entry[data-kind="stderr"]',
    );
  });
});
