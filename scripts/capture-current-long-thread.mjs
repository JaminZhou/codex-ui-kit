import { dirname, isAbsolute, resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";

// Capture-only: the user-authorized disposable thread must already exist.

const port = Number(process.env.CODEX_CURRENT_LONG_THREAD_CDP_PORT ?? "9888");
const profile = process.env.CODEX_CURRENT_LONG_THREAD_PROFILE;
const output = process.env.CODEX_CURRENT_LONG_THREAD_OUTPUT;
const allowNavigation =
  process.env.CODEX_CURRENT_LONG_THREAD_ALLOW_NAVIGATION === "1";
const title = process.env.CODEX_CURRENT_LONG_THREAD_TITLE ?? "LONG THREAD 01";

if (!profile || !output || !isAbsolute(profile) || !isAbsolute(output)) {
  throw new Error("PROFILE and OUTPUT must be absolute paths.");
}
if (dirname(resolve(output)) !== resolve(profile)) {
  throw new Error("OUTPUT must be a new direct child of the isolated profile.");
}
if (!allowNavigation) {
  throw new Error("Set CODEX_CURRENT_LONG_THREAD_ALLOW_NAVIGATION=1 explicitly.");
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const candidates = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter((page) => page.url().startsWith("app://-/index.html"));
  const ranked = await Promise.all(
    candidates.map(async (page) =>
      page.evaluate(() => ({
        area: innerWidth * innerHeight,
        buttonCount: document.querySelectorAll("button").length,
        hasComposer: Boolean(
          document.querySelector(
            '[contenteditable="true"][role="textbox"][aria-label="Do anything"]',
          ),
        ),
        hasMain: Boolean(document.querySelector("main")),
      })).then((signals) => ({ page, signals })),
    ),
  );
  ranked.sort((left, right) => {
    const leftScore =
      Number(left.signals.hasComposer) * 1_000_000_000 +
      Number(left.signals.hasMain) * 100_000_000 +
      left.signals.buttonCount * 10_000 +
      left.signals.area;
    const rightScore =
      Number(right.signals.hasComposer) * 1_000_000_000 +
      Number(right.signals.hasMain) * 100_000_000 +
      right.signals.buttonCount * 10_000 +
      right.signals.area;
    return rightScore - leftScore;
  });
  const page = ranked[0]?.page;
  if (!page || !ranked[0]?.signals.hasMain) {
    throw new Error("Main Codex Renderer target not found structurally.");
  }

  const titleRow = page.getByText(title, { exact: true }).first();
  if ((await titleRow.count()) === 1 && (await titleRow.isVisible())) {
    await titleRow.click();
    await page.waitForTimeout(500);
  }
  if ((await page.getByText(title, { exact: true }).count()) === 0) {
    throw new Error(`Disposable long-thread task is not reachable: ${title}`);
  }

  const normalizeWide = async () => {
    await page.setViewportSize({ height: 820, width: 1180 });
    await page.waitForTimeout(350);
    const hideSidebar = page.getByRole("button", {
      exact: true,
      name: "Hide sidebar",
    });
    if ((await hideSidebar.count()) === 1 && (await hideSidebar.isVisible())) {
      await hideSidebar.click();
      await page.waitForTimeout(300);
    }
    const pinnedSummary = page.getByRole("button", {
      exact: true,
      name: "Toggle pinned summary",
    });
    if (
      (await pinnedSummary.count()) === 1 &&
      (await pinnedSummary.isVisible())
    ) {
      const summaryHeading = page.getByText("Environment", { exact: true });
      if ((await summaryHeading.count()) > 0) {
        await pinnedSummary.click();
        await page.waitForTimeout(300);
      }
    }
  };

  const returnToLatest = async () => {
    const control = page.getByRole("button", {
      exact: true,
      name: "Scroll to bottom",
    });
    if ((await control.count()) === 1 && (await control.isVisible())) {
      await control.click();
      await page.waitForTimeout(350);
    }
  };

  const capture = async () =>
    page.evaluate(() => {
      const round = (value) => Math.round(value * 100) / 100;
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: round(value.height),
          left: round(value.left),
          top: round(value.top),
          width: round(value.width),
        };
      };
      const visible = (element) =>
        element instanceof HTMLElement &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility === "visible";
      const scrollCandidates = [...document.querySelectorAll("main *")]
        .filter((element) => {
          if (!visible(element)) return false;
          const style = getComputedStyle(element);
          return (
            style.flexDirection === "column-reverse" &&
            element.scrollHeight > element.clientHeight
          );
        })
        .sort(
          (left, right) =>
            right.getBoundingClientRect().width -
            left.getBoundingClientRect().width,
        );
      const viewport = scrollCandidates[0];
      const railButtons = [...document.querySelectorAll("button")].filter(
        (button) =>
          button.getAttribute("aria-label")?.startsWith(
            "Jump to user message ",
          ),
      );
      const visibleRailButtons = railButtons.filter(visible);
      const currentRail = railButtons.find(
        (button) => button.getAttribute("aria-current") === "true",
      );
      const composerInput = document.querySelector(
        '[contenteditable="true"][role="textbox"][aria-label="Do anything"]',
      );
      const composer = composerInput?.closest('[data-slot="composer"]') ??
        composerInput?.parentElement?.parentElement;
      const floating = [...document.querySelectorAll("button")].find(
        (button) => button.getAttribute("aria-label") === "Scroll to bottom",
      );
      const assistantLeafCount = [...document.querySelectorAll("main *")]
        .filter(
          (element) =>
            visible(element) &&
            element.children.length === 0 &&
            /^LONG THREAD \d{2}\.$/.test(element.textContent?.trim() ?? ""),
        ).length;
      return {
        assistantLeafCount,
        composer: rect(composer),
        currentRailIndex: Number(
          currentRail
            ?.getAttribute("aria-label")
            ?.replace("Jump to user message ", "") ?? 0,
        ),
        floating: rect(floating),
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        rail: {
          buttonCount: railButtons.length,
          rect: rect(visibleRailButtons[0]?.closest("nav")),
          visibleButtonCount: visibleRailButtons.length,
        },
        viewport:
          viewport instanceof HTMLElement
            ? {
                flexDirection: getComputedStyle(viewport).flexDirection,
                rect: rect(viewport),
                scrollHeight: viewport.scrollHeight,
                scrollTop: viewport.scrollTop,
              }
            : null,
        window: { height: innerHeight, width: innerWidth },
      };
    });

  await normalizeWide();
  await returnToLatest();
  const latest = await capture();
  const message15 = page.getByRole("button", {
    exact: true,
    name: "Jump to user message 15",
  });
  if ((await message15.count()) !== 1 || !(await message15.isVisible())) {
    throw new Error("Wide 30-message navigation rail is not visible.");
  }
  await message15.click();
  await page.waitForTimeout(400);
  const middle = await capture();
  const wideScreenshot = output.replace(/\.json$/, "-wide-middle.png");
  await page.screenshot({ path: wideScreenshot });

  await page.setViewportSize({ height: 680, width: 720 });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const viewport = [...document.querySelectorAll("main *")].find(
      (element) =>
        element instanceof HTMLElement &&
        getComputedStyle(element).flexDirection === "column-reverse" &&
        element.scrollHeight > element.clientHeight,
    );
    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Reverse-origin viewport not found.");
    }
    viewport.scrollTop = -900;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForTimeout(350);
  const compactAway = await capture();
  const compactScreenshot = output.replace(/\.json$/, "-compact-away.png");
  await page.screenshot({ path: compactScreenshot });
  await returnToLatest();
  const compactLatest = await capture();

  const result = {
    compactAway,
    compactLatest,
    compactScreenshot,
    latest,
    middle,
    titleHashInputLength: title.length,
    wideScreenshot,
  };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
