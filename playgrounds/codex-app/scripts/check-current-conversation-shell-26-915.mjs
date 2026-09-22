import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-conversation-shell-26-915-"),
);

const scenes = [
  {
    frame: "conversation-current-26-915-ready",
    id: "conversation-current-26-915-ready",
    scenario: "current-basic-message-26-825",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "conversation-current-26-915-ready",
    id: "conversation-current-26-915-ready-compact",
    scenario: "current-basic-message-26-825",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page, scene) {
  const contract = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
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
    const input = document.querySelector(".codex-ui-composer__input");
    return {
      aside: read(".codex-ui-app-shell__sidebar"),
      composer: read(".codex-ui-composer"),
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      input: read(".codex-ui-composer__input"),
      main: read(".codex-ui-app-shell__main"),
      navigation: read(".codex-ui-app-sidebar__navigation"),
      thread: read(".codex-ui-thread"),
      inputLabel: input?.getAttribute("aria-label") ?? null,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });

  assert.equal(contract.frame, scene.frame);
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.overflow, 0);
  assert.equal(contract.inputLabel, "Message composer");
  assert.ok(
    contract.aside &&
      contract.composer &&
      contract.input &&
      contract.main &&
      contract.navigation &&
      contract.thread,
  );
  assert.equal(contract.thread.top, 47);
  assert.equal(contract.thread.height, 370.5);
  assert.equal(contract.composer.height, 98);
  assert.equal(contract.input.height, 44);

  if (scene.windowSize.width === 1180) {
    assert.ok(Math.abs(contract.aside.width - 321.875) <= 1);
    assert.ok(Math.abs(contract.navigation.width - 321.875) <= 1);
    assert.ok(Math.abs(contract.navigation.top - 116) <= 1);
    assert.ok(Math.abs(contract.main.left - 321.875) <= 1);
    assert.ok(Math.abs(contract.main.width - 858.125) <= 1);
    assert.ok(Math.abs(contract.composer.left - 383.4375) <= 1);
    assert.ok(Math.abs(contract.composer.width - 736) <= 1);
    assert.ok(Math.abs(contract.input.left - 395.4375) <= 1);
    assert.ok(Math.abs(contract.input.width - 712) <= 1);
  } else {
    assert.ok(contract.aside.left <= -320);
    assert.ok(Math.abs(contract.aside.width - 321.875) <= 1);
    assert.equal(contract.main.left, 0);
    assert.equal(contract.main.width, 720);
    assert.ok(Math.abs(contract.composer.left - 17) <= 1);
    assert.ok(Math.abs(contract.composer.width - 687) <= 1);
    assert.ok(Math.abs(contract.input.left - 29) <= 1);
    assert.ok(Math.abs(contract.input.width - 663) <= 1);
  }

  await writeFile(
    join(artifactDirectory, `${scene.id}.json`),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  return { contract, screenshot: await page.screenshot() };
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    return await readContract(page, scene);
  } finally {
    await app.close();
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
  const firstImage = PNG.sync.read(first.screenshot);
  const secondImage = PNG.sync.read(second.screenshot);
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
    `${scene.id}: current 26.915 conversation shell replay drifted`,
  );
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.915.31945",
    scenes: scenes.map(({ id }) => id),
  }),
);
