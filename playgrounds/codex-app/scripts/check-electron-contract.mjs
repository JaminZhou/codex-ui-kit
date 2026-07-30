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

  const sidebarResizer = page.getByRole("separator", {
    name: "Resize navigation sidebar",
  });
  const initialSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  const initialResizerBox = await sidebarResizer.boundingBox();
  if (!initialResizerBox || Math.abs(initialSidebarWidth - 274) > 1) {
    throw new Error(
      `Electron navigation resizer baseline failed: ${JSON.stringify({
        initialResizerBox,
        initialSidebarWidth,
      })}`,
    );
  }
  await page.mouse.move(
    initialResizerBox.x + initialResizerBox.width / 2,
    initialResizerBox.y + 200,
  );
  await page.mouse.down();
  await page.mouse.move(
    initialResizerBox.x + initialResizerBox.width / 2 + 64,
    initialResizerBox.y + 200,
    { steps: 8 },
  );
  await page.mouse.up();
  const draggedSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(draggedSidebarWidth - 338) > 1) {
    throw new Error(
      `Electron navigation pointer resize failed: ${draggedSidebarWidth}`,
    );
  }
  await sidebarResizer.press("Home");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  const restoredSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(restoredSidebarWidth - 272) > 1) {
    throw new Error(
      `Electron navigation keyboard resize failed: ${restoredSidebarWidth}`,
    );
  }

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

const narrowReachabilityScene = {
  frame: "recovered",
  id: "electron-narrow-reachability",
  scenario: "streaming-recovery",
};
const { app: narrowApp, page: narrowPage } = await launchScene(
  narrowReachabilityScene,
  { capture: false },
);

try {
  const defaultMinimum = await narrowApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getMinimumSize(),
  );
  if (defaultMinimum?.[0] !== 720) {
    throw new Error(
      `Electron default minimum width does not reach narrow mode: ${JSON.stringify(defaultMinimum)}`,
    );
  }
  await narrowApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await narrowPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
  );
  const narrowedState = await narrowApp.evaluate(({ BrowserWindow }) => ({
    bounds: BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    minimum: BrowserWindow.getAllWindows()[0]?.getMinimumSize(),
  }));
  if (
    narrowedState.bounds?.width !== 720 ||
    narrowedState.bounds?.height !== 680
  ) {
    throw new Error(
      `Electron default window did not resize into narrow mode: ${JSON.stringify(narrowedState)}`,
    );
  }
  const showNarrowSidebar = narrowPage.getByRole("button", {
    name: "Show sidebar",
  });
  await showNarrowSidebar.click();
  await narrowPage.waitForSelector(
    ".codex-ui-app-shell[data-layout-mode=\"narrow\"][data-narrow-sidebar-behavior=\"current-build\"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])",
  );
  const pinnedMainWidth = await narrowPage
    .locator(".codex-ui-app-shell__main")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(pinnedMainWidth - 446) > 1) {
    throw new Error(
      `Electron current-build pinned sidebar geometry failed: ${pinnedMainWidth}`,
    );
  }
  await narrowPage.getByRole("button", { name: "Hide sidebar" }).click();
  await narrowPage.waitForSelector(
    ".codex-ui-app-shell[data-layout-mode=\"narrow\"]:not([data-sidebar-open]) .codex-ui-app-shell__main:not([inert])",
  );
} finally {
  await narrowApp.close();
}

const shellScene = {
  frame: "shell-offline",
  id: "electron-shell-continuity",
  scenario: "streaming-recovery",
  shellState: "offline",
  view: "shell",
};
const { app: shellApp, page: shellPage } = await launchScene(shellScene, {
  capture: false,
});

try {
  const shellBounds = await shellApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (shellBounds?.width !== 1180 || shellBounds?.height !== 820) {
    throw new Error(
      `Electron shell native bounds failed: ${JSON.stringify(shellBounds)}`,
    );
  }
  const shellOffline = shellPage.getByRole("alert");
  if (!(await shellOffline.textContent())?.includes("You’re offline")) {
    throw new Error("Electron shell did not expose the offline route state.");
  }
  await shellPage.getByRole("button", { name: "Try again" }).click();
  await shellPage.waitForSelector(
    '.demo-root[data-shell-state="loading"] .codex-ui-app-route-outlet[data-status="loading"]:not([aria-busy]) > .codex-ui-app-route-outlet__state[role="status"]',
  );
  await shellPage.waitForFunction(
    () =>
      document
        .querySelector(".demo-root")
        ?.getAttribute("data-shell-state") === "ready" &&
      document.querySelector(".codex-ui-app-notification") !== null,
  );
  const restored = await shellPage.evaluate(() => ({
    notification: document
      .querySelector(".codex-ui-app-notification")
      ?.textContent?.replace(/\s+/g, " ").trim(),
    selected: Array.from(
      document.querySelectorAll(
        '.codex-ui-app-sidebar__item[aria-current="page"]',
      ),
      (item) => item.textContent?.trim(),
    ),
  }));
  if (
    !restored.notification?.includes("Connection restored") ||
    restored.selected.length !== 1 ||
    restored.selected[0] !== "Pull requests"
  ) {
    throw new Error(
      `Electron shell retry did not restore route continuity: ${JSON.stringify(restored)}`,
    );
  }

  await shellApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await shellPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open])',
  );
  await shellApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(1180, 820);
  });
  await shellPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="wide"][data-sidebar-open]',
  );
  const resizedSelection = await shellPage.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    selected: Array.from(
      document.querySelectorAll(
        '.codex-ui-app-sidebar__item[aria-current="page"]',
      ),
      (item) => item.textContent?.trim(),
    ),
  }));
  if (
    resizedSelection.overflow > 1 ||
    resizedSelection.selected.length !== 1 ||
    resizedSelection.selected[0] !== "Pull requests"
  ) {
    throw new Error(
      `Electron shell resize lost route selection: ${JSON.stringify(resizedSelection)}`,
    );
  }
} finally {
  await shellApp.close();
}

const markdownScene = {
  frame: "markdown-complete",
  id: "electron-markdown",
  scenario: "markdown",
};
const { app: markdownApp, page: markdownPage } = await launchScene(
  markdownScene,
  { capture: false },
);

try {
  const markdownNativeState = await markdownApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (
    markdownNativeState?.width !== 1180 ||
    markdownNativeState?.height !== 820
  ) {
    throw new Error(
      `Electron Markdown native bounds failed: ${JSON.stringify(markdownNativeState)}`,
    );
  }

  await markdownPage.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__codexMarkdownCopiedText = value;
        },
      },
    });
  });
  const markdownCopy = markdownPage.getByRole("button", {
    name: "Copy code",
  });
  await markdownCopy.click();
  await markdownPage.getByRole("button", { name: "Copied" }).waitFor();
  const markdownInteraction = await markdownPage.evaluate(() => {
    const tableScroll = document.querySelector(
      ".codex-ui-markdown__table-scroll",
    );
    tableScroll?.focus();
    return {
      actionCount: document.querySelectorAll(
        '[aria-label="Markdown response actions"] button',
      ).length,
      copiedText: window.__codexMarkdownCopiedText,
      copyFocused:
        document
          .querySelector(".codex-ui-code-block__copy")
          ?.getAttribute("data-copied") === "true",
      linkTarget: document
        .querySelector(
          '[data-item-id="assistant-markdown"] a[href^="https://example.com"]',
        )
        ?.getAttribute("target"),
      tableFocused: document.activeElement === tableScroll,
    };
  });
  if (
    markdownInteraction.actionCount !== 4 ||
    markdownInteraction.copiedText !== "const ready = true;" ||
    !markdownInteraction.copyFocused ||
    markdownInteraction.linkTarget !== "_blank" ||
    !markdownInteraction.tableFocused
  ) {
    throw new Error(
      `Electron Markdown interaction failed: ${JSON.stringify(markdownInteraction)}`,
    );
  }
} finally {
  await markdownApp.close();
}

