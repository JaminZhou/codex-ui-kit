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
  assertCurrentProjectsIndexObservation,
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
  const projectsObservation = () => ({
    collapsed: { expandedCount: 0, focusOnToggle: true },
    compact: {
      header: {
        gridTemplateColumns: "416px 128px",
        rect: { height: 40, width: 560 },
      },
      horizontalOverflow: 0,
      navigationVisible: false,
      navigationWidth: null,
      routePath: "/projects",
      rows: { count: 14, firstRect: { height: 70, width: 560 } },
      scrollOwners: [
        {
          clientHeight: 554,
          overflowY: "auto",
          rect: { height: 554, top: 46 },
          scrollHeight: 1_188,
        },
      ],
      updatedDisplay: "none",
      viewport: { height: 600, width: 600 },
    },
    empty: { emptyMessageCount: 1, focusOnSearch: true, rowCount: 0 },
    expanded: {
      expandedCount: 1,
      focusOnToggle: true,
      recentGroupCount: 1,
      wrapperHeight: 119,
    },
    sort: {
      initial: {
        name: { active: false, descending: false },
        updated: { active: true, descending: true },
      },
      nameAscending: {
        name: { active: true, descending: false },
        updated: { active: false, descending: false },
      },
      nameDescending: {
        name: { active: true, descending: true },
        updated: { active: false, descending: false },
      },
      restored: {
        name: { active: false, descending: false },
        updated: { active: true, descending: true },
      },
    },
    wide: {
      header: {
        gridTemplateColumns: "512px 64px 128px",
        rect: { height: 40, width: 736 },
      },
      horizontalOverflow: 0,
      navigationVisible: true,
      navigationWidth: 322.91,
      routePath: "/projects",
      rows: { count: 14, firstRect: { height: 70, width: 736 } },
      scrollOwners: [
        {
          clientHeight: 774,
          overflowY: "auto",
          rect: { height: 774, top: 46 },
          scrollHeight: 1_188,
        },
      ],
      search: {
        count: 1,
        placeholder: "Search projects",
        rect: { height: 18, width: 688 },
      },
      title: {
        count: 1,
        rect: { height: 33.59 },
        style: {
          fontSize: "28px",
          fontWeight: "400",
          lineHeight: "33.6px",
        },
      },
      updatedDisplay: "inline-flex",
      viewport: { height: 820, width: 1180 },
    },
  });

  it("gates current Projects geometry, interactions, and compact behavior", () => {
    const observation = projectsObservation();
    expect(() =>
      assertCurrentProjectsIndexObservation(observation),
    ).not.toThrow();
    expect(() =>
      assertCurrentProjectsIndexObservation({
        ...observation,
        compact: {
          ...observation.compact,
          header: {
            ...observation.compact.header,
            gridTemplateColumns: "432px 112px",
          },
        },
      }),
    ).toThrow("compact route geometry");
    expect(() =>
      assertCurrentProjectsIndexObservation({
        ...observation,
        empty: { ...observation.empty, focusOnSearch: false },
      }),
    ).toThrow("settled empty state");
    expect(() =>
      assertCurrentProjectsIndexObservation({
        ...observation,
        sort: {
          ...observation.sort,
          restored: {
            ...observation.sort.restored,
            updated: { active: true, descending: false },
          },
        },
      }),
    ).toThrow("sort cycle");
    expect(() =>
      assertCurrentProjectsIndexObservation({
        ...observation,
        expanded: { ...observation.expanded, recentGroupCount: 0 },
      }),
    ).toThrow("expansion and focus continuity");
  });

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
        "Start new voice chat": [{}, {}],
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
          clientHeight: 659,
          overflowY: "auto",
          rect: { height: 659 },
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
          clientHeight: 519,
          overflowY: "auto",
          rect: { height: 519 },
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
        "Start new voice chat": [{}],
      },
      navigation: null,
      routes: Object.fromEntries(
        ["New chat", "Plugins", "Pull requests", "Scheduled", "Sites"].map(
          (route) => [route, []],
        ),
      ),
    };
    const compactVisibleBeforeCollapse = compactPinned;
    const compactPullRequests = {
      ...compactPinned,
      controls: {
        ...compactPinned.controls,
        "Add files and more": [],
        Dictate: [],
        "Start new voice chat": [{}],
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
        appAsarBytes: 284_124_509,
        appAsarSha256:
          "8eb91bd9efbf9a4dd04b9b0afdbfcb4e0bab5da18c1919ad74ca327c00c7e791",
        appVersion: "26.818.41509",
        buildNumber: "6962",
        chromiumVersion: "151.0.7922.170",
      },
      captureKind: "renderer_emulation",
      runtimeBundleIdentity: {
        afterCapture: {
          appAsarBytes: 284_124_509,
          appAsarSha256:
            "8eb91bd9efbf9a4dd04b9b0afdbfcb4e0bab5da18c1919ad74ca327c00c7e791",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_351_000_000,
          device: "16777231",
          inode: "346397970",
        },
        beforeCapture: {
          appAsarBytes: 284_124_509,
          appAsarSha256:
            "8eb91bd9efbf9a4dd04b9b0afdbfcb4e0bab5da18c1919ad74ca327c00c7e791",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_350_900_000,
          device: "16777231",
          inode: "346397970",
        },
        ownerPid: 25_197,
        processStartedAtMs: 1_786_350_800_000,
      },
      projectsIndexObservation: projectsObservation(),
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
            rect: { height: 272.06, width: 320 },
            visibleMenuCount: 1,
          },
        },
        pointerCollapsed: { expanded: false, focusOnRow: true },
        projectMenu: {
          bridge: { available: true, frozen: true },
          items: [
            {
              defaultMessage: "Unpin",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "unpin-project",
              messageId: "sidebarElectron.unpinProjectShort",
              type: "item",
            },
            {
              defaultMessage: "Edit",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "edit-project",
              messageId: "sidebarElectron.editProjectShort",
              type: "item",
            },
            {
              defaultMessage: null,
              enabled: true,
              hasIcon: false,
              hasOnSelect: false,
              id: "project-actions-separator",
              messageId: null,
              type: "separator",
            },
            {
              defaultMessage: "Reveal in Finder",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "reveal-project-folder",
              messageId: "sidebarElectron.openWorkspaceRootInFinder",
              type: "item",
            },
            {
              defaultMessage: "Create permanent worktree",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "create-permanent-worktree",
              messageId: "sidebarElectron.createStableWorktree",
              type: "item",
            },
            {
              defaultMessage: null,
              enabled: true,
              hasIcon: false,
              hasOnSelect: false,
              id: "project-chat-actions-separator",
              messageId: null,
              type: "separator",
            },
            {
              defaultMessage: "Archive chats",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "archive-project-threads",
              messageId: "sidebarElectron.archiveProjectThreads",
              type: "item",
            },
            {
              defaultMessage: null,
              enabled: true,
              hasIcon: false,
              hasOnSelect: false,
              id: "project-remove-separator",
              messageId: null,
              type: "separator",
            },
            {
              defaultMessage: "Remove project",
              enabled: true,
              hasIcon: true,
              hasOnSelect: true,
              id: "remove-project",
              messageId: "sidebarElectron.removeProject.menuItem.local",
              type: "item",
            },
          ],
          renderMode: "electron-native-context-menu",
          trigger: {
            ariaExpanded: "false",
            ariaHaspopup: "menu",
            rect: { height: 24, width: 24 },
            tag: "button",
          },
        },
        responsive: {
          compactVisibleBeforeCollapse: {
            horizontalOverflow: 0,
            navigationVisible: true,
            navigationWidth: 274.11,
            projectExpanded: false,
            showSidebarCount: 0,
          },
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
        compactVisibleBeforeCollapse,
        mediumNewChat: medium,
        thresholdNewChat: threshold,
        wideNewChat: wide,
      },
      targetSelection: { selected: { url: "app://-/index.html" } },
    };

    expect(() => assertCurrentBaselineRecord(record)).not.toThrow();
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        projectsIndexObservation: undefined,
      }),
    ).toThrow("wide route geometry");
    expect(() =>
      assertCurrentBaselineRecord({
        ...record,
        projectsIndexObservation: {
          ...record.projectsIndexObservation,
          compact: {
            ...record.projectsIndexObservation.compact,
            updatedDisplay: "inline-flex",
          },
        },
      }),
    ).toThrow("compact route geometry");
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
          compactVisibleBeforeCollapse: {
            ...record.sidebarLifecycle.responsive
              .compactVisibleBeforeCollapse,
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
        compactVisibleBeforeCollapse: withNavigationWidth(
          record.states.compactVisibleBeforeCollapse,
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
            items: [
              ...persistedRecord.sidebarLifecycle.projectMenu.items.slice(0, 6),
              {
                defaultMessage: "Mark all as read",
                enabled: true,
                hasIcon: true,
                hasOnSelect: true,
                id: "mark-project-threads-read",
                messageId: "sidebarElectron.markProjectThreadsRead",
                type: "item",
              },
              ...persistedRecord.sidebarLifecycle.projectMenu.items.slice(6),
            ],
          },
        },
      }),
    ).not.toThrow();
    expect(currentBaselineFingerprint.appVersion).toBe("26.818.41509");
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
    for (const invalidCount of [undefined, 0, 1.5]) {
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
    expect(() =>
      assertCurrentSidebarLifecycle({
        ...record.sidebarLifecycle,
        baseline: {
          ...record.sidebarLifecycle.baseline,
          expandedProjectGroupCount: 7,
          projectGroupCount: 6,
        },
      }),
    ).toThrow("project-group baseline");
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
          navigationWidth: 400,
          projectRow: {
            ...persistedRecord.sidebarLifecycle.baseline.projectRow,
            rect: {
              ...persistedRecord.sidebarLifecycle.baseline.projectRow.rect,
              width: 384,
            },
          },
        },
        responsive: {
          ...persistedRecord.sidebarLifecycle.responsive,
          compactPinned: {
            ...persistedRecord.sidebarLifecycle.responsive.compactPinned,
            navigationWidth: 400,
          },
          compactVisibleBeforeCollapse: {
            ...persistedRecord.sidebarLifecycle.responsive
              .compactVisibleBeforeCollapse,
            navigationWidth: 400,
          },
          wideRestored: {
            ...persistedRecord.sidebarLifecycle.responsive.wideRestored,
            navigationWidth: 400,
          },
        },
      }),
    ).not.toThrow();
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
          bridge: { available: false, frozen: true },
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
                scrollHeight: 659,
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
      "The sidebar did not remain visible at the 720px viewport:",
    );
    expect(
      captureSource.indexOf("states.compactVisibleBeforeCollapse"),
    ).toBeLessThan(
      captureSource.lastIndexOf("await hideSidebar();"),
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
