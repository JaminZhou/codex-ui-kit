import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertCurrentBaselineRecord,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "../scripts/current-baseline-contract.mjs";

const candidate = (overrides: Record<string, unknown> = {}) => ({
  area: 1180 * 820,
  index: 1,
  landmarks: { main: 2, nav: 1, sidebarTrigger: 1, textbox: 1 },
  url: "app://-/index.html",
  visibleControls: 80,
  ...overrides,
});

describe("current baseline capture contract", () => {
  it("selects the structural main Renderer instead of target order", () => {
    expect(
      selectCurrentMainCandidate([
        candidate({
          area: 408 * 400,
          index: 0,
          landmarks: { main: 1, nav: 0, sidebarTrigger: 0, textbox: 0 },
          url: "app://-/index.html?initialRoute=%2Favatar-overlay",
          visibleControls: 1,
        }),
        candidate(),
        candidate({ area: 400_000, index: 2, visibleControls: 20 }),
      ]).index,
    ).toBe(1);
  });

  it("fails closed when structurally valid targets are ambiguous", () => {
    expect(() =>
      selectCurrentMainCandidate([
        candidate({ area: 900_000, index: 0 }),
        candidate({ area: 800_000, index: 1 }),
      ]),
    ).toThrow("ambiguous");
  });

  it("requires shell landmarks and interactive density", () => {
    expect(() =>
      selectCurrentMainCandidate([
        candidate({
          landmarks: { main: 1, nav: 0, sidebarTrigger: 0, textbox: 1 },
        }),
      ]),
    ).toThrow("not found");
  });

  it("keeps the required width matrix and rejects user-content keys", () => {
    const state = (width: number, height: number) => ({
      colorScheme: "dark",
      controls: { "Show sidebar": [] },
      editor: {},
      horizontalOverflow: 0,
      navigation: { width: 274.11 },
      routes: { "Pull requests": [{ ariaCurrent: null }] },
      viewport: { devicePixelRatio: 1, height, width },
    });
    const compactCollapsed = {
      ...state(720, 680),
      controls: { "Show sidebar": [{}] },
      navigation: null,
    };
    const compactPullRequests = {
      ...state(720, 680),
      routes: { "Pull requests": [{ ariaCurrent: "page" }] },
    };
    const record = {
      baseline: {
        appAsarSha256: "a".repeat(64),
        appVersion: "26.803.41515",
        buildNumber: "6321",
        chromiumVersion: "151.0.7922.76",
      },
      captureKind: "renderer_emulation",
      schemaVersion: 1,
      states: {
        compactCollapsed,
        compactPinned: state(720, 680),
        compactPullRequests,
        compactRestored: state(720, 680),
        mediumNewChat: state(820, 680),
        thresholdNewChat: state(721, 680),
        wideNewChat: state(1180, 820),
      },
      targetSelection: { selected: { url: "app://-/index.html" } },
    };

    expect(() => assertCurrentBaselineRecord(record)).not.toThrow();
    expect(currentBaselineViewports.compact.width).toBe(720);
    expect(() =>
      assertCurrentBaselineRecord({ ...record, projectName: "private" }),
    ).toThrow("forbidden user-content key");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactCollapsed: {
            ...record.states.compactCollapsed,
            colorScheme: "light",
          },
        },
      }),
    ).toThrow("expected dark color scheme");
  });

  it("normalizes transient Renderer state without unsafe reloads or retained content", () => {
    const captureSource = readFileSync(
      new URL("../scripts/capture-current-baseline.mjs", import.meta.url),
      "utf8",
    );

    expect(captureSource).toContain("await hideSidebar();");
    expect(captureSource).toContain('return "non-app-page";');
    expect(captureSource).not.toContain(".reload(");
    expect(captureSource).not.toContain(".screenshot(");
    expect(captureSource).not.toContain("document.body.textContent");
  });
});
