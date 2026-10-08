import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import { PNG } from "../playgrounds/codex-app/node_modules/pngjs/lib/png.js";
import { navigationFingerprints } from "./current-navigation-assets-contract.mjs";
import { selectCurrentMainCandidate } from "./current-baseline-contract.mjs";
import { navigationPngColorProfile } from "./navigation-png-color.mjs";
import {
  assertSrgbPaintCalibration,
  paintCalibrationCrop,
  paintCalibrationHtml,
  paintCalibrationPixels,
} from "./paint-calibration-contract.mjs";

const version = "26.930.61225";
const fingerprint = navigationFingerprints[version];
assert.ok(fingerprint, `Missing fingerprint for ${version}`);

const port = Number(process.env.CODEX_CURRENT_SHELL_CDP_PORT);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const profile = realpathSync(process.env.CODEX_CURRENT_SHELL_PROFILE ?? "");
assert.match(profile, /^\/private\/tmp\/codex-ui-kit-cdp\.[A-Za-z0-9]+$/);
const owner = process.env.CODEX_CURRENT_SHELL_OWNER_PID ?? "";
assert.match(owner, /^[1-9][0-9]*$/);
const output = resolve(
  process.env.CODEX_CURRENT_SHELL_OUTPUT ?? `${profile}/shell-edge-${version}.png`,
);
assert.ok(output.startsWith(`${profile}/`), "Capture output must stay inside the exact probe profile");

const processInfo = JSON.parse(
  execFileSync(
    "/usr/bin/python3",
    [fileURLToPath(new URL("./read-macos-process-info.py", import.meta.url)), owner],
    { encoding: "utf8" },
  ),
);
assert.equal(
  processInfo.executablePath,
  "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT",
);
const requiredArguments = [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--remote-debugging-address=127.0.0.1",
  "--force-color-profile=srgb",
];
for (const argument of requiredArguments) {
  assert.equal(processInfo.argv.filter((value) => value === argument).length, 1);
}

const ownerStart = Date.parse(
  execFileSync("/bin/ps", ["-p", owner, "-o", "lstart="], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  }).trim(),
);
const appAsar = "/Applications/ChatGPT.app/Contents/Resources/app.asar";
const readBundleIdentity = async () => {
  const file = await stat(appAsar);
  assert.equal(file.size, fingerprint.appAsarBytes);
  assert.ok(file.ctimeMs < ownerStart, "The probe must have launched after the installed bundle was written");
  const sha256 = execFileSync("/usr/bin/shasum", ["-a", "256", appAsar], {
    encoding: "utf8",
  }).trim().split(/\s+/)[0];
  assert.equal(sha256, fingerprint.appAsarSha256);
  return { bytes: file.size, sha256 };
};

const listenerFields = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"],
  { encoding: "utf8" },
).trim().split("\n");
assert.ok(listenerFields.includes(`p${owner}`), "The exact Codex process must own the CDP listener");
for (const field of listenerFields) {
  if (field.startsWith("n")) assert.equal(field, `n127.0.0.1:${port}`);
  if (!field.startsWith("p")) continue;
  let pid = field.slice(1);
  const seen = new Set();
  while (pid !== owner) {
    assert.ok(pid !== "1" && !seen.has(pid), "Unexpected process owns the CDP listener");
    seen.add(pid);
    pid = execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], {
      encoding: "utf8",
    }).trim();
  }
}

