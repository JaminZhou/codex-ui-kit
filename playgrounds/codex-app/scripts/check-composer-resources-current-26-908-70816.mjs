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

async function mentionGeometry(page) {
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
    const mention = document.querySelector(
      ".codex-ui-composer-resource-mention",
    );
    const textbox = document.querySelector(
      ".demo-current-resource-mention-composer__textbox",
    );
    const style = mention ? getComputedStyle(mention) : null;
    return {
      mention: bounds(mention),
      root: bounds(document.querySelector(".demo-root")),
      style: style
        ? {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            display: style.display,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            padding: style.padding,
            verticalAlign: style.verticalAlign,
            whiteSpace: style.whiteSpace,
          }
        : null,
      textbox: bounds(textbox),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
}

async function captureMention(width, suffix) {
  const { app, page } = await launchScene(
    sceneFor(
      width,
      "workspace-composer-current-26-908-70816-github-mentioned",
    ),
    { capture: false },
  );
  try {
    const root = page.locator(".demo-root");
    const composer = page.locator(
      ".demo-current-resource-mention-composer",
    );
    const mention = page.locator(".codex-ui-composer-resource-mention");
    await composer.waitFor();
    await mention.waitFor();
    assert.equal(
      await root.getAttribute("data-frame"),
      "workspace-composer-current-26-908-70816-github-mentioned",
    );
    assert.equal(
      await root.getAttribute("data-current-composer-controls-26-908"),
      "true",
    );
    assert.equal(await root.getAttribute("data-composer-overlay"), null);
    assert.equal(await root.getAttribute("data-composer-plugin-action"), null);
    assert.equal(await mention.getAttribute("contenteditable"), "false");
    assert.equal(
      await mention.getAttribute("data-inline-mention-interactive"),
      "",
    );
    assert.equal(
      await mention.locator(".codex-ui-composer-resource-mention__label").textContent(),
      "GitHub",
    );
    assert.equal(
      await page.locator(".codex-ui-composer-attachment").count(),
      0,
    );
    assert.equal(
      await page.getByRole("textbox", { name: "Do anything" }).count(),
      1,
    );
    assert.equal(
      await page.getByRole("button", { name: "Add files and more" }).count(),
      1,
    );
    assert.equal(await page.getByRole("button", { name: "Send" }).count(), 1);
    const measured = await mentionGeometry(page);
    assert.equal(measured.overflow, 0);
    assert.ok(measured.mention && measured.root && measured.textbox);
    assert.equal(measured.mention.height, 20);
    assert.equal(measured.style?.backgroundColor, "rgba(0, 0, 0, 0)");
    assert.equal(measured.style?.borderRadius, "0px");
    assert.equal(measured.style?.display, "inline-flex");
    assert.equal(measured.style?.fontSize, "14px");
    assert.equal(measured.style?.fontWeight, "500");
    assert.equal(measured.style?.lineHeight, "20px");
    assert.equal(measured.style?.padding, "0px 2px");
    assert.equal(measured.style?.verticalAlign, "bottom");
    assert.equal(measured.style?.whiteSpace, "break-spaces");
    await page.getByRole("button", { name: "Add files and more" }).click();
    const picker = page.locator(
      '[data-current-resource-catalog="26.908.70816"]',
    );
    await picker.waitFor();
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.equal(await picker.getByRole("option", { name: /^GitHub/ }).count(), 1);
    await picker.getByRole("option", { name: /^GitHub/ }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".demo-root")?.getAttribute("data-composer-overlay") ===
        null,
    );
    assert.equal(
      await page.locator(".codex-ui-composer-resource-mention").count(),
      1,
    );
    assert.equal(
      await page.locator(".codex-ui-composer-attachment").count(),
      0,
    );
    await page.waitForFunction(
      () =>
        document.activeElement?.classList.contains(
          "demo-current-resource-mention-composer__textbox",
        ),
    );
    const screenshot = await page.screenshot();
    await writeFile(
      join(
        directory,
        `composer-resource-mention-current-26-908-70816-${width}-${suffix}.png`,
      ),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await captureMention(width, "first");
  try {
    await first.page.getByRole("button", { name: "Send" }).click();
    assert.equal(
      await first.page.locator(".demo-root").getAttribute("data-frame"),
      "workspace-composer-current-26-908-70816-github-mentioned",
    );
  } finally {
    await first.app.close();
  }

  const second = await captureMention(width, "second");
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
      `${width}px own-fixture current 26.908.70816 resource mention drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    directory,
    mentionPixelGate: "0% own-fixture drift at 1180 and 720",
    optionCount: expectedOptions.length,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.908.70816",
    widths: [1180, 720],
  }),
);
