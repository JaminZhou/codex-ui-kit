import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const captureScript = readFileSync(
  new URL("../scripts/capture-current-thread-overflow.mjs", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("current thread overflow capture policy", () => {
  it("keeps the native menu observation read only", () => {
    expect(packageJson.scripts["capture:current-thread-overflow-26-825"]).toBe(
      "node scripts/capture-current-thread-overflow.mjs",
    );
    expect(captureScript).toContain("never selects a");
    expect(captureScript).toContain("native menu item or mutates");
    expect(captureScript).not.toMatch(
      /getByRole\(["']menuitem["'][\s\S]{0,160}\.click\(/,
    );
    expect(captureScript).not.toMatch(
      /\.fill\(|\.type\(|keyboard\.type|\.press\(["']Enter["']|Input\.dispatch/,
    );
    expect(captureScript).not.toMatch(
      /name:\s*["'](?:Pin|Rename|Archive|Share|New side chat|Add scheduled task|Open in new window)["'][\s\S]{0,120}\.click\(/,
    );
  });

  it("requires the promoted fingerprint and exact isolated owner", () => {
    expect(captureScript).toContain("--remote-debugging-address=");
    expect(captureScript).toContain("--remote-debugging-port=");
    expect(captureScript).toContain("--user-data-dir=");
    expect(captureScript).toContain("127.0.0.1");
    expect(captureScript).toContain("/private/tmp/codex-ui-kit-");
    expect(captureScript).toContain("currentBaselineFingerprint");
    expect(captureScript).toContain("current-thread-overflow-capture-");
    expect(captureScript).toContain(
      "CODEX_CURRENT_THREAD_OVERFLOW_ALLOW_CAPTURE",
    );
    expect(captureScript).toContain("TASK_TITLE_SHA256");
  });
});
