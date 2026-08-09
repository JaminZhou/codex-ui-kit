import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("composer visual contract", () => {
  it("keeps the disabled shell visibly unavailable", () => {
    expect(styles).toMatch(
      /\.codex-ui-composer\[data-disabled\] \{[\s\S]*?cursor: default;[\s\S]*?opacity: 0\.58;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer\[data-disabled\] button:disabled,[\s\S]*?textarea:disabled \{[\s\S]*?cursor: default;/,
    );
  });

  it("does not apply hover affordances to disabled slotted controls", () => {
    expect(styles).toContain(
      ".codex-ui-composer__actions > button:hover:not(:disabled)",
    );
    expect(styles).toContain(
      ".codex-ui-composer__actions > select:hover:not(:disabled)",
    );
    expect(styles).toContain(
      ".codex-ui-composer-attachment__remove:hover:not(:disabled)",
    );
  });

  it("locks auxiliary composer tray and queue geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-composer__suggestions \{[\s\S]*?bottom: calc\(100% - 0\.875rem\);[\s\S]*?position: absolute;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-mention-menu \{[\s\S]*?max-height: var\(--codex-ui-composer-mention-max-height\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-queue \{[\s\S]*?max-height: var\(--codex-ui-composer-queue-max-height\);/,
    );
    expect(styles).toContain(
      '.codex-ui-composer-attachment[data-layout="card"]',
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-attachment\[data-layout="card"\] \{[\s\S]*?gap: 0\.625rem;[\s\S]*?max-width: 16rem;[\s\S]*?padding: 0\.75rem 2rem 0\.75rem 0\.75rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-attachment \{[\s\S]*?box-sizing: border-box;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-attachment__copy \{[\s\S]*?min-width: 0;[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toContain(
      ".codex-ui-composer-attachment__progress",
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-attachment\[data-layout="image"\][\s\S]*?> \.codex-ui-composer-attachment__progress \{[\s\S]*?left: 0\.5rem;[\s\S]*?right: 0\.5rem;/,
    );
    expect(styles).toContain(
      ".codex-ui-composer-attachment__retry:focus-visible",
    );
    expect(styles).toMatch(
      /\.codex-ui-message-attachment \{[\s\S]*?box-sizing: border-box;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-dock__queue \{[\s\S]*?var\(--codex-ui-composer-queue-inline-inset\)[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-context__control \{[\s\S]*?height: var\(--codex-ui-composer-context-control-height\);/,
    );
    expect(styles).toContain(
      ".codex-ui-composer-dock__surface",
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-permission-menu \{[\s\S]*?padding: 0\.25rem;[\s\S]*?width: min\(30\.0234375rem,/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-resource-picker \{[\s\S]*?height: 20rem;[\s\S]*?padding: 0\.25rem;[\s\S]*?width: 100%;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-mode \{[\s\S]*?border-radius: 9999px;[\s\S]*?height: var\(--codex-ui-size-button-composer\);[\s\S]*?padding: 0 0\.5rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-mode__icon svg \{[\s\S]*?height: 1rem;[\s\S]*?stroke-width: 1\.2;[\s\S]*?width: 1rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer__suggestions:has\([\s\S]*?> \.codex-ui-composer-resource-picker[\s\S]*?\) \{[\s\S]*?bottom: calc\(100% \+ 0\.25rem\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-conversation-thread-shell__composer[\s\S]*?> \.codex-ui-composer-dock[\s\S]*?> \.codex-ui-composer-dock__surface[\s\S]*?> \.codex-ui-composer \{[\s\S]*?--codex-ui-composer-background: var\([\s\S]*?--codex-ui-conversation-thread-composer-background/,
    );
  });

  it("keeps current queue actions persistently visible and keyboard reachable", () => {
    expect(styles).toMatch(
      /\.codex-ui-composer-queue__send-now,[\s\S]*?\.codex-ui-composer-queue__more \{[\s\S]*?opacity: 1;/,
    );
    expect(styles).toContain(
      ".codex-ui-composer-queue__row:focus-within .codex-ui-composer-queue__send-now",
    );
    expect(styles).toContain(
      ".codex-ui-composer-queue__handle:focus-visible",
    );
    expect(styles).toContain(
      '.codex-ui-composer-queue__more[data-state="open"]',
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-queue \{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: auto;/,
    );
    expect(styles).not.toContain(
      ".codex-ui-composer-queue:has(.codex-ui-composer-queue__more",
    );
    expect(styles).not.toContain(
      ".codex-ui-composer-dock__queue:has(",
    );
  });
});
