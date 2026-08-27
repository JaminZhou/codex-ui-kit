import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentSidebarRowsRecord,
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

const port = Number(process.env.CODEX_CURRENT_SIDEBAR_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_SIDEBAR_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_SIDEBAR_OUTPUT_DIR;
const allowCapture =
  process.env.CODEX_CURRENT_SIDEBAR_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated sidebar-row CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated sidebar-row profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute sidebar-row output directory.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_SIDEBAR_ALLOW_CAPTURE=1 to authorize fixed route, hover, and screenshot sampling in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The sidebar-row profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-sidebar-rows-")
) {
  throw new Error(
    "The output must be a new current-sidebar-rows-* direct child of the isolated profile.",
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
    throw new Error("The installed app.asar changed while it was being hashed.");
  }
  return {
    bundle: {
      appAsarBytes: after.size,
      appAsarSha256,
      changedAtMs: Math.ceil(Math.max(after.ctimeMs, after.mtimeMs)),
      checkedAtMs: Date.now(),
      device: String(after.dev),
      inode: String(after.ino),
    },
    fingerprint: {
      appAsarBytes: after.size,
      appAsarSha256,
      appVersion: plistValue("CFBundleShortVersionString"),
      buildNumber: plistValue("CFBundleVersion"),
      chromiumVersion: plistValue("ChromiumBaseVersion"),
    },
  };
};
const beforeCapture = await readInstalledSnapshot();
const fingerprint = beforeCapture.fingerprint;
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
    (listener) =>
      listener.addresses.length !== 1 ||
      listener.addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every sidebar-row CDP listener must be loopback-only.");
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
  const processProfile = valuesFor(processInfo.argv, "--user-data-dir=");
  if (
    processInfo.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
    valuesFor(processInfo.argv, "--remote-debugging-address=")[0] ===
      "127.0.0.1" &&
    valuesFor(processInfo.argv, "--remote-debugging-port=")[0] ===
      String(port) &&
    processProfile.length === 1 &&
    (await realpath(processProfile[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated sidebar-row owner is ambiguous.");
}
const isolatedOwnerPid = isolatedOwners[0].pid;
const processStartedAt = execFileSync(
  "/bin/ps",
  ["-p", isolatedOwnerPid, "-o", "lstart="],
  {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  },
).trim();
const processStartedAtMatch = processStartedAt.match(
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
);
if (!processStartedAtMatch) {
  throw new Error(
    `Could not prove the isolated owner start time for PID ${isolatedOwnerPid}.`,
  );
}
const monthIndex = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
].indexOf(processStartedAtMatch[1]);
const processStartedAtMs = new Date(
  Number(processStartedAtMatch[6]),
  monthIndex,
  Number(processStartedAtMatch[2]),
  Number(processStartedAtMatch[3]),
  Number(processStartedAtMatch[4]),
  Number(processStartedAtMatch[5]),
).getTime();
if (!Number.isSafeInteger(processStartedAtMs) || processStartedAtMs <= 0) {
  throw new Error(
    `Could not prove the isolated owner start time for PID ${isolatedOwnerPid}.`,
  );
}
const parentPid = (pid) =>
  execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], {
    encoding: "utf8",
  }).trim();
for (const listener of listeners) {
  if (listener.pid === isolatedOwnerPid) continue;
  const visited = new Set();
  let candidatePid = listener.pid;
  while (candidatePid !== isolatedOwnerPid && candidatePid !== "1") {
    if (!/^\d+$/.test(candidatePid) || visited.has(candidatePid)) {
      throw new Error(`Could not prove listener ancestry for PID ${listener.pid}.`);
    }
    visited.add(candidatePid);
    candidatePid = parentPid(candidatePid);
  }
  if (candidatePid !== isolatedOwnerPid) {
    throw new Error(`Listener PID ${listener.pid} is outside the isolated app tree.`);
  }
}

await mkdir(outputDirectory, { mode: 0o700 });

const round = (value) => Math.round(value * 1_000) / 1_000;
const shapeSha256 = (shapes) =>
  createHash("sha256").update(JSON.stringify(shapes)).digest("hex");
