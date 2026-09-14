import { launchScene, visualScenes } from "./electron-harness.mjs";

const scenes = visualScenes.filter(({ view }) => view === "onboarding");
if (scenes.length !== 5) {
  throw new Error(`Expected five onboarding scenes, received ${scenes.length}`);
}

for (const scene of scenes) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const state = await page.evaluate(() => {
      const root = document.querySelector(".codex-ui-login-page");
      return {
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        mode: root?.getAttribute("data-mode"),
        status: root?.getAttribute("data-status"),
        viewport: { height: innerHeight, width: innerWidth },
      };
    });
    if (state.bodyOverflow > 1 || !state.mode || !state.status) {
      throw new Error(`${scene.id}: invalid onboarding state ${JSON.stringify(state)}`);
    }
    if (scene.id === "onboarding-login") {
      await page.getByRole("button", { name: "More options" }).click();
      await page.getByRole("button", { name: "Continue with Google" }).click();
      await page.getByRole("button", { name: "Cancel sign-in" }).click();
      const restored = await page.locator(".codex-ui-login-page").getAttribute("data-mode");
      if (restored !== "chatgpt") {
        throw new Error(`${scene.id}: cancel did not restore chatgpt mode`);
      }
    }
    if (scene.id === "onboarding-login-api-key") {
      const input = page.getByLabel("Enter your OpenAI API key");
      await input.fill("sk-electron-test");
      if (!(await page.getByRole("button", { name: "Continue" }).isEnabled())) {
        throw new Error(`${scene.id}: API key Continue stayed disabled`);
      }
    }
    if (scene.id === "onboarding-login-device-code") {
      await page.getByRole("button", { name: "Open browser" }).click();
      if ((await page.locator(".codex-ui-login-page").getAttribute("data-mode")) !== "browser-pending") {
        throw new Error(`${scene.id}: device code did not enter browser-pending state`);
      }
    }
    if (scene.id === "onboarding-login-error") {
      await page.getByRole("button", { name: "Try again" }).click();
      if ((await page.locator(".codex-ui-login-page").getAttribute("data-status")) !== "ready") {
        throw new Error(`${scene.id}: retry did not clear error state`);
      }
    }
  } finally {
    await app.close();
  }
}

console.log(`Electron onboarding contracts passed: ${scenes.length} login/onboarding frames.`);
