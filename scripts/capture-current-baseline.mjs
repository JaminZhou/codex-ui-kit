import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentBaselineRecord,
  assertCurrentProjectsIndexObservation,
  currentBaselineViewports,
  resolveCurrentBaselineOutputPath,
  runBestEffortCurrentBaselineCleanup,
  selectCurrentMainCandidate,
  writeCurrentBaselineOutput,
} from "./current-baseline-contract.mjs";

const port = Number(process.env.CODEX_CURRENT_BASELINE_CDP_PORT);
const expectedProfile = process.env.CODEX_CURRENT_BASELINE_PROFILE;
const outputPath = process.env.CODEX_CURRENT_BASELINE_OUTPUT;
const allowNavigation =
  process.env.CODEX_CURRENT_BASELINE_ALLOW_NAVIGATION === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    "Set CODEX_CURRENT_BASELINE_CDP_PORT to an isolated loopback-only Codex CDP port.",
  );
}
if (!expectedProfile?.startsWith("/") || /\s/.test(expectedProfile)) {
  throw new Error(
    "Set CODEX_CURRENT_BASELINE_PROFILE to the absolute unique profile used by the isolated Codex process.",
  );
}
if (!allowNavigation) {
  throw new Error(
    "Set CODEX_CURRENT_BASELINE_ALLOW_NAVIGATION=1 to authorize fixed New chat, Projects, and Pull requests route navigation.",
  );
}

const normalizedProfile = realpathSync(expectedProfile);
const allowedProfilePrefixes = [
  "/private/tmp/codex-ui-kit-",
  `${homedir()}/.Trash/codex-ui-kit-`,
];
if (
  !allowedProfilePrefixes.some((prefix) =>
    normalizedProfile.startsWith(prefix),
  )
) {
  throw new Error(
    "The isolated Codex profile must use a unique codex-ui-kit path in /private/tmp or Trash.",
  );
}
const normalizedOutputPath = outputPath
  ? resolveCurrentBaselineOutputPath(normalizedProfile, outputPath)
  : null;

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readAppAsarSnapshot = () => {
  const before = statSync(appAsar);
  if (!before.isFile()) {
    throw new Error("The installed app.asar must be a regular file.");
  }
  const appAsarBytes = readFileSync(appAsar);
  const after = statSync(appAsar);
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
    appAsarBytes: appAsarBytes.byteLength,
    appAsarSha256: createHash("sha256")
      .update(appAsarBytes)
      .digest("hex"),
    changedAtMs: Math.ceil(Math.max(after.ctimeMs, after.mtimeMs)),
    checkedAtMs: Date.now(),
    device: String(after.dev),
    inode: String(after.ino),
  };
};
const beforeCaptureBundle = readAppAsarSnapshot();
const baseline = {
  appAsarBytes: beforeCaptureBundle.appAsarBytes,
  appAsarSha256: beforeCaptureBundle.appAsarSha256,
  appVersion: plistValue("CFBundleShortVersionString"),
  buildNumber: plistValue("CFBundleVersion"),
  chromiumVersion: plistValue("ChromiumBaseVersion"),
  sampledAt: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date()),
};

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
  if (field.startsWith("p")) {
    listeners.push({ addresses: [], pid: field.slice(1) });
  } else if (field.startsWith("n")) {
    listeners.at(-1)?.addresses.push(field.slice(1));
  }
}
const expectedEndpoint = `127.0.0.1:${port}`;
if (
  listeners.length === 0 ||
  listeners.some(
    (listener) =>
      listener.addresses.length === 0 ||
      listener.addresses.some((address) => address !== expectedEndpoint),
  )
) {
  throw new Error(`CDP listeners must bind only ${expectedEndpoint}.`);
}

const processInfoScript = fileURLToPath(
  new URL("./read-macos-process-info.py", import.meta.url),
);
const processInfo = (pid) =>
  JSON.parse(
    execFileSync("/usr/bin/python3", [processInfoScript, pid], {
      encoding: "utf8",
    }),
  );
