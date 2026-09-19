import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-shell-26-915-"),
);

const scenes = [
  {
    frame: "workspace-current-26-915-ready",
    id: "workspace-current-26-915-ready",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-current-26-915-ready",
    id: "workspace-current-26-915-ready-compact",
    scenario: "workspace-workflow",
    sidebarState: "hidden",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await page.evaluate(() => {
      const bounds = (element) => {
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
      };
      return {
        aside: bounds(document.querySelector(".codex-ui-app-shell__sidebar")),
        composer: bounds(document.querySelector(".codex-ui-composer")),
        header: bounds(document.querySelector(".codex-ui-app-window-chrome")),
        input: bounds(document.querySelector(".codex-ui-composer__input")),
        main: bounds(document.querySelector(".codex-ui-app-shell__main")),
        navigation: bounds(
          document.querySelector(".codex-ui-app-sidebar__navigation"),
        ),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      };
    });
    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.overflow, 0);
    assert.ok(
      contract.aside &&
        contract.composer &&
        contract.header &&
        contract.input &&
        contract.main &&
        contract.navigation,
    );
    assert.equal(contract.header.height, 46);
    if (scene.windowSize.width === 1180) {
      assert.ok(Math.abs(contract.aside.width - 321.875) <= 1);
      assert.ok(Math.abs(contract.navigation.width - 321.875) <= 1);
      assert.ok(Math.abs(contract.navigation.top - 116) <= 1);
      assert.ok(Math.abs(contract.main.left - 321.875) <= 1);
      assert.ok(Math.abs(contract.main.width - 858.125) <= 1);
      assert.ok(Math.abs(contract.composer.left - 383.4375) <= 1);
      assert.equal(contract.composer.width, 736);
      assert.equal(contract.input.height, 44);
      assert.equal(contract.input.top, 720);
    } else {
      assert.ok(contract.aside.left <= -320);
      assert.ok(Math.abs(contract.aside.width - 321.875) <= 1);
      assert.equal(contract.main.left, 0);
      assert.equal(contract.main.width, 720);
      assert.equal(contract.composer.left, 16);
      assert.equal(contract.composer.width, 688);
      assert.equal(contract.input.top, 580);
      assert.equal(contract.input.height, 44);
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
      `${scene.id}: current 26.911 shell replay drifted`,
    );
    await second.app.close();
  } catch (error) {
    await second.app.close();
    throw error;
  }
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
