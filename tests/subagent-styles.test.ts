import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("subagent visual contract", () => {
  it("locks the inline chip geometry and three-agent activity treatment", () => {
    expect(tokens).toContain("--codex-ui-subagent-chip-height: 1.75rem");
    expect(styles).toMatch(
      /\.codex-ui-subagent-activity-group__chip \{[\s\S]*?height: var\(--codex-ui-subagent-chip-height\);[\s\S]*?max-width: 12rem/,
    );
    expect(styles).toContain("codex-ui-subagent-chip-enter 280ms");
  });

  it("locks the 24px panel avatars, 20px previews, and 48px transcript header", () => {
    expect(styles).toMatch(
      /\.codex-ui-subagent-panel,[\s\S]*?\.codex-ui-subagent-transcript-header \* \{\s*box-sizing: border-box;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-subagent-avatar\[data-size="medium"\] \{[\s\S]*?height: 1\.5rem;[\s\S]*?width: 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-subagent-panel__preview \{[\s\S]*?line-height: 1\.25rem/,
    );
    expect(tokens).toContain("--codex-ui-subagent-panel-header-height: 3rem");
  });

  it("colors partial diff metadata by semantic kind instead of child position", () => {
    expect(styles).toContain(
      '.codex-ui-subagent-summary__diff [data-kind="addition"]',
    );
    expect(styles).toContain(
      '.codex-ui-subagent-summary__diff [data-kind="deletion"]',
    );
    expect(styles).not.toContain(
      ".codex-ui-subagent-summary__diff span:last-child",
    );
  });

  it("removes chip, active, and shimmer motion for reduced motion", () => {
    expect(styles).toContain(".codex-ui-subagent-avatar[data-active]::after");
    expect(styles).toContain(
      ".codex-ui-subagent-activity-group__chip[data-animate-entrance]",
    );
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
