import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-terminal-transport-"));

function sceneFor(width, frame) {
  return {
    currentSidebar: true,
    frame,
    id: `${frame}-${width}`,
    scenario: "terminal-lifecycle",
    sidebarState: width === 720 ? "compact-collapsed" : undefined,
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width },
  };
}

async function assertFailure(page, width) {
  const root = page.locator(".demo-root");
  const panel = page.getByTestId("terminal-panel");
  const alert = panel.getByRole("alert");
  await alert.waitFor();
  assert.equal(
    await root.getAttribute("data-frame"),
    "terminal-current-26-825-transport-failed",
  );
  assert.match(
    await alert.textContent(),
    /Terminal connection lost.*terminal transport disconnected/i,
  );
  assert.equal(await alert.getByRole("button", { name: "Reconnect" }).count(), 1);
  assert.equal(await panel.getByRole("log").count(), 0);
  assert.equal(await panel.getByRole("textbox", { name: "Terminal input" }).count(), 0);
  assert.equal(
    await panel.getByRole("tab", { name: /codex-ui-kit/ }).count(),
    1,
  );
  assert.equal(
    await panel.locator('.codex-ui-terminal-panel__tab-label[data-status="failed"]').count(),
    1,
  );
  const computed = await page.evaluate(() => {
    const alert = document.querySelector(".codex-ui-terminal-reload-notice");
    const panel = document.querySelector('[data-testid="terminal-panel"]');
    const alertRect = alert?.getBoundingClientRect();
    const panelRect = panel?.getBoundingClientRect();
    const alertStyle = alert ? getComputedStyle(alert) : null;
    return {
      alertFontFamily: alertStyle?.fontFamily,
      alertRect: alertRect
        ? { height: alertRect.height, width: alertRect.width }
        : null,
      panelRect: panelRect
        ? { height: panelRect.height, width: panelRect.width }
        : null,
    };
  });
  assert.ok(computed.alertFontFamily, `${width}px failure alert lost computed font`);
  assert.ok(
    computed.alertRect && computed.alertRect.width > 0 && computed.alertRect.height > 0,
    `${width}px failure alert has no computed bounds`,
  );
  assert.ok(
    computed.panelRect && computed.panelRect.width > 0 && computed.panelRect.height > 0,
    `${width}px terminal panel has no computed bounds`,
  );
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.equal(overflow, 0, `${width}px terminal transport failure overflowed the route`);
}

async function captureFailure(width, suffix) {
  const { app, page } = await launchScene(
    sceneFor(width, "terminal-current-26-825-transport-failed"),
    { capture: false },
  );
  try {
    await assertFailure(page, width);
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `terminal-transport-failure-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await captureFailure(width, "first");
  try {
    const reconnect = first.page.getByRole("button", { name: "Reconnect" });
    await reconnect.focus();
    assert.equal(
      await reconnect.evaluate((element) => document.activeElement === element),
      true,
    );
    await reconnect.click();
    await first.page.waitForSelector(
      '.demo-root[data-frame="terminal-current-26-825-transport-recovered"]',
    );
    const recoveredPanel = first.page.getByTestId("terminal-panel");
    assert.equal(await recoveredPanel.getByRole("alert").count(), 0);
    assert.equal(
      await recoveredPanel.getByRole("textbox", { name: "Terminal input" }).count(),
      1,
    );
    assert.equal(await recoveredPanel.getByRole("log", { name: "Terminal output" }).count(), 1);
  } finally {
    await first.app.close();
  }

  const second = await captureFailure(width, "second");
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
      `${width}px own-fixture terminal transport failure pixel gate drifted`,
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
    runtimeBaseline: "26.825.51511 replay contract",
    widths: [1180, 720],
  }),
);