const mcpScene = {
  frame: "mcp-tool-calls",
  id: "electron-mcp",
  scenario: "mcp-tool-call",
};
const { app: mcpApp, page: mcpPage } = await launchScene(mcpScene, {
  capture: false,
});

try {
  const timelineToggle = mcpPage.getByRole("button", {
    name: "Worked for 54s",
  });
  if ((await timelineToggle.getAttribute("aria-expanded")) !== "false") {
    throw new Error("Electron MCP timeline should start collapsed.");
  }
  await timelineToggle.click();
  const group = mcpPage.getByTestId("mcp-tool-call-group");
  const groupToggle = group.locator(
    ":scope > details > summary",
  );
  if (
    (await groupToggle.getAttribute("aria-expanded")) !== "false" ||
    (await group.getAttribute("data-source")) !== "openaiDeveloperDocs"
  ) {
    throw new Error("Electron MCP integration group baseline is invalid.");
  }
  await groupToggle.click();
  const calls = group.locator(".codex-ui-tool-call");
  if (
    (await calls.count()) !== 5 ||
    (await group.getByText("Search OpenAI docs", { exact: true }).count()) !==
      3 ||
    (await group.getByText("Fetch OpenAI doc", { exact: true }).count()) !== 2
  ) {
    throw new Error("Electron MCP integration did not reveal all calls.");
  }
  await calls.first().locator("summary").click();
  const mcpInteraction = await mcpPage.evaluate(() => {
    const structuredText = document.querySelector(
      ".codex-ui-tool-call__structured",
    )?.textContent;
    let resultHasCanonicalUrl = false;
    try {
      const structuredResult = JSON.parse(structuredText ?? "null");
      resultHasCanonicalUrl =
        typeof structuredResult === "object" &&
        structuredResult !== null &&
        structuredResult.url ===
          "https://learn.chatgpt.com/docs/extend/mcp";
    } catch {
      resultHasCanonicalUrl = false;
    }
    return {
      groupExpanded:
        document
          .querySelector(".codex-ui-mcp-tool-call-group details")
          ?.hasAttribute("open") ?? false,
      resultHasCanonicalUrl,
      timelineExpanded:
        document
          .querySelector(".codex-ui-activity-timeline")
          ?.hasAttribute("data-expanded") ?? false,
    };
  });
  if (
    !mcpInteraction.groupExpanded ||
    !mcpInteraction.resultHasCanonicalUrl ||
    !mcpInteraction.timelineExpanded
  ) {
    throw new Error(
      `Electron MCP interaction failed: ${JSON.stringify(mcpInteraction)}`,
    );
  }
} finally {
  await mcpApp.close();
}

const recoveryScene = {
  frame: "mixed-review-open",
  id: "electron-mcp-recovery-mixed-thread",
  scenario: "mcp-recovery-mixed-thread",
};
const { app: recoveryApp, page: recoveryPage } = await launchScene(
  recoveryScene,
  { capture: false, layoutMode: "wide" },
);

try {
  const recoveryTimeline = recoveryPage.getByRole("button", {
    name: "Worked for 28s",
  });
  await recoveryTimeline.click();
  const recoveryGroup = recoveryPage.getByTestId("mcp-tool-call-group");
  await recoveryGroup.locator(":scope > details > summary").click();
  const recoveryCalls = recoveryGroup.locator(".codex-ui-tool-call");
  const failedCall = recoveryCalls.first();
  await failedCall.locator("summary").click();

  const recoveryInteraction = await recoveryPage.evaluate(() => {
    const group = document.querySelector(
      ".codex-ui-mcp-tool-call-group",
    );
    const failed = document.querySelector(
      '[data-item-id="mcp-fetch-invalid"]',
    );
    return {
      approvalDecision: document
        .querySelector(
          '.codex-ui-approval-request[data-item-id="command-recovery-note"]',
        )
        ?.getAttribute("data-decision"),
      commandCount: document.querySelectorAll(
        ".codex-ui-command-execution",
      ).length,
      errorPresentation: failed
        ?.querySelector(".codex-ui-tool-call__error")
        ?.getAttribute("data-presentation"),
      errorText: failed
        ?.querySelector(".codex-ui-tool-call__error")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      fileCount: document.querySelectorAll(
        ".codex-ui-file-change-group__file",
      ).length,
      groupLabel: group
        ?.querySelector(".codex-ui-mcp-tool-call-group__label")
        ?.textContent?.trim(),
      groupStatus: group?.getAttribute("data-status"),
      reviewFileCount: document.querySelectorAll(
        ".codex-ui-file-review__file",
      ).length,
      reviewPanelOpen: Boolean(
        document.querySelector(
          '.codex-ui-workspace-panel[data-placement="side"]',
        ),
      ),
      toolCount: group?.querySelectorAll(".codex-ui-tool-call").length,
      responseActionLabels: Array.from(
        document.querySelectorAll(".demo-turn-actions"),
        (element) => element.getAttribute("aria-label"),
      ),
      userCount: document.querySelectorAll(
        '.codex-ui-agent-message[data-role="user"]',
      ).length,
    };
  });
  if (
    recoveryInteraction.approvalDecision !== "approved" ||
    recoveryInteraction.commandCount !== 2 ||
    recoveryInteraction.errorPresentation !== "output" ||
    !recoveryInteraction.errorText?.includes("plaintext") ||
    !recoveryInteraction.errorText?.includes("Invalid URL") ||
    recoveryInteraction.fileCount !== 1 ||
    recoveryInteraction.groupLabel !==
      "Used OpenAI Developer Docs integration" ||
    recoveryInteraction.groupStatus !== "completed" ||
    recoveryInteraction.reviewFileCount !== 1 ||
    !recoveryInteraction.reviewPanelOpen ||
    JSON.stringify(recoveryInteraction.responseActionLabels) !==
      JSON.stringify(["MCP response actions", "Response actions"]) ||
    recoveryInteraction.toolCount !== 3 ||
    recoveryInteraction.userCount !== 2
  ) {
    throw new Error(
      `Electron MCP recovery and mixed-thread interaction failed: ${JSON.stringify(recoveryInteraction)}`,
    );
  }

  await recoveryPage.getByRole("button", {
    name: "Show raw tool call output",
  }).click();
  const rawOutputDialog = recoveryPage.getByRole("dialog", {
    name: "Fetch OpenAI doc raw output",
  });
  await rawOutputDialog.waitFor({ state: "visible" });
  const rawOutputText = await rawOutputDialog.textContent();
  if (
    !rawOutputText?.includes("not-a-valid-url") ||
    !rawOutputText.includes("Invalid URL")
  ) {
    throw new Error(
      `Electron MCP raw-output dialog omitted the call payload: ${rawOutputText}`,
    );
  }
  await rawOutputDialog.getByRole("button", {
    name: "Close dialog",
  }).click();
  await rawOutputDialog.waitFor({ state: "hidden" });
} finally {
  await recoveryApp.close();
}