const before = await readBundleIdentity();
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let selectedPage;
let originalViewport;
try {
  assert.ok(browser.version().includes(fingerprint.chromiumVersion));
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(
    pages.map(async (page) => {
      const url = page.url();
      const candidate = {
        page,
        url,
        area: 0,
        landmarks: { main: 0, nav: 0, sidebarTrigger: 0 },
        visibleControls: 0,
      };
      if (!url.startsWith("app://-/index.html")) return candidate;
      const structure = await page.evaluate(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 &&
            style.display !== "none" && style.visibility !== "hidden" &&
            Number(style.opacity) > 0;
        };
        const count = (selector) =>
          [...document.querySelectorAll(selector)].filter(visible).length;
        return {
          width: innerWidth,
          height: innerHeight,
          landmarks: {
            main: count("main"),
            nav: count("nav"),
            sidebarTrigger: count('[aria-label*="sidebar" i], [data-testid*="sidebar" i]'),
          },
          visibleControls: count("button, input, textarea, [role=button], [role=combobox]"),
        };
      });
      return { ...candidate, ...structure, area: structure.width * structure.height };
    }),
  );
  const selected = selectCurrentMainCandidate(candidates);
  selectedPage = selected.page;
  originalViewport = selectedPage.viewportSize();
  await selectedPage.setViewportSize({ width: 1180, height: 820 });
  await selectedPage.waitForFunction(
    () => innerWidth === 1180 && innerHeight === 820,
  );
  await selectedPage.evaluate(() => document.fonts.ready);

  const calibrationPage = await selectedPage.context().newPage();
  let calibration;
  try {
    await calibrationPage.setViewportSize({ width: 300, height: 200 });
    await calibrationPage.setContent(paintCalibrationHtml);
    const bytes = await calibrationPage.screenshot({ clip: paintCalibrationCrop });
    assert.equal(navigationPngColorProfile(bytes), null);
    const png = PNG.sync.read(bytes);
    assertSrgbPaintCalibration(png);
    calibration = { kind: "independent-css-alpha-composition", pixels: paintCalibrationPixels(png) };
  } finally {
    await calibrationPage.close();
  }

  await selectedPage.mouse.move(1178, 818);
  await selectedPage.waitForTimeout(400);
  const observation = await selectedPage.evaluate(() => {
    const main = document.querySelector("main");
    const rect = main?.getBoundingClientRect();
    const style = main && getComputedStyle(main);
    const visible = (element) => {
      const r = element.getBoundingClientRect();
      const s = getComputedStyle(element);
      return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      theme: document.documentElement.getAttribute("data-theme"),
      visibleMainCount: [...document.querySelectorAll("main")].filter(visible).length,
      visibleOverlayCount: [...document.querySelectorAll('[role="dialog"], [role="menu"]')].filter(visible).length,
      main: rect && style ? {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        background: style.backgroundColor,
        boxShadow: style.boxShadow,
        borderLeft: style.borderLeft,
      } : null,
    };
  });
  assert.deepEqual(observation.viewport, { width: 1180, height: 820, deviceScaleFactor: 1 });
  assert.equal(observation.theme, "dark");
  assert.equal(observation.visibleMainCount, 1);
  assert.equal(observation.visibleOverlayCount, 0);
  assert.deepEqual(observation.main, {
    x: 321.875,
    y: 44,
    width: 854.125,
    height: 772,
    background: "rgb(24, 24, 24)",
    boxShadow: "none",
    borderLeft: "1px solid rgba(255, 255, 255, 0.082)",
  });

  const pngBytes = await selectedPage.screenshot({
    clip: { x: 321, y: 120, width: 16, height: 640 },
    animations: "disabled",
    caret: "hide",
    omitBackground: true,
  });
  assert.equal(navigationPngColorProfile(pngBytes), null);
  await writeFile(output, pngBytes, { flag: "wx" });
  assert.deepEqual(await readBundleIdentity(), before, "Installed package changed during capture");
  console.log(JSON.stringify({
    version,
    buildNumber: fingerprint.buildNumber,
    chromiumVersion: fingerprint.chromiumVersion,
    rendererViewport: observation.viewport,
    resolvedTheme: observation.theme,
    main: observation.main,
    crop: { x: 321, y: 120, width: 16, height: 640 },
    screenshotSha256: createHash("sha256").update(pngBytes).digest("hex"),
    screenshotBytes: pngBytes.length,
    colorProfileMode: "forced-srgb-with-independent-calibration",
    pngColorProfile: null,
    calibration,
    outputName: basename(output),
  }));
} finally {
  if (selectedPage && originalViewport) {
    await selectedPage.setViewportSize(originalViewport).catch(() => {});
  }
  await browser.close();
}
