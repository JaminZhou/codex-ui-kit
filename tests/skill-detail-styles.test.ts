import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("SkillDetail styles", () => {
  it("keeps the measured wide and compact dialog geometry", () => {
    expect(styles).toContain("height: min(45rem, 100dvh)");
    expect(styles).toContain("width: min(37.5rem, 100dvw)");
    expect(styles).toContain("border-radius: 1.5625rem");
    expect(styles).toContain("flex: 0 0 7.5rem");
  });

  it("keeps scroll, menu, switch, and mention layers explicit", () => {
    expect(styles).toContain(".codex-ui-skill-detail__content");
    expect(styles).toContain("overflow: auto");
    expect(styles).toContain(".codex-ui-skill-detail__menu");
    expect(styles).toContain('.codex-ui-skill-detail__switch[aria-checked="true"]');
    expect(styles).toContain(".codex-ui-skill-prompt-mention");
  });
});