const classifyAction = (label) => {
  const normalized = String(label ?? "").toLowerCase();
  if (normalized.includes("unpin")) return "unpin";
  if (normalized.includes("pin")) return "pin";
  if (normalized.includes("archive")) return "archive";
  return "other";
};
const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visibleControls = [
      ...document.querySelectorAll('a, button, [role="button"], [role="tab"]'),
    ].filter((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.left < innerWidth &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight
      );
    }).length;
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
      visibleControls,
    };
  });
  return { index, page, url: page.url(), ...structure };
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let page;
let captureError = null;
let cleanupError = null;
let successSummary;
const restoreNewChat = async () => {
  if (!page || page.isClosed()) return;
  await page.setViewportSize(currentBaselineViewports.wide);
  const newChat = page
    .locator("nav:visible")
    .getByText("New chat", { exact: true })
    .filter({ visible: true });
  if ((await newChat.count()) !== 1) {
    throw new Error("Could not resolve one visible New chat route.");
  }
  await newChat.click();
  await page.waitForFunction(
    () => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const homeMarkers = [
        ...document.querySelectorAll('[data-testid="home-icon"]'),
      ].filter(visible);
      const composers = [
        ...document.querySelectorAll(
          'textarea, [contenteditable="true"], [role="textbox"]',
        ),
      ].filter(visible);
      return homeMarkers.length === 1 && composers.length > 0;
    },
    undefined,
    { timeout: 15_000 },
  );
  await page.mouse.move(1_000, 400);
};

