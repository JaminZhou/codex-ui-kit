import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("worktree setup visual contract", () => {
  it("keeps the current 26.825 card and log geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-worktree-setup \{[\s\S]*?gap: 0\.5rem;[\s\S]*?max-width: 46rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-setup__card \{[\s\S]*?border-radius: 0\.9375rem;[\s\S]*?gap: 0\.75rem;[\s\S]*?padding: 0\.75rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-worktree-setup__details \{[\s\S]*?border-radius: 0\.78125rem;[\s\S]*?height: 7\.71875rem;/,
    );
    expect(styles).toContain(
      "--codex-ui-worktree-setup-completed: #2c67c5",
    );
    expect(styles).toContain(
      "--codex-ui-worktree-setup-progress: #3a83f7",
    );
  });

  it("keeps stage motion optional and focus visible", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.codex-ui-worktree-setup__steps > li\[data-status="in-progress"\][\s\S]*?animation: none/,
    );
    expect(styles).toContain(
      ".codex-ui-worktree-setup__details-toggle:focus-visible",
    );
    expect(styles).toContain("outline: 2px solid var(--codex-ui-focus)");
  });
});
