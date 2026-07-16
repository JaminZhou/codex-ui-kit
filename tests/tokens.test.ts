import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("visual token contract", () => {
  it("keeps the measured spacing, type, radius, and thread foundations", () => {
    expect(tokens).toContain("--codex-ui-spacing: 0.25rem");
    expect(tokens).toContain("--codex-ui-font-size-md: 1rem");
    expect(tokens).toContain("--codex-ui-radius-2xl: 1rem");
    expect(tokens).toContain("--codex-ui-thread-content-max-width: 48rem");
    expect(tokens).toContain("--codex-ui-radius-composer: calc(var(--codex-ui-spacing) * 5.5)");
  });

  it("keeps the measured semantic light and dark color anchors", () => {
    expect(tokens).toContain("--codex-ui-text-foreground: #1a1c1f");
    expect(tokens).toContain("--codex-ui-green-500: #00a240");
    expect(tokens).toContain("--codex-ui-red-400: #fa423e");
    expect(tokens).toContain("--codex-ui-background-surface: var(--codex-ui-gray-900)");
    expect(tokens).toContain("--codex-ui-border-focus: var(--codex-ui-blue-300)");
  });

  it("loads the token contract before component styles", () => {
    expect(styles.startsWith('@import "./tokens.css";')).toBe(true);
  });
});
