import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "playwright-core";
import { launchScene } from "./electron-harness.mjs";
import { paintCalibrationCrop, paintCalibrationHtml, paintCalibrationPixels, assertSrgbPaintCalibration } from "../../../scripts/paint-calibration-contract.mjs";
import { currentObservationCandidateFingerprints } from "../../../scripts/current-baseline-contract.mjs";
import { navigationPngColorProfile } from "../../../scripts/navigation-png-color.mjs";

const args = {};
for (const argument of process.argv.slice(2)) {
  assert.match(argument, /^--[a-z-]+=.+$/);
  const [key, ...value] = argument.slice(2).split("=");
  assert.ok(!Object.hasOwn(args, key), `Duplicate argument --${key}`);
  args[key] = value.join("=");
}
for (const key of Object.keys(args)) assert.ok(["port", "profile", "owner-pid", "output", "paint-mode"].includes(key), `Unknown argument --${key}`);
const port = Number(args.port);
const ownerPid = args["owner-pid"];
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
assert.match(ownerPid ?? "", /^[1-9][0-9]*$/);
const paintMode = args["paint-mode"] ?? "rgba-control";
assert.ok(["rgba-control", "product-color-srgb", "product-navigation-wide-srgb"].includes(paintMode), `Unknown paint mode ${paintMode}`);
assert.ok(args.profile && args.output, "Usage: check-engine-paint-control.mjs --port=PORT --profile=DIR --owner-pid=PID --output=FILE [--paint-mode=rgba-control|product-color-srgb|product-navigation-wide-srgb]");
assert.ok(!isAbsolute(args.output), "--output must be a repository-relative path");
const root = await realpath(fileURLToPath(new URL("../../../", import.meta.url)));
const output = resolve(root, args.output);
const outputRelative = relative(root, output);
assert.ok(outputRelative && outputRelative !== ".." && !outputRelative.startsWith(`..${sep}`), "--output must stay inside the repository");
assert.ok(outputRelative.startsWith(`research${sep}`), "--output must be written under research/");
const playgroundRoot = await realpath(fileURLToPath(new URL("../", import.meta.url)));
process.chdir(playgroundRoot);
const isWideProductControl = paintMode === "product-navigation-wide-srgb";
const viewport = isWideProductControl ? { width: 820, height: 680 } : { width: 560, height: 360 };
const profile = await realpath(args.profile);
assert.match(profile, /^\/private\/tmp\/codex-ui-kit-cdp\.[A-Za-z0-9]+$/);
const fingerprint = currentObservationCandidateFingerprints["26.930.31730"];
const appBundle = "/Applications/ChatGPT.app";
const appExecutable = `${appBundle}/Contents/MacOS/ChatGPT`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const info = JSON.parse(execFileSync("/usr/bin/python3", [fileURLToPath(new URL("../../../scripts/read-macos-process-info.py", import.meta.url)), ownerPid], { encoding: "utf8" }));
assert.equal(info.executablePath, appExecutable);
for (const expected of [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--remote-debugging-address=127.0.0.1",
  "--force-color-profile=srgb",
]) assert.equal(info.argv.filter(argument => argument === expected).length, 1);
const listenerInfo = execFileSync("/usr/sbin/lsof", ["-nP", "-a", "-iTCP:" + port, "-sTCP:LISTEN", "-Fpn"], { encoding: "utf8" }).trim().split("\n");
const listenerPids = listenerInfo.filter(entry => entry.startsWith("p"));
const listenerAddresses = listenerInfo.filter(entry => entry.startsWith("n"));
assert.ok(listenerPids.includes(`p${ownerPid}`), "The isolated Codex app must own the CDP listener");
for (const entry of listenerPids) {
  let pid = entry.slice(1);
  const seen = new Set();
  while (pid !== ownerPid) {
    assert.ok(pid !== "1" && !seen.has(pid), "Every CDP listener process must descend from the isolated Codex PID");
    seen.add(pid);
    pid = execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], { encoding: "utf8" }).trim();
  }
}
assert.ok(listenerAddresses.length > 0);
assert.deepEqual([...new Set(listenerAddresses)], [`n127.0.0.1:${port}`], "The CDP listener must be loopback-only");
const asarHash = () => execFileSync("/usr/bin/shasum", ["-a", "256", appAsar], { encoding: "utf8" }).split(/\s/)[0];
const asarBefore = await stat(appAsar);
assert.equal(asarBefore.size, fingerprint.appAsarBytes);
assert.equal(asarHash(), fingerprint.appAsarSha256);