const workflowScene = {
  frame: "review-open",
  id: "electron-workflow",
  scenario: "workspace-workflow",
};
const { app: workflowApp, page: workflowPage } =
  await launchScene(workflowScene, {
    capture: false,
    layoutMode: "wide",
  });

try {
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const reviewResizer = workflowPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  const initialReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  const initialReviewResizerBox = await reviewResizer.boundingBox();
  if (
    !initialReviewResizerBox ||
    Math.abs(initialReviewWidth - 370) > 1 ||
    (await reviewResizer.getAttribute("aria-valuemin")) !== "320" ||
    (await reviewResizer.getAttribute("aria-valuemax")) !== "554"
  ) {
    throw new Error(
      `Electron Review resizer baseline failed: ${JSON.stringify({
        initialReviewResizerBox,
        initialReviewWidth,
      })}`,
    );
  }
  await workflowPage.mouse.move(
    initialReviewResizerBox.x + initialReviewResizerBox.width / 2,
    initialReviewResizerBox.y + 200,
  );
  await workflowPage.mouse.down();
  await workflowPage.mouse.move(
    initialReviewResizerBox.x + initialReviewResizerBox.width / 2 - 64,
    initialReviewResizerBox.y + 200,
    { steps: 8 },
  );
  await workflowPage.mouse.up();
  const draggedReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(draggedReviewWidth - 434) > 1) {
    throw new Error(
      `Electron Review pointer resize failed: ${draggedReviewWidth}`,
    );
  }
  await reviewResizer.press("End");
  const maximumReviewGeometry = await workflowPage.evaluate(() => {
    const shell = document
      .querySelector(".codex-ui-app-shell")
      ?.getBoundingClientRect();
    const header = document
      .querySelector(".codex-ui-thread-header")
      ?.getBoundingClientRect();
    const resizer = document
      .querySelector(".codex-ui-app-shell__side-panel-resizer")
      ?.getBoundingClientRect();
    return {
      ariaMax: document
        .querySelector(".codex-ui-app-shell__side-panel-resizer")
        ?.getAttribute("aria-valuemax"),
      ariaNow: document
        .querySelector(".codex-ui-app-shell__side-panel-resizer")
        ?.getAttribute("aria-valuenow"),
      mainWidth: header?.width,
      trackWidth:
        shell && resizer
          ? shell.right - (resizer.left + resizer.width / 2)
          : null,
    };
  });
  if (
    maximumReviewGeometry.ariaMax !== "554" ||
    maximumReviewGeometry.ariaNow !== "554" ||
    Math.abs((maximumReviewGeometry.mainWidth ?? 0) - 352) > 1 ||
    Math.abs((maximumReviewGeometry.trackWidth ?? 0) - 554) > 1
  ) {
    throw new Error(
      `Electron Review maximum track failed: ${JSON.stringify(maximumReviewGeometry)}`,
    );
  }
  await reviewResizer.press("Home");
  for (let index = 0; index < 6; index += 1) {
    await reviewResizer.press("ArrowLeft");
  }
  const restoredReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(restoredReviewWidth - 368) > 1) {
    throw new Error(
      `Electron Review keyboard resize failed: ${restoredReviewWidth}`,
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  const commandDisclosure = workflowPage
    .locator('[data-testid="command-execution"] details')
    .first();
  await commandDisclosure.locator("summary").click();
  if (!(await commandDisclosure.evaluate((element) => element.open))) {
    throw new Error("Electron command disclosure did not expand.");
  }
  const fileGroup = workflowPage.locator(
    '[data-testid="file-change-group"]',
  );
  if (
    (await fileGroup.count()) !== 1 ||
    (await fileGroup.locator(".codex-ui-file-change-group__file").count()) !==
      2
  ) {
    throw new Error("Electron file changes were not aggregated into one card.");
  }
  await workflowPage.getByRole("button", { name: "Open CHECKS.md" }).click();
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const workflowDiff = workflowPage.getByRole("list", {
    name: "Review diff for WORKFLOW.md",
  });
  const checksDiff = workflowPage.getByRole("list", {
    name: "Review diff for CHECKS.md",
  });
  if (
    !(await workflowDiff.isVisible()) ||
    !(await checksDiff.isVisible()) ||
    !(await workflowPage
      .getByRole("listitem", { name: "Review file CHECKS.md" })
      .getAttribute("data-selected"))
  ) {
    throw new Error(
      "Electron Review panel did not preserve both diffs and exact file focus.",
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const selectedTerminalText = await workflowPage
    .getByRole("log", { name: "Terminal output" })
    .textContent();
  if (
    !selectedTerminalText?.includes("pnpm test -- protocol-state") ||
    selectedTerminalText.includes("apply_patch WORKFLOW.md")
  ) {
    throw new Error(
      `Electron command-specific Terminal selection failed: ${selectedTerminalText}`,
    );
  }
  const workflowTerminalInput = workflowPage.getByRole("textbox", {
    name: "Terminal input",
  });
  await workflowTerminalInput.fill("first-terminal-only");
  await workflowTerminalInput.press("Enter");
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .nth(1)
    .click();
  const secondTerminalText = await workflowPage
    .getByRole("log", { name: "Terminal output" })
    .textContent();
  if (
    !secondTerminalText?.includes("apply_patch WORKFLOW.md") ||
    secondTerminalText.includes("first-terminal-only")
  ) {
    throw new Error(
      `Electron Terminal local-history isolation failed: ${secondTerminalText}`,
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  if (
    !(await workflowPage
      .getByRole("log", { name: "Terminal output" })
      .textContent())?.includes("first-terminal-only")
  ) {
    throw new Error(
      "Electron Terminal did not restore command-specific local history.",
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Review" })
    .click();
  if (
    !(await workflowDiff.isVisible()) ||
    !(await checksDiff.isVisible())
  ) {
    throw new Error("Electron Review action did not restore both file diffs.");
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  await workflowPage.waitForSelector('[data-testid="file-change-group"]', {
    state: "detached",
  });
} finally {
  await workflowApp.close();
}

const terminalScene = {
  frame: "terminal-open",
  id: "electron-background-terminal",
  scenario: "background-terminal",
};
const { app: terminalApp, page: terminalPage } = await launchScene(
  terminalScene,
  { capture: false },
);

try {
  await terminalPage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const terminalResizer = terminalPage.getByRole("separator", {
    name: "Resize bottom panel",
  });
  const initialTerminal = await terminalPage.evaluate(() => ({
    height: document
      .querySelector(".codex-ui-app-shell__bottom-panel")
      ?.getBoundingClientRect().height,
    input: Boolean(
      document.querySelector('input[aria-label="Terminal input"]'),
    ),
    max: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuemax"),
    min: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuemin"),
    now: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuenow"),
    transcriptText: document
      .querySelector('[role="log"][aria-label="Terminal output"]')
      ?.textContent,
  }));
  const terminalResizerBox = await terminalResizer.boundingBox();
  if (
    !terminalResizerBox ||
    Math.abs((initialTerminal.height ?? 0) - 272) > 1 ||
    initialTerminal.min !== "152" ||
    initialTerminal.max !== "402" ||
    initialTerminal.now !== "272" ||
    !initialTerminal.input ||
    !initialTerminal.transcriptText?.includes("VITE ready in 438 ms") ||
    !initialTerminal.transcriptText.includes("q")
  ) {
    throw new Error(
      `Electron Terminal baseline failed: ${JSON.stringify(initialTerminal)}`,
    );
  }

  await terminalPage.mouse.move(
    terminalResizerBox.x + terminalResizerBox.width / 2,
    terminalResizerBox.y + terminalResizerBox.height / 2,
  );
  await terminalPage.mouse.down();
  await terminalPage.mouse.move(
    terminalResizerBox.x + terminalResizerBox.width / 2,
    terminalResizerBox.y + terminalResizerBox.height / 2 - 64,
    { steps: 8 },
  );
  await terminalPage.mouse.up();
  const draggedTerminalHeight = await terminalPage
    .locator(".codex-ui-app-shell__bottom-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  if (Math.abs(draggedTerminalHeight - 336) > 1) {
    throw new Error(
      `Electron Terminal pointer resize failed: ${draggedTerminalHeight}`,
    );
  }

  await terminalResizer.press("Home");
  for (let index = 0; index < 15; index += 1) {
    await terminalResizer.press("ArrowUp");
  }
  const keyboardTerminalHeight = await terminalPage
    .locator(".codex-ui-app-shell__bottom-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  if (Math.abs(keyboardTerminalHeight - 272) > 1) {
    throw new Error(
      `Electron Terminal keyboard resize failed: ${keyboardTerminalHeight}`,
    );
  }

  const terminalInput = terminalPage.getByRole("textbox", {
    name: "Terminal input",
  });
  await terminalInput.fill("pwd");
  await terminalInput.press("Enter");
  if (
    (await terminalInput.inputValue()) !== "" ||
    !(await terminalPage
      .getByRole("log", { name: "Terminal output" })
      .textContent())?.includes(
      "Replay input is host-owned and was not executed.",
    )
  ) {
    throw new Error("Electron Terminal input did not stay host-owned.");
  }

  await terminalPage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await terminalPage.waitForSelector(
    ".codex-ui-app-shell:not([data-bottom-panel-open])",
  );
  const terminalToggle = terminalPage.getByRole("button", {
    name: "Toggle bottom panel",
  });
  if ((await terminalToggle.getAttribute("aria-pressed")) !== "false") {
    throw new Error("Electron Terminal close did not update the toggle.");
  }
  await terminalToggle.click();
  await terminalPage.waitForSelector(
    ".codex-ui-app-shell[data-bottom-panel-open]",
  );
  if (
    Math.abs(
      (await terminalPage
        .locator(".codex-ui-app-shell__bottom-panel")
        .evaluate((element) => element.getBoundingClientRect().height)) - 272,
    ) > 1
  ) {
    throw new Error("Electron Terminal did not restore its last height.");
  }
} finally {
  await terminalApp.close();
}

const pullRequestScene = {
  frame: "review-open",
  id: "electron-pull-request-detail",
  scenario: "workspace-workflow",
  view: "pull-request",
};
const { app: pullRequestApp, page: pullRequestPage } = await launchScene(
  pullRequestScene,
  { capture: false, layoutMode: "wide" },
);

try {
  await pullRequestPage.waitForSelector(
    '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
  );
  const pullRequestGeometry = await pullRequestPage.evaluate(() => {
    const bounds = (selector) =>
      document.querySelector(selector)?.getBoundingClientRect().toJSON() ??
      null;
    return {
      main: bounds(".codex-ui-app-shell__main"),
      panel: bounds(".codex-ui-app-shell__side-panel"),
      resizer: bounds(".codex-ui-app-shell__side-panel-resizer"),
      selectedTab: document
        .querySelector('[aria-label="Pull request view"] [aria-selected="true"]')
        ?.textContent?.trim(),
    };
  });
  if (
    !pullRequestGeometry.main ||
    !pullRequestGeometry.panel ||
    !pullRequestGeometry.resizer ||
    Math.abs(pullRequestGeometry.main.width - 352) > 1 ||
    Math.abs(pullRequestGeometry.panel.width - 554) > 1 ||
    Math.abs(pullRequestGeometry.resizer.width - 16) > 0.5 ||
    pullRequestGeometry.selectedTab !== "Summary"
  ) {
    throw new Error(
      `Electron pull request baseline failed: ${JSON.stringify(pullRequestGeometry)}`,
    );
  }

  await pullRequestPage.getByRole("tab", { name: "Timeline" }).click();
  await pullRequestPage.getByRole("textbox", { name: "Timeline comment" }).fill(
    "Synthetic local comment",
  );
  await pullRequestPage.getByRole("tab", { name: "Code" }).click();
  if (
    (await pullRequestPage
      .getByRole("list", { name: "Pull request code review" })
      .getAttribute("data-file-count")) !== "3"
  ) {
    throw new Error("Electron pull request Code tab did not render three files.");
  }

  const pullRequestResizer = pullRequestPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  const pullRequestResizerBox = await pullRequestResizer.boundingBox();
  if (!pullRequestResizerBox) {
    throw new Error("Electron pull request resize separator is missing.");
  }
  await pullRequestPage.mouse.move(
    pullRequestResizerBox.x + pullRequestResizerBox.width / 2,
    pullRequestResizerBox.y + 200,
  );
  await pullRequestPage.mouse.down();
  await pullRequestPage.mouse.move(
    pullRequestResizerBox.x + pullRequestResizerBox.width / 2 + 64,
    pullRequestResizerBox.y + 200,
    { steps: 8 },
  );
  await pullRequestPage.mouse.up();
  const narrowedPullRequestWidth = await pullRequestPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(narrowedPullRequestWidth - 490) > 1) {
    throw new Error(
      `Electron pull request pointer resize failed: ${narrowedPullRequestWidth}`,
    );
  }
  await pullRequestResizer.press("End");

  await pullRequestPage.getByRole("button", { name: "Expand panel" }).click();
  const expandedPullRequest = await pullRequestPage.evaluate(() => ({
    expanded: document
      .querySelector(".codex-ui-app-shell")
      ?.hasAttribute("data-side-panel-expanded"),
    panelWidth: document
      .querySelector(".codex-ui-app-shell__side-panel")
      ?.getBoundingClientRect().width,
    resizer: Boolean(
      document.querySelector(".codex-ui-app-shell__side-panel-resizer"),
    ),
  }));
  if (
    !expandedPullRequest.expanded ||
    expandedPullRequest.resizer ||
    Math.abs((expandedPullRequest.panelWidth ?? 0) - 906) > 1
  ) {
    throw new Error(
      `Electron pull request expansion failed: ${JSON.stringify(expandedPullRequest)}`,
    );
  }
  await pullRequestPage
    .getByRole("button", { name: "Restore panel width" })
    .click();
  await pullRequestPage.getByRole("tab", { name: "Summary" }).click();
  await pullRequestPage.getByRole("button", { name: "Live local" }).click();
  await pullRequestPage.waitForSelector(
    '.demo-root[data-view="conversation"][data-mode="live"]',
  );
  if (
    (await pullRequestPage
      .getByRole("button", { name: "Live local" })
      .getAttribute("aria-current")) !== "page" ||
    (await pullRequestPage
      .getByRole("button", { name: "Pull requests" })
      .getAttribute("aria-current")) !== null
  ) {
    throw new Error(
      "Electron Live local navigation did not leave the pull request view.",
    );
  }
} finally {
  await pullRequestApp.close();
}

const compactScene = {
  frame: "review-open",
  id: "electron-multi-file-compact",
  scenario: "multi-file-review",
};
const { app: compactApp, page: compactPage } = await launchScene(
  compactScene,
  {
    capture: false,
    windowSize: { height: 600, width: 800 },
  },
);

try {
  const compactNativeState = await compactApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/alpha.txt",
    })
    .click();
  await compactPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const compactContract = await compactPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
      };
    };
    const headerActions = document.querySelector(".demo-header-actions");
    return {
      backdropVisible:
        window.getComputedStyle(
          document.querySelector(
            '.codex-ui-app-shell__backdrop[data-backdrop="side-panel"]',
          ),
        ).display !== "none",
      fileGroups: document.querySelectorAll(
        ".codex-ui-file-change-group",
      ).length,
      fileRows: document.querySelectorAll(
        ".codex-ui-file-change-group__file",
      ).length,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headerActionsVisible:
        headerActions !== null &&
        window.getComputedStyle(headerActions).visibility === "visible",
      layoutMode: document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode"),
      main: rect(".codex-ui-app-shell__main"),
      mainAriaHidden: document
        .querySelector(".codex-ui-app-shell__main")
        ?.getAttribute("aria-hidden"),
      mainInert: document
        .querySelector(".codex-ui-app-shell__main")
        ?.hasAttribute("inert"),
      reviewDiffs: document.querySelectorAll(
        ".codex-ui-file-review .codex-ui-file-diff",
      ).length,
      sidePanelResizer: (() => {
        const element = document.querySelector(
          ".codex-ui-app-shell__side-panel-resizer",
        );
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          ariaMax: element.getAttribute("aria-valuemax"),
          ariaMin: element.getAttribute("aria-valuemin"),
          ariaNow: element.getAttribute("aria-valuenow"),
          width: bounds.width,
        };
      })(),
      sidePanel: rect(".codex-ui-app-shell__side-panel"),
      sidePanelAriaHidden: document
        .querySelector(".codex-ui-app-shell__side-panel")
        ?.getAttribute("aria-hidden"),
      sidePanelInert: document
        .querySelector(".codex-ui-app-shell__side-panel")
        ?.hasAttribute("inert"),
      sidebar: rect(".codex-ui-app-shell__sidebar"),
    };
  });

  if (
    compactNativeState?.width !== 800 ||
    compactNativeState?.height !== 600 ||
    compactContract.horizontalOverflow > 1 ||
    compactContract.fileGroups !== 1 ||
    compactContract.fileRows !== 2 ||
    compactContract.reviewDiffs !== 2 ||
    !compactContract.headerActionsVisible ||
    compactContract.layoutMode !== "medium" ||
    !compactContract.backdropVisible ||
    compactContract.mainAriaHidden !== null ||
    !compactContract.mainInert ||
    compactContract.sidePanelAriaHidden !== "false" ||
    compactContract.sidePanelInert ||
    !compactContract.sidebar ||
    !compactContract.main ||
    !compactContract.sidePanel ||
    compactContract.sidePanelResizer !== null ||
    Math.abs(compactContract.sidebar.width - 274) > 1 ||
    Math.abs(compactContract.main.width - 526) > 1 ||
    Math.abs(compactContract.sidePanel.width - 320) > 1 ||
    compactContract.sidePanel.right > 801
  ) {
    throw new Error(
      `Compact Electron multi-file geometry failed: ${JSON.stringify({
        native: compactNativeState,
        renderer: compactContract,
      })}`,
    );
  }

  await compactPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/beta.txt",
    })
    .click();
  await compactPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  if (
    !(await compactPage
      .getByRole("list", {
        name: "Review diff for .research/ui-kit-multifile-probe/alpha.txt",
      })
      .isVisible()) ||
    !(await compactPage
      .getByRole("list", {
        name: "Review diff for .research/ui-kit-multifile-probe/beta.txt",
      })
      .isVisible())
  ) {
    throw new Error(
      "Compact Electron Review overlay did not preserve both file diffs.",
    );
  }

  await compactPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  await compactPage.evaluate(() => {
    HTMLElement.prototype.scrollIntoView = function (options) {
      if (this.matches(".codex-ui-file-review__file[data-selected]")) {
        this.dataset.scrollRequest = JSON.stringify(options);
      }
    };
  });
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/beta.txt",
    })
    .click();
  const repeatedScrollRequest = await compactPage
    .getByRole("listitem", {
      name: "Review file .research/ui-kit-multifile-probe/beta.txt",
    })
    .getAttribute("data-scroll-request");
  if (
    !repeatedScrollRequest ||
    JSON.parse(repeatedScrollRequest).block !== "nearest" ||
    JSON.parse(repeatedScrollRequest).inline !== "nearest"
  ) {
    throw new Error(
      `Repeated file activation did not reveal the selected diff: ${repeatedScrollRequest}`,
    );
  }
} finally {
  await compactApp.close();
}

