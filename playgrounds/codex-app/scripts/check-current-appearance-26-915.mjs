import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-appearance-26-915-"),
);

const scenes = [
  {
    frame: "workspace-appearance-settings-current-26-915-error",
    id: "current-appearance-26-915-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-appearance-settings-current-26-915-error",
    id: "current-appearance-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".codex-ui-appearance-settings"),
    );
    const root = roots
      .map((element) => ({
        element,
        visibleArea: (() => {
          const rect = element.getBoundingClientRect();
          const width = Math.max(
            0,
            Math.min(innerWidth, rect.right) - Math.max(0, rect.left),
          );
          const height = Math.max(
            0,
            Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top),
          );
          return width * height;
        })(),
      }))
      .sort((left, right) => right.visibleArea - left.visibleArea)[0]?.element ??
      roots[0];
    const bounds = root?.getBoundingClientRect();
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      root: bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      theme: root
        ? Array.from(root.querySelectorAll('input[type="radio"]'))
            .filter((input) => input.closest('[role="radiogroup"]')?.getAttribute("aria-label") === "Theme")
            .map((input) => ({
              checked: input.checked,
              label: input.getAttribute("aria-label"),
            }))
        : [],
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      preferences: root?.querySelectorAll(
        ".codex-ui-appearance-settings__preferences-card > *",
      ).length ?? 0,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, status, expectedTheme = "System") {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.equal(contract.preferences, 7);
  assert.equal(
    contract.theme.find((option) => option.checked)?.label,
    expectedTheme,
  );
  assert.ok(contract.root && contract.root.width > 300 && contract.root.height > 300);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    await page.locator(".codex-ui-appearance-settings").waitFor({
      state: "attached",
    });
    const initial = await readContract(page);
    assertContract(initial, scene, "error");
    assert.match(initial.alert ?? "", /Appearance settings could not be saved/);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    });
    const initialScreenshot = await page.screenshot();

    const settingsCandidates = page.locator(".codex-ui-appearance-settings");
    let settings = null;
    let settingsArea = 0;
    for (const candidate of await settingsCandidates.all()) {
      const box = await candidate.boundingBox();
      const visibleWidth = box
        ? Math.max(
            0,
            Math.min(scene.windowSize.width, box.x + box.width) -
              Math.max(0, box.x),
          )
        : 0;
      const visibleHeight = box
        ? Math.max(
            0,
            Math.min(scene.windowSize.height, box.y + box.height) -
              Math.max(0, box.y),
          )
        : 0;
      const area = visibleWidth * visibleHeight;
      if (box && area > settingsArea) {
        settings = candidate;
        settingsArea = area;
      }
    }
    assert.ok(settings, `${scene.id}: visible Appearance settings root missing`);

    await settings
      .getByRole("button", { name: "Retry", exact: true })
      .evaluate((button) => button.click());
    await page
      .locator('.codex-ui-appearance-settings[data-status="ready"]')
      .waitFor({ state: "attached" });
    const retry = await readContract(page);
    assertContract(retry, scene, "ready");
    const retryScreenshot = await page.screenshot();

    await settings
      .getByRole("radio", { name: "Dark", exact: true })
      .evaluate((input) => input.click());
    await page
      .locator('.codex-ui-appearance-settings[data-status="saved"]')
      .waitFor({ state: "attached" });
    const saved = await readContract(page);
    assertContract(saved, scene, "saved", "Dark");
    assert.match(saved.alert ?? "", /^$/);
    const savedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, retry, saved }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: { initialScreenshot, retryScreenshot, savedScreenshot },
    };
  } catch (error) {
    await app.close();
    throw error;
  }
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
    `${name}: current 26.915 Appearance replay drifted`,
  );
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of ["initial", "retry", "saved"]) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[`${state}Screenshot`],
      second.screenshots[`${state}Screenshot`],
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Appearance error → Retry → saved theme",
    scenes: scenes.map(({ id }) => id),
  }),
);
