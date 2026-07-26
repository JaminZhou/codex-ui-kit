import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("workflow surface visual contract", () => {
  it("keeps workspace selection responsive without viewport overflow", () => {
    expect(styles).toContain(
      "container-name: codex-ui-workspace-selection",
    );
    expect(styles).toContain(
      "@container codex-ui-workspace-selection (max-width: 42rem)",
    );
    expect(styles).toMatch(
      /@container codex-ui-workspace-selection \(max-width: 42rem\)[\s\S]*?\.codex-ui-workspace-selection__fields \{[\s\S]*?grid-template-columns: 1fr/,
    );
    expect(styles).toContain(
      ".codex-ui-run-location-menu__trigger-label",
    );
  });

  it("switches pull requests from split view to stacked detail", () => {
    expect(styles).toContain(
      "container-name: codex-ui-pull-request-page",
    );
    expect(styles).toContain(
      "grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr)",
    );
    expect(styles).toMatch(
      /\.codex-ui-pull-request-page \{[\s\S]*?display: flex;[\s\S]*?flex-direction: column/,
    );
    expect(styles).toMatch(
      /\.codex-ui-pull-request-page__body \{[\s\S]*?flex: 1 1 auto;[\s\S]*?grid-template-rows: minmax\(0, 1fr\)/,
    );
    expect(styles).toMatch(
      /@container codex-ui-pull-request-page \(max-width: 48rem\)[\s\S]*?\.codex-ui-pull-request-page__body \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/,
    );
    expect(styles).toContain(
      '.codex-ui-pull-request-list__item[data-selected]',
    );
  });

  it("shows event and review states without motion dependency", () => {
    expect(styles).toContain(
      "container-name: codex-ui-conversation-event-list",
    );
    expect(styles).toMatch(
      /@container codex-ui-conversation-event-list \(max-width: 34rem\)[\s\S]*?\.codex-ui-conversation-event__main \{[\s\S]*?flex-direction: column/,
    );
    expect(styles).toContain(
      '.codex-ui-conversation-event[data-ownership="thread"]',
    );
    expect(styles).toContain(
      '.codex-ui-conversation-event[data-status="failed"]',
    );
    expect(styles).toContain(
      '.codex-ui-pull-request-checks li[data-status="running"]',
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.codex-ui-conversation-event\[data-status="running"\][\s\S]*?animation: none/,
    );
  });
});
