import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const captureScript = readFileSync(
  new URL("../scripts/capture-current-skill-detail.mjs", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("current skill detail capture policy", () => {
  it("limits Try now to an unsent capture boundary", () => {
    expect(packageJson.scripts["capture:current-skill-detail-26-825"]).toBe(
      "node scripts/capture-current-skill-detail.mjs",
    );
    expect(captureScript).toContain("unsent Try now draft");
    expect(captureScript).toContain("It never toggles, opens, reveals, copies, uninstalls, or submits.");
    expect(captureScript).not.toMatch(
      /\.fill\(|\.type\(|keyboard\.type|\.press\(["']Enter["']|Input\.dispatch/,
    );
    expect(captureScript).not.toMatch(
      /getByRole\(["'](?:switch|menuitem)["'][\s\S]{0,160}\.click\(/,
    );
    expect(captureScript).not.toMatch(
      /getByRole\(["']button["'][\s\S]{0,100}name:\s*["']Send["'][\s\S]{0,100}\.click\(/,
    );
  });

  it("requires the promoted fingerprint and exact isolated owner", () => {
    expect(captureScript).toContain("--remote-debugging-address=");
    expect(captureScript).toContain("--remote-debugging-port=");
    expect(captureScript).toContain("--user-data-dir=");
    expect(captureScript).toContain("127.0.0.1");
    expect(captureScript).toContain("/private/tmp/codex-ui-kit-");
    expect(captureScript).toContain("currentBaselineFingerprint");
    expect(captureScript).toContain("current-skill-detail-capture-");
    expect(captureScript).toContain(
      "CODEX_CURRENT_SKILL_DETAIL_ALLOW_CAPTURE",
    );
  });
});