try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(pages.map(inspectCandidate));
  const selected = selectCurrentMainCandidate(candidates);
  page = selected.page;
  await page.bringToFront();
  await page.setViewportSize(currentBaselineViewports.wide);
  await page.evaluate(async () => document.fonts.ready);
  await restoreNewChat();
  const navigation = page.locator("nav").first();
  await navigation.waitFor({ state: "visible" });
  const rows = navigation.locator(
    "[data-app-action-sidebar-thread-row]",
  );
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        "nav [data-app-action-sidebar-thread-row]",
      ).length >= 4,
  );

  const rowKinds = await rows.evaluateAll((elements) =>
    elements.map((element, index) => {
      const bounds = element.getBoundingClientRect();
      const unreadDot = [...element.querySelectorAll("span")].find((span) => {
        const rect = span.getBoundingClientRect();
        const style = getComputedStyle(span);
        return (
          Math.abs(rect.width - 8) <= 0.1 &&
          Math.abs(rect.height - 8) <= 0.1 &&
          style.backgroundColor === "rgb(131, 195, 255)"
        );
      });
      return {
        index,
        active: Boolean(element.querySelector(".animate-spin")),
        hasStatus: Boolean(element.querySelector(".animate-spin") || unreadDot),
        kind:
          element.getAttribute("data-app-action-sidebar-thread-kind") ||
          "unknown",
        pinned:
          element.getAttribute("data-app-action-sidebar-thread-pinned") ===
          "true",
        project: Boolean(
          element.closest("[data-app-action-sidebar-project-list-id]"),
        ),
        selected:
          element.getAttribute("data-app-action-sidebar-thread-selected") ===
          "true",
        titleLength: (
          element.querySelector("[data-thread-title]")?.textContent || ""
        ).trim().length,
        unread: Boolean(unreadDot),
        height: Math.round(bounds.height * 1_000) / 1_000,
        width: Math.round(bounds.width * 1_000) / 1_000,
      };
    }),
  );
  const isOrdinaryRow = (row) => row.kind !== "worktree";
  const activeIndex = rowKinds.find(
    (row) => isOrdinaryRow(row) && row.active,
  )?.index;
  const unreadIndex = rowKinds.find(
    (row) => isOrdinaryRow(row) && row.unread,
  )?.index;
  const projectActionIndex = rowKinds.find(
    (row) =>
      isOrdinaryRow(row) && row.project && row.active && !row.pinned,
  )?.index;
  const recentsActionIndex = rowKinds.find(
    (row) =>
      isOrdinaryRow(row) &&
      !row.project &&
      !row.pinned &&
      !row.hasStatus &&
      !row.selected,
  )?.index;
  if (
    !Number.isInteger(activeIndex) ||
    !Number.isInteger(unreadIndex) ||
    !Number.isInteger(projectActionIndex) ||
    !Number.isInteger(recentsActionIndex)
  ) {
    throw new Error(
      `Prime the isolated sidebar with an active project-task, an unread row, and an idle Recents row before capture: ${JSON.stringify({
        active: rowKinds.filter(
          (row) => isOrdinaryRow(row) && row.active,
        ).length,
        projectActive: rowKinds.filter(
          (row) =>
            isOrdinaryRow(row) && row.project && row.active && !row.pinned,
        ).length,
        recentsIdle: rowKinds.filter(
          (row) =>
            isOrdinaryRow(row) &&
            !row.project &&
            !row.pinned &&
            !row.hasStatus &&
            !row.selected,
        ).length,
        unread: rowKinds.filter(
          (row) => isOrdinaryRow(row) && row.unread,
        ).length,
      })}`,
    );
  }

  const relativeRect = (bounds, rowBounds) => ({
    height: round(bounds.height),
    left: round(bounds.left - rowBounds.left),
    right: round(bounds.right - rowBounds.left),
    rightInset: round(rowBounds.right - bounds.right),
    top: round(bounds.top - rowBounds.top),
    width: round(bounds.width),
  });
  const inspectActive = async (row) => {
    const raw = await row.evaluate((element) => {
      const rowBounds = element.getBoundingClientRect();
      const spinner = element.querySelector(".animate-spin");
      const icon = spinner?.querySelector("svg");
      const rail = spinner?.parentElement;
      if (!spinner || !icon || !rail) return null;
      const spinnerStyle = getComputedStyle(spinner);
      return {
        rowRect: { height: rowBounds.height, width: rowBounds.width },
        railBounds: rail.getBoundingClientRect().toJSON(),
        rowBounds: rowBounds.toJSON(),
        spinner: {
          animationDuration: spinnerStyle.animationDuration,
          animationIterationCount: spinnerStyle.animationIterationCount,
          color: spinnerStyle.color,
          cssHeight: spinnerStyle.height,
          cssWidth: spinnerStyle.width,
          shapes: [...icon.querySelectorAll("path, circle, rect, line")].map(
            (shape) => ({
              d: shape.getAttribute("d"),
              tag: shape.tagName.toLowerCase(),
            }),
          ),
          viewBox: icon.getAttribute("viewBox"),
        },
      };
    });
    if (!raw) throw new Error("The active sidebar spinner disappeared during capture.");
    return {
      railRect: relativeRect(raw.railBounds, raw.rowBounds),
      rowRect: {
        height: round(raw.rowRect.height),
        width: round(raw.rowRect.width),
      },
      spinner: {
        animationDuration: raw.spinner.animationDuration,
        animationIterationCount: raw.spinner.animationIterationCount,
        color: raw.spinner.color,
        cssHeight: raw.spinner.cssHeight,
        cssWidth: raw.spinner.cssWidth,
        pathCount: raw.spinner.shapes.filter((shape) => shape.tag === "path")
          .length,
        shapeSha256: shapeSha256(raw.spinner.shapes),
        viewBox: raw.spinner.viewBox,
      },
    };
  };
  const inspectUnread = async (row) => {
    const raw = await row.evaluate((element) => {
      const rowBounds = element.getBoundingClientRect();
      const dot = [...element.querySelectorAll("span")].find((span) => {
        const bounds = span.getBoundingClientRect();
        return (
          Math.abs(bounds.width - 8) <= 0.1 &&
          Math.abs(bounds.height - 8) <= 0.1 &&
          getComputedStyle(span).backgroundColor === "rgb(131, 195, 255)"
        );
      });
      let rail = dot?.parentElement;
      while (rail && rail !== element) {
        const bounds = rail.getBoundingClientRect();
        if (
          Math.abs(bounds.width - 20) <= 0.1 &&
          Math.abs(bounds.height - 20) <= 0.1
        ) {
          break;
        }
        rail = rail.parentElement;
      }
      if (!dot || !rail) return null;
      const style = getComputedStyle(dot);
      return {
        dotBounds: dot.getBoundingClientRect().toJSON(),
        dotStyle: {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
        },
        railBounds: rail.getBoundingClientRect().toJSON(),
        rowBounds: rowBounds.toJSON(),
        rowRect: { height: rowBounds.height, width: rowBounds.width },
      };
    });
    if (!raw) throw new Error("The unread sidebar dot disappeared during capture.");
    return {
      dotRect: relativeRect(raw.dotBounds, raw.rowBounds),
      dotStyle: raw.dotStyle,
      railRect: relativeRect(raw.railBounds, raw.rowBounds),
      rowRect: {
        height: round(raw.rowRect.height),
        width: round(raw.rowRect.width),
      },
    };
  };
  const inspectActions = async (row) => {
    await row.hover();
    await page.waitForTimeout(100);
    const raw = await row.evaluate((element) => {
      const rowBounds = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll("button")].filter((button) => {
        const label = button.getAttribute("aria-label") || "";
        const bounds = button.getBoundingClientRect();
        return (
          /pin|archive/i.test(label) &&
          bounds.width > 0 &&
          bounds.height > 0 &&
          getComputedStyle(button).opacity !== "0"
        );
      });
      let toolbar = buttons[0]?.parentElement;
      while (toolbar && toolbar !== element) {
        const bounds = toolbar.getBoundingClientRect();
        if (
          buttons.every((button) => toolbar.contains(button)) &&
          bounds.width >= 40 &&
          bounds.height >= 20
        ) {
          break;
        }
        toolbar = toolbar.parentElement;
      }
      return {
        rowBounds: rowBounds.toJSON(),
        rowRect: { height: rowBounds.height, width: rowBounds.width },
        toolbarBounds: toolbar?.getBoundingClientRect().toJSON(),
        buttons: buttons.map((button) => {
          const icon = button.querySelector("svg");
          const iconStyle = icon ? getComputedStyle(icon) : null;
          return {
            bounds: button.getBoundingClientRect().toJSON(),
            icon: icon
              ? {
                  height: iconStyle.height,
                  shapes: [
                    ...icon.querySelectorAll("path, circle, rect, line"),
                  ].map((shape) => ({
                    d: shape.getAttribute("d"),
                    tag: shape.tagName.toLowerCase(),
                  })),
                  viewBox: icon.getAttribute("viewBox"),
                  width: iconStyle.width,
                }
              : null,
            label: button.getAttribute("aria-label") || "",
          };
        }),
      };
    });
    if (!raw.toolbarBounds || raw.buttons.length !== 2) {
      throw new Error("The sidebar action toolbar is incomplete after hover.");
    }
    return {
      buttons: raw.buttons.map((button) => ({
        category: classifyAction(button.label),
        icon: button.icon
          ? {
              height: button.icon.height,
              shapeSha256: shapeSha256(button.icon.shapes),
              viewBox: button.icon.viewBox,
              width: button.icon.width,
            }
          : null,
        rect: relativeRect(button.bounds, raw.rowBounds),
      })),
      rowRect: {
        height: round(raw.rowRect.height),
        width: round(raw.rowRect.width),
      },
      toolbarRect: relativeRect(raw.toolbarBounds, raw.rowBounds),
    };
  };
  const screenshotRegion = async (
    row,
    name,
    width,
    { clearHover = true } = {},
  ) => {
    if (clearHover) await page.mouse.move(1_000, 400);
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(50);
    const bounds = await row.boundingBox();
    if (!bounds) throw new Error(`The ${name} row is no longer visible.`);
    const path = join(outputDirectory, name);
    await page.screenshot({
      clip: {
        height: 30,
        width,
        x: Math.round(bounds.x + bounds.width) - width,
        y: Math.round(bounds.y),
      },
      path,
    });
    const bytes = await readFile(path);
    const png = PNG.sync.read(bytes);
    if (png.width !== width || png.height !== 30) {
      throw new Error(
        `The ${name} region must be ${width}x30, received ${png.width}x${png.height}.`,
      );
    }
    return {
      height: png.height,
      name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: png.width,
    };
  };

  const activeRow = rows.nth(activeIndex);
  const unreadRow = rows.nth(unreadIndex);
  const projectActionRow = rows.nth(projectActionIndex);
  const recentsActionRow = rows.nth(recentsActionIndex);
  const assertActiveStatusVisible = async () => {
    const activeStatusVisible = await activeRow.evaluate((element) => {
      const spinner = element.querySelector(".animate-spin");
      return (
        element.getAttribute("data-app-action-sidebar-thread-kind") !==
          "worktree" &&
        spinner instanceof Element &&
        spinner.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      );
    });
    if (!activeStatusVisible) {
      throw new Error(
        "The ordinary active sidebar spinner changed during screenshot capture.",
      );
    }
  };
  const statuses = {
    active: await inspectActive(activeRow),
    unread: await inspectUnread(unreadRow),
  };
  await assertActiveStatusVisible();
  const activeStatusScreenshot = await screenshotRegion(
    activeRow,
    "active-status.png",
    28,
  );
  await assertActiveStatusVisible();
  const screenshots = {
    activeStatus: activeStatusScreenshot,
    unreadStatus: await screenshotRegion(
      unreadRow,
      "unread-status.png",
      28,
    ),
  };
  const actions = {
    project: {
      ...(await inspectActions(projectActionRow)),
      sourceStatus: "active",
    },
    recents: {
      ...(await inspectActions(recentsActionRow)),
      sourceStatus: "idle",
    },
  };
  await projectActionRow.hover();
  screenshots.projectActions = await screenshotRegion(
    projectActionRow,
    "project-actions.png",
    72,
    { clearHover: false },
  );
  await recentsActionRow.hover();
  screenshots.recentsActions = await screenshotRegion(
    recentsActionRow,
    "recents-actions.png",
    72,
    { clearHover: false },
  );

  const navigationRect = await navigation.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    };
  });
  const kinds = Object.fromEntries(
    [...new Set(rowKinds.map((row) => row.kind))]
      .sort()
      .map((kind) => [kind, rowKinds.filter((row) => row.kind === kind).length]),
  );
  const afterCapture = await readInstalledSnapshot();
  if (JSON.stringify(afterCapture.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error("The installed build changed during sidebar-row capture.");
  }
  await restoreNewChat();
  const record = {
    actions,
    captureKind: "renderer_cdp",
    fingerprint,
    privacyBoundary:
      "counts-title-lengths-generic-actions-geometry-styles-only",
    profileOwnerPid: Number(isolatedOwnerPid),
    restoredRoute: "New chat",
    rowSummary: {
      horizontalOverflow: await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      kinds,
      pinnedRows: rowKinds.filter((row) => row.pinned).length,
      projectRows: rowKinds.filter((row) => row.project).length,
      recentRows: rowKinds.filter((row) => !row.project).length,
      rowHeights: [...new Set(rowKinds.map((row) => row.height))].sort(
        (left, right) => left - right,
      ),
      rowWidths: [...new Set(rowKinds.map((row) => row.width))].sort(
        (left, right) => left - right,
      ),
      selectedRows: rowKinds.filter((row) => row.selected).length,
      sidebarRect: Object.fromEntries(
        Object.entries(navigationRect).map(([key, value]) => [key, round(value)]),
      ),
      statusCounts: {
        active: rowKinds.filter((row) => row.active).length,
        unread: rowKinds.filter((row) => row.unread).length,
      },
      titleLengthRange: {
        max: Math.max(...rowKinds.map((row) => row.titleLength)),
        min: Math.min(...rowKinds.map((row) => row.titleLength)),
      },
      totalRows: rowKinds.length,
      viewport: currentBaselineViewports.wide,
    },
    runtimeBundleIdentity: {
      afterCapture: afterCapture.bundle,
      beforeCapture: beforeCapture.bundle,
      ownerPid: Number(isolatedOwnerPid),
      processStartedAtMs,
    },
    schemaVersion: 1,
    screenshots,
    statuses,
    targetSelection: {
      candidates: candidates.map(({ page: _page, ...candidate }) => candidate),
      selected: { ...selected, page: undefined },
    },
  };
  delete record.targetSelection.selected.page;
  assertCurrentSidebarRowsRecord(record);
  record.sha256 = createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex");
  await writeFile(
    join(outputDirectory, "sidebar-rows.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  successSummary = {
    actions: {
      project: actions.project.buttons.map((button) => button.category),
      recents: actions.recents.buttons.map((button) => button.category),
    },
    fingerprint,
    outputDirectory,
    rowSummary: record.rowSummary,
    sha256: record.sha256,
    spinnerShapeSha256: statuses.active.spinner.shapeSha256,
  };
} catch (error) {
  captureError = error;
} finally {
  try {
    await restoreNewChat();
  } catch (error) {
    cleanupError = error;
  }
  await browser.close();
}
if (captureError && cleanupError) {
  throw new AggregateError(
    [captureError, cleanupError],
    "Sidebar-row capture and isolated-state cleanup both failed.",
  );
}
if (cleanupError) {
  throw new Error(
    `Sidebar-row isolated-state cleanup failed: ${cleanupError.message}`,
    { cause: cleanupError },
  );
}
if (captureError) throw captureError;
console.log(JSON.stringify(successSummary));
