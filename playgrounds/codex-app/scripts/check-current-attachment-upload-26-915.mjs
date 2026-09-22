import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-attachment-upload-26-915-"),
);

// These public attachment states are replay-only. Native 26.915 upload
// progress/error reachability remains a host-owned observation boundary.
const frames = {
  error: "attachment-upload-error",
  ready: "attachment-multi-ready",
  uploading: "attachment-uploading",
};

function sceneFor(width, frame) {
  const compact = width === 720;
  return {
    frame,
    id: `current-attachment-upload-26-915-${frame}-${width}`,
    scenario: "attachment-lifecycle",
    sidebarState: compact ? "hidden" : undefined,
    theme: "dark",
    view: "conversation",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function readState(page) {
  return page.evaluate(() => {
    const tray = document.querySelector(".codex-ui-composer__attachments");
    const attachment = document.querySelector(
      '.codex-ui-composer-attachment[data-status="uploading"], .codex-ui-composer-attachment[data-status="error"]',
    );
    const progress = attachment?.querySelector('[role="progressbar"]');
    return {
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      errorCount: document.querySelectorAll(
        '.codex-ui-composer-attachment[data-status="error"]',
      ).length,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      overflow: tray ? tray.scrollWidth - tray.clientWidth : null,
      progress: progress?.getAttribute("aria-valuenow") ?? null,
      progressLabel: progress?.getAttribute("aria-label") ?? null,
      retryCount: document.querySelectorAll(
        ".codex-ui-composer-attachment__retry",
      ).length,
      status: attachment?.getAttribute("data-status") ?? null,
      statusText:
        attachment?.querySelector('[role="status"]')?.textContent?.trim() ?? null,
      submitDisabled: document
        .querySelector('.codex-ui-composer [data-action="submit"]')
        ?.hasAttribute("disabled"),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertUploading(state) {
  assert.equal(state.frame, frames.uploading);
  assert.equal(state.attachmentCount, 5);
  assert.equal(state.status, "uploading");
  assert.equal(state.progress, "62");
  assert.equal(state.progressLabel, "Uploading current-build.zip");
  assert.equal(state.statusText, "Uploading…");
  assert.equal(state.submitDisabled, true);
  assert.ok((state.overflow ?? Infinity) <= 1);
  assert.deepEqual(state.viewport, { height: 820, width: 1180 });
}

function assertError(state) {
  assert.equal(state.frame, frames.error);
  assert.equal(state.attachmentCount, 5);
  assert.equal(state.errorCount, 1);
  assert.equal(state.status, "error");
  assert.equal(state.retryCount, 1);
  assert.equal(state.statusText, "Upload failed");
  assert.equal(state.submitDisabled, true);
  assert.ok((state.overflow ?? Infinity) <= 1);
  assert.deepEqual(state.viewport, { height: 680, width: 720 });
}

async function capture(scene, suffix) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const initial = await readState(page);
    if (scene.frame === frames.uploading) assertUploading(initial);
    else assertError(initial);
    const initialScreenshot = await page.screenshot();

    if (scene.frame === frames.error) {
      await page.getByRole("button", { name: "Retry current-build.zip" }).click();
      await page.waitForSelector(
        '.demo-root[data-frame="attachment-uploading"] [role="progressbar"][aria-valuenow="18"]',
      );
      await page.waitForFunction(
        () => document.activeElement?.getAttribute("aria-label") === "Message composer",
      );
      await page.waitForSelector(
        '.demo-root[data-frame="attachment-multi-ready"] .codex-ui-composer-attachment[data-status="ready"]',
      );
      const recovered = await readState(page);
      assert.equal(recovered.frame, frames.ready);
      assert.equal(recovered.attachmentCount, 5);
      assert.equal(recovered.errorCount, 0);
      assert.equal(recovered.progress, null);
      assert.equal(recovered.submitDisabled, false);
      assert.ok((recovered.overflow ?? Infinity) <= 1);
      const recoveredScreenshot = await page.screenshot();
      await writeFile(
        join(artifactDirectory, `${scene.id}-${suffix}-recovered.png`),
        recoveredScreenshot,
      );
      return { initialScreenshot, recoveredScreenshot };
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}-${suffix}-uploading.png`),
      initialScreenshot,
    );
    return { initialScreenshot };
  } finally {
    await app.close();
  }
}

const uploadingFirst = await capture(sceneFor(1180, frames.uploading), "first");
const uploadingSecond = await capture(sceneFor(1180, frames.uploading), "second");
const errorFirst = await capture(sceneFor(720, frames.error), "first");
const errorSecond = await capture(sceneFor(720, frames.error), "second");

for (const [label, first, second] of [
  ["uploading-wide", uploadingFirst.initialScreenshot, uploadingSecond.initialScreenshot],
  ["error-compact", errorFirst.initialScreenshot, errorSecond.initialScreenshot],
  ["ready-compact", errorFirst.recoveredScreenshot, errorSecond.recoveredScreenshot],
]) {
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
    `${label}: current 26.915 attachment upload replay drifted`,
  );
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift for uploading/error/recovered states",
    replayBaseline: "public attachment upload/progress/error fixture",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    installedProductBoundary: "native upload progress/error remains host-owned",
    scenes: ["uploading-wide-1180", "error-compact-720", "ready-compact-720"],
  }),
);
