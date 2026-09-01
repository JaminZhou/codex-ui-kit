import { execFileSync } from "node:child_process";
import { realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { currentBaselineFingerprint } from "./current-baseline-contract.mjs";

// Capture-only. Prepare the isolated product in one of the documented states
// before running this script; it never drops files, submits a turn, or archives
// a task.

const port = Number(process.env.CODEX_CURRENT_ATTACHMENT_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_ATTACHMENT_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_ATTACHMENT_OUTPUT;
const state = process.env.CODEX_CURRENT_ATTACHMENT_STATE;
const allowCapture = process.env.CODEX_CURRENT_ATTACHMENT_ALLOW_CAPTURE === "1";
const allowedStates = new Set(["completed", "post-picker", "preview"]);
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated attachment CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated attachment profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute attachment capture output path.");
}
if (!allowedStates.has(state)) {
  throw new Error(
    "CODEX_CURRENT_ATTACHMENT_STATE must be post-picker, preview, or completed.",
  );
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_ATTACHMENT_ALLOW_CAPTURE=1 to authorize read-only DOM sampling in the isolated app.",
  );
}

const profile = realpathSync(requestedProfile);
const output = resolve(requestedOutput);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The attachment profile must be isolated under /private/tmp.");
}
if (
  dirname(output) !== profile ||
  !basename(output).startsWith("current-attachment-26-825-") ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "The output must be a current-attachment-26-825-*.json direct child of the isolated profile.",
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
  throw new Error("Every attachment CDP listener must be loopback-only.");
}
const processInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", pid],
      { encoding: "utf8" },
    ),
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
  throw new Error("The isolated attachment CDP owner is ambiguous.");
}

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
  (response) => response.json(),
);
const target = targets.find(
  (candidate) =>
    candidate.type === "page" && candidate.url.startsWith("app://-/index.html"),
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

const expression = `(() => {
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
  const visible = (element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  const button = (label) =>
    [...document.querySelectorAll("button")].find(
      (candidate) => candidate.getAttribute("aria-label") === label && visible(candidate),
    );
  const leaf = (text) =>
    [...document.querySelectorAll("*")].find(
      (candidate) => candidate.childElementCount === 0 && candidate.textContent?.trim() === text && visible(candidate),
    );
  const editor = [...document.querySelectorAll('textarea, [role="textbox"]')]
    .filter(visible)
    .at(-1);
  const composer = editor?.closest("form");
  const attachmentRoot = (label) =>
    button("Remove " + label)?.parentElement;
  const attachment = (label) => {
    const root = attachmentRoot(label);
    const style = root ? getComputedStyle(root) : null;
    const copy = root?.querySelector("[class*='copy']");
    const image = root?.querySelector("img");
    return root ? {
      image: rect(image),
      label,
      rect: rect(root),
      remove: rect(button("Remove " + label)),
      style: style ? {
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
      } : null,
      text: copy?.textContent?.trim() ?? null,
    } : null;
  };
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find(visible);
  const previewImage = dialog?.querySelector("img");
  const toolbarLabel = dialog
    ? [...dialog.querySelectorAll("span")].find((candidate) =>
        candidate.textContent?.trim().match(/^\\d+%$/),
      )
    : null;
  const toolbar = toolbarLabel?.parentElement;
  const reply = leaf("CURRENT ATTACHMENT SUCCESS 26.825.");
  return {
    activeLabel: document.activeElement?.getAttribute("aria-label") ?? null,
    attachments: [attachment("probe.png"), attachment("probe.txt")].filter(Boolean),
    composer: rect(composer),
    dialog: dialog ? {
      actions: ["Edit image", "Download image", "Close image preview"].map((label) => ({
        label,
        rect: rect(button(label)),
      })),
      image: rect(previewImage),
      rect: rect(dialog),
      toolbar: rect(toolbar),
      zoom: toolbarLabel?.textContent?.trim() ?? null,
    } : null,
    horizontalOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    reply: reply?.textContent?.trim() ?? null,
    state: ${JSON.stringify(state)},
    viewport: { height: innerHeight, width: innerWidth },
  };
})()`;
const response = await call("Runtime.evaluate", {
  expression,
  returnByValue: true,
});
socket.close();
if (response.result?.exceptionDetails) {
  throw new Error(
    response.result.exceptionDetails.exception?.description ??
      response.result.exceptionDetails.text,
  );
}
const observation = response.result.result.value;
if (observation.horizontalOverflow !== 0) {
  throw new Error(`Attachment capture overflowed: ${observation.horizontalOverflow}.`);
}
if (state === "post-picker" && observation.attachments.length !== 2) {
  throw new Error("The post-picker state must expose probe.png and probe.txt.");
}
if (
  state === "preview" &&
  (observation.dialog?.zoom == null || observation.activeLabel !== "Edit image")
) {
  throw new Error("The preview state must expose zoom and focus Edit image.");
}
if (
  state === "completed" &&
  observation.reply !== "CURRENT ATTACHMENT SUCCESS 26.825."
) {
  throw new Error("The completed state is missing the exact synthetic reply.");
}

writeFileSync(
  output,
  `${JSON.stringify(
    {
      baseline: fingerprint,
      capturedAt: new Date().toISOString(),
      observation,
      ownerPid: Number(owners[0].pid),
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
console.log(`Wrote ${output}`);
