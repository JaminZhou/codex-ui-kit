import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("complete thread visual contract", () => {
  it("locks turn, viewport, placeholder, and user-message geometry", () => {
    expect(tokens).toContain("--codex-ui-thread-turn-gap: calc(var(--codex-ui-spacing) * 3)");
    expect(tokens).toContain("--codex-ui-thread-content-top-inset: calc(var(--codex-ui-spacing) * 8)");
    expect(tokens).toContain("--codex-ui-thread-placeholder-height: 17.5rem");
    expect(tokens).toContain("--codex-ui-user-message-max-width: 77%");
    expect(styles).toContain("contain-intrinsic-size: auto var(--codex-ui-thread-placeholder-height)");
    expect(styles).toContain("overflow-anchor: none");
    expect(styles).toContain("position: sticky");
  });

  it("protects shimmer, target highlight, focus, and reduced motion", () => {
    expect(tokens).toContain("--codex-ui-loading-shimmer-duration: 2s");
    expect(tokens).toContain("--codex-ui-message-highlight-duration: 1400ms");
    expect(styles).toContain("steps(48, end) infinite");
    expect(styles).toContain("@keyframes codex-ui-message-target-highlight");
    expect(styles).toContain(".codex-ui-agent-message__content:focus-visible");
    expect(styles).toContain(".codex-ui-loading-shimmer {\n    animation: none");
    expect(styles).toContain("scroll-behavior: auto");
  });

  it("does not pulse a complete running message", () => {
    const runningMessage = styles.match(
      /\.codex-ui-agent-message\[data-status="running"\] \{([^}]+)\}/,
    )?.[1];
    expect(runningMessage).toContain("contain: layout style");
    expect(runningMessage).not.toContain("animation");
  });
});
