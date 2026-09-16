import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(
  join(tmpdir(), "ui-kit-composer-resources-26-908-70816-"),
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

function sceneFor(width, frame = "workspace-composer-current-26-908-70816-resources") {
  const compact = width === 720;
  return {
    frame,
    id: `${frame}-${width}`,
    scenario: "workspace-workflow",
    sidebarState: compact ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: compact ? 680 : 820, width },
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
  return page.evaluate(() => {
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
    const root = document.querySelector(".demo-root");
    const picker = document.querySelector(
      '[data-current-resource-catalog="26.908.70816"]',
    );
    const scroller = picker?.querySelector(
      ".codex-ui-composer-resource-picker__scroller",
    );
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      picker: bounds(picker),
      root: bounds(root),
      scroller:
        scroller instanceof HTMLElement
          ? {
              clientHeight: scroller.clientHeight,
              scrollHeight: scroller.scrollHeight,
            }
          : null,
    };
  });
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const picker = page.locator(
      '[data-current-resource-catalog="26.908.70816"]',
    );
    await picker.waitFor();
    assert.equal(
      await root.getAttribute("data-current-composer-controls-26-908"),
      "true",
    );
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.deepEqual(await readOptions(picker), expectedOptions);
    const measured = await geometry(page);
    assert.equal(measured.overflow, 0);
    assert.ok(measured.picker && measured.root && measured.scroller);
    assert.equal(measured.picker.width, width === 720 ? 688 : 736);
    assert.equal(measured.picker.height, 320);
    assert.equal(measured.scroller.clientHeight, 310);
    assert.ok(measured.scroller.scrollHeight > measured.scroller.clientHeight);
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `composer-resources-current-26-908-70816-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, picker, screenshot };
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
          .querySelector('[data-current-resource-catalog="26.908.70816"]')
          ?.getAttribute("aria-activedescendant")
          ?.endsWith("resource-sites"),
    );
    await first.picker.press("Enter");
    assert.equal(
      await first.page.locator(".demo-root").getAttribute("data-composer-overlay"),
      null,
    );
    await first.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Do anything",
    );
    await first.page.getByRole("button", { name: "Add files and more" }).click();
    const reopened = first.page.locator(
      '[data-current-resource-catalog="26.908.70816"]',
    );
    await reopened.waitFor();
    await reopened.getByRole("option", { name: /^GitHub/ }).click();
    assert.equal(
      await first.page.locator(".demo-root").getAttribute("data-frame"),
      "workspace-composer-current-26-908-70816-plugin-selected",
    );
    await first.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Do anything",
    );
    const attachment = first.page.locator(
      '[data-composer-attachment-id="current-plugin-github-26-908-70816"]',
    );
    assert.equal(await attachment.count(), 1);
    assert.equal(
      await attachment.locator(".codex-ui-composer-attachment__label").textContent(),
      "GitHub",
    );
    assert.equal(
      await attachment.locator(".codex-ui-composer-attachment__meta").textContent(),
      "Plugin",
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
      pixelmatch(
        firstImage.data,
        secondImage.data,
        null,
        firstImage.width,
        firstImage.height,
        { threshold: 0 },
      ),
      0,
      `${width}px own-fixture current 26.908.70816 resource menu drifted`,
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
    runtimeBaseline: "26.908.70816",
    widths: [1180, 720],
  }),
);
