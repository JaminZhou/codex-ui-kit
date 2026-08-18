import { describe, expect, it } from "vitest";
import {
  collectCurrentMcpVisualAssets,
  mergeSupplementalCurrentMcpCapture,
} from "../scripts/visual-asset-mcp-contract.mjs";

const baseline = {
  appAsarSha256: "new-fingerprint",
  appVersion: "26.900.1",
  buildNumber: "7000",
  interactionState: "completed-current-mcp-thread",
  theme: "dark",
  viewport: { height: 820, width: 1180 },
};

function icon(semanticId, sha256 = `${semanticId}-sha`) {
  return {
    owner: { semanticId },
    region: "conversation",
    sha256,
  };
}

function completedMcpCapture(overrides = {}) {
  return {
    baselineContext: baseline,
    captureMode: "completed-mcp-thread",
    icons: [
      icon("thread-mcp-tool", "tool-sha"),
      icon("thread-mcp-tool", "tool-sha"),
      icon("thread-mcp-tool", "tool-sha"),
      icon("thread-activity-chevron"),
      icon("thread-reconnecting"),
    ],
    mcpObservation: {
      activityChevronCount: 1,
      callCount: 2,
      callHeight: 21,
      callToolIconCount: 2,
      groupCount: 1,
      groupHeight: 21,
      groupToolIconCount: 1,
      openGroupChevronRotate: "90deg",
      reconnectingIconCount: 1,
    },
    ...overrides,
  };
}

describe("current MCP visual asset contract", () => {
  it("requires every group and call-row glyph in one fingerprint", () => {
    const observed = collectCurrentMcpVisualAssets(completedMcpCapture());

    expect(observed.get("thread-mcp-tool")).toHaveLength(3);
    expect(observed.get("thread-activity-chevron")).toHaveLength(1);
    expect(observed.get("thread-reconnecting")).toHaveLength(1);

    const missingCallGlyph = completedMcpCapture();
    missingCallGlyph.icons.splice(2, 1);
    expect(() => collectCurrentMcpVisualAssets(missingCallGlyph)).toThrow(
      "expected 3 thread-mcp-tool captures, received 2",
    );
  });

  it("merges a same-new-build supplemental capture before atomic promotion", () => {
    const fullCapture = {
      baselineContext: { ...baseline, interactionState: "full-shell" },
      captureMode: "full",
      icons: [icon("sidebar-new-chat")],
    };

    const merged = mergeSupplementalCurrentMcpCapture(
      fullCapture,
      completedMcpCapture(),
    );

    expect(merged.icons).toHaveLength(6);
    expect(
      merged.icons.filter(
        ({ owner }) => owner.semanticId === "thread-mcp-tool",
      ),
    ).toHaveLength(3);
    expect(fullCapture.icons).toHaveLength(1);
  });

  it("rejects supplemental evidence from a different build", () => {
    const fullCapture = {
      baselineContext: { ...baseline, interactionState: "full-shell" },
      captureMode: "full",
      icons: [],
    };
    const staleCapture = completedMcpCapture({
      baselineContext: { ...baseline, appVersion: "26.899.9" },
    });

    expect(() =>
      mergeSupplementalCurrentMcpCapture(fullCapture, staleCapture),
    ).toThrow("must match the full capture fingerprint, theme, and viewport");
  });

  it("rejects a supplement outside the full-refresh transaction", () => {
    expect(() =>
      mergeSupplementalCurrentMcpCapture(
        {
          baselineContext: baseline,
          captureMode: "completed-thread",
          icons: [],
        },
        completedMcpCapture(),
      ),
    ).toThrow("can merge only into a full visual asset capture");
  });
});
