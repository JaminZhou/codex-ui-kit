import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";
import { navigationCrop } from "../../../scripts/current-navigation-assets-contract.mjs";
import { normalizeNavigationPng } from "../../../scripts/navigation-png-color.mjs";

const root = new URL("../../../", import.meta.url);
const playgroundRoot = new URL("../", import.meta.url);
process.chdir(fileURLToPath(playgroundRoot));

const version = "26.930.31730";
const width = 820;
const height = 680;
const referenceName = "light-820-hover-4.png";
const residualRegions = [
  { id: "explore-button", x: 8, y: 184, width: 36, height: 36 },
  { id: "explore-icon", x: 16, y: 192, width: 20, height: 20 },
  { id: "right-edge", x: 42, y: 0, width: 10, height: 280 },
  { id: "right-edge-outside-explore-row", x: 42, y: 0, width: 10, height: 280, exclude: { x: 8, y: 184, width: 36, height: 36 } },
  { id: "rail-interior", x: 0, y: 0, width: 42, height: 280 },
];
const requestedOutput = process.argv.find(argument => argument.startsWith("--output="))?.slice("--output=".length)
  ?? `navigation-card-and-style-ab-${version}.json`;
assert.match(requestedOutput, /^[a-z0-9.-]+\.json$/);
const output = new URL(`research/${requestedOutput}`, root);
const outputAlreadyExists = await access(output).then(() => true, error => {
  if (error.code === "ENOENT") return false;
  throw error;
});
assert.equal(outputAlreadyExists, false, `Output already exists: ${fileURLToPath(output)}; pass a unique --output=... name`);
const manifestUrl = new URL(`research/current-navigation-${version}/assets.json`, root);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const referenceSample = manifest.samples.find(sample => sample.png === referenceName);
assert.ok(referenceSample, `Missing reference sample ${referenceName}`);
assert.deepEqual(referenceSample.sharedCard.rect, { left: 52, top: 44, width: 764, height: 632 });
const exploreReference = referenceSample.items.find(item => item.label === "Explore");
assert.ok(exploreReference);

const scene = {
  currentSidebar: true,
  frame: "sidebar-current",
  id: "navigation-card-stacking-light-820-hover-explore",
  scenario: "streaming-recovery",
  sidebarState: "primary-navigation-current-26-930-31730",
  view: "shell",
  theme: "light",
};

