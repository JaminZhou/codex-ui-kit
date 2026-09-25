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
    [...element.querySelectorAll(".codex-ui-composer-resource-picker__option")]
      .filter((option) => !option.querySelector("[data-current-context-redacted]"))
      .map((option) => [
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
  return page.evaluate(({ runtimeBaseline, publicLabels }) => {
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
    const heading = picker?.querySelector(
      ".codex-ui-composer-resource-picker__heading",
    );
    const redactedContext = picker?.querySelector(
      "[data-current-context-redacted]",
    )?.closest("[role='option']");
    const publicRows = [...(picker?.querySelectorAll('[role="option"]') ?? [])]
      .flatMap((option) => {
        const labelElement = option.querySelector(
          ".codex-ui-composer-resource-picker__label",
        );
        const label = labelElement?.textContent?.trim();
        const descriptionElement = option.querySelector(
          ".codex-ui-composer-resource-picker__description",
        );
        const icon = option.querySelector(
          ".codex-ui-composer-resource-picker__icon > svg",
        );
        const iconStyle = icon instanceof SVGElement
          ? getComputedStyle(icon)
          : null;
        return label && publicLabels.includes(label)
          ? [
              {
                icon: {
                  ...bounds(icon),
                  computedHeight: iconStyle?.height ?? null,
                  computedWidth: iconStyle?.width ?? null,
                  inlineHeight: icon instanceof SVGElement ? icon.style.height : null,
                  inlineWidth: icon instanceof SVGElement ? icon.style.width : null,
                },
                label,
                labelBounds: bounds(labelElement),
                descriptionBounds: bounds(descriptionElement),
                descriptionColor:
                  descriptionElement instanceof Element
                    ? getComputedStyle(descriptionElement).color
                    : null,
                ...bounds(option),
              },
            ]
          : [];
      });
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
      heading: heading instanceof HTMLElement
        ? { text: heading.textContent?.trim(), ...bounds(heading) }
        : null,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      picker: bounds(picker),
      pickerTransform:
        picker instanceof Element ? getComputedStyle(picker).transform : null,
      publicRows,
      redactedContext: bounds(redactedContext),
      root: bounds(document.querySelector(".demo-root")),
      scroller:
        scroller instanceof HTMLElement
          ? {
              clientHeight: scroller.clientHeight,
              scrollHeight: scroller.scrollHeight,
            }
          : null,
    };
  }, {
    runtimeBaseline,
    publicLabels: expectedOptions.map(([label]) => label),
  });
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
    if (runtimeBaseline === "26.917.71314") {
      const redactedContext = picker.locator(
        '[role="option"]:has([data-current-context-redacted])',
      );
      assert.equal(await redactedContext.count(), 1);
      assert.equal(await redactedContext.isDisabled(), true);
    }
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
    if (runtimeBaseline === "26.917.71314") {
      assert.equal(measured.heading?.text, "Add");
      assert.equal(measured.heading?.height, 26.5625);
      assert.equal(measured.redactedContext?.height, 28.5625);
      assert.equal(
        measured.redactedContext?.top,
        measured.firstOption.bottom,
      );
      const menuTop = measured.picker.top;
      for (const [label, relativeTop] of [
        ["Files and folders", 31.5625],
        ["Work in a project", 88.6875],
        ["GitHub", 262.0625],
        ["Documents", 290.625],
      ]) {
        const row = measured.publicRows.find((item) => item.label === label);
        assert.ok(row, `missing safe public resource row: ${label}`);
        assert.ok(
          Math.abs(row.top - menuTop - relativeTop) <= 0.01,
          `${label} row offset drifted: ${row.top - menuTop}px`,
        );
      }
      const filesRow = measured.publicRows.find(
        (item) => item.label === "Files and folders",
      );
      assert.ok(filesRow?.icon && filesRow.labelBounds);
      assert.equal(filesRow.icon.width, 16, JSON.stringify(filesRow.icon));
      assert.equal(filesRow.icon.height, 16, JSON.stringify(filesRow.icon));
      assert.equal(
        Math.round((filesRow.labelBounds.left - measured.picker.left) * 100) /
          100,
        35,
      );
      const projectRow = measured.publicRows.find(
        (item) => item.label === "Work in a project",
      );
      assert.ok(projectRow?.labelBounds && projectRow.descriptionBounds);
      assert.equal(
        projectRow?.descriptionColor,
        "rgba(255, 255, 255, 0.498)",
      );
      assert.ok(
        Math.abs(projectRow.labelBounds.width - 103.0469) <= 0.01,
      );
      assert.ok(
        Math.abs(projectRow.descriptionBounds.left - measured.picker.left - 146.0469) <=
          0.01,
      );
      assert.equal(measured.picker.top, width === 720 ? 242 : 382);
    }
    if (width === 1180) {
      assert.ok(Math.abs(measured.aside.width - 321.875) <= 1);
      assert.ok(Math.abs(measured.editor.left - 383.4375) <= 1);
      assert.ok(Math.abs(measured.addTrigger.left - 391.4375) <= 1);
      const hasExactProductGeometry =
        runtimeBaseline === "26.911.61220" ||
        runtimeBaseline === "26.917.71314";
      assert.ok(
        Math.abs(measured.picker.left - 383.4375) <=
          (hasExactProductGeometry ? 0.1 : 1),
        `wide menu left edge drifted: ${measured.picker.left}px (${measured.pickerTransform})`,
      );
    } else {
      assert.ok(measured.aside.left <= -320);
      assert.ok(Math.abs(measured.editor.left - 16) <= 1);
      assert.ok(Math.abs(measured.addTrigger.left - 24) <= 1);
      const expectedPickerLeft =
        runtimeBaseline === "26.917.71314" ? 17 : 16;
      assert.ok(Math.abs(measured.picker.left - expectedPickerLeft) <= 0.1);
    }
    assert.equal(
      measured.picker.width,
      width === 720
        ? runtimeBaseline === "26.917.71314"
          ? 687
          : 688
        : 736,
    );
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
    const redactedContext = picker.locator(
      '[role="option"]:has([data-current-context-redacted])',
    );
    const screenshot = await page.screenshot({
      mask: runtimeBaseline === "26.917.71314" ? [redactedContext] : [],
      maskColor: "#3a3a3a",
    });
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
    redactedContextSlotCount: runtimeBaseline === "26.917.71314" ? 1 : 0,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline,
    widths: [1180, 720],
  }),
);
