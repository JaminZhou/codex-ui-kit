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

const workflowScene = {
  frame: "review-open",
  id: "electron-workflow",
  scenario: "workspace-workflow",
};
const { app: workflowApp, page: workflowPage } =
  await launchScene(workflowScene, { capture: false });

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
    compactContract.mainAriaHidden !== null ||
    compactContract.mainInert ||
    compactContract.sidePanelAriaHidden !== "false" ||
    compactContract.sidePanelInert ||
    !compactContract.sidebar ||
    !compactContract.main ||
    !compactContract.sidePanel ||
    !compactContract.sidePanelResizer ||
    Math.abs(compactContract.sidebar.width - 274) > 1 ||
    compactContract.main.width < 200 ||
    compactContract.sidePanel.width < 315 ||
    Math.abs(compactContract.sidePanelResizer.width - 16) > 0.5 ||
    compactContract.sidePanelResizer.ariaMin !== "320" ||
    compactContract.sidePanelResizer.ariaMax !== "320" ||
    compactContract.sidePanelResizer.ariaNow !== "320" ||
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
      "Compact Electron split did not keep conversation and Review interactive.",
    );
  }

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

console.log(
  "Electron host, native-window, resizable navigation and Review, multi-file Review, large diff scrolling, and compact geometry contracts passed.",
);
