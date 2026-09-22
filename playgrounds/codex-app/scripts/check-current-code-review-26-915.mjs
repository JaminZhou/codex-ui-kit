import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-code-review-26-915-"),
);

const scenes = [
  {
    frame: "workspace-code-review-settings-current-26-915-error",
    id: "current-code-review-26-915-error-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-code-review-settings-current-26-915-error",
    id: "current-code-review-26-915-error-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-code-review-settings-current-26-915-loading",
    id: "current-code-review-26-915-loading-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".codex-ui-code-review-settings"),
    );
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
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      busy: root?.getAttribute("aria-busy") ?? null,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      loading: root?.querySelector(".codex-ui-code-review-settings__loading")?.textContent?.trim() ?? null,
      root: bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null,
      rowCount: root?.querySelectorAll(".codex-ui-code-review-settings__row").length ?? 0,
      status: root?.getAttribute("data-status") ?? null,
      switchCount: root?.querySelectorAll('[role="switch"]').length ?? 0,
      trigger: root
        ?.querySelector('.codex-ui-code-review-settings__trigger[aria-label="Review trigger"]')
        ?.textContent?.trim() ?? null,
      viewport: { height: innerHeight, width: innerWidth },
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function assertContract(contract, scene, status) {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.ok(contract.root && contract.root.width > 300 && contract.root.height > 120);
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
    const settings = page.locator(".codex-ui-code-review-settings");
    await settings.waitFor({ state: "attached" });
    const initial = await readContract(page);
    const isLoading = scene.frame.endsWith("-loading");
    assertContract(initial, scene, isLoading ? "loading" : "error");
    await settleFonts(page);
    const initialScreenshot = await page.screenshot();

    if (isLoading) {
      assert.equal(initial.busy, "true");
      assert.match(initial.loading ?? "", /Loading code review settings/);
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ initial }, null, 2)}\n`,
      );
      return { app, screenshots: { initialScreenshot } };
    }

    assert.match(initial.alert ?? "", /Unable to load code review settings/);
    await settings
      .getByRole("button", { name: "Retry", exact: true })
      .evaluate((button) => button.click());
    await page
      .locator('.codex-ui-code-review-settings[data-status="ready"]')
      .waitFor({ state: "attached" });
    const retry = await readContract(page);
    assertContract(retry, scene, "ready");
    assert.equal(retry.rowCount, 4);
    assert.equal(retry.switchCount, 3);
    assert.match(retry.trigger ?? "", /On PR open/);
    await settleFonts(page);
    const retryScreenshot = await page.screenshot();

    await settings
      .getByRole("switch", { name: "Enable automatic code review" })
      .click();
    await settings.getByRole("button", { name: "Review trigger" }).click();
    await page.getByRole("menuitemradio", { name: "On every push" }).click();
    await settings
      .getByRole("switch", { name: "Enable exhaustive code review" })
      .click();
    await settings
      .getByRole("switch", { name: "Allow credits for code reviews" })
      .click();
    const interacted = await readContract(page);
    assertContract(interacted, scene, "ready");
    assert.equal(interacted.trigger, "On every push⌄");
    const interaction = await page.evaluate(() => ({
      automatic: document
        .querySelector('[role="switch"][aria-label="Enable automatic code review"]')
        ?.getAttribute("aria-checked"),
      credits: document
        .querySelector('[role="switch"][aria-label="Allow credits for code reviews"]')
        ?.getAttribute("aria-checked"),
      exhaustive: document
        .querySelector('[role="switch"][aria-label="Enable exhaustive code review"]')
        ?.getAttribute("aria-checked"),
    }));
    assert.deepEqual(interaction, {
      automatic: "false",
      credits: "true",
      exhaustive: "true",
    });
    await settleFonts(page);
    const interactedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, retry, interacted, interaction }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: { initialScreenshot, retryScreenshot, interactedScreenshot },
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
    `${name}: current 26.915 Code review replay drifted`,
  );
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of Object.keys(first.screenshots)) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[state],
      second.screenshots[state],
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Code review loading/error → Retry → preference changes",
    scenes: scenes.map(({ id }) => id),
  }),
);