const compactTerminalScene = {
  frame: "terminal-open",
  id: "electron-background-terminal-compact",
  scenario: "background-terminal",
};
const {
  app: compactTerminalApp,
  page: compactTerminalPage,
} = await launchScene(compactTerminalScene, {
  capture: false,
  windowSize: { height: 680, width: 820 },
});

try {
  const compactTerminal = await compactTerminalPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
      };
    };
    const resizer = document.querySelector(
      ".codex-ui-app-shell__bottom-panel-resizer",
    );
    return {
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      panel: rect(".codex-ui-app-shell__bottom-panel"),
      panelContent: rect(
        '.codex-ui-workspace-panel[data-placement="bottom"] [role="tabpanel"]',
      ),
      resizer: resizer
        ? {
            max: resizer.getAttribute("aria-valuemax"),
            min: resizer.getAttribute("aria-valuemin"),
            now: resizer.getAttribute("aria-valuenow"),
            rect: rect(".codex-ui-app-shell__bottom-panel-resizer"),
          }
        : null,
    };
  });
  if (
    compactTerminal.horizontalOverflow > 1 ||
    !compactTerminal.panel ||
    !compactTerminal.panelContent ||
    !compactTerminal.resizer?.rect ||
    Math.abs(compactTerminal.panel.width - 546) > 1 ||
    Math.abs(compactTerminal.panel.left - 274) > 1 ||
    Math.abs(compactTerminal.panel.height - 272) > 1 ||
    Math.abs(compactTerminal.panelContent.height - 239) > 1 ||
    Math.abs(compactTerminal.resizer.rect.height - 16) > 0.5 ||
    Math.abs(
      compactTerminal.resizer.rect.left -
        compactTerminal.panel.left,
    ) > 1 ||
    Math.abs(
      compactTerminal.resizer.rect.right -
        compactTerminal.panel.right,
    ) > 1 ||
    compactTerminal.resizer.min !== "152" ||
    compactTerminal.resizer.max !== "332" ||
    compactTerminal.resizer.now !== "272"
  ) {
    throw new Error(
      `Compact Electron Terminal geometry failed: ${JSON.stringify(compactTerminal)}`,
    );
  }
} finally {
  await compactTerminalApp.close();
}

