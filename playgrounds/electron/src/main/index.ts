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

async function captureResourceSurfaces(
  webContents: WebContents,
  openPreview = false,
) {
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
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    await wait(80);
    const card = document.querySelector('[data-acceptance-surface="resource-surfaces"]');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 16;
    }
    await wait(180);
    if (${openPreview ? "true" : "false"}) {
      card
        ?.querySelector('.resource-state-matrix__wide .codex-ui-generated-image-gallery__image')
        ?.click();
      await wait(180);
    }
    const gallery = card?.querySelector('.resource-state-matrix__wide .codex-ui-generated-image-gallery');
    const galleryImage = gallery?.querySelector('.codex-ui-generated-image-gallery__image');
    const sourceList = card?.querySelector('.codex-ui-source-list');
    const preview = document.querySelector('.codex-ui-image-preview');
    const previewDialog = preview?.querySelector('.codex-ui-image-preview__dialog');
    const previewImage = preview?.querySelector('.codex-ui-image-preview__stage > img');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      focusedLabel: document.activeElement?.getAttribute('aria-label'),
      gallery: rect(gallery),
      galleryImage: rect(galleryImage),
      galleryImageRadius: galleryImage ? getComputedStyle(galleryImage).borderRadius : null,
      pendingCount: card?.querySelectorAll('.codex-ui-generated-image-gallery__placeholder').length ?? 0,
      preview: rect(preview),
      previewDialog: rect(previewDialog),
      previewImage: rect(previewImage),
      resourceRows: [...(card?.querySelectorAll('.codex-ui-resource-card') ?? [])].map(rect),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      sourceList: rect(sourceList),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
}

async function captureNavigationSurfaces(webContents: WebContents) {
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
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    const card = document.querySelector('.acceptance-card--navigation');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 12;
    }
    await wait(180);
    const messageRailButton = card?.querySelector('.codex-ui-message-navigation-rail__button');
    if (messageRailButton instanceof HTMLElement) {
      messageRailButton.focus();
      messageRailButton.dispatchEvent(new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }));
    }
    await wait(120);
    const header = card?.querySelector('.codex-ui-thread-header');
    const context = card?.querySelector('.codex-ui-thread-header__context');
    const panel = card?.querySelector('.desktop-navigation-surface__panel');
    const navigation = card?.querySelector('.codex-ui-thread-navigation');
    const floatingButtons = [...(card?.querySelectorAll('.desktop-navigation-surface__floating-button') ?? [])];
    const navigationButtons = [...(navigation?.querySelectorAll('button') ?? [])];
    const messageRail = card?.querySelector('.codex-ui-message-navigation-rail');
    const messageRailRows = [...(messageRail?.querySelectorAll('.codex-ui-message-navigation-rail__row') ?? [])];
    const messageRailMarkers = [...(messageRail?.querySelectorAll('.codex-ui-message-navigation-rail__marker') ?? [])];
    const messageRailTooltip = messageRail?.querySelector('.codex-ui-message-navigation-rail__tooltip');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      contextGap: context ? getComputedStyle(context).gap : null,
      floatingButtons: floatingButtons.map((button) => ({
        bounds: rect(button),
        opacity: getComputedStyle(button).opacity,
        pointerEvents: getComputedStyle(button).pointerEvents,
        tabIndex: button.tabIndex,
        working: button.hasAttribute('data-working'),
      })),
      header: rect(header),
      headerPosition: header ? getComputedStyle(header).position : null,
      focusedLabel: document.activeElement?.getAttribute('aria-label'),
      messageRail: rect(messageRail),
      messageRailCurrent: messageRail?.querySelector('[aria-current="true"]')?.getAttribute('aria-label'),
      messageRailMarkers: messageRailMarkers.map((marker) => ({
        bounds: rect(marker),
        opacity: getComputedStyle(marker).opacity,
      })),
      messageRailRows: messageRailRows.map(rect),
      messageRailTooltip: rect(messageRailTooltip),
      messageRailTooltipText: messageRailTooltip?.textContent ?? null,
      navigationButtons: navigationButtons.map((button) => ({
        bounds: rect(button),
        disabled: button.disabled,
        label: button.getAttribute('aria-label'),
      })),
      navigationGap: navigation ? getComputedStyle(navigation).gap : null,
      panel: rect(panel),
      panelOpen: panel?.hasAttribute('data-open') ?? false,
      panelZIndex: panel ? getComputedStyle(panel).zIndex : null,
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      titleOverflow: (() => {
        const title = card?.querySelector('.codex-ui-thread-header__title');
        return title ? title.scrollWidth > title.clientWidth : null;
      })(),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
}

