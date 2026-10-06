import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene } from "./electron-harness.mjs";

const requireLocalReferenceAssets = process.argv.includes(
  "--require-local-reference-assets",
);
const capturePreview = process.argv.includes("--capture-preview");
assert.ok(
  process.argv.slice(2).every((argument) =>
    ["--require-local-reference-assets", "--capture-preview"].includes(argument),
  ),
  "Supported options: --require-local-reference-assets and --capture-preview",
);
assert.ok(
  !capturePreview || requireLocalReferenceAssets,
  "a screenshot preview requires all local reference SVG candidates",
);

const reference = JSON.parse(
  await readFile(
    new URL(
      "../../../research/current-home-composer-layout-26.930.31730.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const liveViewportObservation = JSON.parse(
  await readFile(
    new URL(
      "../../../research/current-home-composer-live-viewport-26.930.31730.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const localReferenceBuildPath = new URL(
  "../dist/local-reference-assets/26.930.31730/",
  import.meta.url,
);
const lifecycleTransitionWait = { polling: "raf", timeout: 5_000 };

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function assertNear(actual, expected, label, tolerance = 0.02) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}px, received ${actual}px (tolerance ${tolerance}px)`,
  );
}

const scene = {
  currentSidebar: true,
  frame: "sidebar-current",
  id: "current-home-composer-26-930-dark-1180",
  scenario: "streaming-recovery",
  sidebarState: "primary-navigation-current-26-930-31730",
  theme: "dark",
  view: "shell",
  width: 1180,
  height: 820,
};

const { app, page } = await launchScene(scene, {
  capture: false,
  windowSize: { height: scene.height, width: scene.width },
});

async function waitForLocalReferenceAssets(targetPage) {
  await targetPage.waitForFunction(
    () =>
      [...document.querySelectorAll("[data-local-reference-asset]")].every(
        (element) =>
          element.getAttribute("data-local-reference-load-state") !== "pending",
      ),
    undefined,
    { timeout: 8_000 },
  );
  const assets = await targetPage
    .locator("[data-local-reference-asset]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        fileName: element.getAttribute("data-local-reference-asset"),
        state: element.getAttribute("data-local-reference-load-state"),
      })),
    );
  assert.equal(assets.length, 5);
  assert.ok(
    assets.every((asset) => asset.state === "loaded" || asset.state === "missing"),
    "each optional local reference asset must resolve or fall back before measurement",
  );
  assert.equal(
    new Set(assets.map((asset) => asset.state)).size,
    1,
    "partial local reference extraction must not silently mix reference and placeholder glyphs",
  );
  if (requireLocalReferenceAssets) {
    assert.ok(
      assets.every((asset) => asset.state === "loaded"),
      "the local-reference acceptance mode requires all extracted SVG candidates to load",
    );
  }
  return assets;
}

try {
  await page.waitForSelector(
    '.demo-root[data-current-home-composer-26-930="true"] .demo-current-home-composer-26-930[data-current-build="26.930.31730"]',
  );
  const localReferenceAssets = await waitForLocalReferenceAssets(page);
  if (!requireLocalReferenceAssets) {
    assert.ok(
      localReferenceAssets.every((asset) => asset.state === "missing"),
      "ordinary renderer builds must not expose local-only reference SVGs",
    );
    assert.equal(
      await pathExists(localReferenceBuildPath),
      false,
      "ordinary renderer builds must not contain installed-app reference bytes",
    );
  }
  const native = await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    return { bounds: windows[0]?.getContentBounds(), count: windows.length };
  });
  assert.equal(native.count, 1);
  assert.equal(native.bounds.width, scene.width);
  assert.equal(native.bounds.height, scene.height);

  const actual = await page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value
        ? {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          }
        : null;
    };
    const region = (name) =>
      rect(document.querySelector(`[data-home-composer-region="${name}"]`));
    const root = document.querySelector(
      ".demo-current-home-composer-26-930",
    );
    const title = document.querySelector(
      ".demo-current-home-composer-26-930__title",
    );
    const editor = document.querySelector(
      ".demo-current-home-composer-26-930__editor",
    );
    const card = document.querySelector(
      ".demo-current-home-composer-26-930__surface",
    );
    const mark = document.querySelector(
      ".demo-current-home-composer-26-930__mark",
    );
    const markVector = mark?.querySelector(
      'svg[data-current-build-icon="home-mark"]',
    );
    const styles = (element) => {
      const value = getComputedStyle(element);
      return {
        backgroundColor: value.backgroundColor,
        borderRadius: value.borderRadius,
        color: value.color,
        fontFamily: value.fontFamily,
        fontSize: value.fontSize,
        fontWeight: value.fontWeight,
        lineHeight: value.lineHeight,
        textAlign: value.textAlign,
      };
    };

    return {
      actions: Object.fromEntries(
        [
          "add-resource",
          "permission",
          "model-picker",
          "dictation",
          "voice-chat",
        ].map((name) => [name, region(name)]),
      ),
      card: rect(card),
      cardStyle: styles(card),
      context: {
        location: region("location-context"),
        project: region("project-context"),
        toggle: region("context-toggle"),
      },
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      editor: rect(editor),
      editorContent: editor.textContent,
      editorEditable: editor.getAttribute("contenteditable"),
      editorStyle: styles(editor),
      main: rect(document.querySelector(".codex-ui-app-shell__main")),
      mark: rect(mark),
      markAssetStatus: mark.getAttribute("data-asset-status"),
      markVector: markVector
        ? {
            pathCount: markVector.querySelectorAll("path").length,
            viewBox: markVector.getAttribute("viewBox"),
          }
        : null,
      localReferenceAssets: [...document.querySelectorAll("[data-local-reference-asset]")].map((element) => ({
        fileName: element.getAttribute("data-local-reference-asset"),
        state: element.getAttribute("data-local-reference-load-state"),
      })),
      rootBuild: root.getAttribute("data-current-build"),
      rootCopyStatus: root.getAttribute("data-copy-status"),
      rootSceneStatus: root.getAttribute("data-scene-status"),
      title: rect(title),
      titleCenter:
        title.getBoundingClientRect().left +
        title.getBoundingClientRect().width / 2,
      titleStyle: styles(title),
      theme: document.querySelector(".demo-root")?.getAttribute("data-theme"),
      visualAssetStatus: root.getAttribute("data-visual-asset-status"),
    };
  });

  const nearRect = (actualRect, expectedRect, label) => {
    assert.ok(actualRect, `${label}: element must exist`);
    for (const key of ["left", "top", "width", "height"]) {
      assertNear(actualRect[key], expectedRect[key], `${label}.${key}`);
    }
  };

  assert.equal(actual.rootBuild, reference.baseline.appVersion);
  assert.equal(actual.theme, reference.capture.theme);
  assert.equal(actual.rootCopyStatus, "synthetic");
  assert.equal(
    actual.rootSceneStatus,
    "observed-geometry-home-mark-path-match-remaining-assets-and-product-pixels-unverified",
  );
  assert.equal(
    actual.visualAssetStatus,
    "home-mark-reuses-existing-four-path-match; five-optional-local-candidates-remain; tint-and-product-pixels-unverified",
  );
  assert.equal(
    actual.markAssetStatus,
    "existing-home-mark-four-path-match; tint-and-product-pixels-unverified",
  );
  assert.deepEqual(actual.markVector, {
    pathCount: liveViewportObservation.layout.home.mark.pathCount,
    viewBox: liveViewportObservation.layout.home.mark.viewBox,
  });
  assert.deepEqual(actual.localReferenceAssets, localReferenceAssets);
  assert.equal(actual.documentOverflow, reference.main.horizontalOverflow);
  assert.equal(actual.editorEditable, "true");
  assert.equal(actual.editorContent, "");
  if (capturePreview) {
    const previewDirectory = await mkdtemp(
      join(tmpdir(), "codex-ui-kit-home-26.930-reference-preview-"),
    );
    const previewPath = join(previewDirectory, "home-composer.png");
    await page.screenshot({ path: previewPath, animations: "disabled" });
    console.log(`local-only Home/Composer preview: ${previewPath}`);
  }

  nearRect(actual.main, reference.main.rect, "main");
  nearRect(actual.mark, reference.centerMark.rect, "home mark");
  nearRect(actual.card, reference.composer.card.rect, "composer card");
  nearRect(actual.editor, reference.composer.editor.rect, "composer editor");
  nearRect(
    actual.context.project,
    reference.composer.contextControls[0].rect,
    "project context",
  );
  nearRect(
    actual.context.location,
    reference.composer.contextControls[1].rect,
    "location context",
  );
  nearRect(
    actual.context.toggle,
    reference.composer.contextControls[2].rect,
    "context toggle",
  );
  for (const action of reference.composer.actions) {
    nearRect(actual.actions[action.kind], action.rect, action.kind);
  }

  assertNear(actual.title.top, reference.centerTextBlock.rect.top, "title.top");
  assertNear(
    actual.titleCenter - (actual.main.left + actual.main.width / 2),
    0.5,
    "title horizontal center offset",
  );
  assertNear(
    actual.title.height,
    reference.centerTextBlock.rect.height,
    "title.height",
  );
  assert.equal(actual.titleStyle.fontSize, reference.centerTextBlock.style.fontSize);
  assert.equal(actual.titleStyle.fontWeight, reference.centerTextBlock.style.fontWeight);
  assert.equal(actual.titleStyle.lineHeight, reference.centerTextBlock.style.lineHeight);
  assert.equal(actual.titleStyle.fontFamily, reference.centerTextBlock.style.fontFamily);
  assert.equal(actual.titleStyle.color, reference.centerTextBlock.style.color);
  assert.equal(actual.titleStyle.textAlign, reference.centerTextBlock.style.textAlign);
  assert.equal(
    actual.editorStyle.fontFamily,
    reference.composer.editor.style.fontFamily,
  );
  assert.equal(
    actual.editorStyle.color,
    reference.composer.editor.style.color,
  );
  assert.equal(
    actual.editorStyle.fontSize,
    reference.composer.editor.style.fontSize,
  );
  assert.equal(
    actual.editorStyle.fontWeight,
    reference.composer.editor.style.fontWeight,
  );
  assert.equal(
    actual.editorStyle.lineHeight,
    reference.composer.editor.style.lineHeight,
  );
  assert.equal(
    actual.cardStyle.backgroundColor,
    reference.composer.card.backgroundColor,
  );
  assert.equal(actual.cardStyle.borderRadius, reference.composer.card.borderRadius);

  console.log(
    `${scene.id}: 26.930 Home/Composer measured geometry/styles passed; local reference SVGs ${localReferenceAssets.filter((asset) => asset.state === "loaded").length}/${localReferenceAssets.length}; product control mapping and pixels remain unverified`,
  );
} finally {
  await app.close();
}

for (const viewport of [
  { height: 680, width: 820 },
  { height: 680, width: 721 },
  { height: 680, width: 720 },
]) {
  const compactScene = {
    ...scene,
    height: viewport.height,
    id: `current-home-composer-26-930-compact-${viewport.width}`,
    width: viewport.width,
  };
  const compact = await launchScene(compactScene, {
    capture: false,
    windowSize: viewport,
  });
  try {
    await compact.page.waitForSelector(
      '.demo-root[data-current-home-composer-26-930="true"] .demo-current-home-composer-26-930[data-current-build="26.930.31730"]',
    );
    await waitForLocalReferenceAssets(compact.page);
    const layout = await compact.page.evaluate(() => {
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value
          ? {
              bottom: value.bottom,
              height: value.height,
              left: value.left,
              right: value.right,
              top: value.top,
              width: value.width,
            }
          : null;
      };
      const main = rect(document.querySelector(".codex-ui-app-shell__main"));
      const card = rect(
        document.querySelector(
          ".demo-current-home-composer-26-930__surface",
        ),
      );
      const editor = rect(
        document.querySelector(
          ".demo-current-home-composer-26-930__editor",
        ),
      );
      const title = rect(
        document.querySelector(
          ".demo-current-home-composer-26-930__title",
        ),
      );
      return {
        card,
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        editor,
        main,
        title,
      };
    });
    assert.equal(layout.documentOverflow, 0);
    for (const [name, bounds] of Object.entries({
      card: layout.card,
      editor: layout.editor,
      main: layout.main,
      title: layout.title,
    })) {
      assert.ok(bounds, `${compactScene.id}: ${name} must render`);
    }
    assert.ok(layout.card.width <= layout.main.width);
    assert.ok(layout.card.left >= layout.main.left - 0.02);
    assert.ok(layout.card.right <= layout.main.right + 0.02);
    assert.ok(layout.editor.left >= layout.card.left);
    assert.ok(layout.editor.right <= layout.card.right);
    assert.ok(layout.title.left >= layout.main.left - 0.02);
    assert.ok(layout.title.right <= layout.main.right + 0.02);
    console.log(
      `${compactScene.id}: compact Home/Composer containment and zero-overflow assertions passed; structural only`,
    );
  } finally {
    await compact.app.close();
  }
}

for (const viewport of [
  { height: 820, width: 1180 },
  { height: 680, width: 820 },
  { height: 680, width: 721 },
  { height: 680, width: 720 },
]) {
  const lifecycleScene = {
    ...scene,
    frame: "current-home-lifecycle-" + viewport.width,
    height: viewport.height,
    id: "current-home-composer-26-930-lifecycle-" + viewport.width,
    width: viewport.width,
  };
  const { app, page } = await launchScene(lifecycleScene, {
    capture: false,
    windowSize: viewport,
  });
  try {
    const rootSelector =
      '.demo-root[data-current-home-composer-26-930="true"] .demo-current-home-composer-26-930';
    await page.waitForSelector(rootSelector);
    const root = page.locator(rootSelector);
    const editor = page.getByRole("textbox", {
      name: "Synthetic message editor",
    });
    assert.equal(await root.getAttribute("data-lifecycle-state"), "home");
    assert.equal(
      await root.getAttribute("data-lifecycle-evidence"),
      "local-synthetic-only; no App Server turn",
    );
    assert.equal(
      await editor.getAttribute("data-editor-state"),
      "empty",
    );
    assert.equal(
      await editor.getAttribute("data-editor-evidence"),
      "observed-empty-712x44-at-26.930-1180x820",
    );

    await editor.fill("Shift+Enter must keep a multiline draft.");
    await editor.press("Shift+Enter");
    assert.match(await editor.innerText(), /\r?\n/);
    assert.equal(
      await root.getAttribute("data-lifecycle-state"),
      "home",
      "Shift+Enter must insert a line break instead of submitting.",
    );
    await editor.fill("Summarize the synthetic sample project.");
    assert.equal(
      await editor.getAttribute("data-editor-state"),
      "synthetic-populated",
    );
    await page
      .getByRole("button", { name: "Send synthetic message" })
      .waitFor({ state: "visible" });
    await editor.press("Enter");
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("data-lifecycle-state") === "streaming",
      rootSelector,
      lifecycleTransitionWait,
    );
    const transcript = page.getByRole("log", {
      name: "Synthetic conversation",
    });
    assert.equal(await transcript.getAttribute("aria-live"), "polite");
    assert.equal(await transcript.getAttribute("aria-busy"), "true");
    assert.equal(
      await page.locator("[data-synthetic-user-message]").first().textContent(),
      "Summarize the synthetic sample project.",
    );
    assert.equal(
      await page
        .locator("[data-synthetic-assistant-message]")
        .first()
        .getAttribute("data-status"),
      "streaming",
    );
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("data-lifecycle-state") === "completed",
      rootSelector,
      { timeout: 2_000 },
    );
    assert.match(
      (await page.locator("[data-synthetic-assistant-message]").first().textContent()) ??
        "",
      /deterministic synthetic response/,
    );
    assert.equal(await transcript.getAttribute("aria-busy"), "false");

    await editor.fill("Check a second synthetic turn.");
    await page.getByRole("button", { name: "Send synthetic message" }).click();
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("data-lifecycle-state") === "streaming",
      rootSelector,
      lifecycleTransitionWait,
    );
    await page.waitForFunction(
      (selector) => {
        const conversation = document.querySelector(
          selector + ' [data-home-composer-region="conversation"]',
        );
        return (
          document
            .querySelector(selector)
            ?.getAttribute("data-lifecycle-state") === "completed" &&
          conversation?.getAttribute("data-turn-count") === "2"
        );
      },
      rootSelector,
      { timeout: 2_000 },
    );
    const geometry = await page.evaluate((selector) => {
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value
          ? {
              bottom: value.bottom,
              left: value.left,
              right: value.right,
              top: value.top,
            }
          : null;
      };
      return {
        conversation: rect(
          document.querySelector(
            selector + ' [data-home-composer-region="conversation"]',
          ),
        ),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        dock: rect(
          document.querySelector(
            selector + " .demo-current-home-composer-26-930__dock",
          ),
        ),
        viewport: { height: innerHeight, width: innerWidth },
      };
    }, rootSelector);
    assert.equal(geometry.documentOverflow, 0);
    assert.ok(geometry.conversation && geometry.dock);
    assert.ok(
      geometry.conversation.bottom <= geometry.dock.top,
      lifecycleScene.id + ": transcript must not overlap the Composer",
    );

    await page
      .getByRole("button", { name: "New synthetic conversation" })
      .click();
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("data-lifecycle-state") === "home",
      rootSelector,
      { timeout: 2_000 },
    );
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "Synthetic message editor",
      null,
      { timeout: 2_000 },
    );
    assert.equal(
      await page.locator("[data-synthetic-turn]").count(),
      0,
      "New conversation must discard only the synthetic thread.",
    );
    assert.equal(await editor.textContent(), "");
    assert.equal(
      await editor.evaluate((element) => document.activeElement === element),
      true,
    );
    console.log(
      lifecycleScene.id +
        ": synthetic Home → draft → Enter send → streaming → completion → second turn → new-conversation lifecycle passed; not product lifecycle or pixel evidence",
    );
  } finally {
    await app.close();
  }
}
