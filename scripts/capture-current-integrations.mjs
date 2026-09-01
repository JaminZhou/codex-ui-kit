import { execFileSync } from "node:child_process";
import { realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { currentBaselineFingerprint } from "./current-baseline-contract.mjs";

// Capture-only. Open Plugins or Skills in an isolated current-build process
// before running this script. It samples only fixed catalog labels, geometry,
// and computed styles; private sidebar/project/task text is never returned.

const port = Number(process.env.CODEX_CURRENT_INTEGRATIONS_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_INTEGRATIONS_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_INTEGRATIONS_OUTPUT;
const kind = process.env.CODEX_CURRENT_INTEGRATIONS_KIND;
const allowCapture =
  process.env.CODEX_CURRENT_INTEGRATIONS_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated integrations CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated integrations profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute integrations capture output path.");
}
if (kind !== "plugins" && kind !== "skills") {
  throw new Error("CODEX_CURRENT_INTEGRATIONS_KIND must be plugins or skills.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_INTEGRATIONS_ALLOW_CAPTURE=1 to authorize read-only DOM sampling in the isolated app.",
  );
}

const profile = realpathSync(requestedProfile);
const output = resolve(requestedOutput);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The integrations profile must be isolated under /private/tmp.");
}
if (
  dirname(output) !== profile ||
  !basename(output).startsWith(`current-integrations-26-825-${kind}-`) ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "The output must be a current-integrations-26-825-<kind>-*.json direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const appAsarStat = statSync(appAsar);
const fingerprint = {
  appAsarBytes: appAsarStat.size,
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
  throw new Error("Every integrations CDP listener must be loopback-only.");
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
  throw new Error("The isolated integrations CDP owner is ambiguous.");
}

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
  (response) => response.json(),
);
const target = targets.find(
  (candidate) =>
    candidate.type === "page" && candidate.url === "app://-/index.html",
);
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

const expectedTitle = kind === "plugins" ? "Plugins" : "Skills";
const expectedDescription =
  kind === "plugins"
    ? "Work with Codex across your favorite tools"
    : "Extend Codex with task-specific skills";
const expression = `(() => {
  const visible = (element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const inViewport = (element) => {
    if (!visible(element)) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < innerHeight;
  };
  const exact = (text) =>
    [...document.querySelectorAll("*")].find(
      (element) =>
        element.childElementCount === 0 &&
        element.textContent?.trim() === text &&
        visible(element),
    );
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
  const style = (element) => {
    if (!(element instanceof Element)) return null;
    const value = getComputedStyle(element);
    return {
      border: value.border,
      borderRadius: value.borderRadius,
      color: value.color,
      fontFamily: value.fontFamily,
      fontSize: value.fontSize,
      fontWeight: value.fontWeight,
      lineHeight: value.lineHeight,
      padding: value.padding,
    };
  };
  const title = [...document.querySelectorAll("h1")].find(
    (element) =>
      element.textContent?.trim() === ${JSON.stringify(expectedTitle)} && visible(element),
  );
  const description = exact(${JSON.stringify(expectedDescription)});
  const search = [...document.querySelectorAll("input")].find(
    (input) => input.getAttribute("placeholder") === ${JSON.stringify(`Search ${kind}`)} && visible(input),
  );
  const searchFrame = search?.parentElement;
  const installed = exact("Installed");
  const body = installed?.closest("section")?.parentElement;
  const sections = [...(body?.querySelectorAll("section") ?? [])]
    .filter(inViewport)
    .map((section) => ({
      heading: [...section.querySelectorAll("h2")].find(visible)?.textContent?.trim() ?? null,
      rect: metric(section),
    }));
  const grids = [...(body?.querySelectorAll('[class*="grid-cols"]') ?? [])]
    .filter(inViewport)
    .map((grid) => ({
      columns: getComputedStyle(grid).gridTemplateColumns,
      rect: metric(grid),
    }));
  return {
    body: metric(body),
    description: description?.textContent?.trim() ?? null,
    descriptionRect: metric(description),
    grids,
    heading: metric(title),
    headingStyle: style(title),
    horizontalOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    installedHeading: metric(installed),
    itemTitles: [...(body?.querySelectorAll('[class*="font-medium"]') ?? [])]
      .filter(inViewport)
      .map((element) => element.textContent?.trim())
      .filter(Boolean),
    kind: ${JSON.stringify(kind)},
    search: metric(searchFrame),
    searchStyle: style(searchFrame),
    sections,
    title: title?.textContent?.trim() ?? null,
    viewport: { height: innerHeight, width: innerWidth },
  };
})()`;
const response = await call("Runtime.evaluate", {
  awaitPromise: true,
  expression,
  returnByValue: true,
});
socket.close();
if (response.error || response.result?.exceptionDetails) {
  throw new Error(`Current integrations capture failed: ${JSON.stringify(response)}`);
}
const capture = response.result?.result?.value;
if (
  capture?.title !== expectedTitle ||
  capture?.description !== expectedDescription ||
  !capture.search ||
  !capture.installedHeading ||
  Math.abs(capture.horizontalOverflow) > 1
) {
  throw new Error(
    `The isolated app is not on the expected ${kind} catalog state: ${JSON.stringify(capture)}`,
  );
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
        cdpPort: port,
        mainCodexProcessPreserved: true,
        ownerPid: Number(owners[0].pid),
        profileKind: "unique-private-tmp-profile",
      },
      catalog: capture,
    },
    null,
    2,
  )}\n`,
);
console.log(output);
