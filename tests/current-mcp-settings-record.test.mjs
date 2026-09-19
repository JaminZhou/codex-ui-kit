import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const record = JSON.parse(
  readFileSync(
    new URL("../research/current-mcp-settings-26.915.json", import.meta.url),
    "utf8",
  ),
);

describe("current 26.915 MCP settings record", () => {
  it("pins the installed candidate and read-only route geometry", () => {
    expect(record.schemaVersion).toBe(1);
    expect(record.baseline).toMatchObject({
      appVersion: "26.915.31945",
      buildNumber: "9922",
      chromiumVersion: "153.0.8010.48",
      appAsarSha256:
        "1f7939c1c781887c167043c4d1d307af3400d324685cfc315dfe2f80e634f483",
    });
    expect(record.isolation.mainCodexProcessPreserved).toBe(true);
    expect(record.mcp.wide.viewport).toEqual({ width: 1180, height: 820 });
    expect(record.mcp.compact.viewport).toEqual({ width: 720, height: 680 });
    expect(record.mcp.wide.servers.rowCount).toBe(4);
    expect(record.mcp.compact.fromPlugins.rowCount).toBe(2);
    expect(record.mcp.wide.servers.rows).toHaveLength(4);
    expect(record.mcp.wide.servers.rows.every((row) => row.rect.height === 52)).toBe(
      true,
    );
    expect(record.mcp.compact.search).toBeNull();
    expect(record.mcp.wide.horizontalOverflow).toBe(0);
    expect(record.mcp.compact.horizontalOverflow).toBe(0);
  });

  it("keeps lifecycle observations explicitly read-only", () => {
    expect(record.mcp.stdio.saveDisabled).toBe(true);
    expect(record.mcp.http.saveDisabled).toBe(true);
    expect(record.mcp.compactEditor.saveDisabled).toBe(true);
    expect(record.mcp.detail.saveDisabled).toBe(true);
    expect(record.mcp.detail.uninstallVisible).toBe(true);
    expect(record.mcp.empty.searchHasFocus).toBe(true);
    expect(record.mcp.empty.message).toBe("No MCP servers found");
  });
});
