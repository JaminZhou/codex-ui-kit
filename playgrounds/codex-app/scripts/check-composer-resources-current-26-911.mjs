import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const runtimeBaseline =
  process.env.CODEX_UI_KIT_COMPOSER_RESOURCES_BASELINE ?? "26.911.61220";
const routeVersion = runtimeBaseline.split(".").slice(0, 2).join("-");
const routeFrame =
  runtimeBaseline === "26.917.71314"
    ? "workspace-composer-current-26-917-71314-resources"
    : `workspace-composer-current-${routeVersion}-resources`;

const directory = await mkdtemp(
  join(tmpdir(), `ui-kit-composer-resources-${routeVersion}-`),
);

const expectedOptions = [
  ["Files and folders", null],
  ["Work in a project", "Choose project for new chats"],
  ["Goal", "Set a goal to keep pursuing"],
  ["Plan mode", "Turn plan mode on"],
  ["Record a skill", null],
  ["Sketch", "Draw a sketch"],
  ["GitHub", "Triage PRs, issues, CI, and publish flows"],
  ["Documents", "Create and edit documents"],
  ["PDF", "Read, create, and verify PDFs"],
  ["Spreadsheets", "Create and edit spreadsheets"],
  ["Presentations", "Create and edit presentations"],
  [
    "Template Creator",
    "Create or update reusable templates from reference content",
  ],
  ["Browser", "Control the in-app browser"],
  ["Computer", "Control Mac apps from ChatGPT"],
  ["Visualize", "Create interactive visuals"],
  ["Watch PR", "Drive GitHub bot review rounds to a clean pass."],
  ["AppKit Inspector", "Inspect native macOS views in Codex Browser."],
  ["Plugin Management", "Discover and manage plugins"],
  ["Sites", "Build and deploy websites"],
];

function sceneFor(width) {
  return {
    frame: routeFrame,
    id: `${routeFrame}-${width}`,
    scenario: "workspace-workflow",
    sidebarState: width === 720 ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: width === 720 ? 680 : 820, width },
  };
}

async function readOptions(picker) {
  return picker.evaluate((element) =>
    [...element.querySelectorAll(".codex-ui-composer-resource-picker__option")].map(
      (option) => [
        option
          .querySelector(".codex-ui-composer-resource-picker__label")
          ?.textContent?.trim() ?? null,
        option
          .querySelector(".codex-ui-composer-resource-picker__description")
          ?.textContent?.trim() ?? null,
      ],
    ),
  );
}

async function geometry(page) {
  return page.evaluate((runtimeBaseline) => {
    const bounds = (element) => {
      if (!(element instanceof Element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const picker = document.querySelector(
      `[data-current-resource-catalog="${runtimeBaseline}"]`,
    );
    const aside = document.querySelector(".codex-ui-app-shell__sidebar");
    const editor = document.querySelector(".codex-ui-composer__input");
    const addTrigger = document.querySelector(
      'button[aria-label="Add files and more"]',
    );
    const scroller = picker?.querySelector(
      ".codex-ui-composer-resource-picker__scroller",
    );
    const description = picker?.querySelector(
      ".codex-ui-composer-resource-picker__description",
    );
    const copy = description?.closest(
      ".codex-ui-composer-resource-picker__copy",
    );
    return {
      aside: bounds(aside),
      editor: bounds(editor),
      addTrigger: bounds(addTrigger),
      copyGap: copy instanceof Element ? getComputedStyle(copy).columnGap : null,
      firstOption: bounds(
        picker?.querySelector(".codex-ui-composer-resource-picker__option"),
      ),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      picker: bounds(picker),
      root: bounds(document.querySelector(".demo-root")),
      scroller:
        scroller instanceof HTMLElement
          ? {
              clientHeight: scroller.clientHeight,
              scrollHeight: scroller.scrollHeight,
            }
          : null,
    };
  }, runtimeBaseline);
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const picker = page.locator(
      `[data-current-resource-catalog="${runtimeBaseline}"]`,
    );
    await picker.waitFor();
    assert.equal(
      await root.getAttribute(`data-current-composer-controls-${routeVersion}`),
      "true",
    );
    if (runtimeBaseline === "26.917.71314") {
      assert.equal(
        await root.getAttribute("data-current-composer-controls-26-917-71314"),
        "true",
      );
    }
    assert.equal(
      await root.getAttribute("data-frame"),
      routeFrame,
    );
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.deepEqual(await readOptions(picker), expectedOptions);
    if (runtimeBaseline.startsWith("26.917.")) {
      const style = await picker.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
        };
      });
      assert.deepEqual(style, {
        backgroundColor: "rgb(45, 45, 45)",
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: "430",
      });
    }
    const measured = await geometry(page);
    assert.equal(measured.overflow, 0);
    assert.ok(measured.picker && measured.root && measured.scroller);
    assert.ok(
      measured.aside &&
        measured.editor &&
        measured.addTrigger &&
        measured.firstOption,
    );
    if (width === 1180) {
      assert.ok(Math.abs(measured.aside.width - 321.875) <= 1);
      assert.ok(Math.abs(measured.editor.left - 383.4375) <= 1);
      assert.ok(Math.abs(measured.addTrigger.left - 391.4375) <= 1);
      assert.ok(Math.abs(measured.picker.left - 383.4375) <= 1);
    } else {
      assert.ok(measured.aside.left <= -320);
      assert.ok(Math.abs(measured.editor.left - 16) <= 1);
      assert.ok(Math.abs(measured.addTrigger.left - 24) <= 1);
      assert.ok(Math.abs(measured.picker.left - 16) <= 1);
    }
    assert.equal(measured.picker.width, width === 720 ? 688 : 736);
    assert.equal(measured.picker.height, 320);
    assert.equal(measured.copyGap, "8px");
    assert.equal(measured.firstOption.height, 28.5625);
    assert.equal(measured.scroller.clientHeight, 310);
    assert.ok(measured.scroller.scrollHeight > measured.scroller.clientHeight);

    await picker.focus();
    await page.keyboard.press("Escape");
    assert.equal(await root.getAttribute("data-composer-overlay"), null);
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Do anything",
    );

    await page.getByRole("button", { name: "Add files and more" }).click();
    await picker.waitFor();
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `composer-resources-current-${routeVersion}-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  await first.app.close();

  const second = await capture(width, "second");
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
    assert.equal(secondImage.width, firstImage.width);
    assert.equal(secondImage.height, firstImage.height);
    assert.equal(
      pixelmatch(
        firstImage.data,
        secondImage.data,
        null,
        firstImage.width,
        firstImage.height,
        { threshold: 0 },
      ),
      0,
      `${width}px own-fixture current ${runtimeBaseline} resource menu drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    directory,
    optionCount: expectedOptions.length,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline,
    widths: [1180, 720],
  }),
);