const fixture = (theme, state, mode) => {
  const light = theme === "light";
  const wide = mode === "product-navigation-wide-srgb";
  const observedColor = mode !== "rgba-control";
  const width = wide ? 820 : 560;
  const height = wide ? 680 : 360;
  const cardWidth = width - (wide ? 56 : 52);
  const cardHeight = height - (wide ? 48 : 44);
  const surface = observedColor ? (light ? "rgb(246,246,246)" : "rgb(20,20,20)") : (light ? "#f5f5f6" : "#202124");
  const railBackground = observedColor
    ? (light
      ? "linear-gradient(color(srgb 0.964706 0.964706 0.964706 / 0.85),color(srgb 0.964706 0.964706 0.964706 / 0.85)),linear-gradient(rgb(246,246,246),rgb(246,246,246)),linear-gradient(rgb(246,246,246),rgb(246,246,246))"
      : "linear-gradient(color(srgb 0.156863 0.156863 0.156863 / 0.8),color(srgb 0.156863 0.156863 0.156863 / 0.8)),linear-gradient(rgb(20,20,20),rgb(20,20,20)),linear-gradient(rgb(20,20,20),rgb(20,20,20))")
    : "transparent";
  const cardPaint = observedColor
    ? `border:0;box-shadow:${light
      ? "color(srgb 0.101961 0.109804 0.121569 / 0.04) 0px 0px 0px 0.5px, rgba(0,0,0,.05) 0px 4px 16px 0px"
      : "color(srgb 1 1 1 / 0.06) 0px 0px 0px 0.5px, rgba(0,0,0,.05) 0px 4px 16px 0px"}`
    : (light ? "border:.5px solid rgba(0,0,0,.08);box-shadow:0 4px 16px rgba(0,0,0,.08)" : "border:.5px solid rgba(255,255,255,.06);box-shadow:0 4px 16px rgba(0,0,0,.05)");
  const themePaint = light
    ? `.item{color:rgba(37,38,42,.72)}.item:hover,.item:focus-visible{background:rgba(0,0,0,.06);color:#17181b}.tooltip{background:#fff;color:#28292d;border-color:rgba(0,0,0,.12);box-shadow:0 4px 12px rgba(0,0,0,.18)}`
    : "";
  const labels = wide ? ["Home", "Space", "Scheduled", "Plugins", "Explore", "Code Review"] : ["Home", "Explore", "Code Review"];
  const activeLabel = wide ? "Explore" : "Home";
  const controls = labels.map(label => {
    const activeId = label === activeLabel ? "active-item" : `item-${label.toLowerCase().replaceAll(" ", "-")}`;
    const svg = label === "Home"
      ? `<path d="M3.5 9.1 10 3.8l6.5 5.3M5.5 8v8h9V8M8 16v-5h4v5"/>`
      : label === "Explore"
        ? `<circle cx="10" cy="10" r="6.5"/><path d="m12.7 7.3-1.6 3.8-3.8 1.6 1.6-3.8z"/>`
        : `<path d="M4 4.5h8l4 4v7H4zM12 4.5v4h4M7 12h6M7 14.5h4"/>`;
    const indicator = label === "Home" ? `<span class="dot"></span>` : "";
    const tooltip = label === "Home" ? `<span class="tooltip" role="tooltip">Home</span>` : "";
    return `<button id="${activeId}" class="item" aria-label="${label}" type="button"><svg viewBox="0 0 20 20" aria-hidden="true">${svg}</svg>${indicator}</button>${tooltip}`;
  }).join("");
  return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:-apple-system,system-ui,"Segoe UI",sans-serif}