async function captureThreadSurfaces(
  webContents: WebContents,
  position: "bottom" | "top" = "bottom",
) {
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
    const card = document.querySelector('.acceptance-card--thread');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 12;
    }
    await wait(120);
    const viewport = card?.querySelector('.codex-ui-thread-viewport');
    if (viewport instanceof HTMLElement) {
      viewport.style.scrollBehavior = 'auto';
      viewport.scrollTop = ${position === "top" ? "0" : "viewport.scrollHeight"};
    }
    await wait(120);
    const thread = card?.querySelector('.codex-ui-thread');
    const bubble = card?.querySelector('[data-user-message-bubble]');
    const groupedTurn = card?.querySelector('.codex-ui-agent-turn[data-spacing="grouped"]');
    const runningMessage = card?.querySelector('.codex-ui-agent-message[data-status="running"]');
    const loadingStates = [...(card?.querySelectorAll('.codex-ui-thread-loading') ?? [])];
    const contextOptimizationStates = [...(card?.querySelectorAll('.codex-ui-thread-context-optimization') ?? [])];
    const spinner = card?.querySelector('.codex-ui-thread-loading__spinner');
    const shimmer = card?.querySelector('.codex-ui-loading-shimmer');
    const skeleton = card?.querySelector('.codex-ui-thread-skeleton');
    const renderError = card?.querySelector('.codex-ui-thread-render-error');
    const placeholder = card?.querySelector('.codex-ui-thread-virtualized-placeholder');
    const footer = card?.querySelector('.codex-ui-thread-viewport__footer');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bubble: rect(bubble),
      bubbleMaxWidth: bubble ? getComputedStyle(bubble).maxWidth : null,
      bubblePadding: bubble ? getComputedStyle(bubble).padding : null,
      bubbleRadius: bubble ? getComputedStyle(bubble).borderRadius : null,
      bubbleTabIndex: bubble?.tabIndex ?? null,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      contextOptimizationStates: contextOptimizationStates.map((state) => ({
        bounds: rect(state),
        fontSize: getComputedStyle(state).fontSize,
        gap: getComputedStyle(state).gap,
        mode: state.getAttribute('data-mode'),
        status: state.getAttribute('data-status'),
        text: state.textContent,
      })),
      footer: rect(footer),
      footerPosition: footer ? getComputedStyle(footer).position : null,
      groupedTurnGap: groupedTurn ? getComputedStyle(groupedTurn).gap : null,
      loadingStates: loadingStates.map((state) => ({
        bounds: rect(state),
        fontSize: getComputedStyle(state).fontSize,
        gap: getComputedStyle(state).gap,
        text: state.textContent,
      })),
      placeholder: rect(placeholder),
      renderError: rect(renderError),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      runningMessageBusy: runningMessage?.getAttribute('aria-busy'),
      shimmerAnimationDuration: shimmer ? getComputedStyle(shimmer).animationDuration : null,
      skeleton: rect(skeleton),
      spinner: rect(spinner),
      spinnerComputedSize: spinner ? {
        height: getComputedStyle(spinner).height,
        width: getComputedStyle(spinner).width,
      } : null,
      thread: rect(thread),
      threadGap: thread ? getComputedStyle(thread).gap : null,
      threadPadding: thread ? getComputedStyle(thread).padding : null,
      threadWidthMode: thread?.getAttribute('data-width'),
      viewport: rect(viewport),
      viewportOverflowY: viewport ? getComputedStyle(viewport).overflowY : null,
      viewportTabIndex: viewport?.tabIndex ?? null,
      window: { height: window.innerHeight, width: window.innerWidth },
      position: ${JSON.stringify(position)},
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
  const threadTopMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
    "top",
  );
  const threadTopScreenshot = await browserWindow.webContents.capturePage();
  const threadMetrics = await captureThreadSurfaces(browserWindow.webContents);
  const threadScreenshot = await browserWindow.webContents.capturePage();
  const navigationMetrics = await captureNavigationSurfaces(
    browserWindow.webContents,
  );
  const navigationScreenshot = await browserWindow.webContents.capturePage();
  const interactiveMetrics = await captureInteractivePrimitives(
    browserWindow.webContents,
  );
  const interactiveScreenshot = await browserWindow.webContents.capturePage();
  await browserWindow.webContents.executeJavaScript(
    "document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))",
  );
  const resourceMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
  );
  const resourceScreenshot = await browserWindow.webContents.capturePage();
  const resourcePreviewMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
    true,
  );
  const resourcePreviewScreenshot =
    await browserWindow.webContents.capturePage();
  await browserWindow.webContents.executeJavaScript(
    "document.querySelector('[aria-label=\"Close image preview\"]')?.click()",
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
  const compactResourceMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
  );
  const compactResourceScreenshot = await browserWindow.webContents.capturePage();
  const compactNavigationMetrics = await captureNavigationSurfaces(
    browserWindow.webContents,
  );
  const compactNavigationScreenshot =
    await browserWindow.webContents.capturePage();
  const compactThreadTopMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
    "top",
  );
  const compactThreadTopScreenshot =
    await browserWindow.webContents.capturePage();
  const compactThreadMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
  );
  const compactThreadScreenshot =
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
      join(outputDirectory, "navigation-surfaces-metrics.json"),
      `${JSON.stringify(navigationMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces.png"),
      navigationScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-metrics.json"),
      `${JSON.stringify(threadMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces.png"),
      threadScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-top-metrics.json"),
      `${JSON.stringify(threadTopMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-top.png"),
      threadTopScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactThreadMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light.png"),
      compactThreadScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-top-metrics.json"),
      `${JSON.stringify(compactThreadTopMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-top.png"),
      compactThreadTopScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactNavigationMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces-compact-light.png"),
      compactNavigationScreenshot.toPNG(),
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
    writeFile(
      join(outputDirectory, "resource-surfaces-metrics.json"),
      `${JSON.stringify(resourceMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces.png"),
      resourceScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "resource-preview-metrics.json"),
      `${JSON.stringify(resourcePreviewMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-preview.png"),
      resourcePreviewScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactResourceMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces-compact-light.png"),
      compactResourceScreenshot.toPNG(),
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
