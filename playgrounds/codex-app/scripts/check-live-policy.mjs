import assert from "node:assert/strict";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene);
for (const flag of ["", "1", "true"]) {
  const { app, page } = await launchScene(scene, {
    capture: false,
    environment: { CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: flag },
  });
  try {
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    const label = await page.getByLabel("Live workspace permissions", { exact: true }).innerText();
    assert.equal(label, `${flag === "1" ? "Workspace write" : "Read only"} · Network off`);
    const rejection = await page.evaluate(async () => {
      try {
        await window.codexDemo.startLive({
          prompt: "Must not execute",
          projectToken: "untrusted-project",
          sandboxPolicy: { type: "dangerFullAccess" },
        });
        return "unexpected success";
      } catch (error) {
        return String(error);
      }
    });
    assert.match(rejection, /Select a local project/);
  } finally {
    await app.close();
  }
}
console.log("Live host policy indicators and untrusted-project IPC rejection passed; no live turn was started.");
