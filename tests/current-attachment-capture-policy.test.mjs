import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const captureScript = readFileSync(
  new URL("../scripts/capture-current-attachment.mjs", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("current attachment capture policy", () => {
  it("keeps the promoted capture entry point read-only", () => {
    expect(packageJson.scripts["capture:current-attachment-26-825"]).toBe(
      "node scripts/capture-current-attachment.mjs",
    );
    expect(captureScript).toContain("Capture-only.");
    expect(captureScript).not.toMatch(
      /Input\.dispatchDragEvent|\.fill\(|\.type\(|keyboard\.type|\.press\(["']Enter["']|Archive/,
    );
  });

  it("requires the promoted fingerprint and exact isolated ownership", () => {
    expect(captureScript).toContain("--remote-debugging-address=");
    expect(captureScript).toContain("--remote-debugging-port=");
    expect(captureScript).toContain("--user-data-dir=");
    expect(captureScript).toContain("127.0.0.1");
    expect(captureScript).toContain("/private/tmp/codex-ui-kit-");
    expect(captureScript).toContain("currentBaselineFingerprint");
    expect(captureScript).toContain("CODEX_CURRENT_ATTACHMENT_STATE");
    expect(captureScript).toContain("current-attachment-26-825-");
  });
});
