import assert from "node:assert/strict";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

// The installed 26.915 capture is read-only. This gate carries its measured
// structure into the private replay without claiming host-owned preferences,
// audio processing, or installed-product pixels.
const scenes = [
  {
    frame: "workspace-general-settings",
    id: "current-general-settings-26-915",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-general-settings",
    id: "current-general-settings-26-915-light",
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
];

async function inspect(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll(".codex-ui-general-settings")).some(
        (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
      ),
    );
    const candidates = await page.locator(".codex-ui-general-settings").all();
    let settings = null;
    for (const candidate of candidates) {
      const box = await candidate.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        settings = candidate;
        break;
      }
    }
    assert.ok(settings, `${scene.id}: visible General settings root missing`);
    await settings.locator("h1").waitFor({ state: "attached" });
    const compact = scene.windowSize.width === 720;
    const facts = await settings.evaluate((root) => ({
      cards: root.querySelectorAll(".codex-ui-general-settings__card").length,
      headingWidth: root
        .querySelector("h1")
        ?.getBoundingClientRect().width,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rowCount: root.querySelectorAll(".codex-ui-general-settings__row").length,
      sections: Array.from(
        root.querySelectorAll(".codex-ui-general-settings__section > h2"),
        (heading) => heading.textContent,
      ),
      switches: Array.from(
        root.querySelectorAll('.codex-ui-general-settings [role="switch"]'),
        (control) => ({
          label: control.getAttribute("aria-label"),
          value: control.getAttribute("aria-checked"),
        }),
      ),
      audioLabel: root
        .querySelector('[role="switch"][aria-label="Audio visualizer"]')
        ?.getAttribute("aria-label"),
      audioRowText: Array.from(
        root.querySelectorAll(".codex-ui-general-settings__row"),
      ).find((row) => row.textContent?.includes("Audio visualizer"))?.textContent,
      viewport: { height: innerHeight, width: innerWidth },
    }));
    assert.equal(facts.cards, 6);
    assert.equal(facts.rowCount, 23);
    assert.deepEqual(facts.sections, [
      "Permissions",
      "General",
      "Composer",
      "Popout Window",
      "Notifications",
      "Toys",
    ]);
    assert.equal(facts.switches.length, 13);
    assert.ok(facts.switches.some(({ label }) => label === "Audio visualizer"));
    assert.equal(facts.audioLabel, "Audio visualizer");
    assert.match(facts.audioRowText ?? "", /Audio visualizer/);
    assert.equal(facts.horizontalOverflow, 0);
    assert.equal(facts.viewport.width, compact ? 720 : 1180);
    assert.equal(facts.viewport.height, compact ? 680 : 820);
    assert.ok(Math.abs(facts.headingWidth - (compact ? 358.125 : 768)) <= 1);

    const audioVisualizer = settings.getByRole("switch", {
      name: "Audio visualizer",
    });
    await audioVisualizer.click();
    assert.equal(await audioVisualizer.getAttribute("aria-checked"), "true");
    await audioVisualizer.click();
    assert.equal(await audioVisualizer.getAttribute("aria-checked"), "false");
    return { app, screenshot: await page.screenshot() };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await inspect(scene);
  await first.app.close();
  const second = await inspect(scene);
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
      `${scene.id}: current 26.915 General replay drifted`,
    );
    await second.app.close();
  } catch (error) {
    await second.app.close();
    throw error;
  }
}

console.log(
  JSON.stringify({
    passed: true,
    pixelGate: "0% own-fixture drift at native-wide 1180",
    runtimeBaseline: "26.915.31945",
    scenes: scenes.map(({ id }) => id),
  }),
);
