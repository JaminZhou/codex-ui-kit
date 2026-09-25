import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const captureScript = readFileSync(
  new URL("../scripts/capture-current-composer-menu.mjs", import.meta.url),
  "utf8",
);

describe("current Composer-menu product capture policy", () => {
  it("gates the screenshot recipe to the fingerprinted installed candidate", () => {
    expect(packageJson.scripts["capture:current-composer-menu-26-917-71314"]).toBe(
      "node scripts/capture-current-composer-menu.mjs",
    );
    expect(captureScript).toContain(
      "currentLatestInstalledCandidateBaselineFingerprint",
    );
    expect(captureScript).toContain('process.env.CODEX_CURRENT_COMPOSER_MENU_ALLOW_CAPTURE === "1"');
    expect(captureScript).toContain("selectCurrentMainCandidate(candidates)");
    expect(captureScript).toContain("127.0.0.1:${port}");
    expect(captureScript).toContain('maskColor: "#3a3a3a"');
    expect(captureScript).toContain("Loading plugins...");
    expect(captureScript).toContain("currently materialized Renderer rows only");
    expect(captureScript).toContain('productScreenshots: "local-only-not-committed"');
  });

  it("does not retain non-allowlisted row text or submit a prompt", () => {
    expect(captureScript).toContain("publicAndRedactedOrder");
    expect(captureScript).toContain("redactedSlots");
    expect(captureScript).toContain("publicRowStyles");
    expect(captureScript).toContain("row.id ? [{ id: row.id, ...row.style }] : []");
    expect(captureScript).toContain("focusAfterDismissal");
    expect(captureScript).toContain("mutatedTaskState: false");
    expect(captureScript).toContain("submittedPrompt: false");
    expect(captureScript).not.toMatch(/\.fill\(|\.type\(|\.press\("Enter"\)/);
  });
});
