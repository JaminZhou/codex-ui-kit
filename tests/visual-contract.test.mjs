import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const scenarios = JSON.parse(
  readFileSync(
    new URL("../research/visual-scenarios.json", import.meta.url),
    "utf8",
  ),
);
const scenarioScript = readFileSync(
  new URL("../scripts/check-visual-scenarios.mjs", import.meta.url),
  "utf8",
);

describe("current-thread visual contract", () => {
  it("keeps the completed-thread compatibility command", () => {
    expect(packageJson.scripts["check:visual:current-thread"]).toBe(
      "pnpm build:demo && node scripts/check-current-thread-visual.mjs",
    );
  });

  it("registers completed and streaming states as independent scenarios", () => {
    expect(scenarios.version).toBe(1);
    expect(scenarios.scenarios.map((scenario) => scenario.id)).toEqual([
      "current-thread-completed",
      "current-thread-streaming",
    ]);
    expect(packageJson.scripts["check:visual:streaming"]).toContain(
      "--scenes=current-thread-streaming",
    );
  });

  it("keeps references external and masks only declared cross-owner regions", () => {
    const completed = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-completed",
    );
    const streaming = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-streaming",
    );

    expect(completed).toMatchObject({
      maximumDiffRatioEnv: "CODEX_UI_KIT_VISUAL_MAX_DIFF",
      pixelThresholdEnv: "CODEX_UI_KIT_PIXEL_THRESHOLD",
    });
    expect(completed.regions.map((region) => region.maximumDiffRatioEnv)).toEqual(
      [
        "CODEX_UI_KIT_VISUAL_MAX_HEADER_DIFF",
        "CODEX_UI_KIT_VISUAL_MAX_MESSAGES_DIFF",
        "CODEX_UI_KIT_VISUAL_MAX_COMPOSER_DIFF",
      ],
    );
    expect(streaming.referenceEnv).toBe(
      "CODEX_UI_KIT_THREAD_STREAMING_REFERENCE",
    );
    expect(streaming.expectedGeometry.stop).toEqual(
      expect.objectContaining({
        height: 28,
        left: 868,
        top: 768,
        width: 28,
      }),
    );
    expect(streaming.masks).toEqual([
      expect.objectContaining({
        name: "workspace-environment-control",
        reason: expect.stringContaining("outside the thread scene"),
      }),
    ]);
    expect(scenarioScript).toContain("process.env[scenario.referenceEnv]");
    expect(scenarioScript).toContain("applyMasks(reference, actual");
    expect(scenarioScript).toContain("geometryContractViolations.length > 0");
  });
});
