import { execFileSync } from "node:child_process";
import { realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { currentBaselineFingerprint } from "./current-baseline-contract.mjs";

// Capture-only. This script samples fixed Scheduled-task labels, counts,
// geometry, and computed styles in an isolated current-build process. It never
// returns task names, prompt text, chat names, or sidebar/project/task content.

const port = Number(process.env.CODEX_CURRENT_AUTOMATIONS_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_AUTOMATIONS_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_AUTOMATIONS_OUTPUT;
const allowCapture =
  process.env.CODEX_CURRENT_AUTOMATIONS_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated automations CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated automations profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute automations capture output path.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_AUTOMATIONS_ALLOW_CAPTURE=1 to authorize read-only DOM sampling in the isolated app.",
  );
}

const profile = realpathSync(requestedProfile);
const output = resolve(requestedOutput);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The automations profile must be isolated under /private/tmp.");
}
if (
  dirname(output) !== profile ||
  !basename(output).startsWith("current-automations-26-825-") ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "The output must be a current-automations-26-825-*.json direct child of the isolated profile.",
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
  throw new Error("Every automations CDP listener must be loopback-only.");
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
  throw new Error("The isolated automations CDP owner is ambiguous.");
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
const evaluate = async (expression) => {
  const response = await call("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (response.error || response.result?.exceptionDetails) {
    throw new Error(`Current automations capture failed: ${JSON.stringify(response)}`);
  }
  return response.result?.result?.value;
};

await evaluate(`(() => {
  const visible = (element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const scheduled = [...document.querySelectorAll("*")].find(
    (element) =>
      element.childElementCount === 0 &&
      element.textContent?.trim() === "Scheduled" &&
      visible(element),
  );
  const button = scheduled?.closest("button");
  if (!button) throw new Error("Scheduled navigation is unavailable.");
  button.click();
})()`);
await new Promise((resolveWait) => setTimeout(resolveWait, 700));

const capture = await evaluate(`(() => {
  const visible = (element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
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
      backgroundColor: value.backgroundColor,
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
    (element) => element.textContent?.trim() === "Scheduled tasks" && visible(element),
  );
  const description = exact(
    "Ask ChatGPT to schedule tasks, set reminders, or monitor for updates",
  );
  const search = [...document.querySelectorAll("input")].find(
    (input) =>
      input.getAttribute("placeholder") === "Search scheduled tasks" &&
      visible(input),
  );
  const filters = ["All", "Active", "Paused", "Completed"].map((label) => ({
    label,
    rect: metric(exact(label)?.closest("button")),
  }));
  const suggestionTitles = ["Daily brief", "Weekly review", "Follow-up monitor"];
  const suggestions = suggestionTitles.map((label) => {
    const title = exact(label);
    let owner = title?.parentElement;
    while (
      owner &&
      owner !== document.body &&
      owner.querySelectorAll("svg").length === 0
    ) {
      owner = owner.parentElement;
    }
    return {
      label,
      pathData: owner
        ? [...owner.querySelectorAll("svg path")]
            .map((path) => path.getAttribute("d"))
            .filter(Boolean)
        : [],
      present: Boolean(title),
    };
  });
  const taskRows = [...document.querySelectorAll("button")].filter(
    (button) =>
      ["Pause", "Resume"].includes(button.getAttribute("aria-label") ?? "") &&
      visible(button),
  );
  return {
    description: description?.textContent?.trim() ?? null,
    descriptionRect: metric(description),
    filters,
    heading: metric(title),
    headingStyle: style(title),
    horizontalOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    search: metric(search?.parentElement),
    searchStyle: style(search?.parentElement),
    suggestions,
    taskActionPathData: [...new Set(taskRows.flatMap((button) =>
      [...button.querySelectorAll("svg path")]
        .map((path) => path.getAttribute("d"))
        .filter(Boolean),
    ))],
    taskCount: taskRows.length,
    taskStatuses: taskRows.map((button) => button.getAttribute("aria-label")),
    title: title?.textContent?.trim() ?? null,
    viewport: { height: innerHeight, width: innerWidth },
  };
})()`);
socket.close();
if (
  capture?.title !== "Scheduled tasks" ||
  capture?.description !==
    "Ask ChatGPT to schedule tasks, set reminders, or monitor for updates" ||
  capture?.filters?.length !== 4 ||
  capture?.suggestions?.some(({ present }) => !present) ||
  !capture.search ||
  Math.abs(capture.horizontalOverflow) > 1
) {
  throw new Error(
    `The isolated app is not on the expected Scheduled state: ${JSON.stringify(capture)}`,
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
      scheduled: capture,
    },
    null,
    2,
  )}\n`,
);
console.log(output);
