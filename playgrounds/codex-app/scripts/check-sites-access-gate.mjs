import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-sites-access-gate-"));
const scene = {
  currentSidebar: true,
  frame: "sites-access-26-915-terms",
  id: "sites-access-26-915-terms",
  scenario: "workspace-workflow",
  theme: "dark",
  view: "sites",
};

async function capture(width, suffix) {
  const { app, page } = await launchScene(scene, {
    capture: false,
    currentSidebar: true,
    windowSize: { height: width === 720 ? 680 : 820, width },
  });
  try {
    const root = page.locator('.codex-ui-sites-access[data-mode="terms"]');
    await root.waitFor();
    const geometry = await root.evaluate((element) => {
      const dialog = element.querySelector(".codex-ui-sites-access__terms-dialog");
      const value = dialog?.getBoundingClientRect();
      return {
        dialog: value
          ? { height: value.height, left: value.left, top: value.top, width: value.width }
          : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewport: { height: innerHeight, width: innerWidth },
      };
    });
    assert.ok(geometry.dialog?.width > 0);
    assert.equal(geometry.overflow, 0);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("main", { name: "Sites pricing", exact: true }).waitFor();
    await page.getByRole("button", { name: "Back to ChatGPT", exact: true }).click();
    await root.waitFor();
    const screenshot = await page.screenshot();
    await writeFile(join(directory, `sites-access-${width}-${suffix}.png`), screenshot);
    return { geometry, screenshot };
  } finally {
    await app.close();
  }
}

try {
  const records = [];
  for (const width of [1180, 720]) {
    const first = await capture(width, "first");
    const second = await capture(width, "second");
    const baseline = PNG.sync.read(first.screenshot);
    const replay = PNG.sync.read(second.screenshot);
    assert.equal(replay.width, baseline.width);
    assert.equal(replay.height, baseline.height);
    const mismatch = pixelmatch(
      baseline.data,
      replay.data,
      null,
      baseline.width,
      baseline.height,
      { threshold: 0 },
    );
    assert.equal(mismatch, 0, `${width}px Sites access replay drifted`);
    records.push({ width, geometry: first.geometry, mismatch });
  }
  console.log(JSON.stringify({
    directory,
    passed: true,
    modes: ["terms", "pricing"],
    pixelGate: "0% own-fixture drift at 1180 and 720",
    records,
  }));
} finally {
  await rm(directory, { force: true, recursive: true });
}
