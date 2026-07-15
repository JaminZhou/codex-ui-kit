import { join } from "node:path";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  screen,
  type WebContents,
} from "electron";
import {
  isThemeSource,
  isWindowPreset,
  windowPresets,
  type AppliedWindowSize,
  type DesktopEnvironment,
  type ThemeState,
  type WindowPreset,
} from "../shared/contract";

const appName = "Codex UI Kit Playground";
const defaultPreset: WindowPreset = "standard";
const minimumSize = { height: 620, width: 720 };

let mainWindow: BrowserWindow | null = null;

function getThemeState(): ThemeState {
  return {
    resolved: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    source: nativeTheme.themeSource,
  };
}

function getEnvironment(): DesktopEnvironment {
  return {
    arch: process.arch,
    chromium: process.versions.chrome,
    electron: process.versions.electron,
    platform: process.platform,
    theme: getThemeState(),
  };
}

function sendThemeState(webContents: WebContents) {
  webContents.send("playground:theme-changed", getThemeState());
}

function getAppliedSize(
  browserWindow: BrowserWindow,
  preset: WindowPreset,
): AppliedWindowSize {
  const requested = windowPresets[preset];
  const display = screen.getDisplayMatching(browserWindow.getBounds());
  const width = Math.max(
    minimumSize.width,
    Math.min(requested.width, display.workAreaSize.width),
  );
  const height = Math.max(
    minimumSize.height,
    Math.min(requested.height, display.workAreaSize.height),
  );

  return { height, preset, width };
}

function applyWindowPreset(
  browserWindow: BrowserWindow,
  preset: WindowPreset,
): AppliedWindowSize {
  const applied = getAppliedSize(browserWindow, preset);
  browserWindow.setContentSize(applied.width, applied.height, true);
  browserWindow.center();
  return applied;
}

function registerIpcHandlers() {
  ipcMain.handle("playground:get-environment", () => getEnvironment());

  ipcMain.handle("playground:set-theme-source", (_event, source: unknown) => {
    if (!isThemeSource(source)) {
      throw new TypeError("Invalid theme source");
    }

    nativeTheme.themeSource = source;
    return getThemeState();
  });

  ipcMain.handle("playground:set-window-preset", (event, preset: unknown) => {
    if (!isWindowPreset(preset)) {
      throw new TypeError("Invalid window preset");
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) {
      throw new Error("No BrowserWindow is associated with this Renderer");
    }

    return applyWindowPreset(browserWindow, preset);
  });
}

async function createWindow() {
  const initial = windowPresets[defaultPreset];
  const browserWindow = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#181818" : "#f4f4f3",
    height: initial.height,
    minHeight: minimumSize.height,
    minWidth: minimumSize.width,
    show: false,
    title: appName,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 18, y: 20 } : undefined,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: true,
    },
    width: initial.width,
  });

  mainWindow = browserWindow;
  browserWindow.setMenuBarVisibility(false);
  browserWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  browserWindow.webContents.on("will-navigate", (event, url) => {
    const allowedUrl = process.env.ELECTRON_RENDERER_URL;
    if (!allowedUrl || new URL(url).origin !== new URL(allowedUrl).origin) {
      event.preventDefault();
    }
  });
  browserWindow.once("ready-to-show", () => browserWindow.show());
  browserWindow.on("closed", () => {
    if (mainWindow === browserWindow) {
      mainWindow = null;
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await browserWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await browserWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.setName(appName);

app.whenReady().then(async () => {
  registerIpcHandlers();
  nativeTheme.on("updated", () => {
    const background = nativeTheme.shouldUseDarkColors ? "#181818" : "#f4f4f3";
    for (const browserWindow of BrowserWindow.getAllWindows()) {
      browserWindow.setBackgroundColor(background);
      sendThemeState(browserWindow.webContents);
    }
  });

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
