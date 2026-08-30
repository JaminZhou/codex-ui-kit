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
const waitingTitleSha256 =
  process.env.CODEX_CURRENT_SIDEBAR_WAITING_TITLE_SHA256;
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
if (!/^[a-f0-9]{64}$/.test(waitingTitleSha256 ?? "")) {
  throw new Error(
    "Set the SHA-256 of one disposable waiting-approval task title.",
  );
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_SIDEBAR_ALLOW_CAPTURE=1 to authorize fixed route, hover, collection expansion, and screenshot sampling in the isolated app.",
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
const recordCandidateUrl = (url) => {
  if (
    url === "app://-/index.html" ||
    url === "app://-/index.html?initialRoute=%2Favatar-overlay"
  ) {
    return url;
  }
  if (url.startsWith("app://-/index.html?")) {
    return "app://-/index.html?redacted";
  }
  return "non-app-page";
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

  const rawRowKinds = await rows.evaluateAll((elements) =>
    elements.map((element, index) => {
      const bounds = element.getBoundingClientRect();
      const unreadDot = [...element.querySelectorAll("span")].find((span) => {
        const rect = span.getBoundingClientRect();
        const style = getComputedStyle(span);
        return (
          Math.abs(rect.width - 8) <= 0.1 &&
          Math.abs(rect.height - 8) <= 0.1 &&
          style.backgroundColor === "rgb(58, 131, 247)"
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
        title: (
          element.querySelector("[data-thread-title]")?.textContent || ""
        ).trim(),
        unread: Boolean(unreadDot),
        height: Math.round(bounds.height * 1_000) / 1_000,
        width: Math.round(bounds.width * 1_000) / 1_000,
      };
    }),
  );
  const waitingIndex = rawRowKinds.find(
    (row) =>
      row.kind !== "worktree" &&
      row.project &&
      row.active &&
      !row.selected &&
      createHash("sha256").update(row.title).digest("hex") ===
        waitingTitleSha256,
  )?.index;
  const rowKinds = rawRowKinds.map(({ title, ...row }) => ({
    ...row,
    titleLength: title.length,
  }));
  const isOrdinaryRow = (row) => row.kind !== "worktree";
  const independentActiveIndex = rowKinds.find(
    (row) =>
      isOrdinaryRow(row) && row.active && row.index !== waitingIndex,
  )?.index;
  const activeIndex = independentActiveIndex ?? waitingIndex;
  const unreadIndex = rowKinds.find(
    (row) => isOrdinaryRow(row) && row.unread,
  )?.index;
  const projectActionIndex = rowKinds.find(
    (row) =>
      isOrdinaryRow(row) &&
      row.project &&
      row.active &&
      !row.pinned &&
      row.index !== waitingIndex,
  )?.index ?? rowKinds.find(
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
    !Number.isInteger(waitingIndex) ||
    !Number.isInteger(unreadIndex) ||
    !Number.isInteger(projectActionIndex) ||
    !Number.isInteger(recentsActionIndex)
  ) {
    throw new Error(
      `Prime the isolated sidebar with a waiting-approval project task or an independent active task, an unread row, and an idle Recents row before capture: ${JSON.stringify({
        active: rowKinds.filter(
          (row) => isOrdinaryRow(row) && row.active,
        ).length,
        waitingApproval: Number.isInteger(waitingIndex) ? 1 : 0,
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
          getComputedStyle(span).backgroundColor === "rgb(58, 131, 247)"
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

  const [
    activeRow,
    waitingRow,
    unreadRow,
    projectActionRow,
    recentsActionRow,
  ] = await Promise.all(
    [
      activeIndex,
      waitingIndex,
      unreadIndex,
      projectActionIndex,
      recentsActionIndex,
    ].map((index) => rows.nth(index).elementHandle()),
  );
  if (
    !activeRow ||
    !waitingRow ||
    !unreadRow ||
    !projectActionRow ||
    !recentsActionRow
  ) {
    throw new Error("A fixed sidebar-row handle disappeared before capture.");
  }
  const assertOrdinaryActiveRow = async (
    row,
    { requireProject = false, subject },
  ) => {
    const activeStatusVisible = await row.evaluate((element, projectOnly) => {
      const spinner = element.querySelector(".animate-spin");
      return (
        element.getAttribute("data-app-action-sidebar-thread-kind") !==
          "worktree" &&
        (!projectOnly ||
          Boolean(
            element.closest("[data-app-action-sidebar-project-list-id]"),
          )) &&
        spinner instanceof Element &&
        spinner.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      );
    }, requireProject);
    if (!activeStatusVisible) {
      throw new Error(
        `The ordinary active ${subject} spinner changed during capture.`,
      );
    }
  };
  const assertActiveStatusVisible = () =>
    assertOrdinaryActiveRow(activeRow, { subject: "status" });
  const assertWaitingStatusVisible = () =>
    assertOrdinaryActiveRow(waitingRow, {
      requireProject: true,
      subject: "waiting approval",
    });
  const assertProjectActionActive = () =>
    assertOrdinaryActiveRow(projectActionRow, {
      requireProject: true,
      subject: "project action",
    });
  const assertUnreadStatusVisible = async () => {
    const unreadStatusVisible = await unreadRow.evaluate((element) => {
      const dot = [...element.querySelectorAll("span")].find((span) => {
        const bounds = span.getBoundingClientRect();
        return (
          Math.abs(bounds.width - 8) <= 0.1 &&
          Math.abs(bounds.height - 8) <= 0.1 &&
          getComputedStyle(span).backgroundColor === "rgb(58, 131, 247)"
        );
      });
      return (
        element.getAttribute("data-app-action-sidebar-thread-kind") !==
          "worktree" &&
        dot instanceof Element &&
        dot.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      );
    });
    if (!unreadStatusVisible) {
      throw new Error(
        "The ordinary unread sidebar dot changed during screenshot capture.",
      );
    }
  };
  const assertRecentsActionIdle = async () => {
    const recentsActionIdle = await recentsActionRow.evaluate((element) => {
      const visible = (candidate) =>
        candidate instanceof Element &&
        candidate.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const unreadDot = [...element.querySelectorAll("span")].find((span) => {
        const bounds = span.getBoundingClientRect();
        return (
          Math.abs(bounds.width - 8) <= 0.1 &&
          Math.abs(bounds.height - 8) <= 0.1 &&
          getComputedStyle(span).backgroundColor === "rgb(58, 131, 247)"
        );
      });
      return (
        element.getAttribute("data-app-action-sidebar-thread-kind") !==
          "worktree" &&
        !element.closest("[data-app-action-sidebar-project-list-id]") &&
        element.getAttribute("data-app-action-sidebar-thread-pinned") !==
          "true" &&
        element.getAttribute("data-app-action-sidebar-thread-selected") !==
          "true" &&
        !visible(element.querySelector(".animate-spin")) &&
        !visible(unreadDot)
      );
    });
    if (!recentsActionIdle) {
      throw new Error(
        "The ordinary idle Recents row changed during action capture.",
      );
    }
  };
  const statuses = {
    active: {
      ...(await inspectActive(activeRow)),
      sourceStatus:
        activeIndex === waitingIndex ? "waitingOnApproval" : "running",
    },
    waiting: {
      ...(await inspectActive(waitingRow)),
      sourceStatus: "waitingOnApproval",
      titleLength: rawRowKinds[waitingIndex].title.length,
      titleSha256: waitingTitleSha256,
    },
    unread: await inspectUnread(unreadRow),
  };
  await assertActiveStatusVisible();
  const activeStatusScreenshot = await screenshotRegion(
    activeRow,
    "active-status.png",
    28,
  );
  await assertActiveStatusVisible();
  await assertWaitingStatusVisible();
  const waitingStatusScreenshot = await screenshotRegion(
    waitingRow,
    "waiting-status.png",
    28,
  );
  await assertWaitingStatusVisible();
  await assertUnreadStatusVisible();
  const unreadStatusScreenshot = await screenshotRegion(
    unreadRow,
    "unread-status.png",
    28,
  );
  await assertUnreadStatusVisible();
  const screenshots = {
    activeStatus: activeStatusScreenshot,
    unreadStatus: unreadStatusScreenshot,
    waitingStatus: waitingStatusScreenshot,
  };
  await assertProjectActionActive();
  const projectActions = await inspectActions(projectActionRow);
  await page.mouse.move(1_000, 400);
  await assertProjectActionActive();
  await assertRecentsActionIdle();
  const recentsActions = await inspectActions(recentsActionRow);
  await page.mouse.move(1_000, 400);
  await assertRecentsActionIdle();

  const inspectCollection = async () =>
    page.evaluate(() => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0;
      const navigation = [...document.querySelectorAll("nav")].find(visible);
      if (!navigation) return null;
      const showMoreButtons = [...navigation.querySelectorAll("button")].filter(
        (button) =>
          visible(button) && button.textContent?.trim() === "Show more",
      );
      const showLessButtons = [...navigation.querySelectorAll("button")].filter(
        (button) =>
          visible(button) && button.textContent?.trim() === "Show less",
      );
      const button = showMoreButtons[0];
      const item = button?.closest('[role="listitem"]');
      const list = item?.parentElement;
      const projectList = list?.closest(
        "[data-app-action-sidebar-project-list-id]",
      );
      if (!button || !item || !list || !projectList) {
        return {
          showLessCount: showLessButtons.length,
          showMoreCount: showMoreButtons.length,
        };
      }
      const buttonBounds = button.getBoundingClientRect();
      const itemBounds = item.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        buttonBounds: buttonBounds.toJSON(),
        buttonStyle: {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          padding: style.padding,
          textAlign: style.textAlign,
        },
        itemBounds: itemBounds.toJSON(),
        itemRole: item.getAttribute("role"),
        listRole: list.getAttribute("role"),
        rowCount: projectList.querySelectorAll(
          "[data-app-action-sidebar-thread-row]",
        ).length,
        showLessCount: showLessButtons.length,
        showMoreCount: showMoreButtons.length,
        toggleAttributes: {
          ariaControls: button.getAttribute("aria-controls"),
          ariaExpanded: button.getAttribute("aria-expanded"),
          role: button.getAttribute("role"),
          type: button.getAttribute("type"),
        },
      };
    });
  const collectionToggle = page
    .locator("nav:visible button")
    .filter({ hasText: /^Show more$/ });
  if ((await collectionToggle.count()) !== 1) {
    throw new Error("The current Show more control is ambiguous.");
  }
  await collectionToggle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(50);
  const collectionBeforeRaw = await inspectCollection();
  if (
    !collectionBeforeRaw?.buttonBounds ||
    collectionBeforeRaw.showMoreCount !== 1 ||
    collectionBeforeRaw.showLessCount !== 0 ||
    collectionBeforeRaw.rowCount !== 5
  ) {
    throw new Error(
      `The current project collection is not at the five-row Show more boundary: ${JSON.stringify(collectionBeforeRaw)}`,
    );
  }
  const collectionItemBox = {
    height: round(collectionBeforeRaw.itemBounds.height),
    width: round(collectionBeforeRaw.itemBounds.width),
    x: round(collectionBeforeRaw.itemBounds.x),
    y: round(collectionBeforeRaw.itemBounds.y),
  };
  const showMorePath = join(outputDirectory, "show-more.png");
  await page.screenshot({
    clip: {
      height: 32,
      width: 140,
      x: Math.round(collectionItemBox.x),
      y: Math.round(collectionItemBox.y),
    },
    path: showMorePath,
  });
  const showMoreBytes = await readFile(showMorePath);
  const showMorePng = PNG.sync.read(showMoreBytes);
  if (showMorePng.width !== 140 || showMorePng.height !== 32) {
    throw new Error("The Show more screenshot must be exactly 140x32.");
  }
  screenshots.showMore = {
    height: 32,
    name: "show-more.png",
    sha256: createHash("sha256").update(showMoreBytes).digest("hex"),
    width: 140,
  };
  if ((await collectionToggle.count()) !== 1) {
    throw new Error("The current Show more control became ambiguous.");
  }
  await collectionToggle.click();
  await page.waitForFunction(
    (previousCount) => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const navigation = [...document.querySelectorAll("nav")].find(visible);
      const projectLists = [
        ...(navigation?.querySelectorAll(
          "[data-app-action-sidebar-project-list-id]",
        ) ?? []),
      ];
      return projectLists.some(
        (list) =>
          list.querySelectorAll("[data-app-action-sidebar-thread-row]")
            .length > previousCount,
      );
    },
    collectionBeforeRaw.rowCount,
  );
  await page.waitForTimeout(300);
  const collectionAfterRaw = await inspectCollection();
  const expandedProjectRowCounts = await page.evaluate(() => {
    const visible = (element) =>
      element instanceof Element &&
      element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    return [
      ...document.querySelectorAll(
        "nav [data-app-action-sidebar-project-list-id]",
      ),
    ]
      .filter(visible)
      .map(
        (list) =>
          list.querySelectorAll("[data-app-action-sidebar-thread-row]")
            .length,
      );
  });
  const expandedRowCount = Math.max(...expandedProjectRowCounts);
  if (
    expandedRowCount <= collectionBeforeRaw.rowCount ||
    (collectionAfterRaw?.showMoreCount ?? 0) !== 0 ||
    (collectionAfterRaw?.showLessCount ?? 0) !== 0
  ) {
    throw new Error(
      `The current project collection did not expand one-way: ${JSON.stringify({ collectionAfterRaw, expandedProjectRowCounts })}`,
    );
  }
  const collection = {
    afterExpansion: {
      rowCount: expandedRowCount,
      showLessCount: collectionAfterRaw?.showLessCount ?? 0,
      showMoreCount: collectionAfterRaw?.showMoreCount ?? 0,
    },
    beforeExpansion: {
      buttonRect: relativeRect(
        collectionBeforeRaw.buttonBounds,
        collectionBeforeRaw.itemBounds,
      ),
      buttonStyle: collectionBeforeRaw.buttonStyle,
      itemRect: {
        height: round(collectionBeforeRaw.itemBounds.height),
        width: round(collectionBeforeRaw.itemBounds.width),
      },
      itemRole: collectionBeforeRaw.itemRole,
      listRole: collectionBeforeRaw.listRole,
      rowCount: collectionBeforeRaw.rowCount,
      showLessCount: collectionBeforeRaw.showLessCount,
      showMoreCount: collectionBeforeRaw.showMoreCount,
      toggleAttributes: collectionBeforeRaw.toggleAttributes,
    },
  };
  const actions = {
    project: {
      ...projectActions,
      sourceStatus:
        projectActionIndex === waitingIndex ? "waitingOnApproval" : "active",
    },
    recents: { ...recentsActions, sourceStatus: "idle" },
  };
  await assertProjectActionActive();
  await projectActionRow.hover();
  screenshots.projectActions = await screenshotRegion(
    projectActionRow,
    "project-actions.png",
    72,
    { clearHover: false },
  );
  await page.mouse.move(1_000, 400);
  await assertProjectActionActive();
  await assertRecentsActionIdle();
  await recentsActionRow.hover();
  screenshots.recentsActions = await screenshotRegion(
    recentsActionRow,
    "recents-actions.png",
    72,
    { clearHover: false },
  );
  await page.mouse.move(1_000, 400);
  await assertRecentsActionIdle();

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
    collection,
    fingerprint,
    privacyBoundary:
      "disposable-title-hash-counts-generic-actions-geometry-styles-only",
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
        waitingApproval: 1,
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
      candidates: candidates.map(({ page: _page, url, ...candidate }) => ({
        ...candidate,
        url: recordCandidateUrl(url),
      })),
      selected: {
        area: selected.area,
        index: selected.index,
        landmarks: selected.landmarks,
        url: recordCandidateUrl(selected.url),
        visibleControls: selected.visibleControls,
      },
    },
  };
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
    waitingSpinnerShapeSha256: statuses.waiting.spinner.shapeSha256,
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
