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
        appAsarBytes: 223_450_200,
        appAsarSha256:
          "5f6e773aafd542d3cf09e10b5dca6cabd301d0a155f4b8ce870e3915fc3da25e",
        appVersion: "26.803.41515",
        buildNumber: "6321",
        chromiumVersion: "151.0.7922.76",
      },
      captureKind: "renderer_emulation",
      runtimeBundleIdentity: {
        afterCapture: {
          appAsarBytes: 223_450_200,
          appAsarSha256:
            "5f6e773aafd542d3cf09e10b5dca6cabd301d0a155f4b8ce870e3915fc3da25e",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_351_000_000,
          device: "16777231",
          inode: "341558647",
        },
        beforeCapture: {
          appAsarBytes: 223_450_200,
          appAsarSha256:
            "5f6e773aafd542d3cf09e10b5dca6cabd301d0a155f4b8ce870e3915fc3da25e",
          changedAtMs: 1_786_150_111_000,
          checkedAtMs: 1_786_350_900_000,
          device: "16777231",
          inode: "341558647",
        },
        ownerPid: 25_197,
        processStartedAtMs: 1_786_350_800_000,
      },
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
    expect(currentBaselineFingerprint.appVersion).toBe("26.803.41515");
    expect(currentBaselineViewports.compact.width).toBe(720);
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