body{background:${surface};color:${light ? "#25262a" : "#e6e7e9"}}#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${surface}}
.card{position:absolute;left:52px;top:44px;width:${cardWidth}px;height:${cardHeight}px;border-radius:12px;${cardPaint}}
.rail{position:absolute;z-index:1;left:0;top:44px;width:52px;height:${wide ? 632 : 132}px;padding:8px 8px 0;display:flex;flex-direction:column;gap:8px;background:${railBackground}}
.item{position:relative;width:36px;height:36px;border:0;border-radius:9px;padding:8px;color:rgba(236,237,239,.72);background:transparent;display:grid;place-items:center}
.item:hover{background:rgba(255,255,255,.08);color:#fff}.item:focus-visible{outline:2px solid #5b9cff;outline-offset:1px;background:rgba(255,255,255,.08)}
svg{width:20px;height:20px;overflow:visible}svg path,svg circle{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dot{position:absolute;left:22px;top:6px;width:8px;height:8px;border-radius:50%;background:#3a83f7}
.tooltip{display:none;position:absolute;z-index:3;left:52px;top:1px;min-width:116px;height:28px;padding:6px 9px;border-radius:8px;font-size:12px;line-height:16px;font-weight:500;white-space:nowrap;background:#303134;color:#f1f2f3;border:1px solid rgba(255,255,255,.1);box-shadow:0 4px 12px rgba(0,0,0,.24)}
.tooltip:before{content:"";position:absolute;left:-4px;top:9px;width:6px;height:6px;transform:rotate(45deg);background:inherit;border-left:inherit;border-bottom:inherit}
.item:hover+.tooltip,.item:focus-visible+.tooltip{display:block}
${themePaint}</style><div id="stage" data-theme="${theme}" data-state="${state}"><div class="card"></div><nav class="rail" aria-label="Independent paint control">${controls}</nav></div>`;
};

const captureCases = [
  { theme: "dark", state: "rest" }, { theme: "dark", state: "hover" }, { theme: "dark", state: "focus" },
  { theme: "light", state: "rest" }, { theme: "light", state: "hover" }, { theme: "light", state: "focus" },
];
const cases = captureCases.map(({ theme, state }) => ({ id: `${paintMode}-${theme}-${state}`, theme, state, paintMode }));
const regions = {
  glyph: { x: 8, y: isWideProductControl ? 228 : 52, width: 36, height: 36 },
  shellEdgeAndShadow: { x: 42, y: 44, width: 20, height: isWideProductControl ? 280 : 140 },
  tooltip: { x: 42, y: 48, width: 180, height: 52 },
  type: { x: 100, y: 48, width: 180, height: 60 },
};
const diffStats = (expected, actual, rect) => {
  const a = PNG.sync.read(expected), b = PNG.sync.read(actual);
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  const crop = image => {
    const data = Buffer.alloc(rect.width * rect.height * 4);
    for (let y = 0; y < rect.height; y++) {
      const start = ((rect.y + y) * image.width + rect.x) * 4;
      image.data.copy(data, y * rect.width * 4, start, start + rect.width * 4);
    }
    return data;
  };
  const first = rect ? crop(a) : a.data, second = rect ? crop(b) : b.data;
  const width = rect?.width ?? a.width, height = rect?.height ?? a.height;
  const diff = Buffer.alloc(width * height * 4);
  const changedPixels = pixelmatch(first, second, diff, width, height, { threshold: 0, includeAA: true });
  const perceptualPixels = pixelmatch(first, second, null, width, height, { threshold: 0.1 });
  let maximumChannelDelta = 0, absoluteChannelDelta = 0;
  for (let offset = 0; offset < first.length; offset += 4) {
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(first[offset + channel] - second[offset + channel]);
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      absoluteChannelDelta += delta;
    }
  }
  const totalPixels = width * height;
  return {
    changedPixels,
    changedRatio: changedPixels / totalPixels,
    perceptualChangedPixels: perceptualPixels,
    perceptualChangedRatio: perceptualPixels / totalPixels,
    maximumChannelDelta,
    meanAbsoluteChannelDelta: absoluteChannelDelta / (totalPixels * 4),
    totalPixels,
  };
};
const hashJson = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const computedStyleSnapshot = async page => page.evaluate(() => {
  const properties = [
    "display", "position", "box-sizing", "width", "height", "margin", "padding",
    "font-family", "font-size", "font-weight", "line-height", "color", "background-color",
    "border-top-width", "border-top-style", "border-top-color", "border-radius", "box-shadow",
    "outline-width", "outline-style", "outline-color", "opacity", "stroke", "stroke-width",
    "stroke-linecap", "stroke-linejoin", "fill",
  ];
  const elements = {
    body: "body", stage: "#stage", card: ".card", rail: ".rail", item: "#active-item",
    glyph: "#active-item svg", path: "#active-item svg path", indicator: ".dot", tooltip: '[role="tooltip"]',
  };
  return Object.fromEntries(Object.entries(elements).map(([name, selector]) => {
    const element = document.querySelector(selector);
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return [name, {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      styles: Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)])),
    }];
  }));
});
const computedStyleDifferences = (source, replay) => {
  const differences = [];
  for (const [element, sourceValue] of Object.entries(source)) {
    const replayValue = replay[element];
    if (!replayValue) {
      differences.push({ element, property: "missing", source: "present", replay: "absent" });
      continue;
    }
    for (const key of ["x", "y", "width", "height"]) {
      if (sourceValue.rect[key] !== replayValue.rect[key]) differences.push({ element, property: `rect.${key}`, source: sourceValue.rect[key], replay: replayValue.rect[key] });
    }
    for (const [property, sourceStyle] of Object.entries(sourceValue.styles)) {
      if (sourceStyle !== replayValue.styles[property]) differences.push({ element, property, source: sourceStyle, replay: replayValue.styles[property] });
    }
  }
  return differences;
};
const settle = async page => {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
};
const capture = async (page, testCase) => {
  await page.setContent(fixture(testCase.theme, testCase.state, testCase.paintMode));
  await settle(page);
  const activeItem = page.locator("#active-item");
  if (testCase.state === "hover") {
    await activeItem.hover();
    await page.waitForTimeout(350);
  } else if (testCase.state === "focus") {
    await page.mouse.move(viewport.width - 10, viewport.height - 10);
    const tabCount = isWideProductControl ? 5 : 1;
    for (let index = 0; index < tabCount; index += 1) await page.keyboard.press("Tab");
    assert.equal(await activeItem.evaluate(element => element === document.activeElement), true);
  } else {
    await page.mouse.move(viewport.width - 10, viewport.height - 10);
  }
  await settle(page);
  const tooltipVisible = await page.locator('[role="tooltip"]').evaluate(element => getComputedStyle(element).display !== "none");
  assert.equal(tooltipVisible, testCase.state !== "rest" && !isWideProductControl, `${testCase.id} tooltip state must match the fixture case`);
  const computed = await computedStyleSnapshot(page);
  const first = await page.screenshot({ clip: { x: 0, y: 0, ...viewport }, scale: "css", animations: "disabled" });
  const second = await page.screenshot({ clip: { x: 0, y: 0, ...viewport }, scale: "css", animations: "disabled" });
  assert.equal(navigationPngColorProfile(first), null, `${testCase.id} screenshot must be untagged`);
  assert.deepEqual([PNG.sync.read(first).width, PNG.sync.read(first).height], [viewport.width, viewport.height]);
  assert.equal(diffStats(first, second).changedPixels, 0, `${testCase.id} must be byte-stable within its engine`);
  return { png: first, computed };
};

const outputDir = await mkdtemp(join(tmpdir(), "ui-kit-engine-control-"));
let sourceBrowser, electronApp;
const isolatedProfileProcesses = () => {
  const crashpadExecutable = `${appBundle}/Contents/Frameworks/Codex Framework.framework/Versions/${fingerprint.chromiumVersion}/Helpers/browser_crashpad_handler`;
  return execFileSync("/bin/ps", ["-axo", "pid=,ppid=,command="], { encoding: "utf8" })
    .split("\n")
    .flatMap(line => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
      if (!match || line.includes("check-engine-paint-control.mjs")) return [];
      const [, pid, ppid, command] = match;
      const argv = command.split(/\s+/);
      if (argv.includes(`--user-data-dir=${profile}`)) return [{ pid: Number(pid), ppid: Number(ppid), kind: "profile-owner", command }];
      if (command.startsWith(`${crashpadExecutable} `) && argv.includes(`--database=${profile}/Crashpad`)) return [{ pid: Number(pid), ppid: Number(ppid), kind: "crashpad-helper", command }];
      return [];
    });
};
const stopIsolatedCodex = async () => {
  await sourceBrowser?.close().catch(() => {});
  try {
    process.kill(Number(ownerPid), 0);
    const stillOwned = JSON.parse(execFileSync("/usr/bin/python3", [fileURLToPath(new URL("../../../scripts/read-macos-process-info.py", import.meta.url)), ownerPid], { encoding: "utf8" }));
    assert.equal(stillOwned.executablePath, appExecutable, "Refusing to signal a recycled or unrelated PID");
    assert.ok(stillOwned.argv.includes(`--user-data-dir=${profile}`), "Refusing to signal a PID that no longer owns the isolated profile");
    assert.ok(stillOwned.argv.includes(`--remote-debugging-port=${port}`), "Refusing to signal a PID that no longer owns the isolated CDP port");
    process.kill(Number(ownerPid), "SIGTERM");
  } catch (error) { if (error.code !== "ESRCH") throw error; }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const processes = isolatedProfileProcesses();
    const helpers = processes.filter(process => process.kind === "crashpad-helper" && process.ppid === 1);
    for (const helper of helpers) {
      const stillExact = isolatedProfileProcesses().find(process => process.pid === helper.pid);
      if (!stillExact || stillExact.kind !== "crashpad-helper" || stillExact.ppid !== 1 || !stillExact.command.startsWith(`${appBundle}/Contents/Frameworks/Codex Framework.framework/Versions/${fingerprint.chromiumVersion}/Helpers/browser_crashpad_handler `)) continue;
      try { process.kill(helper.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    if (processes.length === 0) {
      const listeners = execFileSync("/usr/sbin/lsof", ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"], { encoding: "utf8" }).trim();
      assert.equal(listeners, "", "The isolated CDP listener must be gone after process cleanup");
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`The exact isolated Codex profile still has live processes after cleanup: ${JSON.stringify(isolatedProfileProcesses().map(({ pid, kind, ppid }) => ({ pid, kind, ppid })))}`);
};
try {
  sourceBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const sourceVersion = sourceBrowser.version();
  assert.ok(sourceVersion.includes(fingerprint.chromiumVersion), `Expected source Chromium ${fingerprint.chromiumVersion}; got ${sourceVersion}`);
  let sourceContext;
  const contextDeadline = Date.now() + 30_000;
  while (!sourceContext && Date.now() < contextDeadline) {
    sourceContext = sourceBrowser.contexts()[0];
    if (!sourceContext) await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(sourceContext, "The isolated app must expose its own browser context");
  let sourcePage;
  const targetDeadline = Date.now() + 30_000;
  while (!sourcePage && Date.now() < targetDeadline) {
    const mainRoutePages = sourceContext.pages().filter(page => page.url().startsWith("app://-/index.html"));
    const inspected = await Promise.all(mainRoutePages.map(async page => ({
      page,
      structure: await page.evaluate(() => ({
        href: location.href,
        title: document.title,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
        viewport: { width: innerWidth, height: innerHeight, area: innerWidth * innerHeight },
        landmarkCount: document.querySelectorAll("main,nav,[role=main],[role=navigation]").length,
        interactiveCount: document.querySelectorAll("button,[role=button],input,textarea,[tabindex]:not([tabindex='-1'])").length,
      })),
    })));
    const candidates = inspected.filter(({ structure }) => structure.viewport.width >= 720 && structure.viewport.height >= 600 && structure.landmarkCount > 0 && structure.interactiveCount > 0);
    const initialRouteCandidates = candidates.filter(({ structure }) => new URL(structure.href).searchParams.has("initialRoute"));
    const foregroundCandidates = candidates.filter(({ structure }) => structure.visibilityState === "visible" && structure.hasFocus);
    if (initialRouteCandidates.length === 1) sourcePage = initialRouteCandidates[0].page;
    else if (foregroundCandidates.length === 1) sourcePage = foregroundCandidates[0].page;
    else if (candidates.length === 1) sourcePage = candidates[0].page;
    else await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(sourcePage, "Select exactly one main app route using URL, viewport, and structural landmark/interaction counts; never attach the first CDP page");
  await sourcePage.goto("about:blank");
  const sourceDprSession = await sourceContext.newCDPSession(sourcePage);
  await sourceDprSession.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, screenWidth: viewport.width, screenHeight: viewport.height, deviceScaleFactor: 1, mobile: false });
  assert.equal(await sourcePage.evaluate(() => window.devicePixelRatio), 1);
  await sourcePage.setViewportSize(viewport);
  assert.equal(await sourcePage.evaluate(() => window.devicePixelRatio), 1);
  await sourcePage.setViewportSize({ width: 300, height: 200 });
  await sourcePage.setContent(paintCalibrationHtml);
  const sourceCalibrationImage = await sourcePage.screenshot({ clip: paintCalibrationCrop, scale: "css" });
  assert.equal(navigationPngColorProfile(sourceCalibrationImage), null, "Source calibration PNG must be untagged");
  const sourceCalibrationPixels = paintCalibrationPixels(PNG.sync.read(sourceCalibrationImage));
  assertSrgbPaintCalibration(PNG.sync.read(sourceCalibrationImage));
  await sourcePage.setViewportSize(viewport);
  assert.equal(await sourcePage.evaluate(() => window.devicePixelRatio), 1);
  const sourceCaptures = new Map();
  for (const testCase of cases) sourceCaptures.set(testCase.id, await capture(sourcePage, testCase));

  // Avoid competing native windows/process trees: finish the installed renderer
  // capture and close its exact isolated process before starting local Electron.
  await stopIsolatedCodex();
  sourceBrowser = undefined;

  const scene = { frame: "shell-restored", id: "current-engine-paint-control", scenario: "streaming-recovery", theme: "dark", view: "shell" };
  ({ app: electronApp } = await launchScene(scene, { capture: false, deviceScaleFactor: 1, windowSize: viewport }));
  const electronPage = electronApp.windows()[0];
  await electronPage.setViewportSize(viewport);
  assert.equal(await electronPage.evaluate(() => window.devicePixelRatio), 1);
  const electronInfo = await electronApp.evaluate(() => ({ electron: process.versions.electron, chromium: process.versions.chrome }));
  assert.ok(electronInfo.electron && electronInfo.chromium);
  await electronPage.setViewportSize({ width: 300, height: 200 });
  await electronPage.setContent(paintCalibrationHtml);
  const localCalibrationImage = await electronPage.screenshot({ clip: paintCalibrationCrop, scale: "css" });
  assert.equal(navigationPngColorProfile(localCalibrationImage), null, "Replay calibration PNG must be untagged");
  const localCalibrationPixels = paintCalibrationPixels(PNG.sync.read(localCalibrationImage));
  assertSrgbPaintCalibration(PNG.sync.read(localCalibrationImage));
  assert.deepEqual(localCalibrationPixels, sourceCalibrationPixels, "Source and replay sRGB alpha-composition controls must match exactly");
  await electronPage.setViewportSize(viewport);
  assert.equal(await electronPage.evaluate(() => window.devicePixelRatio), 1);
  const replayCaptures = new Map();
  for (const testCase of cases) replayCaptures.set(testCase.id, await capture(electronPage, testCase));

  const results = [];
  for (const testCase of cases) {
    const sourceCapture = sourceCaptures.get(testCase.id);
    const replayCapture = replayCaptures.get(testCase.id);
    const styleDifferences = computedStyleDifferences(sourceCapture.computed, replayCapture.computed);
    const computedStyleHashes = { source: hashJson(sourceCapture.computed), replay: hashJson(replayCapture.computed) };
    const sourcePng = sourceCapture.png;
    const localPng = replayCapture.png;
    const expected = PNG.sync.read(sourcePng), actual = PNG.sync.read(localPng);
    await writeFile(join(outputDir, `${testCase.id}-source.png`), sourcePng);
    await writeFile(join(outputDir, `${testCase.id}-electron.png`), localPng);
    results.push({
      id: testCase.id,
      computedStyleParity: styleDifferences.length === 0 ? "exact" : "different",
      computedStyleSha256: computedStyleHashes,
      computedStyles: sourceCapture.computed,
      computedStyleDifferences: styleDifferences,
      overall: diffStats(sourcePng, localPng),
      regions: Object.fromEntries(Object.entries(regions).map(([name, bounds]) => [name, diffStats(sourcePng, localPng, bounds)])),
      dimensions: { width: expected.width, height: expected.height },
      electronDimensions: { width: actual.width, height: actual.height },
    });
  }
  assert.equal(asarHash(), fingerprint.appAsarSha256, "Installed app package changed during control capture");
  const saved = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    purpose: "Measure cross-engine raster residual for the same independently authored shell paint fixture; this is not installed-product parity evidence.",
    source: {
      appVersion: fingerprint.appVersion,
      buildNumber: fingerprint.buildNumber,
      appAsarBytes: fingerprint.appAsarBytes,
      appAsarSha256: fingerprint.appAsarSha256,
      chromium: sourceVersion,
      deviceScaleFactor: 1,
      colorProfile: "forced sRGB; independent alpha-composition calibration passed",
      calibrationPixels: sourceCalibrationPixels,
    },
    replay: {
      electron: electronInfo.electron,
      chromium: electronInfo.chromium,
      deviceScaleFactor: 1,
      colorProfile: "forced sRGB; independent alpha-composition calibration passed",
      calibrationPixels: localCalibrationPixels,
    },
    fixture: {
      provenance: "project-authored HTML/CSS and generic inline SVG; no installed-app source or asset used",
      paintMode,
      sha256: createHash("sha256").update(cases.map(testCase => fixture(testCase.theme, testCase.state, testCase.paintMode)).join("\n")).digest("hex"),
      cases,
      regions,
    },
    calibrationParity: "exact",
    results,
  };
  await writeFile(output, `${JSON.stringify(saved, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ output, sourceChromium: sourceVersion, localElectron: electronInfo, cases: results }, null, 2));
} finally {
  await electronApp?.close().catch(() => {});
  try { await stopIsolatedCodex(); }
  finally { await rm(outputDir, { recursive: true, force: true }); }
}
