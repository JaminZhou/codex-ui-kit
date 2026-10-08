import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { launchScene } from "./electron-harness.mjs";

const reference = JSON.parse(await readFile(new URL(
  "../../../research/current-home-composer-layout-26.930.61225.json", import.meta.url,
), "utf8"));
assert.equal(reference.baseline.appVersion, "26.930.61225");
assert.deepEqual(reference.samples.map(s => [s.theme, s.viewport.width]),
  ["dark", "light"].flatMap(theme => [1180, 820, 721, 720].map(width => [theme, width])));
const failures = [];
for (const sample of reference.samples) {
  const { width, height } = sample.viewport;
  const scene = {
    currentSidebar: true, frame: "home-current-26-930-61225",
    id: `home-geometry-61225-${sample.theme}-${width}`, scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-930-61225", theme: sample.theme,
    view: "shell",
  };
  const { app, page } = await launchScene(scene, {
    capture: false, windowSize: { width, height }, deviceScaleFactor: 1,
  });
  try {
    await page.waitForSelector('.demo-current-home-composer-26-930[data-current-build="26.930.61225"]');
    // The captured compact samples have the content sidebar closed; this is
    // an explicit state match, not evidence of an automatic resize transition.
    if (sample.main.rect.x === 52) {
      await page.getByRole("button", { name: "Hide sidebar", exact: true }).first().click();
    }
    const actual = await page.evaluate(() => {
      const node = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return { rect: { x, y, width, height }, styles: Object.fromEntries([
          "backgroundColor", "borderRadius", "boxShadow", "fontFamily", "fontSize",
          "fontWeight", "lineHeight", "opacity", "color",
        ].map(key => [key, computed[key]])), borderWidth: computed.borderWidth };
      };
      return {
        dpr: window.devicePixelRatio,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        main: node('.codex-ui-app-shell__main'),
        homeMark: node('.demo-current-home-composer-26-930__mark'),
        composerCard: node('.demo-current-home-composer-26-930__surface'),
        editor: node('.demo-current-home-composer-26-930__editor'),
        controls: Object.fromEntries(["add-resource", "dictation", "voice-chat"].map(id =>
          [id, node(`[data-home-composer-region="${id}"]`)])),
      };
    });
    const check = (condition, label) => { if (!condition) failures.push(`${sample.theme}-${width}: ${label}`); };
    check(actual.dpr === 1, `DPR ${actual.dpr}`);
    check(actual.overflow === sample.overflow, `overflow ${actual.overflow}`);
    for (const key of ["main", "homeMark", "composerCard", "editor"]) {
      check(!!actual[key], `${key} missing`);
      if (!actual[key]) continue;
      for (const dimension of ["x", "y", "width", "height"]) {
        const expected = sample[key].rect[dimension];
        const value = actual[key].rect[dimension];
        check(Math.abs(value - expected) <= 0.02, `${key}.${dimension}: ${value} vs ${expected}`);
      }
    }
    for (const control of sample.controls) {
      const node = actual.controls[control.id];
      check(!!node, `${control.id} missing`);
      if (!node) continue;
      for (const dimension of ["x", "y", "width", "height"]) {
        check(Math.abs(node.rect[dimension] - control.rect[dimension]) <= 0.02,
          `${control.id}.${dimension}: ${node.rect[dimension]} vs ${control.rect[dimension]}`);
      }
    }
    for (const key of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "color"]) {
      check(actual.editor?.styles[key] === sample.editor.styles[key], `editor.${key}`);
    }
    for (const key of ["backgroundColor", "borderRadius", "boxShadow"]) {
      check(actual.composerCard?.styles[key] === sample.composerCard.styles[key],
        `card.${key}: ${actual.composerCard?.styles[key]} vs ${sample.composerCard.styles[key]}`);
    }
    check(actual.composerCard?.borderWidth === "0px", "card paint must not add a layout border");
    check(actual.homeMark?.styles.opacity === sample.homeMark.styles.opacity, "mark.opacity");
  } finally {
    await app.close();
  }
}
assert.deepEqual(failures, [], `Current Home geometry/style drift:\n${failures.join("\n")}`);
console.log("Current 26.930.61225 empty Home geometry/styles passed in dark/light at four widths; no asset, lifecycle or pixel claim.");