function compare(expectedBytes, actualBytes) {
  const expected = PNG.sync.read(expectedBytes);
  const actual = PNG.sync.read(actualBytes);
  assert.deepEqual([actual.width, actual.height], [expected.width, expected.height]);
  let changedPixels = 0;
  let maximumChannelDelta = 0;
  let absoluteDelta = 0;
  const strip = { x: 42, width: 10, y: 0, height: expected.height };
  let edgeChangedPixels = 0;
  let edgeMaximumChannelDelta = 0;
  const edgePixelPairCounts = new Map();
  const changedPixelsByColumn = Array(expected.width).fill(0);
  const changedPixelsByRow = Array(expected.height).fill(0);
  const regionStats = residualRegions.map(region => ({
    ...region,
    pixelCount: 0,
    changedPixels: 0,
    maximumChannelDelta: 0,
    absoluteChannelDelta: 0,
  }));
  for (let y = 0; y < expected.height; y += 1) {
    for (let x = 0; x < expected.width; x += 1) {
      const offset = (y * expected.width + x) * 4;
      let pixelDelta = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        pixelDelta = Math.max(pixelDelta, Math.abs(expected.data[offset + channel] - actual.data[offset + channel]));
      }
      if (pixelDelta !== 0) {
        changedPixels += 1;
        changedPixelsByColumn[x] += 1;
        changedPixelsByRow[y] += 1;
      }
      maximumChannelDelta = Math.max(maximumChannelDelta, pixelDelta);
      absoluteDelta += pixelDelta;
      for (const region of regionStats) {
        const inBounds = x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
        const excluded = region.exclude
          && x >= region.exclude.x && x < region.exclude.x + region.exclude.width
          && y >= region.exclude.y && y < region.exclude.y + region.exclude.height;
        if (!inBounds || excluded) continue;
        region.pixelCount += 1;
        if (pixelDelta !== 0) region.changedPixels += 1;
        region.maximumChannelDelta = Math.max(region.maximumChannelDelta, pixelDelta);
        region.absoluteChannelDelta += pixelDelta;
      }
      if (x >= strip.x && x < strip.x + strip.width) {
        if (pixelDelta !== 0) edgeChangedPixels += 1;
        edgeMaximumChannelDelta = Math.max(edgeMaximumChannelDelta, pixelDelta);
        if (pixelDelta !== 0) {
          const expectedPixel = [...expected.data.subarray(offset, offset + 4)];
          const actualPixel = [...actual.data.subarray(offset, offset + 4)];
          const key = `${expectedPixel.join(",")} -> ${actualPixel.join(",")}`;
          edgePixelPairCounts.set(key, (edgePixelPairCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }
  const perceptualChangedPixels = pixelmatch(expected.data, actual.data, null, expected.width, expected.height, { threshold: 0.1 });
  const regionalResiduals = regionStats.map(({ absoluteChannelDelta, ...region }) => ({
    ...region,
    changedRatio: region.changedPixels / region.pixelCount,
    meanMaximumChannelDelta: absoluteChannelDelta / region.pixelCount,
  }));
  return {
    changedPixels,
    changedRatio: changedPixels / (expected.width * expected.height),
    perceptualChangedPixels,
    perceptualChangedRatio: perceptualChangedPixels / (expected.width * expected.height),
    maximumChannelDelta,
    meanMaximumChannelDelta: absoluteDelta / (expected.width * expected.height),
    shellEdgeStrip: {
      x: strip.x,
      width: strip.width,
      changedPixels: edgeChangedPixels,
      changedRatio: edgeChangedPixels / (strip.width * strip.height),
      maximumChannelDelta: edgeMaximumChannelDelta,
      mostCommonDifferingPixelPairs: [...edgePixelPairCounts]
        .map(([pair, count]) => ({ pair, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 8),
    },
    regionalResiduals,
    changedPixelsByColumn,
    changedPixelsByRow,
  };
}

const PAINT_LAYOUT_PROPERTIES = new Set([
  "align-content", "align-items", "align-self", "appearance", "aspect-ratio", "backdrop-filter", "box-sizing",
  "box-shadow", "clip-path", "color", "column-gap", "content", "display", "fill", "filter", "flex-basis",
  "flex-direction", "flex-grow", "flex-shrink", "font-family", "font-feature-settings", "font-kerning", "font-size",
  "font-stretch", "font-style", "font-synthesis", "font-synthesis-weight", "font-variant", "font-weight", "gap",
  "height", "isolation", "justify-content", "justify-items", "justify-self", "left", "letter-spacing", "line-height",
  "margin", "mask", "mask-image", "mask-position", "mask-repeat", "mask-size", "max-height", "max-width", "min-height",
  "min-width", "object-fit", "object-position", "opacity", "outline", "outline-color", "outline-offset", "outline-style",
  "outline-width", "overflow", "overflow-x", "overflow-y", "padding", "pointer-events", "position", "right", "row-gap",
  "shape-rendering", "stroke", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "stroke-width", "text-decoration",
  "text-decoration-color", "text-decoration-line", "text-decoration-style", "text-shadow", "text-transform", "top", "transform",
  "transform-origin", "vertical-align", "visibility", "white-space", "width", "will-change", "z-index", "-webkit-font-smoothing",
]);

const isPaintLayoutProperty = property => PAINT_LAYOUT_PROPERTIES.has(property)
  || property.startsWith("background-")
  || property.startsWith("border-")
  || property.startsWith("corner-")
  || property.startsWith("inset-");

const compareComputedStyle = (sourceStyleId, replayStyle) => {
  const sourceStyle = manifest.styles[sourceStyleId];
  const sourceProperties = Object.keys(sourceStyle).filter(isPaintLayoutProperty);
  const replayProperties = Object.keys(replayStyle).filter(isPaintLayoutProperty);
  const commonProperties = sourceProperties.filter(property => Object.hasOwn(replayStyle, property));
  const differences = commonProperties
    .filter(property => sourceStyle[property] !== replayStyle[property])
    .map(property => ({ property, source: sourceStyle[property], replay: replayStyle[property] }));
  return {
    sourceStyleId,
    comparedPropertyCount: commonProperties.length,
    exactPropertyCount: commonProperties.length - differences.length,
    differences,
    sourceOnlyProperties: sourceProperties.filter(property => !Object.hasOwn(replayStyle, property)),
    replayOnlyProperties: replayProperties.filter(property => !Object.hasOwn(sourceStyle, property)),
  };
};

const captureReplayPaintStyles = page => page.evaluate(() => {
  const read = (element, pseudo = null) => {
    const style = getComputedStyle(element, pseudo);
    return Object.fromEntries([...style].map(property => [property, style.getPropertyValue(property)]));
  };
  const rail = document.querySelector(".demo-current-primary-navigation-rail");
  const explore = rail?.querySelector('[data-current-navigation-asset="true"][aria-label="Explore"]');
  const card = document.querySelector("[data-current-navigation-shared-card]");
  if (!(rail instanceof HTMLElement) || !(explore instanceof HTMLElement) || !(card instanceof HTMLElement)) throw new Error("Expected replay paint elements not found");
  const toRect = element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  };
  const icon = explore.querySelector("svg");
  const ancestors = [];
  for (let parent = rail; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const rect = parent.getBoundingClientRect();
    ancestors.push({
      tag: parent.tagName.toLowerCase(),
      className: typeof parent.className === "string" ? parent.className : "",
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      paint: Object.fromEntries(["background-color", "background-image", "position", "z-index", "overflow", "isolation"].map(property => [property, style.getPropertyValue(property)])),
    });
  }
  return {
    bounds: {
      rail: toRect(rail),
      explore: toRect(explore),
      exploreIcon: icon instanceof SVGElement ? toRect(icon) : null,
      sharedCard: toRect(card),
    },
    rail: read(rail),
    explore: read(explore),
    exploreBefore: read(explore, "::before"),
    exploreAfter: read(explore, "::after"),
    sharedCard: read(card),
    ancestors,
  };
});

const expectedBytes = await readFile(new URL(referenceName, new URL(`research/current-navigation-${version}/`, root)));
const normalizedExpected = await normalizeNavigationPng(expectedBytes);
const { app, page } = await launchScene(scene, { capture: false, windowSize: { width, height } });
const results = [];
try {
  const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(window => window.getContentBounds()));
  assert.deepEqual(bounds.map(({ width: actualWidth, height: actualHeight }) => ({ width: actualWidth, height: actualHeight })), [{ width, height }]);
  const rail = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  await rail.waitFor();
  assert.equal(await rail.getAttribute("data-current-build"), version);
  await page.mouse.move(width - 2, height - 2);
  await page.getByRole("button", { name: "Explore", exact: true }).hover();
  await page.waitForTimeout(400);

  const card = page.locator("[data-current-navigation-shared-card]");
  const observed = await card.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const ancestors = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const computed = getComputedStyle(parent);
      ancestors.push({
        tag: parent.tagName.toLowerCase(),
        className: typeof parent.className === "string" ? parent.className : "",
        position: computed.position,
        zIndex: computed.zIndex,
        transform: computed.transform,
        contain: computed.contain,
        isolation: computed.isolation,
        overflow: computed.overflow,
      });
    }
    return {
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      position: style.position,
      zIndex: style.zIndex,
      boxShadow: style.boxShadow,
      ancestors,
    };
  });
  assert.deepEqual(observed.rect, referenceSample.sharedCard.rect);
  assert.equal(observed.boxShadow, manifest.styles[referenceSample.sharedCard.styleId]["box-shadow"]);
  const replayPaintStyles = await captureReplayPaintStyles(page);
  const computedStyleComparisons = {
    rail: compareComputedStyle(referenceSample.railStyleId, replayPaintStyles.rail),
    explore: compareComputedStyle(exploreReference.styleId, replayPaintStyles.explore),
    exploreBefore: compareComputedStyle(exploreReference.beforeStyleId, replayPaintStyles.exploreBefore),
    exploreAfter: compareComputedStyle(exploreReference.afterStyleId, replayPaintStyles.exploreAfter),
    sharedCard: compareComputedStyle(referenceSample.sharedCard.styleId, replayPaintStyles.sharedCard),
  };
  const capture = async id => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const bytes = await page.screenshot({ clip: navigationCrop, animations: "disabled", caret: "hide", omitBackground: true });
    const cardPlacement = await page.evaluate(() => {
      const card = document.querySelector("[data-current-navigation-shared-card]");
      const rect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      return {
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        position: style.position,
        zIndex: style.zIndex,
        parentClassName: card.parentElement?.className ?? "",
      };
    });
    results.push({ id, cardPlacement, ...compare(normalizedExpected, await normalizeNavigationPng(bytes)) });
  };
  await capture("current-card-nested-in-navigation-rail");

  const originalBackdropStyles = await page.evaluate(() => Object.fromEntries(
    ["html", "body", ".demo-root", ".demo-current-primary-navigation-rail"].map(selector => [selector, document.querySelector(selector)?.getAttribute("style") ?? null]),
  ));
  await page.evaluate(() => {
    document.documentElement.style.setProperty("background-color", "rgb(246, 246, 246)", "important");
    document.body.style.setProperty("background-color", "rgb(246, 246, 246)", "important");
    document.querySelector(".demo-root").style.setProperty("background-color", "color(srgb 0.964706 0.964706 0.964706 / 0.85)", "important");
    document.querySelector(".demo-current-primary-navigation-rail").style.setProperty("background", "transparent", "important");
  });
  await capture("source-like-root-backdrop-and-transparent-rail");
  await page.evaluate(styles => {
    for (const [selector, style] of Object.entries(styles)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }
  }, originalBackdropStyles);

  const originalOverflowStyles = await page.evaluate(() => {
    const selectors = [
      "html",
      "body",
      ".demo-root",
      ".codex-ui-app-shell",
      ".codex-ui-app-shell__layout",
      ".codex-ui-app-shell__navigation-rail",
      ".demo-current-primary-navigation-rail",
    ];
    return Object.fromEntries(selectors.map(selector => [selector, document.querySelector(selector)?.getAttribute("style") ?? null]));
  });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("html, body, .demo-root, .codex-ui-app-shell, .codex-ui-app-shell__layout, .codex-ui-app-shell__navigation-rail, .demo-current-primary-navigation-rail")) {
      element.style.setProperty("overflow", "visible", "important");
    }
  });
  await capture("source-like-visible-overflow-ancestors");
  await page.evaluate(styles => {
    for (const [selector, style] of Object.entries(styles)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }
  }, originalOverflowStyles);

  const originalCardInlineStyle = await card.getAttribute("style");
  await page.evaluate(() => {
    const element = document.querySelector("[data-current-navigation-shared-card]");
    if (!(element instanceof HTMLElement)) throw new Error("Card not found for shadow A/B");
    element.style.setProperty("box-shadow", "none", "important");
  });
  await capture("shared-card-shadow-disabled");
  for (const [id, boxShadow] of [
    ["shared-card-outline-shadow-only", "color(srgb 0.101961 0.109804 0.121569 / 0.04) 0px 0px 0px 0.5px"],
    ["shared-card-drop-shadow-only", "rgba(0, 0, 0, 0.05) 0px 4px 16px 0px"],
  ]) {
    await page.evaluate(value => {
      const element = document.querySelector("[data-current-navigation-shared-card]");
      if (!(element instanceof HTMLElement)) throw new Error("Card not found for shadow-layer A/B");
      element.style.setProperty("box-shadow", value, "important");
    }, boxShadow);
    await capture(id);
    await page.evaluate(style => {
      const element = document.querySelector("[data-current-navigation-shared-card]");
      if (!(element instanceof HTMLElement)) throw new Error("Card not found after shadow-layer A/B");
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }, originalCardInlineStyle);
  }
  await page.evaluate(style => {
    const element = document.querySelector("[data-current-navigation-shared-card]");
    if (!(element instanceof HTMLElement)) throw new Error("Card not found after shadow A/B");
    if (style === null) element.removeAttribute("style");
    else element.setAttribute("style", style);
  }, originalCardInlineStyle);

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    const nav = card?.closest("nav");
    if (!(card instanceof HTMLElement) || !(nav instanceof HTMLElement) || !nav.parentElement) throw new Error("Navigation paint host not found");
    nav.parentElement.insertBefore(card, nav);
  });
  await capture("card-sibling-before-navigation");

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    const nav = document.querySelector(".codex-ui-app-primary-navigation-rail");
    if (!(card instanceof HTMLElement) || !(nav instanceof HTMLElement) || !nav.parentElement) throw new Error("Navigation paint host not found");
    nav.parentElement.insertBefore(card, nav.nextSibling);
  });
  await capture("card-sibling-after-navigation");

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    const main = document.querySelector(".codex-ui-app-shell__main");
    if (!(card instanceof HTMLElement) || !(main instanceof HTMLElement)) throw new Error("Card or AppShell main slot not found");
    main.appendChild(card);
  });
  await capture("card-as-child-of-main-z-index-1");

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    if (!(card instanceof HTMLElement)) throw new Error("Card not found");
    document.body.appendChild(card);
  });
  await capture("card-as-body-child-root-auto-layer");

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    const shell = document.querySelector(".codex-ui-app-shell");
    const layout = shell?.querySelector(".codex-ui-app-shell__layout");
    if (!(card instanceof HTMLElement) || !(shell instanceof HTMLElement) || !(layout instanceof HTMLElement)) throw new Error("AppShell card host not found");
    card.style.position = "absolute";
    card.style.left = "52px";
    card.style.top = "44px";
    shell.insertBefore(card, layout);
  });
  await capture("source-absolute-card-under-appshell-layout");

  await page.evaluate(() => {
    const card = document.querySelector("[data-current-navigation-shared-card]");
    const shell = document.querySelector(".codex-ui-app-shell");
    if (!(card instanceof HTMLElement) || !(shell instanceof HTMLElement)) throw new Error("AppShell card host not found");
    shell.appendChild(card);
  });
  await capture("source-absolute-card-over-appshell-layout");

  const result = {
    schemaVersion: 1,
    purpose: "A/B the replay shared-card shadow, position, stacking parent/order, ancestor overflow, and recorded root-backdrop composition; compare focused source/replay paint-layout styles and localize crop residuals by named region, row, and column.",
    computedStyleComparisonScope: "Paint/layout properties only; excludes unrelated user-agent defaults and CSS custom properties.",
    source: {
      appVersion: version,
      sample: referenceName,
      viewport: { width, height },
      crop: navigationCrop,
      sha256: referenceSample.pngSha256,
      sourceCardStyleId: referenceSample.sharedCard.styleId,
      sourceCardBoxShadow: manifest.styles[referenceSample.sharedCard.styleId]["box-shadow"],
      bounds: {
        rail: referenceSample.paintStack[0].rect,
        explore: exploreReference.rect,
        exploreIconRenderSize: exploreReference.icon.renderSize,
        sharedCard: referenceSample.sharedCard.rect,
      },
    },
    replay: {
      electron: await app.evaluate(() => process.versions.electron),
      chromium: await app.evaluate(() => process.versions.chrome),
    },
    currentReplayCard: observed,
    currentReplayBounds: replayPaintStyles.bounds,
    computedStyleComparisons,
    replayAncestors: replayPaintStyles.ancestors,
    sourceBackdropColors: referenceSample.backdropColors,
    sourcePaintStack: referenceSample.paintStack.map(layer => ({
      tag: layer.tag,
      rect: layer.rect,
      styleId: layer.styleId,
      paint: Object.fromEntries(["background-color", "background-image", "position", "z-index", "overflow", "isolation"].map(property => [property, manifest.styles[layer.styleId][property] ?? ""])),
    })),
    results,
    interpretation: "Each capture changes only the card shadow, DOM parent/order/position, ancestor overflow, or backdrop owner. Regional and row/column histograms localize, but do not explain, strict-pixel residuals. The A/B can reject these replay-layer hypotheses for this sample; it does not prove the full product source DOM ancestry or generalize to other viewports/states.",
  };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({
    output: fileURLToPath(output),
    results: results.map(({ id, changedPixels, changedRatio, perceptualChangedPixels, maximumChannelDelta, meanMaximumChannelDelta, shellEdgeStrip, regionalResiduals }) => ({
      id,
      changedPixels,
      changedRatio,
      perceptualChangedPixels,
      maximumChannelDelta,
      meanMaximumChannelDelta,
      shellEdgeStrip,
      regionalResiduals,
    })),
  }, null, 2));
} finally {
  await app.close();
}
