import { readFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCurrentBaselineRecord,
  assertCurrentSidebarLifecycle,
  currentBaselineFingerprint,
  currentBaselineViewports,
  runBestEffortCurrentBaselineCleanup,
  selectCurrentMainCandidate,
  writeCurrentBaselineOutput,
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

  it("selects the main shell before a route-specific composer exists", () => {
    expect(
      selectCurrentMainCandidate([
        candidate({
          landmarks: { main: 2, nav: 1, sidebarTrigger: 1, textbox: 0 },
        }),
      ]).index,
    ).toBe(1);
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

  it("creates output without following links outside the profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-baseline-output-"));
    const profile = join(root, "profile");
    const outside = join(root, "outside.json");
    try {
      await mkdir(profile);
      await writeFile(outside, "keep", "utf8");
      await symlink(outside, join(profile, "linked.json"));

      await expect(
        writeCurrentBaselineOutput(
          profile,
          join(profile, "linked.json"),
          "overwrite",
        ),
      ).rejects.toThrow("new non-symlink file");
      await expect(readFile(outside, "utf8")).resolves.toBe("keep");
      await expect(
        writeCurrentBaselineOutput(
          profile,
          join(profile, "nested", "capture.json"),
          "escape",
        ),
      ).rejects.toThrow("direct child");

      const safeOutput = join(profile, "capture.json");
      await writeCurrentBaselineOutput(profile, safeOutput, "safe");
      await expect(readFile(safeOutput, "utf8")).resolves.toBe("safe");
      await expect(
        writeCurrentBaselineOutput(profile, safeOutput, "overwrite"),
      ).rejects.toThrow("new non-symlink file");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("attempts every renderer cleanup step after an earlier failure", async () => {
    const attempts: string[] = [];
    const failures = await runBestEffortCurrentBaselineCleanup([
      {
        name: "return-new-chat",
        run: async () => {
          attempts.push("return-new-chat");
          throw new Error("synthetic route cleanup failure");
        },
      },
      {
        name: "hide-sidebar",
        run: async () => {
          attempts.push("hide-sidebar");
        },
      },
    ]);

    expect(attempts).toEqual(["return-new-chat", "hide-sidebar"]);
    expect(failures).toEqual(["return-new-chat"]);
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
      controls: {
        "Add files and more": [{}],
        Back: [{}],
        Dictate: [{}],
        Forward: [{}],
        "Hide sidebar": [{}],
        "Show sidebar": [],
        "Start new voice chat": [{}],
      },
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
      routes: Object.fromEntries(
        ["New chat", "Plugins", "Pull requests", "Scheduled", "Sites"].map(
          (route) => [route, [{ ariaCurrent: null }]],
        ),
      ),
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
          scrollHeight: 909,
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
      controls: {
        ...state(720, 680, {
          editorLeft: 28,
          editorWidth: 664,
          mainWidth: 720,
        }).controls,
        "Hide sidebar": [],
        "Show sidebar": [{}],
      },
      navigation: null,
      routes: Object.fromEntries(
        ["New chat", "Plugins", "Pull requests", "Scheduled", "Sites"].map(
          (route) => [route, []],
        ),
      ),
    };
    const compactPullRequests = {
      ...compactPinned,
      controls: {
        ...compactPinned.controls,
        "Add files and more": [],
        Dictate: [],
        "Start new voice chat": [],
      },
      editor: null,
      routeMarkers: { newChatHome: 0 },
      routes: {
        ...compactPinned.routes,
        "Pull requests": [{ ariaCurrent: "page" }],
      },
    };
    const record = {
      baseline: {
        appAsarBytes: 223_451_508,
        appAsarSha256:
          "928129601e8b36eccba603114d6912352f2b13182f3a7d60b32166d0e81aafb5",
        appVersion: "26.803.61601",
        buildNumber: "6396",
        chromiumVersion: "151.0.7922.76",
      },
      captureKind: "renderer_emulation",
      runtimeBundleIdentity: {
        afterCapture: {
          appAsarBytes: 223_451_508,
          appAsarSha256:
            "928129601e8b36eccba603114d6912352f2b13182f3a7d60b32166d0e81aafb5",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_351_000_000,
          device: "16777231",
          inode: "341558647",
        },
        beforeCapture: {
          appAsarBytes: 223_451_508,
          appAsarSha256:
            "928129601e8b36eccba603114d6912352f2b13182f3a7d60b32166d0e81aafb5",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_350_900_000,
          device: "16777231",
          inode: "341558647",
        },
        ownerPid: 25_197,
        processStartedAtMs: 1_786_350_800_000,
      },
      schemaVersion: 1,
      sidebarLifecycle: {
        baseline: {
          expandedProjectGroupCount: 6,
          helpControlCount: 1,
          horizontalOverflow: 0,
          navigationWidth: 274.11,
          projectGroupCount: 6,
          projectRow: {
            rect: { height: 30, width: 258.11 },
            role: "button",
            tabIndex: 0,
            tag: "div",
          },
          settingsControlCount: 0,
        },
        enterExpanded: { expanded: true, focusOnRow: true },
        helpMenu: {
          closed: { focusReturned: true, visibleMenuCount: 0 },
          opened: {
            focusInside: true,
            focusRole: "menu",
            menuItemCount: 8,
            rect: { height: 272.06, width: 200 },
            visibleMenuCount: 1,
          },
        },
        pointerCollapsed: { expanded: false, focusOnRow: true },
        projectMenu: {
          closed: {
            activeTag: "body",
            focusReturned: false,
            visibleMenuCount: 0,
          },
          opened: {
            focusInside: true,
            focusRole: "menu",
            hasMarkAllAsRead: false,
            menuItemCount: 6,
            rect: { height: 179.38, width: 214.05 },
            visibleMenuCount: 1,
          },
        },
        responsive: {
          compactCollapsed: {
            horizontalOverflow: 0,
            navigationVisible: false,
            projectExpanded: false,
            showSidebarCount: 1,
          },
          compactPinned: {
            horizontalOverflow: 0,
            navigationVisible: true,
            navigationWidth: 274.11,
            projectExpanded: false,
          },
          keyboardRestored: { expanded: true, focusOnRow: true },
          wideRestored: {
            horizontalOverflow: 0,
            navigationVisible: true,
            navigationWidth: 274.11,
            projectExpanded: false,
          },
        },
        spaceCollapsed: { expanded: false, focusOnRow: true },
        spaceExpanded: { expanded: true, focusOnRow: true },
      },
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
    const withNavigationWidth = (
      source: (typeof record.states)[keyof typeof record.states],
      navigationWidth: number,
    ) => {
      const viewportWidth = source.viewport.width;
      const mainWidth = viewportWidth - navigationWidth;
      const editorWidth = Math.min(712, mainWidth - 56);
      return {
        ...source,
        editor: source.editor
          ? {
              ...source.editor,
              rect: {
                ...source.editor.rect,
                left:
                  navigationWidth + (mainWidth - editorWidth) / 2,
                width: editorWidth,
              },
            }
          : null,
        main: [{ width: mainWidth }],
        navigation: { width: navigationWidth },
      };
    };
    const persistedNavigationWidth = 322.91;
    const persistedRecord = {
      ...record,
      sidebarLifecycle: {
        ...record.sidebarLifecycle,
        baseline: {
          ...record.sidebarLifecycle.baseline,
          navigationWidth: persistedNavigationWidth,
          projectRow: {
            ...record.sidebarLifecycle.baseline.projectRow,
            rect: {
              ...record.sidebarLifecycle.baseline.projectRow.rect,
              width: persistedNavigationWidth - 16,
            },
          },
        },
        responsive: {
          ...record.sidebarLifecycle.responsive,
          compactPinned: {
            ...record.sidebarLifecycle.responsive.compactPinned,
            navigationWidth: persistedNavigationWidth,
          },
          wideRestored: {
            ...record.sidebarLifecycle.responsive.wideRestored,
            navigationWidth: persistedNavigationWidth,
          },
        },
      },
      states: {
        compactCollapsed: record.states.compactCollapsed,
        compactPinned: withNavigationWidth(
          record.states.compactPinned,
          persistedNavigationWidth,
        ),
        compactPullRequests: withNavigationWidth(
          record.states.compactPullRequests,
          persistedNavigationWidth,
        ),
        compactRestored: withNavigationWidth(
          record.states.compactRestored,
          persistedNavigationWidth,
        ),
        mediumNewChat: withNavigationWidth(
          record.states.mediumNewChat,
          persistedNavigationWidth,
        ),
        thresholdNewChat: withNavigationWidth(
          record.states.thresholdNewChat,
          persistedNavigationWidth,
        ),
        wideNewChat: withNavigationWidth(
          record.states.wideNewChat,
          persistedNavigationWidth,
        ),
      },
    };
    expect(() => assertCurrentBaselineRecord(persistedRecord)).not.toThrow();
    expect(() =>
      assertCurrentBaselineRecord({
        ...persistedRecord,
        sidebarLifecycle: {
          ...persistedRecord.sidebarLifecycle,
          projectMenu: {
            ...persistedRecord.sidebarLifecycle.projectMenu,
            opened: {
              ...persistedRecord.sidebarLifecycle.projectMenu.opened,
              hasMarkAllAsRead: true,
              menuItemCount: 7,
              rect: { height: 207.94, width: 214.05 },
            },
          },
        },
      }),
    ).not.toThrow();
    expect(currentBaselineFingerprint.appVersion).toBe("26.803.61601");
    expect(currentBaselineViewports.compact.width).toBe(720);
    expect(() =>
      assertCurrentSidebarLifecycle({
        ...record.sidebarLifecycle,
        helpMenu: {
          ...record.sidebarLifecycle.helpMenu,
          opened: {
            ...record.sidebarLifecycle.helpMenu.opened,
            menuItemCount: 7,
          },
        },
      }),
    ).toThrow("Help menu boundary");
    for (const invalidCount of [undefined, 5, 5.5, 7]) {
      expect(() =>
        assertCurrentSidebarLifecycle({
          ...record.sidebarLifecycle,
          baseline: {
            ...record.sidebarLifecycle.baseline,
            projectGroupCount: invalidCount,
          },
        }),
      ).toThrow("project-group baseline");
      expect(() =>
        assertCurrentSidebarLifecycle({
          ...record.sidebarLifecycle,
          baseline: {
            ...record.sidebarLifecycle.baseline,
            expandedProjectGroupCount: invalidCount,
          },
        }),
      ).toThrow("project-group baseline");
    }
    for (const invalidWidth of [undefined, 239, 521]) {
      expect(() =>
        assertCurrentSidebarLifecycle({
          ...record.sidebarLifecycle,
          baseline: {
            ...record.sidebarLifecycle.baseline,
            navigationWidth: invalidWidth,
          },
        }),
      ).toThrow("project-group baseline");
    }
    expect(() =>
      assertCurrentSidebarLifecycle({
        ...persistedRecord.sidebarLifecycle,
        baseline: {
          ...persistedRecord.sidebarLifecycle.baseline,
          projectRow: {
            ...persistedRecord.sidebarLifecycle.baseline.projectRow,
            rect: {
              ...persistedRecord.sidebarLifecycle.baseline.projectRow.rect,
              width: 258.11,
            },
          },
        },
      }),
    ).toThrow("project-group baseline");
    expect(() =>
      assertCurrentSidebarLifecycle({
        ...persistedRecord.sidebarLifecycle,
        responsive: {
          ...persistedRecord.sidebarLifecycle.responsive,
          wideRestored: {
            ...persistedRecord.sidebarLifecycle.responsive.wideRestored,
            navigationWidth: 274.11,
          },
        },
      }),
    ).toThrow("responsive state continuity");
    expect(() =>
      assertCurrentSidebarLifecycle({
        ...record.sidebarLifecycle,
        projectMenu: {
          ...record.sidebarLifecycle.projectMenu,
          opened: {
            ...record.sidebarLifecycle.projectMenu.opened,
            hasMarkAllAsRead: true,
          },
        },
      }),
    ).toThrow("project menu boundary");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        baseline: { ...record.baseline, appVersion: "26.804.0" },
      }),
    ).toThrow("promoted build fingerprint");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        runtimeBundleIdentity: {
          ...record.runtimeBundleIdentity,
          processStartedAtMs: 1_786_150_110_000,
        },
      }),
    ).toThrow("running Renderer bundle identity");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        runtimeBundleIdentity: {
          ...record.runtimeBundleIdentity,
          afterCapture: {
            ...record.runtimeBundleIdentity.afterCapture,
            inode: "341558648",
          },
        },
      }),
    ).toThrow("running Renderer bundle identity");
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
          wideNewChat: {
            ...record.states.wideNewChat,
            navigationScrollOwners: [
              {
                ...(record.states.wideNewChat
                  .navigationScrollOwners[0] as Record<string, unknown>),
                scrollHeight: 705,
              },
            ],
          },
        },
      }),
    ).toThrow("sidebar scroll ownership");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          mediumNewChat: {
            ...record.states.mediumNewChat,
            routes: { ...record.states.mediumNewChat.routes, Sites: [] },
          },
        },
      }),
    ).toThrow("primary navigation route stack");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactPinned: {
            ...record.states.compactPinned,
            controls: {
              ...record.states.compactPinned.controls,
              "Hide sidebar": [],
            },
          },
        },
      }),
    ).toThrow("fixed shell control matrix");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        states: {
          ...record.states,
          compactCollapsed: {
            ...record.states.compactCollapsed,
            controls: {
              ...record.states.compactCollapsed.controls,
              "Hide sidebar": [{}],
            },
          },
        },
      }),
    ).toThrow("fixed shell control matrix");
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
    expect(captureSource).toContain("return newChatMarker && composer;");
    expect(captureSource).toContain(
      "await cleanupCurrentBaselineRenderer(selectedPage)",
    );
    expect(
      captureSource.indexOf(
        "await cleanupCurrentBaselineRenderer(selectedPage)",
      ),
    ).toBeLessThan(captureSource.indexOf("await browser.close();"));
    expect(captureSource).not.toContain(".reload(");
    expect(captureSource).not.toContain(".screenshot(");
    expect(captureSource).not.toContain("document.body.textContent");
  });
});
