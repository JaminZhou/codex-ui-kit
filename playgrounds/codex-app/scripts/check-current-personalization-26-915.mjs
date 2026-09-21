import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-personalization-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "workspace-personalization-settings-current-26-915-error",
    id: "current-personalization-26-915-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "workspace-personalization-settings-current-26-915-error",
    id: "current-personalization-26-915-compact",
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".codex-ui-personalization-settings"),
    );
    const root = roots
      .map((element) => ({
        element,
        visibleArea: (() => {
          const rect = element.getBoundingClientRect();
          const width = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
          const height = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
          return width * height;
        })(),
      }))
      .sort((left, right) => right.visibleArea - left.visibleArea)[0]?.element
      ?? roots[0];
    const bounds = root?.getBoundingClientRect();
    const textarea = root?.querySelector("textarea");
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      personality: root
        ?.querySelector(".codex-ui-personalization-settings__personality-trigger")
        ?.textContent?.trim(),
      root: bounds
        ? { height: bounds.height, left: bounds.left, top: bounds.top, width: bounds.width }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      switchCount: root?.querySelectorAll('[role="switch"]').length ?? 0,
      textareaValue: textarea instanceof HTMLTextAreaElement ? textarea.value : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, status, frame = scene.frame) {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.equal(contract.personality, "Friendly⌄");
  assert.equal(contract.switchCount, 2);
  assert.ok(contract.root && contract.root.width > 300 && contract.root.height > 300);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const waitForStablePaint = async () => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      });
    };
    await page.locator(".codex-ui-personalization-settings").waitFor();
    const initial = await readContract(page);
    assertContract(initial, scene, "error");
    assert.match(initial.alert ?? "", /Custom instructions could not be saved/);
    await waitForStablePaint();
    const initialScreenshot = await page.screenshot();

    const settingsCandidates = page.locator(".codex-ui-personalization-settings");
    let settings = null;
    let settingsArea = 0;
    for (const candidate of await settingsCandidates.all()) {
      const box = await candidate.boundingBox();
      const visibleWidth = box
        ? Math.max(0, Math.min(scene.windowSize.width, box.x + box.width) - Math.max(0, box.x))
        : 0;
      const visibleHeight = box
        ? Math.max(0, Math.min(scene.windowSize.height, box.y + box.height) - Math.max(0, box.y))
        : 0;
      const area = visibleWidth * visibleHeight;
      if (box && area > settingsArea) {
        settings = candidate;
        settingsArea = area;
      }
    }
    assert.ok(settings, `${scene.id}: visible Personalization settings root missing`);
    const retryButton = settings.getByRole("button", { name: "Retry", exact: true });
    await retryButton.scrollIntoViewIfNeeded();
    await retryButton.evaluate((button) => button.click());
    await page
      .locator('.codex-ui-personalization-settings[data-status="ready"]')
      .waitFor({ state: "attached" });
    const retry = await readContract(page);
    assertContract(retry, scene, "ready");
    await waitForStablePaint();
    const original = retry.textareaValue ?? "";
    const instructions = settings.getByRole("textbox", { name: "Custom instructions" });
    await instructions.fill(`${original} current-26-915`);
    const saveButton = settings.getByRole("button", { name: "Save", exact: true });
    assert.equal(await saveButton.isEnabled(), true);
    const dirty = await readContract(page);
    assertContract(dirty, scene, "ready");
    await waitForStablePaint();
    const retryScreenshot = await page.screenshot();

    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.evaluate((button) => button.click());
    await page
      .locator('.codex-ui-personalization-settings[data-status="saved"]')
      .waitFor({ state: "attached" });
    const saved = await readContract(page);
    assertContract(saved, scene, "saved");
    assert.equal(saved.textareaValue, `${original} current-26-915`);
    await waitForStablePaint();
    const savedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, retry, dirty, saved }, null, 2)}\n`,
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
    `${name}: current 26.915 Personalization replay drifted`,
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
    replayEvidence: "current 26.915 controlled Personalization save failure → Retry → Save",
    scenes: scenes.map(({ id }) => id),
  }),
);
