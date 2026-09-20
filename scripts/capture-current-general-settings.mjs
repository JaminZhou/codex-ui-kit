import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { currentInstalledCandidateBaselineFingerprint } from "./current-baseline-contract.mjs";

// Capture-only. This samples the public Settings/General structure from an
// isolated current Codex Renderer. It never changes a preference, submits a
// prompt, or records account/project/task text.
const port = Number(process.env.CODEX_CURRENT_GENERAL_SETTINGS_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_GENERAL_SETTINGS_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_GENERAL_SETTINGS_OUTPUT;
const allowCapture =
  process.env.CODEX_CURRENT_GENERAL_SETTINGS_ALLOW_CAPTURE === "1";
const requestedFingerprint =
  process.env.CODEX_CURRENT_GENERAL_SETTINGS_FINGERPRINT ?? "26.915.31945";
const expectedFingerprint = currentInstalledCandidateBaselineFingerprint;
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated General Settings CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated General Settings profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute General Settings capture output path.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_GENERAL_SETTINGS_ALLOW_CAPTURE=1 to authorize read-only Settings navigation.",
  );
}
if (requestedFingerprint !== "26.915.31945") {
  throw new Error(`Unsupported General Settings fingerprint ${requestedFingerprint}.`);
}

const profile = realpathSync(requestedProfile);
const output = resolve(requestedOutput);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The General Settings profile must be isolated under /private/tmp.");
}
if (
  dirname(output) !== profile ||
  !basename(output).startsWith("current-general-settings-26-915-") ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "The output must be a current-general-settings-26-915-*.json direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const asarStat = statSync(appAsar);
const fingerprint = {
  appAsarBytes: asarStat.size,
  appAsarSha256: execFileSync("/usr/bin/shasum", ["-a", "256", appAsar], {
    encoding: "utf8",
  })
    .trim()
    .split(/\s+/)[0],
  appVersion: plistValue("CFBundleShortVersionString"),
  buildNumber: plistValue("CFBundleVersion"),
  chromiumVersion: plistValue("ChromiumBaseVersion"),
};
if (
  Object.entries(expectedFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint does not match 26.915.31945: ${JSON.stringify(fingerprint)}`,
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
  throw new Error("Every General Settings CDP listener must be loopback-only.");
}
const processInfo = (pid) =>
  JSON.parse(
    execFileSync("/usr/bin/python3", ["scripts/read-macos-process-info.py", pid], {
      encoding: "utf8",
    }),
  );
const valueFor = (argv, prefix) =>
  argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
const owners = listeners.filter(({ pid }) => {
  try {
    const info = processInfo(pid);
    const processProfile = valueFor(info.argv, "--user-data-dir=");
    return (
      info.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
      valueFor(info.argv, "--remote-debugging-address=") === "127.0.0.1" &&
      valueFor(info.argv, "--remote-debugging-port=") === String(port) &&
      processProfile &&
      realpathSync(processProfile) === profile
    );
  } catch {
    return false;
  }
});
if (owners.length !== 1) {
  throw new Error("The isolated General Settings CDP owner is ambiguous.");
}

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
  response.json(),
);
const target = targets
  .filter((candidate) => candidate.type === "page" && candidate.url.startsWith("app://-/index.html"))
  .sort((left, right) => Number(right.url === "app://-/index.html") - Number(left.url === "app://-/index.html"))[0];
if (!target?.webSocketDebuggerUrl) {
  throw new Error("The isolated Codex page target is unavailable.");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  callback(message);
};
await new Promise((resolveOpen, rejectOpen) => {
  socket.onopen = resolveOpen;
  socket.onerror = rejectOpen;
});
const call = (method, params = {}) =>
  new Promise((resolveCall) => {
    const id = ++nextId;
    pending.set(id, resolveCall);
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const response = await call("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (response.error || response.result?.exceptionDetails) {
    throw new Error(`Current General Settings capture failed: ${JSON.stringify(response)}`);
  }
  return response.result?.result?.value;
};

const alreadyOnGeneral = await evaluate(
  `document.querySelector('[aria-current="page"]')?.textContent?.trim() === "General"`,
);
if (!alreadyOnGeneral) {
  await evaluate(`(() => {
    const visible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const profile = [...document.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === "Open profile menu" && visible(button),
    );
    if (!profile) throw new Error("Open profile menu is unavailable.");
    profile.click();
  })()`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  await evaluate(`(() => {
    const menuItem = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent?.trim() === "Settings",
    );
    if (!menuItem) throw new Error("Settings menu item is unavailable.");
    menuItem.click();
  })()`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 700));
}

const capture = await evaluate(`(() => {
  const visible = (element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const metric = (element) => {
    if (!(element instanceof Element)) return null;
    const bounds = element.getBoundingClientRect();
    return {
      height: bounds.height,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    };
  };
  const root = [...document.querySelectorAll("div")].find(
    (element) =>
      element.className?.toString().startsWith("group/settings ") && visible(element),
  );
  const settingsNav = [...document.querySelectorAll("button")].filter(
    (button) => {
      const bounds = button.getBoundingClientRect();
      return visible(button) && bounds.left === 8 && bounds.width > 300;
    },
  );
  const cards = [...document.querySelectorAll("div")]
    .filter(
      (element) =>
        visible(element) &&
        element.className?.toString().includes("rounded-2xl") &&
        element.className?.toString().includes("border-default"),
    )
    .map(metric)
    .filter(Boolean)
    .slice(0, 12);
  const visibleButtons = [...document.querySelectorAll("button")].filter(visible);
  const toggles = visibleButtons.filter((button) => button.getAttribute("role") === "switch");
  const menus = visibleButtons.filter((button) =>
    ["VS Code", "Auto detect", "Bottom", "Right", "Standard", "View", "Enter", "Queue", "Steer", "Only when unfocused"].includes(button.textContent?.trim() ?? ""),
  );
  const sections = [...document.querySelectorAll("div")]
    .filter((element) => visible(element) && element.className?.toString().includes("font-medium") && element.textContent?.trim())
    .map((element) => element.textContent.trim())
    .filter((text) => ["Permissions", "General", "Composer", "Popout Window", "Notifications", "Toys"].includes(text));
  return {
    route: "settings/general",
    nativeViewport: { height: innerHeight, width: innerWidth },
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    verticalOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    content: metric(root),
    heading: metric([...document.querySelectorAll("h1")].find((element) => visible(element) && element.textContent?.trim() === "General")),
    cards,
    settingsNavigation: { count: settingsNav.length, width: settingsNav[0]?.getBoundingClientRect().width ?? null },
    sectionHeadings: sections,
    rowCount: [...document.querySelectorAll("div")].filter((element) => visible(element) && element.className?.toString().includes("min-w-0 text-default") && element.className?.toString().includes("text-sm font-medium")).length,
    menuCount: menus.length,
    toggleCount: toggles.length,
    toggleLabels: toggles.map((button) => button.getAttribute("aria-label")),
    selectedNavigation: document.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
  };
})()`);
socket.close();

if (
  capture?.route !== "settings/general" ||
  capture?.nativeViewport?.width !== 2560 ||
  capture?.nativeViewport?.height !== 1318 ||
  capture?.horizontalOverflow !== 0 ||
  capture?.verticalOverflow !== 0 ||
  capture?.content?.width !== 768 ||
  capture?.cards?.length !== 6 ||
  capture?.sectionHeadings?.length !== 6 ||
  capture?.toggleCount !== 13 ||
  capture?.menuCount !== 10 ||
  capture?.selectedNavigation !== "General"
) {
  throw new Error(`The isolated app is not on the expected current General state: ${JSON.stringify(capture)}`);
}

writeFileSync(
  output,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      baseline: fingerprint,
      isolation: {
        cdpAddress: "127.0.0.1",
        mainCodexProcessPreserved: true,
        mutationsSubmitted: false,
        captureMode: "native-viewport-only",
        profileKind: "unique-private-tmp-profile",
      },
      page: capture,
      evidenceBoundary: [
        "This is a current-build native-viewport observation only.",
        "It records public labels, counts, geometry, and overflow; no setting value was changed.",
        "The independent 1180x820 and 720x680 replay remains a renderer contract and does not promote installed-product pixels.",
      ],
      captureDigest: sha256(JSON.stringify(capture)),
    },
    null,
    2,
  )}\n`,
);
console.log(output);
