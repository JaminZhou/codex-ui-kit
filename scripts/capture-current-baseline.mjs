import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentBaselineRecord,
  currentBaselineViewports,
  selectCurrentMainCandidate,
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
    "Set CODEX_CURRENT_BASELINE_ALLOW_NAVIGATION=1 to authorize fixed New chat and Pull requests route navigation.",
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
if (outputPath && !resolve(outputPath).startsWith(`${normalizedProfile}/`)) {
  throw new Error("The optional capture output must stay inside the isolated profile.");
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const appAsarBytes = readFileSync(appAsar);
const baseline = {
  appAsarBytes: appAsarBytes.byteLength,
  appAsarSha256: createHash("sha256")
    .update(appAsarBytes)
    .digest("hex"),
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
    const fixedRouteState = (label) =>
      [...document.querySelectorAll('a, button, [role="button"], [role="tab"]')]
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
    const navigation = [...document.querySelectorAll("nav")].find(visible);
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

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(pages.map(inspectCandidate));
  const selected = selectCurrentMainCandidate(candidates);
  const page = selected.page;
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
  const waitForShell = async () => {
    await page.waitForFunction(
      () =>
        document.querySelector("main") &&
        document.querySelector(
          'textarea, [contenteditable="true"], [role="textbox"]',
        ) &&
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
      () =>
        [...document.querySelectorAll('[data-testid="home-icon"]')].some(
          (element) =>
            element.checkVisibility({
              checkOpacity: true,
              checkVisibilityCSS: true,
            }),
        ),
    );
  };

  await setViewport(currentBaselineViewports.wide);
  await waitForShell();
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

  await setViewport(currentBaselineViewports.medium);
  states.mediumNewChat = await inspectShellState(page);

  await setViewport(currentBaselineViewports.threshold);
  states.thresholdNewChat = await inspectShellState(page);

  await setViewport(currentBaselineViewports.compact);
  const automaticallyCollapsed = await inspectShellState(page);
  if (
    automaticallyCollapsed.navigation !== null ||
    automaticallyCollapsed.controls?.["Show sidebar"]?.length !== 1
  ) {
    throw new Error(
      "The sidebar did not collapse automatically at the 720px breakpoint.",
    );
  }
  states.compactCollapsed = automaticallyCollapsed;

  await showSidebar();
  states.compactPinned = await inspectShellState(page);

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

  await hideSidebar();
  const record = {
    baseline,
    captureKind: "renderer_emulation",
    schemaVersion: 1,
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
  assertCurrentBaselineRecord(record);
  const output = `${JSON.stringify(record, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, output, "utf8");
  process.stdout.write(output);
} finally {
  await browser.close();
}
