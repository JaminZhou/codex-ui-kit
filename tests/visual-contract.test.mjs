import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectCurrentThreadVisualScenes } from "../scripts/check-current-thread-visual.mjs";

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
const captureScript = readFileSync(
  new URL("../scripts/capture-current-visual-assets.mjs", import.meta.url),
  "utf8",
);
const updaterScript = readFileSync(
  new URL("../scripts/update-current-visual-assets.mjs", import.meta.url),
  "utf8",
);

describe("current-thread visual contract", () => {
  it("measures the removed structural header control before asserting its absence", () => {
    const declaration =
      "const currentThreadNewChatInputs = iconInputs.filter(";
    const observation =
      "structuralNewChatIconCount: currentThreadNewChatInputs.length";

    expect(captureScript).toContain(declaration);
    expect(captureScript).toContain(observation);
    expect(captureScript.indexOf(declaration)).toBeLessThan(
      captureScript.indexOf(observation),
    );
  });

  it("captures MCP tool glyphs from both group and call-row owners", () => {
    expect(captureScript).toContain(
      "for (const svg of [...groupToolIcons, ...callToolIcons])",
    );
    expect(captureScript).toContain(
      'icons.push(captureSemanticSvg(svg, "thread-mcp-tool"))',
    );
  });

  it("regenerates the replay subset inside an MCP manifest write", () => {
    const mcpBranch = updaterScript.slice(
      updaterScript.indexOf("if (mcpOnly)"),
      updaterScript.indexOf("if (threadOnly)"),
    );

    expect(mcpBranch).toContain("writeManifestAndCurrentThreadSubset(");
    expect(mcpBranch).not.toContain("writeFileSync(manifestPath");
  });

  it("keeps the completed-thread compatibility command", () => {
    expect(packageJson.scripts["check:visual:current-thread"]).toBe(
      "pnpm build:demo && node scripts/check-current-thread-visual.mjs",
    );
    expect(selectCurrentThreadVisualScenes({})).toEqual([
      "current-thread-completed",
    ]);
    expect(
      selectCurrentThreadVisualScenes({
        CODEX_UI_KIT_THREAD_COMPACT_REFERENCE: "/tmp/compact.png",
      }),
    ).toEqual([
      "current-thread-completed",
      "current-thread-completed-compact",
    ]);
    expect(
      selectCurrentThreadVisualScenes({
        CODEX_UI_KIT_THREAD_STREAMING_COMPACT_REFERENCE:
          "/tmp/streaming-compact.png",
        CODEX_UI_KIT_THREAD_STREAMING_REFERENCE: "/tmp/streaming.png",
      }),
    ).toEqual([
      "current-thread-completed",
      "current-thread-streaming",
      "current-thread-streaming-compact",
    ]);
  });

  it("registers every sampled workflow state as an independent scenario", () => {
    expect(scenarios.version).toBe(1);
    expect(scenarios.scenarios.map((scenario) => scenario.id)).toEqual([
      "current-thread-completed",
      "current-thread-completed-compact",
      "current-thread-streaming",
      "current-thread-streaming-compact",
      "current-thread-tool-call",
      "current-thread-approval",
      "current-workspace-file-diff",
      "current-compact-search-tool",
      "current-compact-browser-tool",
      "current-compact-mcp-unavailable",
      "current-compact-command-failure",
      "current-medium-message-navigation",
      "current-compact-scroll-away",
      "current-compact-interrupted",
      "current-compact-context-running",
      "current-compact-context-completed",
      "current-review-file-card",
      "current-review-workspace",
    ]);
    expect(packageJson.scripts["check:visual:streaming"]).toContain(
      "--scenes=current-thread-streaming,current-thread-streaming-compact",
    );
    expect(packageJson.scripts["check:visual:workflow"]).toContain(
      "--scenes=current-thread-tool-call,current-thread-approval,current-workspace-file-diff",
    );
    expect(packageJson.scripts["check:visual:tool-recovery"]).toContain(
      "--scenes=current-compact-search-tool,current-compact-browser-tool,current-compact-mcp-unavailable,current-compact-command-failure",
    );
    expect(packageJson.scripts["check:visual:continuity"]).toContain(
      "--scenes=current-medium-message-navigation,current-compact-scroll-away,current-compact-interrupted,current-compact-context-running,current-compact-context-completed",
    );
    expect(packageJson.scripts["check:visual:review"]).toContain(
      "--scenes=current-review-file-card,current-review-workspace",
    );
  });

  it("keeps references external and masks only declared cross-owner regions", () => {
    const completed = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-completed",
    );
    const streaming = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-streaming",
    );
    const compactCompleted = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-completed-compact",
    );
    const compactStreaming = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-thread-streaming-compact",
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
    expect(compactCompleted).toMatchObject({
      referenceEnv: "CODEX_UI_KIT_THREAD_COMPACT_REFERENCE",
      expectedGeometry: {
        composer: { height: 98, left: 16, top: 566, width: 688 },
        header: { height: 46, left: 0, top: 0, width: 720 },
      },
      masks: [],
    });
    expect(streaming.referenceEnv).toBe(
      "CODEX_UI_KIT_THREAD_STREAMING_REFERENCE",
    );
    expect(streaming.expectedGeometry.stop).toEqual(
      expect.objectContaining({
        height: 28,
        left: 922,
        padding: "2px",
        top: 768,
        width: 28,
      }),
    );
    expect(streaming.expectedGeometry.stopIcon).toEqual({
      height: 16,
      left: 928,
      top: 774,
      width: 16,
    });
    expect(streaming.masks).toEqual([]);
    expect(compactStreaming).toMatchObject({
      capture: "current-thread-streaming-compact",
      expectedGeometry: {
        assistant: { left: 16, top: { tolerance: 1, value: -17 }, width: 688 },
        composer: { height: 98, left: 16, top: 566, width: 688 },
        stop: { height: 28, left: 668, top: 628, width: 28 },
        user: { height: 82, left: 174, top: -145, width: 530 },
      },
      masks: [],
      referenceEnv: "CODEX_UI_KIT_THREAD_STREAMING_COMPACT_REFERENCE",
      warmViewport: { height: 820, width: 1180 },
    });
    const fileDiff = scenarios.scenarios.find(
      (scenario) => scenario.id === "current-workspace-file-diff",
    );
    expect(fileDiff.regions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ left: 0, name: "thread-turn", width: 666 }),
        expect.objectContaining({ left: 666, name: "review", width: 406 }),
      ]),
    );
    expect(scenarioScript).toContain("process.env[scenario.referenceEnv]");
    expect(scenarioScript).toContain("applyMasks(reference, actual");
    expect(scenarioScript).toContain("region.width ?? diff.width - left");
    expect(scenarioScript).toContain("!Number.isInteger(left)");
    expect(scenarioScript).toContain("geometryContractViolations.length > 0");
    expect(scenarioScript).toContain("scenario.warmViewport");
  });
});
