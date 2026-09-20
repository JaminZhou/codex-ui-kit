import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-composer-lifecycle-26-915-"),
);

const scenes = [
  {
    frame: "workspace-composer-current-26-915-multiline-four",
    id: "workspace-composer-current-26-915-multiline-four-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-composer-current-26-915-multiline-four",
    id: "workspace-composer-current-26-915-multiline-four-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-composer-current-26-915-multiline-long",
    id: "workspace-composer-current-26-915-multiline-long-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-composer-current-26-915-multiline-long",
    id: "workspace-composer-current-26-915-multiline-long-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

function bounds(element) {
  if (!(element instanceof Element)) return null;
  const rect = element.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

async function readComposer(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const composer = document.querySelector(".demo-workspace-start .codex-ui-composer");
    const input = document.querySelector(".demo-workspace-start .codex-ui-composer__input");
    const style = input ? getComputedStyle(input) : null;
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        right: value.right,
        top: value.top,
        width: value.width,
      };
    };
    return {
      composer: rect(composer),
      computed: style
        ? {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            overflowY: style.overflowY,
            padding: style.padding,
          }
        : null,
      frame: root?.getAttribute("data-frame"),
      input: rect(input),
      inputScrollHeight: input instanceof HTMLTextAreaElement ? input.scrollHeight : null,
      inputScrollTop: input instanceof HTMLTextAreaElement ? input.scrollTop : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      queueCount: root?.getAttribute("data-queue-count"),
      phase: root?.getAttribute("data-composer-phase"),
      controls: root?.getAttribute("data-current-composer-controls-26-915"),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await readComposer(page);
    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.controls, "true");
    assert.equal(contract.overflow, 0);
    assert.ok(contract.composer && contract.input && contract.computed);
    assert.equal(contract.computed.fontSize, "14px");
    assert.equal(contract.computed.fontWeight, "400");
    assert.equal(contract.computed.overflowY, "auto");
    const compact = scene.windowSize.width === 720;
    const long = scene.frame.endsWith("long");
    const expected = long
      ? compact
        ? { composerHeight: 224, composerTop: 440, inputHeight: 170, inputTop: 454 }
        : { composerHeight: 259, composerTop: 545, inputHeight: 205, inputTop: 559 }
      : compact
        ? { composerHeight: 134, composerTop: 530, inputHeight: 80, inputTop: 544 }
        : { composerHeight: 134, composerTop: 670, inputHeight: 80, inputTop: 684 };
    assert.ok(
      Math.abs(contract.composer.width - (compact ? 688 : 736)) <= 1,
      JSON.stringify(contract),
    );
    assert.ok(
      Math.abs(contract.composer.height - expected.composerHeight) <= 1,
      JSON.stringify(contract),
    );
    assert.ok(
      Math.abs(contract.composer.top - expected.composerTop) <= 1,
      JSON.stringify(contract),
    );
    assert.ok(
      Math.abs(contract.input.height - expected.inputHeight) <= 1,
      JSON.stringify(contract),
    );
    assert.ok(
      Math.abs(contract.input.top - expected.inputTop) <= 1,
      JSON.stringify(contract),
    );
    if (long) {
      assert.ok(contract.inputScrollHeight >= 390);
      assert.ok(contract.inputScrollTop >= 180);
    }
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    return { app, page, screenshot: await page.screenshot() };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
    assert.equal(firstImage.width, secondImage.width);
    assert.equal(firstImage.height, secondImage.height);
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
      `${scene.id}: own-fixture pixel drift`,
    );
    await second.app.close();
  } catch (error) {
    await second.app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const { app, page } = await launchScene(
    {
      frame: "workspace-composer-current-26-915-queue-paused",
      id: `workspace-composer-current-26-915-queue-paused-${width}`,
      scenario: "workspace-workflow",
      sidebarState: width === 720 ? "compact-collapsed" : undefined,
      theme: "dark",
      view: "workspace",
      windowSize: { height: width === 720 ? 680 : 820, width },
    },
    { capture: false },
  );
  try {
    const initial = await readComposer(page);
    assert.equal(initial.frame, "workspace-composer-current-26-915-queue-paused");
    assert.equal(initial.phase, "queue-paused");
    assert.equal(initial.queueCount, "1");
    const queue = await page.locator(
      ".demo-current-composer-queue-dock > .codex-ui-composer-dock__queue",
    ).boundingBox();
    assert.ok(queue && queue.width > 600 && queue.height >= 70);
    await page.getByRole("button", { name: "Resume" }).first().click();
    await page.waitForSelector(
      '.demo-root[data-composer-phase="resume-ready"][data-queue-count="1"] .codex-ui-composer__primary[data-action="resume"]',
    );
    await page.locator('.codex-ui-composer__primary[data-action="resume"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector(".demo-root")?.getAttribute("data-status") ===
        "completed",
      null,
      { timeout: 8_000 },
    );
    const settled = await readComposer(page);
    assert.equal(settled.queueCount, "0");
    assert.equal(settled.phase, "idle");
  } finally {
    await app.close();
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Composer multiline and queue lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
