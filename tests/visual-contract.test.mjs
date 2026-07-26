import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("current-thread visual contract", () => {
  it("builds the demo before comparing the current implementation", () => {
    expect(packageJson.scripts["check:visual:current-thread"]).toBe(
      "pnpm build:demo && node scripts/check-current-thread-visual.mjs",
    );
  });
});
