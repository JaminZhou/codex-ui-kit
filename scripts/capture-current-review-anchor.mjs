import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only: this script never submits a prompt. The disposable task must
// already contain one completed current 26.825 Review file-change observation.

const port = Number(process.env.CODEX_CURRENT_REVIEW_26_825_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_REVIEW_26_825_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_REVIEW_26_825_OUTPUT_DIR;
const taskTitleSha256 =
  process.env.CODEX_CURRENT_REVIEW_26_825_TASK_TITLE_SHA256;
const allowCapture =
  process.env.CODEX_CURRENT_REVIEW_26_825_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const expectedPaths = [
  "research/current-review-26-825-probe/alpha.txt",
  "research/current-review-26-825-probe/obsolete.txt",
  "research/current-review-26-825-probe/added.txt",
];
const expectedRawPaths = [
  "research/current-review-26-825-probe/added.txt",
  "research/current-review-26-825-probe/alpha.txt",
  "research/current-review-26-825-probe/alpha.txt",
  "research/current-review-26-825-probe/obsolete.txt",
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated current-Review CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated current-Review profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute current-Review output directory.");
}
if (!/^[a-f0-9]{64}$/.test(taskTitleSha256 ?? "")) {
  throw new Error("Set the SHA-256 of the disposable current-Review title.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_REVIEW_26_825_ALLOW_CAPTURE=1 to authorize capture-only navigation and screenshot sampling in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The current-Review profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-review-26-825-capture-")
) {
  throw new Error(
    "The output must be a new current-review-26-825-capture-* direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readInstalledSnapshot = async () => {
  const before = await stat(appAsar);
  const appAsarSha256 = execFileSync(
    "/usr/bin/shasum",
    ["-a", "256", appAsar],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\s+/)[0];
  const after = await stat(appAsar);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.ctimeMs !== after.ctimeMs ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("The installed app.asar changed while it was hashed.");
  }
  return {
    appAsarBytes: after.size,
    appAsarSha256,
    appVersion: plistValue("CFBundleShortVersionString"),
    buildNumber: plistValue("CFBundleVersion"),
    chromiumVersion: plistValue("ChromiumBaseVersion"),
  };
};
const fingerprint = await readInstalledSnapshot();
if (
  Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint does not match the promoted baseline: ${JSON.stringify(fingerprint)}`,
  );
}

const listenerFields = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const listeners = [];
for (const field of listenerFields) {
  if (field.startsWith("p")) listeners.push({ addresses: [], pid: field.slice(1) });
  if (field.startsWith("n")) listeners.at(-1)?.addresses.push(field.slice(1));
}
if (
  listeners.length === 0 ||
  listeners.some(
    ({ addresses }) =>
      addresses.length !== 1 || addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every current-Review CDP listener must be loopback-only.");
}
const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", pid],
      { encoding: "utf8" },
    ),
  );
const valuesFor = (argv, prefix) =>
  argv
    .filter((argument) => argument.startsWith(prefix))
    .map((argument) => argument.slice(prefix.length));
const isolatedOwners = [];
for (const listener of listeners) {
  let processInfo;
  try {
    processInfo = readProcessInfo(listener.pid);
  } catch {
    continue;
  }
  const profiles = valuesFor(processInfo.argv, "--user-data-dir=");
  if (
    processInfo.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
    valuesFor(processInfo.argv, "--remote-debugging-address=")[0] ===
      "127.0.0.1" &&
    valuesFor(processInfo.argv, "--remote-debugging-port=")[0] ===
      String(port) &&
    profiles.length === 1 &&
    (await realpath(profiles[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated current-Review CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    return {
      area: innerWidth * innerHeight,
      landmarks: {
        main: document.querySelectorAll("main").length,
        nav: document.querySelectorAll("nav").length,
        sidebarTrigger: document.querySelectorAll(
          '[aria-label="Hide sidebar"], [aria-label="Show sidebar"]',
        ).length,
        textbox: document.querySelectorAll(
          'textarea, [contenteditable="true"], [role="textbox"]',
        ).length,
      },
      visibleControls: [...document.querySelectorAll("button, a")].filter(
        visible,
      ).length,
    };
  });
  return { index, page, url: page.url(), ...structure };
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let page;
let initialViewport;
let initialSidebarVisible;
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const selected = selectCurrentMainCandidate(
    await Promise.all(pages.map(inspectCandidate)),
  );
  page = selected.page;
  await page.bringToFront();
  initialViewport = await page.evaluate(() => ({
    height: innerHeight,
    width: innerWidth,
  }));
  initialSidebarVisible =
    (await page.locator('button[aria-label="Hide sidebar"]:visible').count()) >
    0;

  const setSidebarVisible = async (visible) => {
    const label = visible ? "Show sidebar" : "Hide sidebar";
    const control = page.locator(`button[aria-label="${label}"]:visible`);
    if ((await control.count()) > 0) {
      await control.first().evaluate((element) => element.click());
      await page.waitForTimeout(250);
    }
  };
  const closeReview = async () => {
    const close = page.getByRole("button", {
      exact: true,
      name: "Close Review tab",
    });
    if ((await close.count()) > 0 && (await close.last().isVisible())) {
      await close.last().evaluate((element) => element.click());
      await page.waitForTimeout(250);
    }
  };

  await setSidebarVisible(true);
  const titleNodes = page.locator("nav:visible [data-thread-title]:visible");
  const titles = await titleNodes.evaluateAll((elements) =>
    elements.map((element, index) => ({
      index,
      title: element.textContent?.trim() ?? "",
    })),
  );
  const matches = titles.filter(({ title }) => sha256(title) === taskTitleSha256);
  if (matches.length !== 1) {
    throw new Error("Could not resolve exactly one disposable current-Review task.");
  }
  await titleNodes.nth(matches[0].index).evaluate((element) => {
    const target = element.closest(
      '[data-app-action-sidebar-thread-row], button, a',
    );
    if (!(target instanceof HTMLElement)) {
      throw new Error("Disposable current-Review task row is not clickable.");
    }
    target.click();
  });
  await page
    .getByText("CURRENT REVIEW 26.825 COMPLETE.", { exact: true })
    .last()
    .waitFor({ state: "visible", timeout: 10_000 });
  await page
    .getByText("Edited 3 files", { exact: true })
    .last()
    .waitFor({ state: "visible", timeout: 10_000 });

  const records = [];
  for (const viewportName of ["wide", "compact"]) {
    const viewport = currentBaselineViewports[viewportName];
    await page.setViewportSize(viewport);
    await page.evaluate(async () => document.fonts.ready);
    await setSidebarVisible(false);
    await closeReview();
    await page.waitForTimeout(300);
    await page.mouse.move(viewport.width - 8, viewport.height - 8);
    const cardScreenshot = screenshotPath(`card-${viewportName}`);
    await page.screenshot({ path: cardScreenshot });

    const reviewButton = page.getByRole("button", {
      exact: true,
      name: "Review",
    });
    if ((await reviewButton.count()) !== 1) {
      throw new Error(`The ${viewportName} Review card action is ambiguous.`);
    }
    await reviewButton.click();
    const filter = page.locator('input[placeholder="Filter files…"]:visible');
    await filter.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.mouse.move(viewport.width - 8, viewport.height - 8);
    const reviewScreenshot = screenshotPath(`review-${viewportName}`);
    await page.screenshot({ path: reviewScreenshot });

    const observation = await page.evaluate(
      ({ expectedPaths: expectedCardPaths, expectedRawPaths: rawPaths }) => {
        const visible = (element) =>
          element instanceof HTMLElement &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        const rect = (element) => {
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const all = [...document.querySelectorAll("*")];
        const edited = all.find(
          (element) =>
            visible(element) &&
            element.children.length === 0 &&
            element.textContent?.trim() === "Edited 3 files",
        );
        let card = edited?.parentElement ?? null;
        while (
          card?.parentElement &&
          !expectedCardPaths.every((path) => card?.textContent?.includes(path))
        ) {
          card = card.parentElement;
        }
        const filterInput = document.querySelector(
          'input[placeholder="Filter files…"]',
        );
        let panel = filterInput?.parentElement ?? null;
        while (panel?.parentElement) {
          const value = panel.getBoundingClientRect();
          if (
            Math.abs(value.right - innerWidth) < 1 &&
            Math.abs(value.height - innerHeight) < 1 &&
            value.width >= 300
          ) {
            break;
          }
          panel = panel.parentElement;
        }
        const buttonLabels = [...document.querySelectorAll("button")]
          .filter(visible)
          .map(
            (button) =>
              button.getAttribute("aria-label") ??
              button.textContent?.replace(/\s+/g, " ").trim(),
          )
          .filter(Boolean);
        const panelButtonLabels = [...(panel?.querySelectorAll("button") ?? [])]
          .map(
            (button) =>
              button.getAttribute("aria-label") ??
              button.textContent?.replace(/\s+/g, " ").trim(),
          )
          .filter(Boolean);
        const svgHash = (element) => {
          const data = [...(element?.querySelectorAll("path") ?? [])]
            .map((path) => path.getAttribute("d") ?? "")
            .join("\n");
          return data;
        };
        const undoAction = [...document.querySelectorAll("button")].find(
          (button) => visible(button) && button.textContent?.trim().startsWith("Undo"),
        );
        const cardRows = expectedCardPaths.map((path) => ({
          count: all.filter(
            (element) =>
              visible(element) &&
              element.children.length === 0 &&
              element.textContent?.trim() === path,
          ).length,
          path,
        }));
        return {
          card: rect(card),
          cardRows,
          cardSvgPaths: svgHash(edited?.parentElement?.previousElementSibling),
          buttonLabels,
          composerSendVisible: [...document.querySelectorAll("button")].some(
            (button) =>
              visible(button) && button.getAttribute("aria-label") === "Send",
          ),
          durationCount: all.filter(
            (element) =>
              visible(element) &&
              element.children.length === 0 &&
              element.textContent?.trim() === "Worked for 20s",
          ).length,
          fullAccessVisible: all.some(
            (element) =>
              visible(element) &&
              element.children.length === 0 &&
              element.textContent?.trim() === "Full access",
          ),
          horizontalOverflow: Math.max(
            0,
            document.documentElement.scrollWidth - innerWidth,
          ),
          panel: rect(panel),
          rawObservedPaths: panelButtonLabels
            .map((label) => rawPaths.find((path) => label.includes(path)))
            .filter(Boolean),
          treeLabels: [...document.querySelectorAll('[role="treeitem"]')]
            .filter(visible)
            .map((element) => ({
              ariaLabel: element.getAttribute("aria-label"),
              text: element.textContent?.replace(/\s+/g, " ").trim(),
              title: element.getAttribute("title"),
            })),
          stopVisible: [...document.querySelectorAll("button")].some(
            (button) =>
              visible(button) && button.getAttribute("aria-label") === "Stop",
          ),
          undoSvgPaths: svgHash(undoAction),
          window: { height: innerHeight, width: innerWidth },
        };
      },
      { expectedPaths, expectedRawPaths },
    );
    if (
      !observation.composerSendVisible ||
      observation.stopVisible ||
      (!observation.fullAccessVisible && viewportName !== "compact") ||
      observation.durationCount !== 1 ||
      observation.horizontalOverflow > 0 ||
      observation.cardRows.some(({ count }) => count !== 1) ||
      JSON.stringify(observation.rawObservedPaths) !==
        JSON.stringify(expectedRawPaths) ||
      !observation.cardSvgPaths ||
      !observation.undoSvgPaths
    ) {
      throw new Error(
        `The ${viewportName} current-Review settlement is incomplete: ${JSON.stringify(observation)}`,
      );
    }
    records.push({
      cardIconSha256: sha256(observation.cardSvgPaths),
      cardScreenshot,
      observation: {
        ...observation,
        cardSvgPaths: undefined,
        undoSvgPaths: undefined,
      },
      reviewScreenshot,
      taskTitleSha256,
      undoIconSha256: sha256(observation.undoSvgPaths),
      viewport: viewportName,
    });
  }

  const afterFingerprint = await readInstalledSnapshot();
  if (
    Object.keys(fingerprint).some(
      (key) => afterFingerprint[key] !== fingerprint[key],
    )
  ) {
    throw new Error("The installed Codex build changed during Review capture.");
  }
  const record = {
    capturedAtMs: Date.now(),
    fingerprint,
    ownerPid: Number(isolatedOwners[0].pid),
    records,
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
} finally {
  if (page && !page.isClosed()) {
    const close = page.getByRole("button", {
      exact: true,
      name: "Close Review tab",
    });
    if ((await close.count()) > 0 && (await close.last().isVisible())) {
      await close.last().evaluate((element) => element.click());
    }
    const restoreLabel = initialSidebarVisible ? "Show sidebar" : "Hide sidebar";
    const control = page.locator(`button[aria-label="${restoreLabel}"]:visible`);
    if ((await control.count()) > 0) {
      await control.first().evaluate((element) => element.click());
    }
    if (initialViewport) await page.setViewportSize(initialViewport);
  }
  await browser.close();
}
