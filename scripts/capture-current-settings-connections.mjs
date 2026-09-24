import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentPreviousInstalledCandidateBaselineFingerprint,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only. This visits Settings → Connections in one isolated Renderer,
// reads public labels/geometry, and never changes a setting or starts pairing.
const port = Number(process.env.CODEX_CURRENT_SETTINGS_CONNECTIONS_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_SETTINGS_CONNECTIONS_PROFILE;
const requestedOutput = process.env.CODEX_CURRENT_SETTINGS_CONNECTIONS_OUTPUT;
const allowCapture =
  process.env.CODEX_CURRENT_SETTINGS_CONNECTIONS_ALLOW_CAPTURE === "1";
const requestedFingerprint =
  process.env.CODEX_CURRENT_SETTINGS_CONNECTIONS_FINGERPRINT;
const expectedFingerprint = currentPreviousInstalledCandidateBaselineFingerprint;
const appBundle = "/Applications/ChatGPT.app";
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const processInfoScript = fileURLToPath(
  new URL("./read-macos-process-info.py", import.meta.url),
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set an isolated loopback-only Settings Connections CDP port.");
}
if (!requestedProfile?.startsWith("/")) {
  throw new Error("Set the absolute isolated Settings Connections profile path.");
}
if (!requestedOutput?.startsWith("/")) {
  throw new Error("Set the absolute Settings Connections capture output path.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_SETTINGS_CONNECTIONS_ALLOW_CAPTURE=1 to authorize read-only Settings navigation.",
  );
}
if (requestedFingerprint !== expectedFingerprint.appVersion) {
  throw new Error("This capture is pinned to the 26.917.62051 candidate.");
}

const profile = realpathSync(requestedProfile);
const output = resolve(requestedOutput);
if (
  !profile.startsWith("/private/tmp/codex-ui-kit-cdp.") ||
  dirname(output) !== profile ||
  !basename(output).startsWith("current-settings-connections-26-917-") ||
  !basename(output).endsWith(".json")
) {
  throw new Error(
    "Use a unique isolated profile and place the capture directly inside it.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", `${appBundle}/Contents/Info.plist`], {
    encoding: "utf8",
  }).trim();
const readAppAsarSnapshot = () => {
  const before = statSync(appAsar);
  const bytes = readFileSync(appAsar);
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
    appAsarBytes: bytes.byteLength,
    appAsarSha256: sha256(bytes),
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
if (
  Object.entries(expectedFingerprint).some(
    ([key, expected]) => baseline[key] !== expected,
  )
) {
  throw new Error(
    `Installed fingerprint does not match 26.917.62051: ${JSON.stringify(baseline)}`,
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
  throw new Error("Every Settings Connections CDP listener must be loopback-only.");
}

const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync("/usr/bin/python3", [processInfoScript, pid], {
      encoding: "utf8",
    }),
  );
const valueFor = (argv, prefix) =>
  argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
const owners = listeners.filter(({ pid }) => {
  try {
    const info = readProcessInfo(pid);
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
  throw new Error("The isolated Settings Connections CDP owner is ambiguous.");
}
const ownerPid = owners[0].pid;
const ownerStart = execFileSync("/bin/ps", ["-p", ownerPid, "-o", "lstart="], {
  encoding: "utf8",
  env: { ...process.env, LC_ALL: "C" },
}).trim();
const startMatch = ownerStart.match(
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
);
if (!startMatch) throw new Error("Could not verify the isolated process start time.");
const month = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
].indexOf(startMatch[1]);
const processStartedAtMs = new Date(
  Number(startMatch[6]),
  month,
  Number(startMatch[2]),
  Number(startMatch[3]),
  Number(startMatch[4]),
  Number(startMatch[5]),
).getTime();
if (beforeCaptureBundle.changedAtMs > processStartedAtMs) {
  throw new Error("The isolated Renderer predates the installed app.asar candidate.");
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(
    pages.map(async (page, index) => {
      const metrics = await page.evaluate(() => {
        const visible = (element) =>
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        const visibleControls = [
          ...document.querySelectorAll('a, button, [role="button"], [role="tab"]'),
        ].filter((element) => visible(element)).length;
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
      return { index, page, url: page.url(), ...metrics };
    }),
  );
  const selected = selectCurrentMainCandidate(candidates);
  const page = selected.page;
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus(), undefined, {
    timeout: 15_000,
  });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(400);

  const connectionsHeading = page.getByRole("heading", {
    exact: true,
    name: "Connections",
  });
  if ((await connectionsHeading.count()) === 0) {
    const profileButton = page.getByRole("button", {
      exact: true,
      name: "Open profile menu",
    });
    if ((await profileButton.count()) !== 1) {
      throw new Error("The isolated profile menu trigger is not unique.");
    }
    if ((await profileButton.getAttribute("aria-expanded")) !== "true") {
      await profileButton.click();
    }
    await page.getByRole("menuitem", { name: /^Settings/ }).first().click();
    const connectionsNavigation = page.getByRole("button", {
      exact: true,
      name: "Connections",
    });
    await connectionsNavigation.waitFor({ state: "visible", timeout: 10_000 });
    await connectionsNavigation.click();
  }
  await connectionsHeading.waitFor({ state: "visible", timeout: 10_000 });

  const labels = ["Control this Mac", "Control other devices", "SSH"];
  const routes = [];
  for (const label of labels) {
    const tab = page.getByRole("button", { exact: true, name: label });
    if ((await tab.count()) !== 1) {
      throw new Error(`Expected one public Connections tab control named ${label}.`);
    }
    if ((await tab.getAttribute("aria-pressed")) !== "true") {
      await tab.click();
      await page.waitForFunction(
        (name) =>
          [...document.querySelectorAll("button")].some(
            (element) =>
              element.textContent?.trim() === name &&
              element.getAttribute("aria-pressed") === "true",
          ),
        label,
      );
    }
    await page.waitForTimeout(180);
    routes.push(
      await page.evaluate((tabLabel) => {
        const visible = (element) =>
          element instanceof HTMLElement &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        const metric = (element) => {
          const rect = element.getBoundingClientRect();
          return {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          };
        };
        const knownTabs = new Set([
          "Control this Mac",
          "Control other devices",
          "SSH",
        ]);
        const tabElements = [...document.querySelectorAll("button")].filter(
          (element) => visible(element) && knownTabs.has(element.textContent?.trim() ?? ""),
        );
        const heading = [...document.querySelectorAll("h1")].find(
          (element) => visible(element) && element.textContent?.trim() === "Connections",
        );
        const knownPublicLabels = new Set([
          "Control this Mac",
          "Control other devices",
          "SSH",
          "Devices that can control this Mac",
          "Allow connections",
          "Other settings",
          "Keep this Mac awake",
          "Devices you can control from this Mac",
          "Access and control other devices from this computer",
          "SSH connections from this Mac",
          "Connect to a remote device through SSH connection",
        ]);
        const publicText = [...document.querySelectorAll("*")]
          .filter(
            (element) =>
              visible(element) &&
              element.childElementCount === 0 &&
              knownPublicLabels.has(element.textContent?.trim() ?? ""),
          )
          .map((element) => element.textContent?.trim() ?? "")
          .filter(Boolean);
        const allowedControls = new Set(["Refresh", "Set up", "Add"]);
        const controls = Object.fromEntries(
          [...document.querySelectorAll("button")]
            .filter(visible)
            .map((button) => ({
              label:
                button.getAttribute("aria-label")?.trim() ||
                button.textContent?.trim() ||
                "",
              rect: metric(button),
            }))
            .filter((button) => allowedControls.has(button.label))
            .map((button) => [button.label, button.rect]),
        );
        const switches = [...document.querySelectorAll('[role="switch"]')]
          .filter(visible)
          .map((element) => {
            const label = element.getAttribute("aria-label")?.trim() ?? "";
            if (!new Set(["Allow connections", "Keep this Mac awake"]).has(label)) {
              return null;
            }
            return {
              label,
              rect: metric(element),
            };
          })
          .filter(Boolean);
        const routeMain = heading?.closest("main");
        const navigation = document.querySelector("nav");
        return {
          activeTab: tabLabel,
          heading: heading ? metric(heading) : null,
          horizontalOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          publicText: [...new Set(publicText)],
          shell: {
            main: routeMain ? metric(routeMain) : null,
            navigation: navigation ? metric(navigation) : null,
          },
          switches,
          tabs: tabElements.map((element) => ({
            label: element.textContent?.trim() ?? "",
            pressed: element.getAttribute("aria-pressed"),
            rect: metric(element),
            role: "button",
            selected: element.getAttribute("aria-pressed") === "true",
          })),
          controls,
        };
      }, label),
    );
    await page.waitForTimeout(180);
  }

  const viewport = await page.evaluate(() => ({
    devicePixelRatio,
    height: innerHeight,
    width: innerWidth,
  }));
  if (
    viewport.width !== 800 ||
    viewport.height !== 600 ||
    routes.length !== 3 ||
    routes.some(
      (route, index) =>
        route.activeTab !== labels[index] ||
        route.tabs.length !== 3 ||
        !route.tabs.some((tab) => tab.label === labels[index] && tab.selected) ||
        route.publicText.length === 0 ||
        route.horizontalOverflow !== 0,
    )
  ) {
    throw new Error(`The isolated Connections contract did not settle: ${JSON.stringify({ routes, viewport })}`);
  }

  const afterCaptureBundle = readAppAsarSnapshot();
  const identityFields = [
    "appAsarBytes", "appAsarSha256", "changedAtMs", "device", "inode",
  ];
  if (
    identityFields.some(
      (field) => beforeCaptureBundle[field] !== afterCaptureBundle[field],
    )
  ) {
    throw new Error("The installed app.asar changed during the Connections capture.");
  }
  const recordWithoutDigest = {
    baseline,
    capturedAt: new Date().toISOString(),
    captureKind: "renderer_emulation",
    evidenceBoundary: [
      "This is a read-only current-build Renderer observation at an emulated 800x600 viewport.",
      "Only public tab labels, approved public copy, controls, geometry, and overflow are retained.",
      "No switch was toggled; no pairing, SSH key exchange, credential entry, or connection mutation was started.",
      "No product screenshot or installed-product pixel comparison is included.",
    ],
    isolation: {
      cdpAddress: "127.0.0.1",
      cdpPort: port,
      mainCodexProcessPreserved: true,
      ownerPid: Number(ownerPid),
      profileKind: "unique-private-tmp-profile",
    },
    productPixelsPromoted: false,
    rendererViewport: viewport,
    runtimeBundleIdentity: {
      afterCapture: afterCaptureBundle,
      beforeCapture: beforeCaptureBundle,
      ownerPid: Number(ownerPid),
      processStartedAtMs,
    },
    routes: [
      {
        id: "settings.connections",
        observations: {
          connectionChanged: false,
          credentialsRecorded: false,
          horizontalOverflow: 0,
          pairingStarted: false,
          readOnly: true,
        },
        states: routes,
      },
    ],
    schemaVersion: 1,
    targetSelection: {
      selected: {
        area: selected.area,
        landmarks: selected.landmarks,
        url: selected.url,
        visibleControls: selected.visibleControls,
      },
    },
    viewport,
    shell: routes[0].shell,
  };
  const record = {
    ...recordWithoutDigest,
    captureDigest: sha256(JSON.stringify(recordWithoutDigest)),
  };
  writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${output}\n`);
} finally {
  await browser.close();
}
