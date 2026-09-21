import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-git-26-915-"),
);

const scenes = [
  {
    frame: "workspace-git-settings-current-26-915-error",
    id: "current-git-26-915-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-git-settings-current-26-915-error",
    id: "current-git-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".codex-ui-git-settings"));
    const root =
      roots
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
        .sort((left, right) => right.visibleArea - left.visibleArea)[0]
        ?.element ?? roots[0];
    const bounds = root?.getBoundingClientRect();
    return {
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      instructions: root
        ? Array.from(root.querySelectorAll("textarea")).map(
            (textarea) => textarea.value,
          )
        : [],
      message: root?.querySelector(".codex-ui-git-settings__status")?.textContent?.trim() ?? "",
      preferences: root?.querySelectorAll(
        ".codex-ui-git-settings__card > .codex-ui-git-settings__row",
      ).length ?? 0,
      root: bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, status) {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.equal(contract.preferences, 5);
  assert.equal(contract.instructions.length, 2);
  assert.ok(contract.root && contract.root.width > 300 && contract.root.height > 300);
}

async function settleFonts(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const settings = page.locator(".codex-ui-git-settings");
    await settings.waitFor({ state: "attached" });
    const initial = await readContract(page);
    assertContract(initial, scene, "error");
    assert.match(initial.message, /Git settings could not be saved/);
    await settleFonts(page);
    const initialScreenshot = await page.screenshot();

    await settings
      .getByRole("button", { name: "Retry", exact: true })
      .evaluate((button) => button.click());
    await page
      .locator('.codex-ui-git-settings[data-status="ready"]')
      .waitFor({ state: "attached" });
    const retry = await readContract(page);
    assertContract(retry, scene, "ready");
    const retryScreenshot = await page.screenshot();

    const commitInstructions = settings.getByRole("textbox", {
      name: "Commit instructions",
      exact: true,
    });
    await commitInstructions.fill("Use imperative mood for commit messages.");
    const dirty = await readContract(page);
    assertContract(dirty, scene, "ready");
    assert.equal(dirty.instructions[0], "Use imperative mood for commit messages.");
    const dirtyScreenshot = await page.screenshot();

    await settings
      .getByRole("button", { name: "Save", exact: true })
      .first()
      .click();
    await page
      .locator('.codex-ui-git-settings[data-status="saved"]')
      .waitFor({ state: "attached" });
    const saved = await readContract(page);
    assertContract(saved, scene, "saved");
    assert.match(saved.message, /^Git settings saved$/);
    assert.equal(saved.instructions[0], "Use imperative mood for commit messages.");
    const savedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, retry, dirty, saved }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: {
        dirtyScreenshot,
        initialScreenshot,
        retryScreenshot,
        savedScreenshot,
      },
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
    `${name}: current 26.915 Git replay drifted`,
  );
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of ["initial", "retry", "dirty", "saved"]) {
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
    replayEvidence: "current 26.915 controlled Git error → Retry → dirty → saved instructions",
    scenes: scenes.map(({ id }) => id),
  }),
);