const parentPid = (pid) => {
  const value = execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], {
    encoding: "utf8",
  }).trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Could not prove parentage for CDP listener PID ${pid}.`);
  }
  return value;
};
const isolatedOwners = listeners.filter(({ pid }) => {
  let argv;
  let executablePath;
  try {
    ({ argv, executablePath } = processInfo(pid));
  } catch {
    return false;
  }
  const valuesFor = (prefix) =>
    argv
      .filter((argument) => argument.startsWith(prefix))
      .map((argument) => argument.slice(prefix.length));
  const addresses = valuesFor("--remote-debugging-address=");
  const ports = valuesFor("--remote-debugging-port=");
  const profiles = valuesFor("--user-data-dir=");
  let candidateProfile;
  try {
    candidateProfile = profiles.length === 1 ? realpathSync(profiles[0]) : null;
  } catch {
    return false;
  }
  return (
    executablePath === "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT" &&
    argv[0] === executablePath &&
    addresses.length === 1 &&
    addresses[0] === "127.0.0.1" &&
    ports.length === 1 &&
    ports[0] === String(port) &&
    profiles.length === 1 &&
    candidateProfile === normalizedProfile
  );
});
if (isolatedOwners.length !== 1) {
  throw new Error(
    "CDP listener ownership is ambiguous or does not exactly match the declared isolated Codex profile.",
  );
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
for (const listener of listeners) {
  if (listener.pid === isolatedOwnerPid) continue;
  const visited = new Set();
  let descendantPid = listener.pid;
  while (descendantPid !== isolatedOwnerPid && descendantPid !== "1") {
    if (visited.has(descendantPid)) {
      throw new Error(`Cycle detected while proving listener PID ${listener.pid}.`);
    }
    visited.add(descendantPid);
    descendantPid = parentPid(descendantPid);
  }
  if (descendantPid !== isolatedOwnerPid) {
    throw new Error(
      `CDP listener PID ${listener.pid} does not descend from isolated owner PID ${isolatedOwnerPid}.`,
    );
  }
}

const inspectShellState = (page) =>
  page.evaluate(() => {
    const roundValue = (value) => Math.round(value * 100) / 100;
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        bottom: roundValue(value.bottom),
        height: roundValue(value.height),
        left: roundValue(value.left),
        right: roundValue(value.right),
        top: roundValue(value.top),
        width: roundValue(value.width),
      };
    };
    const visible = (element) => {
      if (!(element instanceof Element)) return false;
      const value = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        value.width > 0 &&
        value.height > 0 &&
        value.right > 0 &&
        value.left < innerWidth &&
        value.bottom > 0 &&
        value.top < innerHeight &&
        style.display !== "none" &&
        style.opacity !== "0" &&
        style.visibility === "visible"
      );
    };
    const labelled = (label) =>
      [...document.querySelectorAll(`[aria-label="${CSS.escape(label)}"]`)]
        .filter(visible)
        .map((element) => rect(element));
    const navigation = [...document.querySelectorAll("nav")].find(visible);
    const fixedRouteState = (label) =>
      [
        ...(navigation?.querySelectorAll(
          'a, button, [role="button"], [role="tab"]',
        ) ?? []),
      ]
        .filter(
          (element) =>
            visible(element) && element.textContent?.trim() === label,
        )
        .map((element) => ({
          ariaCurrent: element.getAttribute("aria-current"),
          ariaSelected: element.getAttribute("aria-selected"),
          rect: rect(element),
        }));
    const editor = [
      ...document.querySelectorAll(
        'textarea, [contenteditable="true"], [role="textbox"]',
      ),
    ].find(visible);
    const editorStyle = editor ? getComputedStyle(editor) : null;
    const navigationScrollOwners = navigation
      ? [...navigation.querySelectorAll("*")]
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              visible(element) &&
              (style.overflowY === "auto" || style.overflowY === "scroll") &&
              element.scrollHeight > element.clientHeight
            );
          })
          .map((element) => ({
            clientHeight: element.clientHeight,
            overflowY: getComputedStyle(element).overflowY,
            rect: rect(element),
            scrollHeight: element.scrollHeight,
          }))
      : [];
    return {
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      controls: Object.fromEntries(
        [
          "Add files and more",
          "Back",
          "Dictate",
          "Forward",
          "Hide sidebar",
          "Show sidebar",
          "Start new voice chat",
        ].map((label) => [label, labelled(label)]),
      ),
      editor: editor
        ? {
            contenteditable: editor.getAttribute("contenteditable"),
            rect: rect(editor),
            style: {
              color: editorStyle.color,
              fontFamily: editorStyle.fontFamily,
              fontSize: editorStyle.fontSize,
              fontWeight: editorStyle.fontWeight,
              lineHeight: editorStyle.lineHeight,
            },
          }
        : null,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      main: [...document.querySelectorAll("main")].filter(visible).map(rect),
      navigation: rect(navigation),
      navigationScrollOwners,
      routeMarkers: {
        newChatHome: [
          ...document.querySelectorAll('[data-testid="home-icon"]'),
        ].filter(visible).length,
      },
      routes: Object.fromEntries(
        ["New chat", "Plugins", "Pull requests", "Scheduled", "Sites"].map(
          (label) => [label, fixedRouteState(label)],
        ),
      ),
      viewport: {
        devicePixelRatio,
        height: innerHeight,
        width: innerWidth,
      },
    };
  });

const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visibleControls = [
      ...document.querySelectorAll('a, button, [role="button"], [role="tab"]'),
    ].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.left < innerWidth &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        style.display !== "none" &&
        style.visibility === "visible"
      );
    }).length;
    return {
      area: innerWidth * innerHeight,
      height: innerHeight,
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
      width: innerWidth,
    };
  });
  return { index, page, url: page.url(), ...structure };
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

const cleanupCurrentBaselineRenderer = async (page) => {
  if (!page || page.isClosed()) return [];
  return runBestEffortCurrentBaselineCleanup([
    {
      name: "focus-main-renderer",
      run: () => page.bringToFront(),
    },
    {
      name: "return-new-chat",
      run: async () => {
        const alreadyNewChat = page.locator(
          '[data-testid="home-icon"]:visible',
        );
        if ((await alreadyNewChat.count()) > 0) return;
        const showSidebar = page
          .locator('[aria-label="Show sidebar"]:visible')
          .first();
        if ((await showSidebar.count()) > 0) {
          await showSidebar.click();
          await page.waitForSelector("nav:visible", { timeout: 5_000 });
        }
        const newChat = page
          .locator("nav")
          .getByText("New chat", { exact: true })
          .first();
        if ((await newChat.count()) === 0) {
          throw new Error("New chat cleanup target is unavailable.");
        }
        await newChat.click();
        await page.waitForSelector('[data-testid="home-icon"]:visible', {
          timeout: 5_000,
        });
      },
    },
    {
      name: "hide-sidebar",
      run: async () => {
        const hideSidebar = page
          .locator('[aria-label="Hide sidebar"]:visible')
          .first();
        if ((await hideSidebar.count()) === 0) return;
        await hideSidebar.click();
        await page.waitForFunction(
          () => {
            const navigation = document.querySelector("nav");
            return (
              !(navigation instanceof Element) ||
              !navigation.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              })
            );
          },
          undefined,
          { timeout: 5_000 },
        );
      },
    },
  ]);
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let selectedPage = null;
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(pages.map(inspectCandidate));
  const selected = selectCurrentMainCandidate(candidates);
  const page = selected.page;
  selectedPage = page;
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus(), undefined, {
    timeout: 15_000,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const states = {};
  const readShellGeometrySignature = () =>
    page.evaluate(() => {
      const sample = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          bottom: Math.round(value.bottom * 10) / 10,
          height: Math.round(value.height * 10) / 10,
          left: Math.round(value.left * 10) / 10,
          right: Math.round(value.right * 10) / 10,
          visible: element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
          width: Math.round(value.width * 10) / 10,
        };
      };
      const editor = [
        ...document.querySelectorAll(
          'textarea, [contenteditable="true"], [role="textbox"]',
        ),
      ].find((element) =>
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
      );
      return JSON.stringify({
        editor: sample(editor),
        main: sample(document.querySelector("main")),
        navigation: sample(document.querySelector("nav")),
        viewport: { height: innerHeight, width: innerWidth },
      });
    });
  const waitForStableShellGeometry = async () => {
    let previous = null;
    let stableSamples = 0;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const current = await readShellGeometrySignature();
      stableSamples = current === previous ? stableSamples + 1 : 0;
      if (stableSamples >= 2) return;
      previous = current;
      await page.waitForTimeout(100);
    }
    throw new Error("Shell geometry did not stabilize before capture.");
  };
  const setViewport = async (viewport) => {
    await page.setViewportSize(viewport);
    await page.waitForFunction(
      ({ height, width }) => innerHeight === height && innerWidth === width,
      viewport,
      { timeout: 15_000 },
    );
    await waitForStableShellGeometry();
  };
  const inspectSidebarLifecycleBaseline = () =>
    page.evaluate(() => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const round = (value) => Math.round(value * 100) / 100;
      const projectRows = [
        ...document.querySelectorAll(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        ),
      ].filter(visible);
      const first = projectRows[0];
      const navigation = [...document.querySelectorAll("nav")].find(visible);
      const bounds = first?.getBoundingClientRect();
      return {
        expandedProjectGroupCount: projectRows.filter(
          (row) => row.getAttribute("aria-expanded") === "true",
        ).length,
        helpControlCount: [
          ...document.querySelectorAll(
            'button[aria-label="Open help menu"]',
          ),
        ].filter(visible).length,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        navigationWidth: navigation
          ? round(navigation.getBoundingClientRect().width)
          : null,
        projectGroupCount: projectRows.length,
        projectRow: first
          ? {
              rect: {
                height: round(bounds.height),
                width: round(bounds.width),
              },
              role: first.getAttribute("role"),
              tabIndex: first.tabIndex,
              tag: first.tagName.toLowerCase(),
            }
          : null,
        settingsControlCount: [
          ...document.querySelectorAll(
            'button[aria-label="Open settings"], button[aria-label="Settings"]',
          ),
        ].filter(visible).length,
      };
    });
  const inspectProjectExpansion = (projectRow) =>
    projectRow.evaluate((element) => ({
      expanded: element.getAttribute("aria-expanded") === "true",
      focusOnRow: document.activeElement === element,
    }));
  const inspectOpenMenu = () =>
    page.evaluate(() => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const menus = [...document.querySelectorAll('[role="menu"]')].filter(
        visible,
      );
      const menu = menus[0];
      const active = document.activeElement;
      const bounds = menu?.getBoundingClientRect();
      const menuItems = [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])];
      const round = (value) => Math.round(value * 100) / 100;
      return {
        focusInside: Boolean(menu && active && menu.contains(active)),
        focusRole: active?.getAttribute?.("role") ?? null,
        hasMarkAllAsRead: menuItems.some(
          (item) => item.textContent?.trim() === "Mark all as read",
        ),
        menuItemCount: menuItems.length,
        rect: bounds
          ? { height: round(bounds.height), width: round(bounds.width) }
          : null,
        visibleMenuCount: menus.length,
      };
    });
  const inspectNativeProjectMenu = (trigger) =>
    trigger.evaluate((element) => {
      const round = (value) => Math.round(value * 100) / 100;
      const bounds = element.getBoundingClientRect();
      const fiberKey = Object.getOwnPropertyNames(element).find((name) =>
        name.startsWith("__reactFiber$"),
      );
      let fiber = fiberKey ? element[fiberKey] : null;
      let nativeItems = null;
      while (fiber) {
        if (typeof fiber.memoizedProps?.getNativeItems === "function") {
          nativeItems = fiber.memoizedProps.getNativeItems();
          break;
        }
        fiber = fiber.return;
      }
      if (!Array.isArray(nativeItems)) {
        throw new Error(
          "The current project action trigger did not expose one native-item provider.",
        );
      }
      return {
        bridge: {
          available:
            typeof window.electronBridge?.showContextMenu === "function",
          frozen: Object.isFrozen(window.electronBridge),
        },
        items: nativeItems.map((item) => ({
          defaultMessage: item.message?.defaultMessage ?? null,
          enabled: item.enabled !== false,
          hasIcon: item.type === "separator" ? false : Boolean(item.icon),
          hasOnSelect:
            item.type === "separator" ? false : typeof item.onSelect === "function",
          id: item.id ?? null,
          messageId: item.message?.id ?? null,
          submenu: Array.isArray(item.submenu)
            ? item.submenu.map((submenuItem) => ({
                defaultMessage: submenuItem.message?.defaultMessage ?? null,
                enabled: submenuItem.enabled !== false,
                hasIcon: Boolean(submenuItem.icon),
                hasOnSelect: typeof submenuItem.onSelect === "function",
                id: submenuItem.id ?? null,
                messageId: submenuItem.message?.id ?? null,
                type: submenuItem.type ?? "item",
              }))
            : null,
          type: item.type ?? "item",
        })),
        renderMode: "electron-native-context-menu",
        trigger: {
          ariaExpanded: element.getAttribute("aria-expanded"),
          ariaHaspopup: element.getAttribute("aria-haspopup"),
          rect: {
            height: round(bounds.height),
            width: round(bounds.width),
          },
          tag: element.tagName.toLowerCase(),
        },
      };
    });
  const inspectResponsiveSidebar = () =>
    page.evaluate(() => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const navigation = [...document.querySelectorAll("nav")].find(visible);
      const projectRow = document.querySelector(
        'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
      );
      return {
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        navigationVisible: Boolean(navigation),
        navigationWidth: navigation?.getBoundingClientRect().width ?? null,
        projectExpanded:
          projectRow?.getAttribute("aria-expanded") === "true",
        showSidebarCount: [
          ...document.querySelectorAll('[aria-label="Show sidebar"]'),
        ].filter(visible).length,
      };
    });
  const waitForShell = async () => {
    await page.waitForFunction(
      () =>
        document.querySelector("main") &&
        document.querySelector(
          '[aria-label="Hide sidebar"], [aria-label="Show sidebar"]',
        ),
      undefined,
      { timeout: 15_000 },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  };
  const waitForSidebarVisibility = async (expectedVisible) => {
    await page.waitForFunction(
      (visible) => {
        const navigation = document.querySelector("nav");
        if (!(navigation instanceof Element)) return !visible;
        return (
          navigation.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }) === visible
        );
      },
      expectedVisible,
      { timeout: 15_000 },
    );
  };
  const showSidebar = async () => {
    const trigger = page.locator('[aria-label="Show sidebar"]:visible').first();
    if ((await trigger.count()) > 0) {
      await trigger.click();
      await waitForSidebarVisibility(true);
      await waitForStableShellGeometry();
    }
  };
  const hideSidebar = async () => {
    const trigger = page.locator('[aria-label="Hide sidebar"]:visible').first();
    if ((await trigger.count()) > 0) {
      await trigger.click();
      await waitForSidebarVisibility(false);
      await waitForStableShellGeometry();
    }
  };
  const newChat = () => page.locator("nav").getByText("New chat", { exact: true }).first();
  const waitForNewChat = async () => {
    await page.waitForSelector('[data-testid="home-icon"]:visible');
    await page.waitForFunction(
      () => {
        const visible = (element) =>
          element instanceof Element &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        const newChatMarker = [
          ...document.querySelectorAll('[data-testid="home-icon"]'),
        ].some(visible);
        const composer = [
          ...document.querySelectorAll(
            'textarea, [contenteditable="true"], [role="textbox"]',
          ),
        ].some(visible);
        return newChatMarker && composer;
      },
    );
  };
  const readMemoryRouterPath = () =>
    page.evaluate(() => {
      let fiber = null;
      for (const element of [
        document.documentElement,
        document.body,
        ...document.body.querySelectorAll("*"),
      ]) {
        const key = Object.getOwnPropertyNames(element).find(
          (name) =>
            name.startsWith("__reactFiber$") ||
            name.startsWith("__reactContainer$"),
        );
        if (key) {
          fiber = element[key];
          break;
        }
      }
      if (!fiber) return null;
      while (fiber.return) fiber = fiber.return;
      const paths = [];
      const seen = new Set();
      const stack = [fiber];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node || seen.has(node)) continue;
        seen.add(node);
        const value = node.memoizedProps?.value;
        if (typeof value?.location?.pathname === "string") {
          paths.push(value.location.pathname);
        }
        if (node.child) stack.push(node.child);
        if (node.sibling) stack.push(node.sibling);
      }
      return paths.length === 1 ? paths[0] : null;
    });
  const navigateMemoryRoute = async (pathname) => {
    const invoked = await page.evaluate((nextPathname) => {
      let fiber = null;
      for (const element of [
        document.documentElement,
        document.body,
        ...document.body.querySelectorAll("*"),
      ]) {
        const key = Object.getOwnPropertyNames(element).find(
          (name) =>
            name.startsWith("__reactFiber$") ||
            name.startsWith("__reactContainer$"),
        );
        if (key) {
          fiber = element[key];
          break;
        }
      }
      if (!fiber) return false;
      while (fiber.return) fiber = fiber.return;
      const navigators = [];
      const seen = new Set();
      const stack = [fiber];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node || seen.has(node)) continue;
        seen.add(node);
        const value = node.memoizedProps?.value;
        if (
          value?.basename === "/" &&
          value.navigator &&
          typeof value.navigator.push === "function" &&
          typeof value.navigator.replace === "function"
        ) {
          navigators.push(value.navigator);
        }
        if (node.child) stack.push(node.child);
        if (node.sibling) stack.push(node.sibling);
      }
      if (navigators.length !== 1) return false;
      navigators[0].push(nextPathname, null);
      return true;
    }, pathname);
    if (!invoked) {
      throw new Error("The current Renderer memory router was ambiguous.");
    }
    await page.waitForFunction(
      (expectedPathname) => {
        let fiber = null;
        for (const element of [
          document.documentElement,
          document.body,
          ...document.body.querySelectorAll("*"),
        ]) {
          const key = Object.getOwnPropertyNames(element).find(
            (name) =>
              name.startsWith("__reactFiber$") ||
              name.startsWith("__reactContainer$"),
          );
          if (key) {
            fiber = element[key];
            break;
          }
        }
        if (!fiber) return false;
        while (fiber.return) fiber = fiber.return;
        const paths = [];
        const seen = new Set();
        const stack = [fiber];
        while (stack.length > 0) {
          const node = stack.pop();
          if (!node || seen.has(node)) continue;
          seen.add(node);
          const value = node.memoizedProps?.value;
          if (typeof value?.location?.pathname === "string") {
            paths.push(value.location.pathname);
          }
          if (node.child) stack.push(node.child);
          if (node.sibling) stack.push(node.sibling);
        }
        return paths.length === 1 && paths[0] === expectedPathname;
      },
      pathname,
      { timeout: 15_000 },
    );
  };
  const inspectProjectsIndex = async () =>
    page.evaluate(() => {
      const visible = (element) =>
        element instanceof Element &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0;
      const round = (value) => Math.round(value * 100) / 100;
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const bounds = element.getBoundingClientRect();
        return {
          height: round(bounds.height),
          left: round(bounds.left),
          top: round(bounds.top),
          width: round(bounds.width),
        };
      };
      const title = [...document.querySelectorAll("h1, h2, h3")].find(
        (element) =>
          visible(element) && element.textContent?.trim() === "Projects",
      );
      const search = [...document.querySelectorAll("input")].find(
        (element) =>
          visible(element) &&
          (element.getAttribute("placeholder") === "Search projects" ||
            element.getAttribute("aria-label") === "Search projects"),
      );
      const header = document.querySelector("[data-projects-header]");
      const rows = [...document.querySelectorAll("[data-project-row]")];
      const updated = [...(header?.querySelectorAll("button") ?? [])].find(
        (element) => element.textContent?.trim() === "Updated",
      );
      const navigation = [...document.querySelectorAll("nav")].find(visible);
      const scrollOwners = [...document.querySelectorAll("main *")]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            visible(element) &&
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            element.scrollHeight > element.clientHeight
          );
        })
        .map((element) => ({
          clientHeight: element.clientHeight,
          overflowY: getComputedStyle(element).overflowY,
          rect: rect(element),
          scrollHeight: element.scrollHeight,
        }));
      const titleStyle = title ? getComputedStyle(title) : null;
      return {
        header: {
          gridTemplateColumns: header
            ? getComputedStyle(header).gridTemplateColumns
            : null,
          rect: rect(header),
        },
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        navigationVisible: Boolean(navigation),
        navigationWidth: navigation
          ? round(navigation.getBoundingClientRect().width)
          : null,
        routePath: null,
        rows: {
          count: rows.length,
          firstRect: rect(rows[0]),
        },
        scrollOwners,
        search: {
          count: search ? 1 : 0,
          placeholder: search?.getAttribute("placeholder") ?? null,
          rect: rect(search),
        },
        title: {
          count: title ? 1 : 0,
          rect: rect(title),
          style: titleStyle
            ? {
                fontSize: titleStyle.fontSize,
                fontWeight: titleStyle.fontWeight,
                lineHeight: titleStyle.lineHeight,
              }
            : null,
        },
        updatedDisplay: updated ? getComputedStyle(updated).display : null,
        viewport: { height: innerHeight, width: innerWidth },
      };
    });
  const inspectProjectsIndexSort = () =>
    page.evaluate(() => {
      const state = (label) => {
        const button = [...document.querySelectorAll(
          "[data-projects-header] button",
        )].find((element) => element.textContent?.trim() === label);
        const icon = button?.querySelector("svg");
        return {
          active: Boolean(icon),
          descending: Boolean(
            icon?.getAttribute("class")?.split(/\s+/).includes("rotate-180"),
          ),
        };
      };
      return { name: state("Name"), updated: state("Updated") };
    });
  const captureProjectsIndexObservation = async () => {
    await setViewport(currentBaselineViewports.wide);
    await showSidebar();
    if ((await readMemoryRouterPath()) !== "/") {
      throw new Error("Projects capture must start from the New chat route.");
    }
    await navigateMemoryRoute("/projects");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("h1, h2, h3")].some(
          (element) => element.textContent?.trim() === "Projects",
        ) &&
        document.querySelector("[data-projects-header]") &&
        document.querySelector("[data-projects-rows]"),
      undefined,
      { timeout: 15_000 },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await waitForStableShellGeometry();
    await page.mouse.move(1, 1);
    const wide = await inspectProjectsIndex();
    wide.routePath = await readMemoryRouterPath();

    const sort = { initial: await inspectProjectsIndexSort() };
    await page.getByRole("button", { exact: true, name: "Name" }).click();
    sort.nameAscending = await inspectProjectsIndexSort();
    await page.getByRole("button", { exact: true, name: "Name" }).click();
    sort.nameDescending = await inspectProjectsIndexSort();
    await page.getByRole("button", { exact: true, name: "Updated" }).click();
    sort.restored = await inspectProjectsIndexSort();

    const search = page.getByPlaceholder("Search projects");
    await search.fill("__codex_ui_kit_no_match__");
    await page.waitForTimeout(250);
    const empty = await page.evaluate(() => ({
      emptyMessageCount: [...document.querySelectorAll("main *")].filter(
        (element) =>
          element.children.length === 0 &&
          element.textContent?.trim() === "No projects" &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      ).length,
      focusOnSearch:
        document.activeElement?.getAttribute("placeholder") ===
        "Search projects",
      rowCount: document.querySelectorAll("[data-project-row]").length,
    }));
    await search.fill("");
    await page.waitForFunction(
      () => document.querySelectorAll("[data-project-row]").length > 0,
    );

    const toggle = page.locator('[aria-label="Toggle project"]').first();
    const collapsedWrapperHeight = await page.evaluate(() => {
      const wrapper = document.querySelector("[data-project-row-wrapper]");
      return wrapper
        ? Math.round(wrapper.getBoundingClientRect().height * 100) / 100
        : null;
    });
    await toggle.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[aria-label="Toggle project"]')
          ?.getAttribute("aria-expanded") === "true",
    );
    await page.waitForTimeout(250);
    const expanded = await page.evaluate((collapsedWrapperHeight) => {
      const wrapper = document.querySelector("[data-project-row-wrapper]");
      const recentGroups = [...document.querySelectorAll("[aria-label]")].filter(
        (element) =>
          /^(Chats in|Local chats in|Recent chats in|Search matches in)/.test(
            element.getAttribute("aria-label") ?? "",
          ) &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      );
      return {
        collapsedWrapperHeight,
        expandedCount: document.querySelectorAll(
          '[aria-label="Toggle project"][aria-expanded="true"]',
        ).length,
        focusOnToggle:
          document.activeElement?.getAttribute("aria-label") ===
          "Toggle project",
        recentGroupCount: recentGroups.length,
        recentGroupHeight:
          Math.round(
            recentGroups.reduce(
              (height, element) =>
                height + element.getBoundingClientRect().height,
              0,
            ) * 100,
          ) / 100,
        wrapperHeight: wrapper
          ? Math.round(wrapper.getBoundingClientRect().height * 100) / 100
          : null,
      };
    }, collapsedWrapperHeight);
    await toggle.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[aria-label="Toggle project"]')
          ?.getAttribute("aria-expanded") === "false",
    );
    const collapsed = await page.evaluate(() => ({
      expandedCount: document.querySelectorAll(
        '[aria-label="Toggle project"][aria-expanded="true"]',
      ).length,
      focusOnToggle:
        document.activeElement?.getAttribute("aria-label") ===
        "Toggle project",
    }));

    await setViewport({ height: 600, width: 600 });
    await hideSidebar();
    const compact = await inspectProjectsIndex();
    compact.routePath = await readMemoryRouterPath();
    await setViewport(currentBaselineViewports.wide);
    return { collapsed, compact, empty, expanded, sort, wide };
  };

  await setViewport(currentBaselineViewports.wide);
  await waitForShell();
  await hideSidebar();
  await showSidebar();
  await newChat().click();
  await waitForNewChat();
  await waitForStableShellGeometry();
  const normalizedCandidates = await Promise.all(pages.map(inspectCandidate));
  const normalizedSelected = normalizedCandidates.find(
    (candidate) => candidate.index === selected.index,
  );
  if (!normalizedSelected) {
    throw new Error("Selected main Renderer disappeared during normalization.");
  }
  states.wideNewChat = await inspectShellState(page);

  const projectRow = page
    .locator(
      'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
    )
    .first();
  if ((await projectRow.count()) !== 1) {
    throw new Error("A current sidebar project group was not available.");
  }
  if ((await projectRow.getAttribute("aria-expanded")) !== "true") {
    await projectRow.focus();
    await projectRow.press("Enter");
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
          )
          ?.getAttribute("aria-expanded") === "true",
    );
  }
  const sidebarLifecycle = {
    baseline: await inspectSidebarLifecycleBaseline(),
  };
  await projectRow.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "false",
  );
  sidebarLifecycle.pointerCollapsed =
    await inspectProjectExpansion(projectRow);
  await projectRow.press("Enter");
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "true",
  );
  sidebarLifecycle.enterExpanded = await inspectProjectExpansion(projectRow);
  await projectRow.press("Space");
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "false",
  );
  sidebarLifecycle.spaceCollapsed =
    await inspectProjectExpansion(projectRow);
  await projectRow.press("Space");
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "true",
  );
  sidebarLifecycle.spaceExpanded = await inspectProjectExpansion(projectRow);

  const projectRows = page.locator(
    'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
  );
  let projectMenuObservation = null;
  for (let index = 0; index < (await projectRows.count()); index += 1) {
    const candidateRow = projectRows.nth(index);
    await candidateRow.hover();
    const candidateTrigger = candidateRow
      .locator('button[aria-haspopup="menu"]')
      .first();
    if ((await candidateTrigger.count()) !== 1) continue;
    const candidate = await inspectNativeProjectMenu(candidateTrigger);
    const ids = candidate.items.map((item) => item.id);
    if (
      ids.includes("move-to-custom-section") &&
      ids.includes("reveal-project-folder") &&
      !ids.includes("mark-project-threads-read")
    ) {
      projectMenuObservation = candidate;
      break;
    }
    if (
      ids.includes("move-to-custom-section") &&
      ids.includes("reveal-project-folder")
    ) {
      projectMenuObservation ??= candidate;
    }
  }
  if (!projectMenuObservation) {
    throw new Error(
      "A representative current project-menu provider with Section and Reveal in Finder was not available.",
    );
  }
  sidebarLifecycle.projectMenu = projectMenuObservation;

  const helpMenuTrigger = page
    .locator('button[aria-label="Open help menu"]:visible')
    .first();
  await helpMenuTrigger.click();
  await page.waitForSelector('[role="menu"]:visible');
  await page.waitForTimeout(100);
  sidebarLifecycle.helpMenu = { opened: await inspectOpenMenu() };
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[role="menu"]')].every(
        (element) =>
          !element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      ),
  );
  sidebarLifecycle.helpMenu.closed = await page.evaluate((trigger) => ({
    focusReturned: document.activeElement === trigger,
    visibleMenuCount: [...document.querySelectorAll('[role="menu"]')].filter(
      (element) =>
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
    ).length,
  }), await helpMenuTrigger.elementHandle());

  await projectRow.focus();
  await projectRow.press("Space");
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "false",
  );

  await setViewport(currentBaselineViewports.medium);
  states.mediumNewChat = await inspectShellState(page);

  await setViewport(currentBaselineViewports.threshold);
  states.thresholdNewChat = await inspectShellState(page);

  await setViewport(currentBaselineViewports.compact);
  states.compactVisibleBeforeCollapse = await inspectShellState(page);
  sidebarLifecycle.responsive = {
    compactVisibleBeforeCollapse: await inspectResponsiveSidebar(),
  };
  if (
    states.compactVisibleBeforeCollapse.navigation === null ||
    states.compactVisibleBeforeCollapse.controls?.["Hide sidebar"]?.length !== 1
  ) {
    throw new Error(
      `The sidebar did not remain visible at the 720px viewport: ${JSON.stringify(states.compactVisibleBeforeCollapse)}`,
    );
  }
  await hideSidebar();
  states.compactCollapsed = await inspectShellState(page);
  sidebarLifecycle.responsive.compactCollapsed =
    await inspectResponsiveSidebar();

  await showSidebar();
  states.compactPinned = await inspectShellState(page);
  sidebarLifecycle.responsive.compactPinned =
    await inspectResponsiveSidebar();

  await page.locator("nav").getByText("Pull requests", { exact: true }).first().click();
  await page.waitForFunction(() => {
    const candidates = [...document.querySelectorAll("a, button")];
    return candidates.some(
      (element) =>
        element.textContent?.trim() === "Pull requests" &&
        element.getAttribute("aria-current") === "page",
    );
  });
  await waitForStableShellGeometry();
  states.compactPullRequests = await inspectShellState(page);

  await newChat().click();
  await waitForNewChat();
  await waitForStableShellGeometry();
  states.compactRestored = await inspectShellState(page);

  await setViewport(currentBaselineViewports.wide);
  sidebarLifecycle.responsive.wideRestored =
    await inspectResponsiveSidebar();
  await projectRow.focus();
  await projectRow.press("Enter");
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
        )
        ?.getAttribute("aria-expanded") === "true",
  );
  sidebarLifecycle.responsive.keyboardRestored =
    await inspectProjectExpansion(projectRow);

  const projectsIndexObservation =
    await captureProjectsIndexObservation();
  await hideSidebar();
  const afterCaptureBundle = readAppAsarSnapshot();
  const record = {
    baseline,
    captureKind: "renderer_emulation",
    runtimeBundleIdentity: {
      afterCapture: afterCaptureBundle,
      beforeCapture: beforeCaptureBundle,
      ownerPid: Number(isolatedOwnerPid),
      processStartedAtMs,
    },
    schemaVersion: 1,
    projectsIndexObservation,
    sidebarLifecycle,
    states,
    targetSelection: {
      candidates: normalizedCandidates.map(
        ({ area, height, index, landmarks, url, visibleControls, width }) => ({
          area,
          height,
          index,
          landmarks,
          selected: index === selected.index,
          url: recordCandidateUrl(url),
          visibleControls,
          width,
        }),
      ),
      selected: {
        area: normalizedSelected.area,
        landmarks: normalizedSelected.landmarks,
        url: recordCandidateUrl(normalizedSelected.url),
        visibleControls: normalizedSelected.visibleControls,
      },
    },
  };
  assertCurrentProjectsIndexObservation(projectsIndexObservation);
  assertCurrentBaselineRecord(record);
  const output = `${JSON.stringify(record, null, 2)}\n`;
  if (normalizedOutputPath) {
    await writeCurrentBaselineOutput(
      normalizedProfile,
      normalizedOutputPath,
      output,
    );
  }
  process.stdout.write(output);
} finally {
  const cleanupFailures = await cleanupCurrentBaselineRenderer(selectedPage);
  if (cleanupFailures.length > 0) {
    process.stderr.write(
      `Best-effort Renderer cleanup could not complete: ${cleanupFailures.join(", ")}.\n`,
    );
  }
  await browser.close();
}
