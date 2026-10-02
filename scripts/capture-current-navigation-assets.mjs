import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import { assertCurrentBaselineObservationRecord } from "./current-baseline-contract.mjs";
import { allowedSvgAttributes } from "./visual-asset-contract.mjs";
import {
  assertNavigationAssets, navigationCrop, navigationFingerprint, navigationHash,
  navigationLabels, navigationMaskDataUri, navigationWidths,
} from "./current-navigation-assets-contract.mjs";

const port = Number(process.env.CODEX_NAVIGATION_CDP_PORT);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const profile = realpathSync(process.env.CODEX_NAVIGATION_PROFILE ?? "");
assert.match(profile, /^\/private\/tmp\/codex-ui-kit-cdp\.[A-Za-z0-9]+$/);
assert.equal(process.env.CODEX_NAVIGATION_ORIGINAL_THEME, "System", "Declare the observed original preference, not merely its resolved color");
const baseline = JSON.parse(await readFile(new URL("../research/current-baseline-26.928.31416-candidate.json", import.meta.url), "utf8"));
assertCurrentBaselineObservationRecord(baseline, navigationFingerprint);
const owner = String(baseline.runtimeBundleIdentity.ownerPid);
const processInfo = pid => JSON.parse(execFileSync("/usr/bin/python3", [fileURLToPath(new URL("./read-macos-process-info.py", import.meta.url)), pid], { encoding: "utf8" }));
const argv = processInfo(owner);
assert.equal(argv.executablePath, "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT");
for (const argument of [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1"]) assert.equal(argv.argv.filter(value => value === argument).length, 1);
const ownerStart = Date.parse(execFileSync("/bin/ps", ["-p", owner, "-o", "lstart="], { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } }).trim());
assert.equal(ownerStart, baseline.runtimeBundleIdentity.processStartedAtMs, "Probe PID was recycled after the baseline capture");
const fields = execFileSync("/usr/sbin/lsof", ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"], { encoding: "utf8" }).trim().split("\n");
assert.ok(fields.includes(`p${owner}`));
for (const field of fields) {
  if (field.startsWith("n")) assert.equal(field, `n127.0.0.1:${port}`);
  if (!field.startsWith("p")) continue;
  let pid = field.slice(1);
  const seen = new Set();
  while (pid !== owner) {
    assert.ok(pid !== "1" && !seen.has(pid), "Unexpected CDP listener owner");
    seen.add(pid);
    pid = execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], { encoding: "utf8" }).trim();
  }
}
const bundleFile = "/Applications/ChatGPT.app/Contents/Resources/app.asar";
const bundleIdentity = async () => {
  const info = await stat(bundleFile);
  assert.equal(info.size, navigationFingerprint.appAsarBytes);
  assert.ok(info.ctimeMs < baseline.runtimeBundleIdentity.processStartedAtMs, "Probe predates the installed bundle");
  const sha = execFileSync("/usr/bin/shasum", ["-a", "256", bundleFile], { encoding: "utf8" }).split(/\s/)[0];
  assert.equal(sha, navigationFingerprint.appAsarSha256);
  return { bytes: info.size, sha256: sha, inode: info.ino, changedAtMs: info.ctimeMs };
};
const before = await bundleIdentity();
const output = new URL("../research/current-navigation-26.928.31416/", import.meta.url);
if (process.env.CODEX_NAVIGATION_FINALIZE_EXISTING === "1") {
  const recovered = JSON.parse(await readFile(`${profile}/navigation-unvalidated.json`, "utf8"));
  assertNavigationAssets(recovered);
  assert.equal(recovered.source.ownerPid, Number(owner));
  assert.deepEqual(recovered.source.after, before);
  for (const sample of recovered.samples) assert.equal(navigationHash(await readFile(new URL(sample.png, output))), sample.pngSha256);
  await writeFile(new URL("assets.json", output), `${JSON.stringify(recovered, null, 2)}\n`, { flag: "wx" });
  console.log("Finalized existing complete capture after validator repair; all 104 original PNG hashes verified, no capture restarted");
  process.exit(0);
}
await mkdir(output); // create-only: never overwrite a reviewed reference set
const record = {
  schemaVersion: 1, baseline: navigationFingerprint, crop: navigationCrop,
  source: { ownership: "OpenAI; exploratory reference, not MIT relicensed", originalThemePreference: "System", restoredThemePreference: null,
    capturedAt: new Date().toISOString(), ownerPid: Number(owner), processStartedAtMs: baseline.runtimeBundleIdentity.processStartedAtMs, before },
  styles: {}, samples: [],
};
const styleId = style => { const id = navigationHash(style); record.styles[id] = style; return id; };
const compactPrimitive = node => ({ tag: node.tag, attributes: node.attributes, styleId: styleId(node.computedStyle), ...(node.children ? { children: node.children.map(compactPrimitive) } : {}) });
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
assert.ok(browser.version().includes(navigationFingerprint.chromiumVersion));
const page = browser.contexts().flatMap(context => context.pages()).find(candidate => candidate.url() === "app://-/index.html");
assert.ok(page);
const originalViewport = page.viewportSize();
const openAppearance = async () => {
  if (await page.getByRole("radiogroup", { name: "Theme", exact: true }).count()) return;
  await page.getByRole("button", { name: "Open profile menu", exact: true }).click();
  await page.getByRole("menu", { name: "Open profile menu", exact: true }).getByText("Settings", { exact: true }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
};
const setTheme = async label => {
  await openAppearance();
  await page.getByRole("radio", { name: label, exact: true }).locator("..").click();
  assert.ok(await page.getByRole("radio", { name: label, exact: true }).isChecked());
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radiogroup", { name: "Theme", exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("navigation", { name: "App navigation", exact: true }).getByRole("button", { name: "Home", exact: true }).click();
  if (label !== "System") await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, label.toLowerCase());
};
try {
  await openAppearance();
  assert.ok(await page.getByRole("radio", { name: "System", exact: true }).isChecked(), "Declared original theme must match the observed preference");
  for (const theme of ["dark", "light"]) {
    await setTheme(theme === "dark" ? "Dark" : "Light");
    for (const width of navigationWidths) {
      const height = width === 1180 ? 820 : 680;
      await page.setViewportSize({ width, height });
      await page.waitForFunction(({width, height}) => innerWidth === width && innerHeight === height, {width, height});
      for (const state of ["rest", ...navigationLabels.map(label => `hover:${label}`), ...navigationLabels.map(label => `focus:${label}`)]) {
        await page.keyboard.press("Escape");
        await page.mouse.move(width - 2, height - 2);
        await page.evaluate(() => document.activeElement?.blur());
        const railLocator = page.getByRole("navigation", { name: "App navigation", exact: true });
        if (state.startsWith("hover:")) await railLocator.getByRole("button", { name: state.slice(6), exact: true }).hover();
        if (state.startsWith("focus:")) {
          const target = railLocator.getByRole("button", { name: state.slice(6), exact: true });
          await target.focus();
          await page.keyboard.press("Tab");
          await page.keyboard.press("Shift+Tab");
          assert.ok(await target.evaluate(e => e === document.activeElement && e.matches(":focus-visible")));
        }
        // Include the settled public tooltip state, not the context-dependent
        // initial/skip-delay phase shared by Radix triggers.
        await page.waitForTimeout(1250);
        const sample = await page.evaluate(({ labels, attributeNames }) => {
          const style = (e, pseudo = null) => Object.fromEntries([...getComputedStyle(e, pseudo)].filter(name => !name.startsWith("--")).sort().map(name => [name, getComputedStyle(e, pseudo).getPropertyValue(name)]));
          const rect = e => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
          const attributes = e => Object.fromEntries([...e.attributes].filter(a => attributeNames.includes(a.name.toLowerCase())).map(a => [a.name, a.value]));
          const primitive = e => ({ tag: e.tagName.toLowerCase(), attributes: attributes(e), computedStyle: style(e), ...(e.children.length ? { children: [...e.children].map(primitive) } : {}) });
          const rail = document.querySelector("nav");
          const buttons = [...rail.querySelectorAll("button")].filter(e => labels.includes(e.innerText.trim()));
          const items = buttons.map(e => {
            const svg = e.querySelector("svg");
            const common = { sourceClassName: svg.getAttribute("class"), rootAttributes: attributes(svg), rootComputedStyle: style(svg), renderSize: { width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height } };
            let icon;
            if (e.innerText.trim() === "Code Review") {
              const image = svg.querySelector("image");
              const href = image.getAttribute("href");
              if (!href.startsWith("data:image/svg+xml,")) throw new Error("Unexpected mask resource");
              const decoded = decodeURIComponent(href.slice("data:image/svg+xml,".length));
              const doc = new DOMParser().parseFromString(decoded, "image/svg+xml");
              if (doc.querySelector("parsererror")) throw new Error("Malformed embedded SVG");
              const maskNode = node => ({ tag: node.tagName, attributes: Object.fromEntries([...node.attributes].filter(a => a.name !== "xmlns").map(a => [a.name, a.value])), ...(node.children.length ? { children: [...node.children].map(maskNode) } : {}) });
              icon = { ...common, kind: "alpha-mask", maskType: svg.querySelector("mask").getAttribute("mask-type"), maskSvg: maskNode(doc.documentElement) };
            } else icon = { ...common, kind: "vector", viewBox: svg.getAttribute("viewBox"), primitives: [...svg.children].map(primitive) };
            return { label: e.innerText.trim(), rect: rect(e), computedStyle: style(e), beforeComputedStyle: style(e, "::before"), afterComputedStyle: style(e, "::after"), icon };
          });
          const separators = [...rail.querySelectorAll("*")].filter(e => {
            const r = e.getBoundingClientRect();
            return r.width === 24 && r.height === 1 && r.top === 272;
          });
          if (separators.length !== 1) throw new Error("Ambiguous public rail separator");
          const backdropColors = [];
          for (let ancestor = rail; ancestor; ancestor = ancestor.parentElement) {
            const color = getComputedStyle(ancestor).backgroundColor;
            if (color !== "rgba(0, 0, 0, 0)") backdropColors.unshift(color);
          }
          const tips = [...document.querySelectorAll('[role="tooltip"]')].filter(e => labels.includes(e.textContent.trim()) && e.checkVisibility());
          if (tips.length > 1) throw new Error("Ambiguous public navigation tooltip");
          const tooltip = tips.length ? { label: tips[0].textContent.trim(), rect: rect(tips[0]), computedStyle: style(tips[0]) } : null;
          return { theme: document.documentElement.dataset.theme, backdropColors, tooltip, railComputedStyle: style(rail), separatorComputedStyle: style(separators[0]), items };
        }, { labels: navigationLabels, attributeNames: [...allowedSvgAttributes] });
        assert.equal(sample.theme, theme);
        sample.railStyleId = styleId(sample.railComputedStyle); delete sample.railComputedStyle;
        sample.separatorStyleId = styleId(sample.separatorComputedStyle); delete sample.separatorComputedStyle;
        if (sample.tooltip) { sample.tooltip.styleId = styleId(sample.tooltip.computedStyle); delete sample.tooltip.computedStyle; }
        for (const item of sample.items) {
          item.styleId = styleId(item.computedStyle); delete item.computedStyle;
          item.beforeStyleId = styleId(item.beforeComputedStyle); delete item.beforeComputedStyle;
          item.afterStyleId = styleId(item.afterComputedStyle); delete item.afterComputedStyle;
          const icon = item.icon;
          icon.styleId = styleId(icon.rootComputedStyle); delete icon.rootComputedStyle;
          if (icon.kind === "alpha-mask") {
            icon.dataUri = navigationMaskDataUri(icon.maskSvg);
            icon.geometrySha256 = navigationHash(icon.maskSvg);
          } else {
            const geometry = node => ({ tag: node.tag, attributes: node.attributes, ...(node.children ? {children: node.children.map(geometry)} : {}) });
            icon.geometrySha256 = navigationHash({ rootAttributes: icon.rootAttributes, primitives: icon.primitives.map(geometry), viewBox: icon.viewBox });
            icon.primitives = icon.primitives.map(compactPrimitive);
          }
        }
        const png = `${theme}-${width}-${state === "rest" ? "rest" : `${state.split(":")[0]}-${navigationLabels.indexOf(state.split(":")[1])}`}.png`;
        const first = await page.screenshot({ clip: navigationCrop, animations: "disabled", caret: "hide" });
        await page.waitForTimeout(100);
        const second = await page.screenshot({ clip: navigationCrop, animations: "disabled", caret: "hide" });
        assert.equal(navigationHash(first), navigationHash(second), "Product crop must be stable before reference capture");
        await writeFile(new URL(png, output), first, { flag: "wx" });
        record.samples.push({ ...sample, width, height, state, png, pngSha256: navigationHash(first) });
      }
      console.log(`captured public navigation: ${theme} ${width}px, rest + 6 hover + 6 keyboard focus`);
    }
  }
} finally {
  try {
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1180, height: 820 });
    await setTheme("System");
    record.source.restoredThemePreference = "System";
    if (originalViewport) await page.setViewportSize(originalViewport);
  } finally { await browser.close(); }
}
record.source.after = await bundleIdentity();
assert.deepEqual(record.source.before, record.source.after);
// Preserve de-identified intermediate evidence if a protocol validator rejects
// a newly observed field. It is not a reviewed repository reference.
await writeFile(`${profile}/navigation-unvalidated.json`, `${JSON.stringify(record, null, 2)}\n`);
assertNavigationAssets(record);
await writeFile(new URL("assets.json", output), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
console.log("validated exact source paths, safe alpha mask, 104 stable product crops; original System preference restored");
