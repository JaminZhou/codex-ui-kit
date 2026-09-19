import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import { currentInstalledCandidateBaselineFingerprint } from "./current-baseline-contract.mjs";

// Capture-only. This samples the public Sites entry boundary in an isolated
// current-build process. It never creates, publishes, or edits a site.

const port = Number(process.env.CODEX_CURRENT_SITES_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_SITES_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_SITES_OUTPUT;
const viewportMode = process.env.CODEX_CURRENT_SITES_VIEWPORT ?? "native-wide";
const allowCapture = process.env.CODEX_CURRENT_SITES_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const expected = currentInstalledCandidateBaselineFingerprint;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated Sites CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated Sites profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute Sites capture output path.");
}
if (!['native-wide', 'emulated-compact'].includes(viewportMode)) {
  throw new Error("CODEX_CURRENT_SITES_VIEWPORT must be native-wide or emulated-compact.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_SITES_ALLOW_CAPTURE=1 to authorize read-only Sites sampling.",
  );
}

const profile = await realpath(requestedProfile);
const output = resolve(requestedOutput);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The Sites profile must be isolated under /private/tmp.");
}
if (
  dirname(output) !== profile ||
  !basename(output).startsWith("current-sites-26-915-") ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "The output must be a current-sites-26-915-* JSON file directly inside the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const before = await stat(appAsar);
const sha = execFileSync("/usr/bin/shasum", ["-a", "256", appAsar], {
  encoding: "utf8",
})
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
const fingerprint = {
  appAsarBytes: after.size,
  appAsarSha256: sha,
  appVersion: plistValue("CFBundleShortVersionString"),
  buildNumber: plistValue("CFBundleVersion"),
  chromiumVersion: plistValue("ChromiumBaseVersion"),
};
for (const [key, value] of Object.entries(expected)) {
  if (fingerprint[key] !== value) {
    throw new Error(`The installed fingerprint does not match 26.915: ${JSON.stringify(fingerprint)}`);
  }
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
  throw new Error("Every Sites CDP listener must be loopback-only.");
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
    return (
      info.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
      valueFor(info.argv, "--remote-debugging-address=") === "127.0.0.1" &&
      valueFor(info.argv, "--remote-debugging-port=") === String(port) &&
      realpathSync(valueFor(info.argv, "--user-data-dir=")) === profile
    );
  } catch {
    return false;
  }
});
if (owners.length !== 1) {
  throw new Error("The isolated Sites CDP owner is ambiguous.");
}

const visible = (element) =>
  element instanceof HTMLElement &&
  element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
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
    boxShadow: value.boxShadow,
  };
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter((page) => page.url() === "app://-/index.html");
  if (pages.length !== 1) throw new Error("Expected exactly one main Codex page.");
  const page = pages[0];
  page.setDefaultTimeout(15_000);
  await page.bringToFront();
  if (viewportMode === "emulated-compact") {
    await page.setViewportSize({ height: 680, width: 720 });
  }
  const add = page.getByLabel("Add files and more", { exact: true });
  await add.waitFor({ state: "visible" });
  await add.click({ force: true });
  await page.getByText("Sites", { exact: true }).last().click({ force: true });
  await page.getByText("Before you use Sites", { exact: true }).waitFor();
  const terms = await page.evaluate(({ rectSource, styleSource, visibleSource }) => {
    const rectFn = eval(`(${rectSource})`);
    const styleFn = eval(`(${styleSource})`);
    const visibleFn = eval(`(${visibleSource})`);
    const modal = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].find(visibleFn);
    const exact = (text) =>
      [...document.querySelectorAll("*")].find(
        (element) =>
          element.childElementCount === 0 &&
          element.textContent?.trim() === text &&
          visibleFn(element),
      );
    const continueButton = exact("Continue");
    return {
      modal: modal
        ? { rect: rectFn(modal), style: styleFn(modal), text: modal.innerText }
        : null,
      continue: continueButton
        ? { rect: rectFn(continueButton), style: styleFn(continueButton) }
        : null,
    };
  }, {
    rectSource: rect.toString(),
    styleSource: style.toString(),
    visibleSource: visible.toString(),
  });
  if (!terms.modal || !terms.continue) {
    throw new Error(`Sites terms surface was not captured: ${JSON.stringify(terms)}`);
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click({ force: true });
  const webview = page.locator('webview[src*="codex-pricing"]');
  await webview.waitFor({ state: "attached" });
  const pricing = await webview.evaluate((element) => ({
    rect: (() => {
      const value = element.getBoundingClientRect();
      return { height: value.height, left: value.left, top: value.top, width: value.width };
    })(),
    src: element.getAttribute("src"),
    style: (() => {
      const value = getComputedStyle(element);
      return {
        backgroundColor: value.backgroundColor,
        border: value.border,
        borderRadius: value.borderRadius,
        display: value.display,
      };
    })(),
  }));
  const result = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString().slice(0, 10),
    baseline: { ...fingerprint, theme: "dark" },
    isolation: {
      cdpAddress: "127.0.0.1",
      cdpPort: port,
      mainCodexProcessPreserved: true,
      profileKind: "unique-private-tmp-profile",
      captureMode: viewportMode,
    },
    entry: {
      action: "Add files and more → Sites",
      terms,
      pricing,
      backLabel: "Back to ChatGPT",
    },
    boundary: {
      readOnly: true,
      observed: "The current build presents Sites terms, then routes to an embedded pricing surface.",
      doesNotClaim: [
        "site creation or publishing",
        "visitor-submitted content handling",
        "pricing, entitlement, or billing state",
        "third-party site runtime behavior",
      ],
    },
  };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
