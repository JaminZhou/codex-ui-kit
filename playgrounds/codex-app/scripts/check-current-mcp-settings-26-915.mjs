import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const baselineDirectory = join(process.cwd(), "tests", "visual", "baselines");
const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-mcp-settings-26-915-"),
);

const scenes = [
  {
    frame: "workspace-mcp-settings-current-26-915",
    id: "current-mcp-settings-26-915-wide",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915",
    id: "current-mcp-settings-26-915-compact",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915-error",
    id: "current-mcp-settings-26-915-error-wide",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915-error",
    id: "current-mcp-settings-26-915-error-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915-toggle-failure",
    id: "current-mcp-settings-26-915-toggle-failure-wide",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915-toggle-failure",
    id: "current-mcp-settings-26-915-toggle-failure-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

function rect(value) {
  if (!value) return null;
  return {
    height: value.height,
    left: value.left,
    top: value.top,
    width: value.width,
  };
}

async function readContract(page) {
  return page.evaluate(() => {
    const rect = (value) =>
      value
        ? { height: value.height, left: value.left, top: value.top, width: value.width }
        : null;
    const bounds = (selector) => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value
        ? { height: value.height, left: value.left, top: value.top, width: value.width }
        : null;
    };
    return {
      cards: Array.from(
        document.querySelectorAll(".codex-ui-mcp-settings__rows"),
        (element) => {
          const value = element.getBoundingClientRect();
          return rect(value);
        },
      ),
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      status: document
        .querySelector(".codex-ui-mcp-settings")
        ?.getAttribute("data-status"),
      toggleStatus: document
        .querySelector('[data-source="server"][data-toggle-status]')
        ?.getAttribute("data-toggle-status"),
      pluginRows: Array.from(
        document.querySelectorAll('.codex-ui-mcp-settings__row[data-source="plugin"] .codex-ui-mcp-settings__server-name'),
        (element) => element.textContent?.trim(),
      ),
      root: bounds(".codex-ui-mcp-settings"),
      searchDisplay: getComputedStyle(
        document.querySelector(".codex-ui-mcp-settings__search"),
      ).display,
      serverRows: Array.from(
        document.querySelectorAll('.codex-ui-mcp-settings__row[data-source="server"] .codex-ui-mcp-settings__server-name'),
        (element) => element.textContent?.trim(),
      ),
      tabs: Array.from(
        document.querySelectorAll(".codex-ui-plugin-manager-tabs > button"),
        (element) => {
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            selected: element.getAttribute("aria-selected"),
            text: element.textContent?.replace(/\s+/g, " ").trim(),
            top: value.top,
            width: value.width,
          };
        },
      ),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene) {
  const compact = scene.windowSize.width === 720;
  const errorScene = scene.frame.endsWith("-error");
  const toggleFailureScene = scene.frame.endsWith("-toggle-failure");
  const topOffset = 46;
  const expectedRoot = compact
    ? { left: 341.875, width: 358.125 }
    : { left: 366.9375, width: 768 };
  const expectedCards = compact
    ? [
        { height: 210, left: 341.875, top: 357.796875, width: 358.125 },
        { height: 87.125, left: 341.875, top: 633.796875, width: 358.125 },
      ]
    : [
        { height: 210, left: 366.9375, top: 317.796875, width: 768 },
        { height: 87.125, left: 366.9375, top: 593.796875, width: 768 },
      ];
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.status, errorScene ? "error" : "ready");
  if (errorScene) {
    assert.deepEqual(contract.cards, []);
    assert.deepEqual(contract.serverRows, []);
    assert.deepEqual(contract.pluginRows, []);
    assert.equal(contract.root?.width, compact ? 358.125 : 768);
    return;
  }
  assert.equal(contract.searchDisplay, compact ? "none" : "flex");
  assert.deepEqual(contract.serverRows, [
    "local-browser",
    "design-reference",
    "workspace-tools",
    "docs-reference",
  ]);
  assert.equal(contract.toggleStatus, toggleFailureScene ? "error" : "ready");
  assert.deepEqual(contract.pluginRows, ["native_inspector", "connected_apps"]);
  assert.deepEqual(
    contract.tabs.map(({ text, selected, height, top }) => ({ text, selected, height, top })),
    [
      { text: "Plugins13", selected: "false", height: 28, top: (compact ? 243.796875 : 201.796875) },
      { text: "Apps6", selected: "false", height: 28, top: (compact ? 243.796875 : 201.796875) },
      { text: "MCPs4", selected: "true", height: 28, top: (compact ? 243.796875 : 201.796875) },
      { text: "Skills2", selected: "false", height: 28, top: (compact ? 243.796875 : 201.796875) },
      { text: "Marketplace2", selected: "false", height: 28, top: (compact ? 243.796875 : 201.796875) },
    ],
  );
  assert.ok(contract.root);
  assert.ok(Math.abs(contract.root.left - expectedRoot.left) <= 0.1);
  assert.ok(Math.abs(contract.root.width - expectedRoot.width) <= 0.1);
  assert.deepEqual(contract.cards, expectedCards);
  assert.equal(
    contract.cards[0].top - contract.tabs[0].top,
    compact ? 114 : 116,
  );
  assert.equal(topOffset, 46);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.waitForSelector(".codex-ui-mcp-settings");
    const initial = await readContract(page);
    assertContract(initial, scene);
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const initialScreenshot = await page.screenshot();

    let addScreenshot = null;
    let retryScreenshot = null;
    if (scene.frame.endsWith("-error")) {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert.match(await alert.innerText(), /Couldn’t load MCP servers/);
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await page.waitForFunction(
        () =>
          document.querySelector(".codex-ui-mcp-settings")?.getAttribute("data-status") ===
          "ready",
      );
      await page.getByText("local-browser", { exact: true }).waitFor();
      retryScreenshot = await page.screenshot();
    } else if (scene.frame.endsWith("-toggle-failure")) {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert.match(await alert.innerText(), /MCP server could not be enabled/);
      const toggle = page.getByRole("switch", {
        name: "Enable local-browser",
        exact: true,
      });
      assert.equal(await toggle.getAttribute("aria-busy"), null);
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-source="server"][data-toggle-status="ready"]',
          ) !== null && !document.querySelector('[role="alert"]'),
      );
      retryScreenshot = await page.screenshot();
    }
    if (
      scene.windowSize.width === 1180 &&
      !scene.frame.endsWith("-error") &&
      !scene.frame.endsWith("-toggle-failure")
    ) {
      const search = page.getByPlaceholder("Search MCP servers");
      await search.fill("current-mcp-no-match");
      await page.getByText("No MCP servers found", { exact: true }).waitFor();
      await search.fill("");
      await page.getByRole("button", { name: "Add", exact: true }).click();
      const addItems = await page
        .getByRole("menu", { name: "Add integration" })
        .getByRole("menuitem")
        .allTextContents();
      assert.deepEqual(addItems, [
        "Create plugin",
        "Add a marketplace",
        "Add MCP server",
        "Record a skill",
      ]);
      addScreenshot = await page.screenshot();
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Add", exact: true }).click();
      await page
        .getByRole("menu", { name: "Add integration" })
        .getByRole("menuitem", { name: "Add MCP server", exact: true })
        .click();
      await page.waitForFunction(
        (expectedFrame) =>
          document.querySelector(".demo-root")?.getAttribute("data-frame") ===
          expectedFrame,
        `${scene.frame}-stdio-create`,
      );
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await page.waitForFunction(
        (expectedFrame) =>
          document.querySelector(".demo-root")?.getAttribute("data-frame") ===
          expectedFrame,
        scene.frame,
      );

      const toggle = page.getByRole("switch", {
        name: "Enable local-browser",
        exact: true,
      });
      await toggle.click();
      await page.waitForFunction(() => {
        const element = document.querySelector(
          '[role="switch"][aria-label="Enable local-browser"]',
        );
        return (
          element?.getAttribute("aria-checked") === "true" &&
          !element?.hasAttribute("aria-busy")
        );
      });
      await page
        .getByRole("button", { name: "Settings for local-browser", exact: true })
        .click();
      await page.waitForFunction(
        (expectedFrame) =>
          document.querySelector(".demo-root")?.getAttribute("data-frame") ===
          expectedFrame,
        `${scene.frame}-detail`,
      );
      await page.getByRole("button", { name: "Uninstall", exact: true }).click();
      await page.waitForFunction(
        (expectedFrame) =>
          document.querySelector(".demo-root")?.getAttribute("data-frame") ===
            expectedFrame &&
          !document.querySelector('[aria-label="Settings for local-browser"]'),
        scene.frame,
      );
    }

    const prefix = scene.id;
    await writeFile(
      join(artifactDirectory, `${prefix}.json`),
      `${JSON.stringify(initial, null, 2)}\n`,
    );
    await writeFile(join(artifactDirectory, `${prefix}-initial.png`), initialScreenshot);
    if (addScreenshot) {
      await writeFile(join(artifactDirectory, `${prefix}-add.png`), addScreenshot);
    }
    return {
      app,
      screenshots: {
        add: addScreenshot,
        initial: initialScreenshot,
        retry: retryScreenshot,
      },
    };
  } catch (error) {
    await app.close();
    throw error;
  }
}

