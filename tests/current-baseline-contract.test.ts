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
    const state = (
      width: number,
      height: number,
      geometry: {
        editorLeft: number;
        editorWidth: number;
        mainWidth: number;
      },
      navigationScrollOwners: unknown[] = [],
    ) => ({
      colorScheme: "dark",
      controls: { "Show sidebar": [] },
      editor: {
        rect: {
          height: 44,
          left: geometry.editorLeft,
          width: geometry.editorWidth,
        },
      },
      horizontalOverflow: 0,
      main: [{ width: geometry.mainWidth }],
      navigation: { width: 274.11 },
      navigationScrollOwners,
      routeMarkers: { newChatHome: 1 },
      routes: { "Pull requests": [{ ariaCurrent: null }] },
      viewport: { devicePixelRatio: 1, height, width },
    });
    const wide = state(
      1180,
      820,
      { editorLeft: 371.05, editorWidth: 712, mainWidth: 905.89 },
      [
        {
          clientHeight: 705,
          overflowY: "auto",
          rect: { height: 705 },
          scrollHeight: 949,
        },
      ],
    );
    const medium = state(
      820,
      680,
      { editorLeft: 302.11, editorWidth: 489.89, mainWidth: 545.89 },
      [
        {
          clientHeight: 565,
          overflowY: "auto",
          rect: { height: 565 },
          scrollHeight: 949,
        },
      ],
    );
    const threshold = state(721, 680, {
      editorLeft: 302.11,
      editorWidth: 390.89,
      mainWidth: 446.89,
    });
    const compactPinned = state(720, 680, {
      editorLeft: 302.11,
      editorWidth: 389.89,
      mainWidth: 445.89,
    });
    const compactCollapsed = {
      ...state(720, 680, {
        editorLeft: 28,
        editorWidth: 664,
        mainWidth: 720,
      }),
      controls: { "Show sidebar": [{}] },
      navigation: null,
    };
    const compactPullRequests = {
      ...compactPinned,
      editor: null,
      routeMarkers: { newChatHome: 0 },
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
        compactPinned,
        compactPullRequests,
        compactRestored: compactPinned,
        mediumNewChat: medium,
        thresholdNewChat: threshold,
        wideNewChat: wide,
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
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          mediumNewChat: {
            ...record.states.mediumNewChat,
            viewport: { devicePixelRatio: 1, height: 680, width: 821 },
          },
        },
      }),
    ).toThrow("required viewport matrix");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          mediumNewChat: {
            ...record.states.mediumNewChat,
            navigation: { width: 260 },
          },
        },
      }),
    ).toThrow("responsive shell and route-continuity contract");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactPinned: {
            ...record.states.compactPinned,
            editor: { rect: { height: 44, left: 302.11, width: 380 } },
          },
        },
      }),
    ).toThrow("exact New chat shell geometry");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          wideNewChat: {
            ...record.states.wideNewChat,
            navigationScrollOwners: [],
          },
        },
      }),
    ).toThrow("sidebar scroll ownership");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactPullRequests: {
            ...record.states.compactPullRequests,
            editor: { rect: { height: 44, left: 302.11, width: 389.89 } },
          },
        },
      }),
    ).toThrow("responsive shell and route-continuity contract");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactRestored: {
            ...record.states.compactRestored,
            navigation: { width: 260 },
          },
        },
      }),
    ).toThrow("responsive shell and route-continuity contract");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactRestored: {
            ...record.states.compactRestored,
            viewport: { devicePixelRatio: 1, height: 681, width: 720 },
          },
        },
      }),
    ).toThrow("required viewport matrix");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactRestored: {
            ...record.states.compactRestored,
            routeMarkers: { newChatHome: 0 },
          },
        },
      }),
    ).toThrow("New chat route boundary");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactPinned: {
            ...record.states.compactPinned,
            horizontalOverflow: undefined,
          },
        },
      }),
    ).toThrow("finite horizontal-overflow measurement");
  });

  it("normalizes transient Renderer state without unsafe reloads or retained content", () => {
    const captureSource = readFileSync(
      new URL("../scripts/capture-current-baseline.mjs", import.meta.url),
      "utf8",
    );

    expect(captureSource).toContain(
      "The sidebar did not collapse automatically at the 720px breakpoint.",
    );
    expect(captureSource.indexOf("const automaticallyCollapsed")).toBeLessThan(
      captureSource.indexOf("await hideSidebar();"),
    );
    expect(captureSource).toContain('return "non-app-page";');
    expect(captureSource).toContain('[data-testid="home-icon"]:visible');
    expect(captureSource).not.toContain(".reload(");
    expect(captureSource).not.toContain(".screenshot(");
    expect(captureSource).not.toContain("document.body.textContent");
  });
});
