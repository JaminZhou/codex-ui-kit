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
    expect(packageJson.scripts["capture:current-mcp-26-915"]).toBe(
      "CODEX_CURRENT_MCP_FINGERPRINT=26.915.31945 node scripts/capture-current-mcp.mjs",
    );
    expect(packageJson.scripts["capture:current-mcp-26-917-71314"]).toBe(
      "CODEX_CURRENT_MCP_FINGERPRINT=26.917.71314 node scripts/capture-current-mcp.mjs",
    );
    expect(packageJson.scripts["capture:current-mcp-settings-26-915"]).toBe(
      "CODEX_CURRENT_MCP_SETTINGS_FINGERPRINT=26.915.31945 node scripts/capture-current-mcp-settings.mjs",
    );
    expect(packageJson.scripts["capture:current-integrations-26-915"]).toBe(
      "CODEX_CURRENT_INTEGRATIONS_FINGERPRINT=26.915.31945 node scripts/capture-current-integrations.mjs",
    );
    expect(captureScript).toContain(
      "Capture-only: this script never submits a prompt.",
    );
    expect(captureScript).toContain("currentInstalledCandidateBaselineFingerprint");
    expect(captureScript).toContain("currentLatestInstalledCandidateBaselineFingerprint");
    expect(captureScript).toContain('captureMode: "native-viewport-only"');
    expect(captureScript).toContain("mutationsSubmitted: false");
    expect(captureScript).toContain("Unsupported MCP capture fingerprint");
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
