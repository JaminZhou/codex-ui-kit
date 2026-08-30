import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("Worktrees settings visual contract", () => {
  it("locks the current 768px column, 20px cards, and preference geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?padding: 1\.25rem 0 1\.3125rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__preferences,[\s\S]*?border-radius: 1\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__preference-control \{[\s\S]*?flex: 0 0 auto;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__preference-control > input \{[\s\S]*?width: 18rem;[\s\S]*?\.codex-ui-worktree-settings__preference-control > input\[type="text"\] \{[\s\S]*?height: 2\.25rem;/,
    );
  });

  it("retains switch, action, and managed-card geometry at compact widths", () => {
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__switch \{[\s\S]*?height: 1\.25rem;[\s\S]*?width: 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__entry \{[\s\S]*?min-height: 7\.78515625rem;[\s\S]*?padding: 0\.75rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-settings__entry-actions > button \{[\s\S]*?border-radius: 0\.78125rem;[\s\S]*?height: 1\.75rem;/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 50rem\)[\s\S]*?\.codex-ui-worktree-settings \{[\s\S]*?width: calc\(100% - 2\.5rem\);/,
    );
  });
});