const largeReviewScene = {
  frame: "review-open",
  id: "electron-large-file-review",
  scenario: "large-file-review",
};
const { app: largeReviewApp, page: largeReviewPage } = await launchScene(
  largeReviewScene,
  { capture: false },
);

try {
  const reviewBefore = await largeReviewPage.evaluate(() => {
    const review = document.querySelector(".codex-ui-file-review");
    return review
      ? {
          clientHeight: review.clientHeight,
          fileCount: review.querySelectorAll(
            ".codex-ui-file-review__file",
          ).length,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          scrollHeight: review.scrollHeight,
          scrollTop: review.scrollTop,
        }
      : null;
  });
  if (
    !reviewBefore ||
    reviewBefore.fileCount !== 8 ||
    reviewBefore.horizontalOverflow > 1 ||
    reviewBefore.scrollHeight <= reviewBefore.clientHeight
  ) {
    throw new Error(
      `Electron large Review overflow failed: ${JSON.stringify(reviewBefore)}`,
    );
  }

  await largeReviewPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await largeReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await largeReviewPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  const selectedPath = ".research/large-review/08.ts";
  await largeReviewPage
    .getByRole("button", { name: `Open ${selectedPath}` })
    .click();
  const reviewAfter = await largeReviewPage.evaluate((path) => {
    const review = document.querySelector(".codex-ui-file-review");
    const selected = document.querySelector(
      '.codex-ui-file-review__file[data-selected]',
    );
    if (!review || !selected) return null;
    const reviewRect = review.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    return {
      current: selected.getAttribute("aria-label") === `Review file ${path}`,
      fullyVisible:
        selectedRect.top >= reviewRect.top - 1 &&
        selectedRect.bottom <= reviewRect.bottom + 1,
      scrollTop: review.scrollTop,
    };
  }, selectedPath);
  if (
    !reviewAfter?.current ||
    !reviewAfter.fullyVisible ||
    reviewAfter.scrollTop <= 0
  ) {
    throw new Error(
      `Electron large Review selection failed: ${JSON.stringify(reviewAfter)}`,
    );
  }
} finally {
  await largeReviewApp.close();
}

