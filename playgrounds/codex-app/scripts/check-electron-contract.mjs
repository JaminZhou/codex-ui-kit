import { launchScene } from "./electron-harness.mjs";

const scene = {
  frame: "recovered",
  id: "electron",
  scenario: "streaming-recovery",
};
const { app, page } = await launchScene(scene);

try {
  const nativeState = await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    const active = windows[0];
    return {
      bounds: active?.getContentBounds(),
      count: windows.length,
      destroyed: active?.isDestroyed(),
      title: active?.getTitle(),
      webPreferences: active?.webContents.getLastWebPreferences(),
    };
  });

  if (
    nativeState.count !== 1 ||
    nativeState.destroyed ||
    nativeState.bounds?.width !== 1180 ||
    nativeState.bounds?.height !== 820 ||
    nativeState.webPreferences?.contextIsolation !== true ||
    nativeState.webPreferences?.nodeIntegration !== false ||
    nativeState.webPreferences?.sandbox !== true
  ) {
    throw new Error(
      `Electron host contract failed: ${JSON.stringify(nativeState)}`,
    );
  }

  const sidebarToggle = page.getByRole("button", { name: "Hide sidebar" });
  await sidebarToggle.click();
  await page.waitForSelector(
    ".codex-ui-app-shell:not([data-sidebar-open])",
  );
  const showSidebar = page.getByRole("button", { name: "Show sidebar" });
  await showSidebar.click();
  await page.waitForSelector(".codex-ui-app-shell[data-sidebar-open]");

  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.getByRole("button", { exact: true, name: "Live" }).click();
  await page.waitForSelector('.demo-root[data-mode="live"]');
  const liveTheme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  if (liveTheme !== "dark") {
    throw new Error(
      `Electron live theme contract failed: ${JSON.stringify(liveTheme)}`,
    );
  }
} finally {
  await app.close();
}

console.log("Electron host and native-window interaction contract passed.");
