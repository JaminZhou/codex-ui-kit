import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("command execution styles", () => {
  it("constrains direct SVG and image icons to the wrapper", () => {
    expect(styles).toMatch(
      /\.codex-ui-command-execution__icon > :is\(img, svg\) \{[\s\S]*?display: block;[\s\S]*?height: 100%;[\s\S]*?width: 100%;[\s\S]*?\}/,
    );
  });
});
