import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("Keyboard and Voice Settings visual contracts", () => {
  it("locks the current 768px page, sticky search, and 384px shortcut binding column", () => {
    expect(styles).toMatch(
      /\.codex-ui-keyboard-shortcuts,[\s\S]*?max-width: 48rem;[\s\S]*?padding: 1\.25rem 0 1\.3125rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-keyboard-shortcuts__search-sticky \{[\s\S]*?position: sticky;[\s\S]*?top: 1\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-keyboard-shortcuts__bindings \{[\s\S]*?flex: 0 0 24rem;[\s\S]*?width: 24rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-keyboard-shortcuts__capture \{[\s\S]*?height: 1\.75rem;[\s\S]*?width: 9rem;/,
    );
  });

  it("locks current Voice cards, switches, dictionary, and picker geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-voice-settings__card \{[\s\S]*?border-radius: 0\.9375rem;[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-voice-settings__switch \{[\s\S]*?height: 1\.25rem;[\s\S]*?width: 2rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-voice-settings__dictionary-entry > input \{[\s\S]*?height: 2\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-voice-picker \.codex-ui-dialog__surface \{[\s\S]*?height: 24\.234375rem;[\s\S]*?width: min\(32\.5rem, 100%\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-voice-picker__artwork \{[\s\S]*?height: 9rem;[\s\S]*?width: 9rem;/,
    );
  });
});
