import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-summary-populated-"));

function sceneFor(width) {
  return {
    currentSidebar: true,
    frame: "context-summary-populated",
    id: `context-summary-populated-${width}`,
    scenario: "context-summary",
    sidebarState: width === 720 ? "hidden" : undefined,
    theme: "dark",
    view: "conversation",
    windowSize: { height: width === 720 ? 680 : 820, width },
  };
}

async function assertSummary(page, width) {
  const root = page.locator(".demo-root");
  const dialog = page.getByRole("dialog", { name: "Thread summary" });
  await dialog.waitFor();
  assert.equal(await root.getAttribute("data-frame"), "context-summary-populated");
  assert.equal(await dialog.getByRole("button", { name: "README.md" }).count(), 1);
  assert.equal(
    await dialog.getByRole("button", { name: "OpenAI Developer Docs" }).count(),
    1,
  );
  assert.equal(await dialog.getByRole("button", { name: "GitHub Triage" }).count(), 1);
  assert.equal(await dialog.getByText("Artifact · 2 pages").count(), 1);
  assert.equal(await dialog.getByText("3 sources").count(), 1);
  const outputsToggle = dialog.getByRole("button", {
    name: "Toggle outputs summary",
  });
  await outputsToggle.focus();
  assert.equal(
    await outputsToggle.evaluate((element) => document.activeElement === element),
    true,
  );
  await outputsToggle.click();
  assert.equal(await dialog.getByRole("button", { name: "README.md" }).count(), 0);
  await outputsToggle.click();
  assert.equal(await dialog.getByRole("button", { name: "README.md" }).count(), 1);
  const computed = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    return {
      fontFamily: styles.fontFamily,
      height: bounds.height,
      width: bounds.width,
    };
  });
  assert.ok(computed.fontFamily, `${width}px summary has no computed font`);
  assert.ok(computed.width > 0 && computed.height > 0, `${width}px summary has no bounds`);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    0,
    `${width}px populated summary overflowed the route`,
  );
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    await assertSummary(page, width);
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `summary-populated-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  await first.app.close();
  const second = await capture(width, "second");
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
      `${width}px own-fixture populated summary pixel gate drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    directory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    evidence: "replay-only populated artifact/source sections",
    widths: [1180, 720],
  }),
);
