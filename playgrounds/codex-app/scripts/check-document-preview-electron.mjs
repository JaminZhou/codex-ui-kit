import { launchScene, visualScenes } from "./electron-harness.mjs";

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

console.log("Electron document preview contracts passed for 3 lifecycle frames.");