async function assertPixel(name, actual, baselinePath) {
  if (update) {
    await copyFile(actual, baselinePath);
    return;
  }
  const baseline = PNG.sync.read(await readFile(baselinePath));
  const replay = PNG.sync.read(await readFile(actual));
  assert.equal(replay.width, baseline.width);
  assert.equal(replay.height, baseline.height);
  assert.equal(
    pixelmatch(baseline.data, replay.data, null, replay.width, replay.height, {
      threshold: 0,
    }),
    0,
    `${name}: own-fixture pixel drift`,
  );
}

function assertRepeatPixel(name, first, second) {
  const firstImage = PNG.sync.read(first);
  const secondImage = PNG.sync.read(second);
  assert.equal(secondImage.width, firstImage.width);
  assert.equal(secondImage.height, firstImage.height);
  assert.equal(
    pixelmatch(
      firstImage.data,
      secondImage.data,
      null,
      firstImage.width,
      firstImage.height,
      { threshold: 0 },
    ),
    0,
    `${name}: current 26.915 MCP error replay drifted`,
  );
}

const results = [];
for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  const prefix = scene.id;
  const initialPath = join(artifactDirectory, `${prefix}-initial.png`);
  await writeFile(initialPath, second.screenshots.initial);
  if (
    scene.frame.endsWith("-error") ||
    scene.frame.endsWith("-toggle-failure")
  ) {
    assertRepeatPixel(`${prefix} initial`, first.screenshots.initial, second.screenshots.initial);
    assertRepeatPixel(`${prefix} retry`, first.screenshots.retry, second.screenshots.retry);
  } else {
    await assertPixel(
      `${prefix} initial`,
      initialPath,
      join(baselineDirectory, `${prefix}-initial.png`),
    );
  }
  if (second.screenshots.add) {
    const addPath = join(artifactDirectory, `${prefix}-add.png`);
    await writeFile(addPath, second.screenshots.add);
    await assertPixel(
      `${prefix} add`,
      addPath,
      join(baselineDirectory, `${prefix}-add.png`),
    );
  }
  results.push(scene.id);
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.915.31945",
    scenes: results,
  }),
);
