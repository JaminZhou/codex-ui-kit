import { launchScene, visualScenes } from "./electron-harness.mjs";
import assert from "node:assert/strict";
import { assertCurrentPdfContract, readCurrentPdfContract } from "./current-pdf-contract.mjs";

const sceneIds = [
  "workspace-document-preview-ready",
  "workspace-document-preview-error",
  "workspace-document-preview-loading-compact",
];

for (const sceneId of sceneIds) {
  const scene = visualScenes.find(({ id }) => id === sceneId);
  if (!scene) throw new Error(`Missing document preview scene: ${sceneId}`);

  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await page
      .locator('[data-testid="document-preview-panel"]')
      .evaluate((panel) => ({
        ariaBusy: panel.getAttribute("aria-busy"),
        kind: panel.getAttribute("data-kind"),
        status: panel.getAttribute("data-status"),
        title: panel.querySelector(".codex-ui-document-preview__title")?.textContent?.trim(),
        width: panel.getBoundingClientRect().width,
      }));
    const expectedStatus = scene.frame.endsWith("-loading")
      ? "loading"
      : scene.frame.endsWith("-error")
        ? "error"
        : "ready";
    if (
      contract.kind !== "pdf" ||
      contract.status !== expectedStatus ||
      contract.title !== "design-spec.pdf" ||
      contract.width < (sceneId.endsWith("-compact") ? 300 : 500) ||
      (expectedStatus === "loading" && contract.ariaBusy !== "true") ||
      (expectedStatus !== "loading" && contract.ariaBusy !== null)
    ) {
      throw new Error(`${sceneId}: Electron document preview contract failed: ${JSON.stringify(contract)}`);
    }
    if (expectedStatus === "error") {
      await page.getByRole("button", { name: "Retry preview" }).click();
      await page
        .locator('[data-testid="document-preview-panel"][data-status="ready"]')
        .waitFor();
    }
  } finally {
    await app.close();
  }
}

const currentScene = visualScenes.find(({ id }) => id === "workspace-document-preview-current-ready");
const { app, page } = await launchScene(currentScene, { capture: false });
try {
  await assertCurrentPdfContract(page, currentScene);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="current-pdf-preview"]')?.getAttribute("data-page") === "2");
  assert.ok((await readCurrentPdfContract(page)).scrollTop > 0);
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await page.getByRole("menuitem", { name: "150%", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="current-pdf-preview"][data-zoom="150"]') && document.querySelectorAll('[data-painted="true"]').length === 2);
  assert.ok((await readCurrentPdfContract(page)).scrollHeight > 2500);
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await page.getByRole("menuitem", { name: "Zoom to fit", exact: true }).click();
  await page.getByRole("button", { name: "Annotate", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Annotating", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Annotating", exact: true }).click();
  await page.getByRole("button", { name: "Enter full screen", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="current-pdf-preview"][data-zoom="190"]') && document.querySelectorAll('[data-painted="true"]').length === 2);
  await page.getByRole("button", { name: "Exit full screen", exact: true }).click();
  // Actual Electron BrowserWindow resize, separate from the product's Renderer-emulation evidence.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(720, 680));
  await page.locator('[data-testid="current-pdf-preview"]').waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Preview design-spec.pdf", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-painted="true"]').length === 2);
  await assertCurrentPdfContract(page, { frame: "workspace-document-preview-current-compact" });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByRole("button", { name: "Close design-spec.pdf", exact: true }).click();
  await page.locator('[data-testid="current-pdf-preview"]').waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Preview design-spec.pdf", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-painted="true"]').length === 2);
  const reopened = await readCurrentPdfContract(page);
  assert.equal(reopened.page, 1);
  assert.equal(reopened.scrollTop, 0);
  await page.getByRole("button", { name: "Remove design-spec.pdf", exact: true }).click();
  await page.locator('[data-testid="current-pdf-preview"]').waitFor({ state: "detached" });
  assert.equal(await page.getByRole("button", { name: "Preview design-spec.pdf", exact: true }).count(), 0);
  assert.equal(await page.getByRole("textbox", { name: "Message", exact: true }).inputValue(), "");
} finally { await app.close(); }

console.log("Electron document preview contracts passed: 3 generic frames and current PDF paging/zoom/annotation/expansion/native resize/close/reopen/draft cleanup.");