const codingWorkspaceScene = {
  frame: "workspace-ready",
  id: "electron-coding-workspace",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: codingWorkspaceApp,
  page: codingWorkspacePage,
} = await launchScene(codingWorkspaceScene, { capture: false });
try {
  const nativeWindow = await codingWorkspaceApp.evaluate(
    ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window
        ? {
            destroyed: window.isDestroyed(),
            size: window.getContentSize(),
            visible: window.isVisible(),
          }
        : null;
    },
  );
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820])
  ) {
    throw new Error(
      `Electron coding workspace window failed: ${JSON.stringify(nativeWindow)}`,
    );
  }

  for (const expected of [
    {
      composerWidth: 736,
      height: 820,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1180,
    },
    {
      composerWidth: 654,
      height: 680,
      layoutMode: "medium",
      rootWidth: 686,
      sidebarOpen: true,
      width: 960,
    },
    {
      composerWidth: 514,
      height: 680,
      layoutMode: "medium",
      rootWidth: 546,
      sidebarOpen: true,
      width: 820,
    },
    {
      composerWidth: 648,
      height: 680,
      layoutMode: "narrow",
      rootWidth: 680,
      sidebarOpen: false,
      width: 720,
    },
    {
      composerWidth: 736,
      height: 1080,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1920,
    },
    {
      composerWidth: 736,
      height: 1326,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 2560,
    },
    {
      composerWidth: 736,
      height: 820,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1180,
    },
  ]) {
    await codingWorkspaceApp.evaluate(
      ({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(
          size.width,
          size.height,
        );
      },
      expected,
    );
    await codingWorkspacePage.waitForFunction(
      (target) => {
        const shell = document.querySelector(".codex-ui-app-shell");
        return (
          window.innerWidth === target.width &&
          window.innerHeight === target.height &&
          shell?.getAttribute("data-layout-mode") ===
            target.layoutMode &&
          shell.hasAttribute("data-sidebar-open") ===
            target.sidebarOpen
        );
      },
      expected,
      { timeout: 5_000 },
    );
    const geometry = await codingWorkspacePage.evaluate(() => ({
      composerWidth: document
        .querySelector(".demo-workspace-start .codex-ui-composer")
        ?.getBoundingClientRect().width,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      rootWidth: document
        .querySelector(".demo-workspace-start")
        ?.getBoundingClientRect().width,
    }));
    if (
      Math.abs((geometry.rootWidth ?? 0) - expected.rootWidth) > 1 ||
      Math.abs(
        (geometry.composerWidth ?? 0) - expected.composerWidth,
      ) > 1 ||
      geometry.horizontalOverflow > 1
    ) {
      throw new Error(
        `Electron coding workspace responsive geometry failed at ${expected.width}x${expected.height}: ${JSON.stringify(geometry)}`,
      );
    }
  }

  const projectDestination = codingWorkspacePage.locator(
    "#demo-workspace-destination-trigger",
  );
  const projectTrigger = codingWorkspacePage.getByRole("button", {
    name: "Change project: codex-ui-kit",
  });
  const projectDialog = codingWorkspacePage.getByRole("dialog", {
    name: "Choose a project",
  });
  const projectSearch = projectDialog.getByRole("searchbox", {
    name: "Search projects",
  });
  await projectDestination.click();
  const destinationPopupState = await codingWorkspacePage.evaluate(() => {
    const destination = document.querySelector(
      "#demo-workspace-destination-trigger",
    );
    const contextTrigger = document.querySelector(
      "#demo-workspace-project-trigger",
    );
    return {
      contextExpanded: contextTrigger?.getAttribute("aria-expanded"),
      controls: destination?.getAttribute("aria-controls"),
      destinationExpanded: destination?.getAttribute("aria-expanded"),
      hasPopup: destination?.getAttribute("aria-haspopup"),
    };
  });
  if (
    destinationPopupState.contextExpanded === "true" ||
    destinationPopupState.controls !== "demo-workspace-project-dialog" ||
    destinationPopupState.destinationExpanded !== "true" ||
    destinationPopupState.hasPopup !== "dialog"
  ) {
    throw new Error(
      `Electron coding workspace destination popup semantics are invalid: ${JSON.stringify(destinationPopupState)}.`,
    );
  }
  await projectSearch.press("Escape");
  await projectDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.id,
    )) !== "demo-workspace-destination-trigger"
  ) {
    throw new Error(
      "Electron coding workspace did not restore destination focus after Escape.",
    );
  }
  await projectTrigger.click();
  await projectSearch.press("Escape");
  await projectDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Change project: codex-ui-kit"
  ) {
    throw new Error(
      "Electron coding workspace did not restore project-trigger focus after Escape.",
    );
  }
  await projectTrigger.click();
  await projectTrigger.focus();
  await codingWorkspacePage
    .getByRole("textbox", { name: "Workspace message composer" })
    .focus();
  await projectDialog.waitFor({ state: "hidden" });
  await projectTrigger.click();
  await projectDialog
    .getByRole("button", {
      name: "Don't work in a project",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change project: No project"]',
  );
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Change project: No project"
  ) {
    throw new Error(
      "Electron coding workspace did not restore project-trigger focus after clearing the project.",
    );
  }
  const noProjectDestination = (
    await codingWorkspacePage
      .locator(".demo-workspace-destination")
      .textContent()
  )?.trim();
  if (noProjectDestination !== "No project?") {
    throw new Error(
      `Electron coding workspace did not enter the no-project state: ${JSON.stringify(noProjectDestination)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Change project: No project" })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  await projectSearch.fill("app-server");
  await projectDialog
    .getByRole("option", {
      name: "Select project codex-app-server-client",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change project: codex-app-server-client"]',
  );
  await codingWorkspacePage.waitForTimeout(50);

  await codingWorkspacePage
    .getByRole("button", { name: "Change environment: Local" })
    .press("ArrowDown");
  await codingWorkspacePage.waitForTimeout(50);
  const environmentMenu = codingWorkspacePage.getByRole("menu", {
    name: "Start in",
  });
  const localEnvironment = environmentMenu.getByRole("menuitemradio", {
    name: "Work locally",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.matches(
        ".demo-workspace-environment-menu .codex-ui-menu-item:first-of-type",
      ) ?? false,
  );
  if ((await localEnvironment.getAttribute("aria-checked")) !== "true") {
    throw new Error(
      "Electron coding workspace did not preserve the local environment selection.",
    );
  }
  await environmentMenu
    .getByRole("menuitemradio", { name: "New worktree" })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  const localEnvironmentDialog = codingWorkspacePage.getByRole("dialog", {
    name: "Select local environment",
  });
  const localEnvironmentSearch = localEnvironmentDialog.getByRole(
    "searchbox",
    {
      name: "Search local environments",
    },
  );
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Search local environments",
  );
  const repairing = localEnvironmentDialog.getByRole("button", {
    name: "Use local environment Repairing worktree",
  });
  if (!(await repairing.isDisabled())) {
    throw new Error(
      "Electron coding workspace exposed a repairing environment as selectable.",
    );
  }
  await localEnvironmentSearch.press("Escape");
  await localEnvironmentDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  const canceledWorktreeState = await codingWorkspacePage.evaluate(() => ({
    activeLabel: document.activeElement?.getAttribute("aria-label"),
    environmentLabel: document
      .querySelector('[data-kind="environment"]')
      ?.getAttribute("aria-label"),
  }));
  if (
    canceledWorktreeState.activeLabel !== "Change environment: Local" ||
    canceledWorktreeState.environmentLabel !== "Change environment: Local"
  ) {
    throw new Error(
      `Electron coding workspace did not preserve and refocus the local environment after canceling New worktree: ${JSON.stringify(canceledWorktreeState)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Change environment: Local" })
    .press("ArrowDown");
  await environmentMenu
    .getByRole("menuitemradio", { name: "New worktree" })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Search local environments",
  );
  await localEnvironmentSearch.fill("coding");
  await localEnvironmentDialog
    .getByRole("button", {
      name: "Use local environment Coding workspace",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change environment: Local"]',
  );
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: feat/coding-workspace-lifecycle"]',
  );

  await codingWorkspacePage
    .getByRole("button", { name: "Change project: codex-ui-kit" })
    .click();
  await projectSearch.fill("app-server");
  await projectDialog
    .getByRole("option", {
      name: "Select project codex-app-server-client",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change environment: Local"]',
  );
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: main"]',
  );

  await codingWorkspacePage
    .getByRole("button", {
      name: "Change worktree: main",
    })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  const worktreeMenu = codingWorkspacePage.getByRole("menu", {
    name: "Branches",
  });
  const branchSearch = worktreeMenu.getByRole("searchbox", {
    name: "Search branches",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Search branches",
  );
  const appServerWorktreeLabels = await worktreeMenu
    .getByRole("menuitemradio")
    .allTextContents();
  if (
    appServerWorktreeLabels.some(
      (label) =>
        label.includes("Repairing") ||
        label.includes("feat/coding-workspace-lifecycle"),
    )
  ) {
    throw new Error(
      `Electron coding workspace exposed another project's worktree: ${JSON.stringify(appServerWorktreeLabels)}.`,
    );
  }
  await worktreeMenu
    .getByRole("menuitem", {
      name: "Create and checkout new branch…",
    })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Search local environments",
  );
  await localEnvironmentSearch.press("Escape");
  await localEnvironmentDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Change worktree: main"
  ) {
    throw new Error(
      "Electron coding workspace did not restore focus to the worktree launcher.",
    );
  }
  await codingWorkspacePage
    .getByRole("button", {
      name: "Change worktree: main",
    })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  await worktreeMenu
    .getByRole("menuitem", {
      name: "Create and checkout new branch…",
    })
    .click();
  await localEnvironmentDialog
    .getByRole("button", { name: "Create worktree" })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change environment: New worktree"]',
  );
  await codingWorkspacePage
    .getByRole("button", {
      name: "Change worktree: main",
    })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  await branchSearch.press("m");
  const branchSearchKeyboardState = await codingWorkspacePage.evaluate(() => ({
    activeLabel: document.activeElement?.getAttribute("aria-label"),
    value: (
      document.querySelector(
        '.demo-workspace-worktree-menu input[aria-label="Search branches"]',
      )
    )?.value,
  }));
  if (
    branchSearchKeyboardState.activeLabel !== "Search branches" ||
    branchSearchKeyboardState.value !== "m"
  ) {
    throw new Error(
      `Electron worktree search lost typed input to menu typeahead: ${JSON.stringify(branchSearchKeyboardState)}.`,
    );
  }
  await branchSearch.press("ArrowDown");
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("role"),
    )) !== "menuitemradio"
  ) {
    throw new Error(
      "Electron worktree search did not retain arrow navigation into filtered branches.",
    );
  }
  await worktreeMenu
    .getByRole("menuitemradio", {
      name: "main",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: main"]',
  );
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change environment: Local"]',
  );

  const workspaceComposer = codingWorkspacePage.getByRole("textbox", {
    name: "Workspace message composer",
  });
  await workspaceComposer.fill(
    "Run the protocol-backed coding workspace lifecycle.",
  );
  await workspaceComposer.press("Enter");
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  if (
    (await codingWorkspacePage
      .getByText("Run the protocol-backed coding workspace lifecycle.", {
        exact: true,
      })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron coding workspace discarded the submitted prompt.",
    );
  }
  if (
    (await codingWorkspacePage
      .getByTestId("command-execution")
      .count()) !== 2
  ) {
    throw new Error(
      "Electron coding workspace did not reach command execution.",
    );
  }
  const workspaceCommandCwds = await codingWorkspacePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    workspaceCommandCwds.some(
      (cwd) => cwd !== "cwd\n/workspace/codex-app-server-client",
    )
  ) {
    throw new Error(
      `Electron coding workspace did not route commands through the selected project: ${JSON.stringify(workspaceCommandCwds)}.`,
    );
  }
  await codingWorkspacePage
    .getByTestId("approval-request")
    .getByRole("button", { name: "Allow once" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"] [data-testid="file-change-group"]',
  );
  const fileGroup = codingWorkspacePage.locator(
    '[data-testid="file-change-group"]',
  );
  if (
    (await fileGroup.count()) !== 1 ||
    (await fileGroup.locator(".codex-ui-file-change-group__file").count()) !==
      2
  ) {
    throw new Error(
      "Electron coding workspace did not reach protocol-backed file changes.",
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Open CHECKS.md" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  await codingWorkspacePage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const workspaceTerminalLabel = (
    await codingWorkspacePage
      .locator(".demo-terminal-tab-label")
      .textContent()
  )?.replace("×", "").trim();
  if (workspaceTerminalLabel !== "▣codex-app-server-client") {
    throw new Error(
      `Electron coding workspace terminal tab did not use the routed project: ${JSON.stringify(workspaceTerminalLabel)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Pull requests" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
  );
} finally {
  await codingWorkspaceApp.close();
}

const cloudWorkspaceScene = {
  frame: "workspace-ready",
  id: "electron-cloud-coding-workspace",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: cloudWorkspaceApp,
  page: cloudWorkspacePage,
} = await launchScene(cloudWorkspaceScene, { capture: false });
try {
  await cloudWorkspacePage
    .getByRole("button", { name: "Change environment: Local" })
    .click();
  await cloudWorkspacePage
    .getByRole("menu", { name: "Start in" })
    .getByRole("menuitemradio", { name: "Connect Codex web" })
    .click();
  await cloudWorkspacePage.waitForSelector(
    'button[aria-label="Change environment: Codex web"]',
  );
  await cloudWorkspacePage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  await cloudWorkspacePage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", {
      name: "feat/coding-workspace-lifecycle",
    })
    .click();
  await cloudWorkspacePage
    .getByRole("textbox", { name: "Workspace message composer" })
    .fill("Run the cloud worktree lifecycle.");
  await cloudWorkspacePage
    .getByRole("textbox", { name: "Workspace message composer" })
    .press("Enter");
  await cloudWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  const cloudWorkspaceCommandCwds = await cloudWorkspacePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    cloudWorkspaceCommandCwds.some(
      (cwd) =>
        cwd !==
        "cwd\n/cloud/codex-ui-kit/.worktrees/feat-coding-workspace-lifecycle",
    )
  ) {
    throw new Error(
      `Electron cloud coding workspace discarded the selected worktree: ${JSON.stringify(cloudWorkspaceCommandCwds)}.`,
    );
  }
} finally {
  await cloudWorkspaceApp.close();
}

const rejectedApprovalScene = {
  frame: "approval-pending",
  id: "electron-workspace-approval-rejected",
  scenario: "workspace-workflow",
};
const {
  app: rejectedApprovalApp,
  page: rejectedApprovalPage,
} = await launchScene(rejectedApprovalScene, { capture: false });
try {
  const rejectedApproval = rejectedApprovalPage.getByTestId(
    "approval-request",
  );
  await rejectedApproval.getByRole("button", { name: "Deny" }).click();
  await rejectedApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-rejected"] [data-testid="approval-request"][data-decision="rejected"]',
  );
  if (
    (await rejectedApproval.getByRole("button", { name: "Deny" }).count()) !==
    0
  ) {
    throw new Error(
      "Electron workspace approval remained actionable after rejection.",
    );
  }
} finally {
  await rejectedApprovalApp.close();
}

const acceptedMixedApprovalScene = {
  frame: "mixed-approval-pending",
  id: "electron-mixed-approval-accepted",
  scenario: "mcp-recovery-mixed-thread",
};
const {
  app: acceptedMixedApprovalApp,
  page: acceptedMixedApprovalPage,
} = await launchScene(acceptedMixedApprovalScene, { capture: false });
try {
  const acceptedMixedApproval =
    acceptedMixedApprovalPage.getByTestId("approval-request");
  await acceptedMixedApproval
    .getByRole("button", { name: "Allow once" })
    .click();
  await acceptedMixedApprovalPage.waitForSelector(
    '.demo-root[data-frame="mixed-review-open"][data-status="completed"] [data-testid="file-change-group"]',
  );
  if (
    (await acceptedMixedApproval.getAttribute("data-decision")) !==
      "approved" ||
    (await acceptedMixedApprovalPage
      .getByText(
        "The recovery check passed and RECOVERY.md is ready for review.",
        { exact: true },
      )
      .count()) !== 1
  ) {
    throw new Error(
      "Electron accepted mixed replay approval did not advance through completion.",
    );
  }
} finally {
  await acceptedMixedApprovalApp.close();
}

const conversationLifecycleScene = {
  frame: "conversation-thread-ready",
  id: "electron-conversation-lifecycle",
  scenario: "conversation-lifecycle",
};
const {
  app: conversationLifecycleApp,
  page: conversationLifecyclePage,
} = await launchScene(conversationLifecycleScene, { capture: false });
try {
  const nativeWindow = await conversationLifecycleApp.evaluate(
    ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window
        ? {
            destroyed: window.isDestroyed(),
            size: window.getContentSize(),
            visible: window.isVisible(),
          }
        : null;
    },
  );
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820])
  ) {
    throw new Error(
      `Electron conversation window contract failed: ${JSON.stringify(nativeWindow)}`,
    );
  }

  const composer = conversationLifecyclePage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill("Start the Electron lifecycle.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"]',
  );
  await composer.fill("Queue the Electron follow-up.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-queue-count="1"]',
  );
  await conversationLifecyclePage
    .getByRole("button", { exact: true, name: "Stop" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queue-paused"]',
  );
  await conversationLifecyclePage.getByRole("button", { name: "Resume" }).click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-status="running"]',
  );

  await conversationLifecyclePage
    .getByRole("button", {
      exact: true,
      name: "Jump to user message 1",
    })
    .click();
  await conversationLifecyclePage.waitForSelector(
    ".codex-ui-thread-floating-button[data-show]",
  );
  await conversationLifecyclePage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-thread-following="true"]',
  );

  const lifecycle = await conversationLifecyclePage.evaluate(() => ({
    contextControls: document.querySelectorAll(
      ".codex-ui-composer-context button",
    ).length,
    navigationButtons: document.querySelectorAll(
      ".codex-ui-message-navigation-rail button",
    ).length,
    queueRows: document.querySelectorAll(
      ".codex-ui-composer-queue__row",
    ).length,
    status: document
      .querySelector(".demo-root")
      ?.getAttribute("data-status"),
    stopButtons: document.querySelectorAll(
      '.codex-ui-composer button[aria-label="Stop"]',
    ).length,
    threadFollowing: document
      .querySelector(".demo-root")
      ?.getAttribute("data-thread-following"),
  }));
  if (
    lifecycle.contextControls !== 0 ||
    lifecycle.navigationButtons !== 11 ||
    lifecycle.queueRows !== 1 ||
    lifecycle.status !== "running" ||
    lifecycle.stopButtons !== 1 ||
    lifecycle.threadFollowing !== "true"
  ) {
    throw new Error(
      `Electron conversation lifecycle failed: ${JSON.stringify(lifecycle)}`,
    );
  }
} finally {
  await conversationLifecycleApp.close();
}

console.log(
  "Electron host, native-window, coding-workspace routing, conversation/Composer lifecycle, default 720px narrow reachability, resizable navigation/Review/Terminal/PR detail, PR tabs and expansion, MCP disclosure/result, multi-file Review, large diff scrolling, and compact geometry contracts passed.",
);
