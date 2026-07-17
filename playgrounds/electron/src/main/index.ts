import { mkdir, writeFile } from "node:fs/promises";
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

async function captureInteractivePrimitives(webContents: WebContents) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    await wait(80);
    const card = document.querySelector('[data-acceptance-surface="interactive-primitives"]');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop +=
        cardBounds.top -
        regionBounds.top -
        Math.max(0, (scrollRegion.clientHeight - cardBounds.height) / 2);
    }
    await wait(180);
    const moreActions = card?.querySelector('[aria-label="More actions"]');
    moreActions?.click();
    await wait(140);
    const rootMenu = [...document.querySelectorAll('.codex-ui-popover[role="menu"]')]
      .find((element) => element.querySelector('.codex-ui-menu-submenu-trigger'));
    rootMenu?.querySelector('.codex-ui-menu-submenu-trigger')?.click();
    await wait(160);
    const overlays = [...document.querySelectorAll('.codex-ui-popover')].map((element) => {
      const bounds = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        borderRadius: styles.borderRadius,
        bounds: rect(element),
        inViewport:
          bounds.left >= 0 &&
          bounds.top >= 0 &&
          bounds.right <= window.innerWidth &&
          bounds.bottom <= window.innerHeight,
        owner: element.getAttribute('data-codex-ui-overlay-owner'),
        padding: styles.padding,
        role: element.getAttribute('role'),
        visible: styles.visibility,
      };
    });
    const toolbarButton = card?.querySelector('.codex-ui-icon-button');
    const mediumButton = card?.querySelector('.codex-ui-button[data-size="medium"]');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      card: rect(card),
      mediumButton: rect(mediumButton),
      overlayOwnerCount: new Set(overlays.map((overlay) => overlay.owner)).size,
      overlays,
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      toolbarButton: rect(toolbarButton),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
}

async function captureAcceptance(browserWindow: BrowserWindow) {
  const outputDirectory = process.env.CODEX_UI_KIT_ACCEPTANCE_DIR;
  if (!outputDirectory) return;

  await new Promise((resolve) => setTimeout(resolve, 500));
  const metrics = await browserWindow.webContents.executeJavaScript(`(() => {
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const overlaps = (first, second) => {
      if (!first || !second) return null;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      return !(
        a.right <= b.left ||
        a.left >= b.right ||
        a.bottom <= b.top ||
        a.top >= b.bottom
      );
    };
    const mention = document.querySelector('.codex-ui-composer-mention-menu');
    const mentionForm = mention?.closest('.codex-ui-composer');
    const mentionFieldset = mentionForm?.querySelector('.codex-ui-composer__fieldset');
    const mentionSample = mentionForm?.closest('.desktop-composer-dock__sample--mentions');
    const mentionLabel = mentionSample?.querySelector(':scope > span');
    const attachments = document.querySelector('.desktop-composer-dock .codex-ui-composer__attachments');
    const queue = document.querySelector('.desktop-composer-dock .codex-ui-composer-queue');
    const fontProbe = document.querySelector('[data-font-probe="sans"]');
    return {
      attachments: rect(attachments),
      attachmentsOverflowX: attachments ? getComputedStyle(attachments).overflowX : null,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      fontFamily: fontProbe ? getComputedStyle(fontProbe).fontFamily : null,
      mention: rect(mention),
      mentionFieldset: rect(mentionFieldset),
      mentionForm: rect(mentionForm),
      mentionLabel: rect(mentionLabel),
      mentionLabelOverlapsTray: overlaps(mentionLabel, mention),
      mentionMaxHeight: mention ? getComputedStyle(mention).maxHeight : null,
      queue: rect(queue),
      queueMaxHeight: queue ? getComputedStyle(queue).maxHeight : null,
      queueRows: [...document.querySelectorAll('.desktop-composer-dock .codex-ui-composer-queue__row')].map(rect),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
  const screenshot = await browserWindow.webContents.capturePage();
  const interactiveMetrics = await captureInteractivePrimitives(
    browserWindow.webContents,
  );
  const interactiveScreenshot = await browserWindow.webContents.capturePage();
  await browserWindow.webContents.executeJavaScript(
    "document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))",
  );
  nativeTheme.themeSource = "light";
  sendThemeState(browserWindow.webContents);
  await browserWindow.webContents.executeJavaScript(
    `[...document.querySelectorAll('.segmented-control button')]
      .find((button) => button.textContent?.trim() === 'Compact')
      ?.click()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 350));
  const compactInteractiveMetrics = await captureInteractivePrimitives(
    browserWindow.webContents,
  );
  const compactInteractiveScreenshot =
    await browserWindow.webContents.capturePage();

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      join(outputDirectory, "composer-auxiliary-metrics.json"),
      `${JSON.stringify(metrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "composer-auxiliary.png"),
      screenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-metrics.json"),
      `${JSON.stringify(interactiveMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives.png"),
      interactiveScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-compact-light-metrics.json"),
      `${JSON.stringify(compactInteractiveMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-compact-light.png"),
      compactInteractiveScreenshot.toPNG(),
    ),
  ]);
  console.log(`acceptance capture: ${outputDirectory}`);
  app.quit();
}

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
  browserWindow.webContents.once("did-finish-load", () => {
    void captureAcceptance(browserWindow).catch((error: unknown) => {
      console.error("acceptance capture failed", error);
      app.exit(1);
    });
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
