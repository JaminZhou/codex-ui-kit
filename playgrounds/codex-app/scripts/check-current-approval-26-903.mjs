import assert from "node:assert/strict";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const sceneIds = [
  "approval-current-26-903-file-deny-pending",
  "approval-current-26-903-file-deny-pending-compact",
  "approval-current-26-903-file-denied-compact",
];

for (const sceneId of sceneIds) {
  const scene = visualScenes.find(({ id }) => id === sceneId);
  if (!scene) throw new Error(`Missing current approval scene: ${sceneId}`);

  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const request = page.getByTestId("current-approval-request");
    const isDenied = scene.frame.endsWith("denied");
    if (isDenied) {
      await request.waitFor({ state: "detached" });
      await page.getByText("无法创建：文件写入批准未被授予，apply_patch 被系统拦截。", { exact: true }).waitFor();
    } else {
      await request.waitFor({ state: "visible" });
      assert.equal(
        await request.getByText("Allow ChatGPT to edit the contents of", { exact: false }).count(),
        1,
      );
      await request.getByText("approval-proof.txt", { exact: true }).first().waitFor();
      await request.getByRole("button", { name: "Deny", exact: true }).waitFor();
      await request.getByRole("button", { name: "Allow once", exact: true }).waitFor();
      assert.equal(await request.getByText("Edit files", { exact: true }).count(), 1);
      assert.equal(await page.locator(".codex-ui-file-diff").count(), 1);
      await request.getByRole("button", { name: "Deny", exact: true }).click();
      await request.waitFor({ state: "detached" });
      await page.getByText("无法创建：文件写入批准未被授予，apply_patch 被系统拦截。", { exact: true }).waitFor();
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      false,
      `${sceneId}: horizontal overflow`,
    );
  } finally {
    await app.close();
  }
}

console.log("Current 26.903 external-file approval denial contracts passed: pending/compact/denied, exact copy/actions, and no-write boundary.");
