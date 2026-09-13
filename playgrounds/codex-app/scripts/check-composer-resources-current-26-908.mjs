import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-composer-resources-26-908-"));

const expectedOptions = [
  ["Files and folders", null],
  ["Attach Google Chrome", null],
  ["Work in a project", "Choose project for new chats"],
  ["Goal", "Set a goal to keep pursuing"],
  ["Plan mode", "Turn plan mode on"],
  ["Record a skill", null],
  ["Sketch", "Draw a sketch"],
  ["GitHub Triage", "PRs, issues, CI, and publish flows"],
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
  [
    "AppKit Inspector",
    "Inspect native macOS views in Codex Browser.",
  ],
  ["Deep Research", "Deep research"],
  ["Plugin Management", "Discover and manage plugins"],
  ["Sites", "Build and deploy websites"],
];

function sceneFor(width) {
  const compact = width === 720;
  return {
    frame: "workspace-composer-current-26-908-resources",
    id: `workspace-composer-current-26-908-resources-${width}`,
    scenario: "workspace-workflow",
    sidebarState: compact ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const picker = page.locator(
      '[data-current-resource-catalog="26.908.40834"]',
    );
    await picker.waitFor();
    assert.equal(
      await root.getAttribute("data-current-composer-controls-26-908"),
      "true",
    );
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.equal(
      await picker.locator(".codex-ui-composer-resource-picker__heading").count(),
      0,
    );
    assert.deepEqual(
      await picker.evaluate((element) =>
        [...element.querySelectorAll(".codex-ui-composer-resource-picker__option")]
          .map((option) => [
            option
              .querySelector(".codex-ui-composer-resource-picker__label")
              ?.textContent?.trim() ?? null,
            option
              .querySelector(
                ".codex-ui-composer-resource-picker__description",
              )
              ?.textContent?.trim() ?? null,
          ]),
      ),
      expectedOptions,
    );
    const geometry = await page.evaluate(() => {
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
      const rootElement = document.querySelector(".demo-root");
      const pickerElement = document.querySelector(
        '[data-current-resource-catalog="26.908.40834"]',
      );
      const scroller = pickerElement?.querySelector(
        ".codex-ui-composer-resource-picker__scroller",
      );
      return {
        groupLabels: [...(pickerElement?.querySelectorAll(
          ".codex-ui-composer-resource-picker__group-label",
        ) ?? [])].map((element) => element.textContent?.trim()),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        picker: bounds(pickerElement),
        root: bounds(rootElement),
        scroller:
          scroller instanceof HTMLElement
            ? {
                clientHeight: scroller.clientHeight,
                scrollHeight: scroller.scrollHeight,
              }
            : null,
        selectedCount: pickerElement?.querySelectorAll(
          '[role="option"][aria-selected="true"]',
        ).length,
      };
    });
    assert.equal(geometry.overflow, 0);
    assert.deepEqual(geometry.groupLabels, ["Plugins"]);
    assert.equal(geometry.selectedCount, 1);
    assert.ok(geometry.picker && geometry.root && geometry.scroller);
    assert.ok(
      geometry.picker.left >= geometry.root.left &&
        geometry.picker.right <= geometry.root.right &&
        geometry.picker.top >= geometry.root.top &&
        geometry.picker.bottom <= geometry.root.bottom,
      `${width}px resource picker escaped its route: ${JSON.stringify(geometry)}`,
    );
    assert.ok(
      geometry.scroller.scrollHeight > geometry.scroller.clientHeight,
      `${width}px resource catalog must stay scrollable: ${JSON.stringify(geometry)}`,
    );
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `composer-resources-current-26-908-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, picker, root, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  try {
    await first.picker.focus();
    await first.picker.press("End");
    await first.page.waitForFunction(
      () =>
        document
          .querySelector('[data-current-resource-catalog="26.908.40834"]')
          ?.getAttribute("aria-activedescendant")
          ?.endsWith("resource-sites"),
    );
    await first.picker.press("Enter");
    assert.equal(await first.root.getAttribute("data-composer-overlay"), null);
    await first.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Do anything",
    );
    await first.page.getByRole("button", { name: "Add files and more" }).click();
    await first.picker.waitFor();
    await first.picker.press("Escape");
    assert.equal(await first.root.getAttribute("data-composer-overlay"), null);
    await first.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Do anything",
    );
  } finally {
    await first.app.close();
  }

  const second = await capture(width, "second");
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
    assert.equal(secondImage.width, firstImage.width);
    assert.equal(secondImage.height, firstImage.height);
    assert.equal(
      pixelmatch(firstImage.data, secondImage.data, null, firstImage.width, firstImage.height, {
        threshold: 0,
      }),
      0,
      `${width}px own-fixture current resource menu pixel gate drifted`,
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
    runtimeBaseline: "26.908.40834",
    widths: [1180, 720],
  }),
);
