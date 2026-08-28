import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const captureScript = readFileSync(
  new URL("../scripts/capture-current-mcp.mjs", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("current MCP capture policy", () => {
  it("keeps the promoted capture entry point capture-only", () => {
    expect(packageJson.scripts["capture:current-mcp"]).toBe(
      "node scripts/capture-current-mcp.mjs",
    );
    expect(captureScript).toContain(
      "Capture-only: this script never submits a prompt.",
    );
    expect(captureScript).not.toMatch(
      /\.fill\(|\.type\(|keyboard\.type|\.press\(["']Enter["']/,
    );
  });

  it("requires exact isolated ownership before navigation", () => {
    expect(captureScript).toContain("--remote-debugging-address=");
    expect(captureScript).toContain("--remote-debugging-port=");
    expect(captureScript).toContain("--user-data-dir=");
    expect(captureScript).toContain("127.0.0.1");
    expect(captureScript).toContain("/private/tmp/codex-ui-kit-");
    expect(captureScript).toContain("taskTitleSha256");
    expect(captureScript).toContain("currentBaselineFingerprint");
    expect(captureScript).toContain("current-mcp-capture-");
  });
});
