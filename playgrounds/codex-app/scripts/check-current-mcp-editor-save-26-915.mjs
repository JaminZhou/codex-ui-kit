import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-mcp-editor-save-26-915-"),
);

const scenes = [
  {
    frame: "workspace-mcp-settings-current-26-915-save-failure-detail",
    id: "current-mcp-editor-save-26-915-wide",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-mcp-settings-current-26-915-save-failure-detail",
    id: "current-mcp-editor-save-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[aria-label="MCP server editor"]');
    const value = root?.getBoundingClientRect();
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      root: value
        ? { height: value.height, left: value.left, top: value.top, width: value.width }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      url: root?.querySelector('input[placeholder="https://mcp.example.com/mcp"]')?.value ?? null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, status = "ready") {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.dialogCount, 0);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.equal(contract.url, "https://mcp.example.com/mcp");
  assert.ok(contract.root && contract.root.width > 350 && contract.root.height > 300);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.waitForSelector('[aria-label="MCP server editor"]');
    const initial = await readContract(page);
    assertContract(initial, scene);
    const initialScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("alert").waitFor();
    const failed = await readContract(page);
    assertContract(failed, scene, "error");
    assert.match(failed.alert ?? "", /Couldn’t save MCP server/);
    assert.match(failed.alert ?? "", /temporarily unavailable/);
    const failedScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[aria-label="MCP server editor"]')
          ?.getAttribute("data-status") === "ready" &&
        !document.querySelector('[aria-label="MCP server editor"] [role="alert"]'),
    );
    const retry = await readContract(page);
    assertContract(retry, scene);
    const retryScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('[aria-label="MCP server editor"]') &&
        document.querySelector(".codex-ui-mcp-settings")?.getAttribute("data-status") ===
          "ready",
    );
    const saved = await page.evaluate(() => ({
      action: document.querySelector(".demo-settings-action-status")?.textContent?.trim(),
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      status: document.querySelector(".codex-ui-mcp-settings")?.getAttribute("data-status"),
    }));
    assert.equal(saved.frame, "workspace-mcp-settings-current-26-915");
    assert.equal(saved.status, "ready");
    assert.equal(saved.action, "Saved workspace-tools");
    const savedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, failed, retry, saved }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: { failedScreenshot, initialScreenshot, retryScreenshot, savedScreenshot },
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
    `${name}: current 26.915 MCP save replay drifted`,
  );
}

const results = [];
for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of ["initial", "failed", "retry", "saved"]) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[`${state}Screenshot`],
      second.screenshots[`${state}Screenshot`],
    );
  }
  results.push(scene.id);
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled MCP editor save failure → Retry → success",
    scenes: results,
  }),
);
