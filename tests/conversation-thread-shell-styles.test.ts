import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("current conversation thread shell visual contract", () => {
  it("locks the current-build header, content, and composer geometry", () => {
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-header-height: 2.875rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-content-max-width: 48rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-content-inline-inset: 1rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-content-top-inset: 2.0625rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-composer-bottom-inset: 1rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-composer-scroll-clearance: 3.75rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-composer-control-size: 1.75rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-user-turn-gap: 2.125rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-font-size: 0.875rem",
    );
    expect(tokens).toContain(
      "--codex-ui-conversation-thread-line-height: 1.375rem",
    );
    expect(styles).toContain(
      "grid-template-rows:\n    var(--codex-ui-conversation-thread-header-height)\n    minmax(0, 1fr)",
    );
    expect(styles).toContain(
      "max-width: calc(\n    var(--codex-ui-conversation-thread-content-max-width) -",
    );
    expect(styles).toContain(
      "padding-top: var(\n    --codex-ui-thread-content-top-inset\n  )",
    );
    expect(styles).toContain(
      "font-weight: var(--codex-ui-font-weight-shell)",
    );
  });

  it("reserves the measured composer without making it part of the scroll flow", () => {
    expect(styles).toContain(
      ".codex-ui-conversation-thread-shell__composer-dock",
    );
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain("position: absolute");
    expect(styles).toContain(
      "--codex-ui-conversation-thread-composer-dock-height",
    );
    expect(styles).toContain(
      "--codex-ui-conversation-thread-composer-scroll-clearance",
    );
    expect(styles).toContain(
      "--codex-ui-floating-control-composer-offset: var(\n    --codex-ui-conversation-thread-composer-dock-height,\n    var(--codex-ui-conversation-thread-composer-reserve)",
    );
    expect(styles).toContain(
      ".codex-ui-conversation-thread-shell__message-navigation > *,\n.codex-ui-conversation-thread-shell__floating-control > * {\n  pointer-events: auto",
    );
    expect(styles).toContain(
      ".codex-ui-conversation-thread-shell__message-navigation {\n  bottom: var(\n    --codex-ui-conversation-thread-composer-dock-height",
    );
    expect(styles).toContain("overflow: clip");
  });

  it("keeps completed assistant actions visible like the sampled thread", () => {
    expect(styles).toContain(
      '.codex-ui-agent-message[data-role="assistant"][data-status="completed"]\n  .codex-ui-agent-message__actions {\n  opacity: 1',
    );
  });
});
