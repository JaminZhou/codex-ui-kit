import { describe, expect, it } from "vitest";
import { chromeExecutableCommands } from "../scripts/browser-executable.mjs";

describe("browser executable discovery", () => {
  it("supports the Chrome and Chromium command names used by Linux packages", () => {
    expect(chromeExecutableCommands).toEqual([
      "google-chrome",
      "google-chrome-stable",
      "chromium",
      "chromium-browser",
    ]);
  });
});
