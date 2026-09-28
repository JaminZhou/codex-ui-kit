import assert from "node:assert/strict";
import { launchScene } from "./electron-harness.mjs";

function assertNear(actual, expected, tolerance = 0.02) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance}px of ${expected}`,
  );
}

function scene(id, width, height) {
  return {
    currentSidebar: true,
    frame: "sidebar-current",
    id,
    scenario: "streaming-recovery",
    sidebarState: "composer-current-26-924",
    theme: "dark",
    view: "shell",
    width,
    height,
  };
}

const wideScene = scene("current-composer-26-924-wide", 1180, 820);
const wide = await launchScene(wideScene, {
  capture: false,
  windowSize: { height: wideScene.height, width: wideScene.width },
});

try {
  await wide.page.waitForSelector(
    '.demo-root[data-current-composer-26-924="true"] .demo-current-composer-26-924[data-current-build="26.924.22138"]',
  );

  const layout = await wide.page.evaluate(() => {
    const rect = (element) => {
      const bounds = element?.getBoundingClientRect();
      return bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null;
    };
    const shell = document.querySelector(".codex-ui-app-shell");
    const editor = document.querySelector(
      ".demo-current-composer-26-924__editor",
    );
    return {
      assetStatus: Array.from(
        document.querySelectorAll(
          ".demo-current-composer-26-924 [data-visual-asset-status]",
        ),
        (element) => element.getAttribute("data-visual-asset-status"),
      ),
      contentStatus: document
        .querySelector(".demo-current-composer-26-924")
        ?.getAttribute("data-scene-status"),
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      editor: rect(editor),
      editorEditable: editor?.getAttribute("contenteditable"),
      editorRole: editor?.getAttribute("role"),
      main: rect(document.querySelector(".codex-ui-app-shell__main")),
      permissionControl: document.querySelector(
        '.demo-current-composer-26-924__permission-trigger[aria-label="Full access"]',
      ) !== null,
      rootBuild: document
        .querySelector(".demo-current-composer-26-924")
        ?.getAttribute("data-current-build"),
      shellSidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      theme: document
        .querySelector(".demo-root")
        ?.getAttribute("data-theme"),
    };
  });

  assert.equal(layout.rootBuild, "26.924.22138");
  assert.equal(
    layout.contentStatus,
    "composer-only-conversation-content-not-captured",
  );
  assert.equal(layout.theme, "dark");
  assert.equal(layout.documentOverflow, 0);
  assert.equal(layout.editorEditable, "true");
  assert.equal(layout.editorRole, "textbox");
  assert.equal(layout.permissionControl, true);
  assert.equal(layout.shellSidebarOpen, true);
  assertNear(layout.editor?.left, 393.44);
  assertNear(layout.editor?.top, 716);
  assertNear(layout.editor?.width, 712);
  assertNear(layout.editor?.height, 44);
  assert.deepEqual(
    [...new Set(layout.assetStatus)],
    ["pending-26.924-capture"],
  );

  const overlays = [
    {
      height: 254.5,
      innerSelector: ".demo-current-composer-26-924__project-listbox",
      label: "Project context, labels and values not retained",
      role: "dialog",
      trigger: "Project context (value not retained)",
      width: 260,
    },
    {
      height: 189.31,
      label: "Environment context, labels and values not retained",
      menuItems: 1,
      role: "menu",
      trigger: "Environment context (value not retained)",
      width: 216,
    },
    {
      height: 280.13,
      label: "Branch context, labels and values not retained",
      menuItems: 1,
      role: "menu",
      trigger: "Branch context (value not retained)",
      width: 296,
    },
    {
      height: 320,
      label: "Add menu, context-dependent sample; item labels not retained",
      menuItems: 14,
      role: "menu",
      trigger: "Add",
      width: 736,
    },
    {
      height: 161.7,
      label: "Full access menu, option labels not retained",
      menuItems: 4,
      role: "menu",
      trigger: "Full access",
      width: 439.1,
    },
    {
      height: 95.98,
      label: "Model selector, values not retained",
      menuItems: 1,
      role: "menu",
      trigger: "Model selector (value not retained)",
      width: 253.95,
    },
  ];

  for (const overlayCase of overlays) {
    const trigger = wide.page.getByRole("button", {
      name: overlayCase.trigger,
    });
    await trigger.click();
    const overlay = wide.page.getByRole(overlayCase.role, {
      name: overlayCase.label,
    });
    await overlay.waitFor();
    const bounds = await overlay.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    });
    assertNear(bounds.width, overlayCase.width);
    assertNear(bounds.height, overlayCase.height);

    if (overlayCase.menuItems) {
      assert.equal(
        await overlay.getByRole("menuitem").count(),
        overlayCase.menuItems,
        "menu item placeholders are fixture-only and carry no product option text",
      );
    }

    if (overlayCase.innerSelector) {
      const listbox = overlay.locator(overlayCase.innerSelector);
      const listboxBounds = await listbox.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      });
      assertNear(listboxBounds.width, 252);
      assertNear(listboxBounds.height, 208.94);
      assert.equal(await listbox.getByRole("option").count(), 1);
    }

    await wide.page.keyboard.press("Escape");
    await overlay.waitFor({ state: "detached" });
    assert.equal(
      await trigger.evaluate((element) => element === document.activeElement),
      true,
      `${overlayCase.trigger}: Escape returns focus to its trigger`,
    );
  }

  console.log(
    "current-composer-26-924-wide: empty editor, six observed overlay bounds, Escape/focus; own-fixture evidence only",
  );
} finally {
  await wide.app.close();
}

for (const compactCase of [
  { width: 820, editorWidth: 437.13 },
  { width: 721, editorWidth: 338.13 },
  { width: 720, editorWidth: 337.13 },
]) {
  const compactScene = scene(
    `current-composer-26-924-${compactCase.width}`,
    compactCase.width,
    680,
  );
  const compact = await launchScene(compactScene, {
    capture: false,
    windowSize: {
      height: compactScene.height,
      width: compactScene.width,
    },
  });

  try {
    await compact.page.waitForSelector(
      '.demo-root[data-current-composer-26-924="true"] .demo-current-composer-26-924__editor',
    );
    const readCompact = () =>
      compact.page.evaluate(() => {
        const rect = (selector) => {
          const bounds = document
            .querySelector(selector)
            ?.getBoundingClientRect();
          return bounds
            ? { left: bounds.left, width: bounds.width }
            : null;
        };
        const shell = document.querySelector(".codex-ui-app-shell");
        return {
          documentOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          editor: rect(".demo-current-composer-26-924__editor"),
          main: rect(".codex-ui-app-shell__main"),
          rail: rect(".codex-ui-app-shell__navigation-rail"),
          sidebar: rect(".codex-ui-app-shell__sidebar"),
          sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
        };
      });

    const expanded = await readCompact();
    assert.equal(expanded.documentOverflow, 0);
    assert.equal(expanded.sidebarOpen, true);
    assert.deepEqual(expanded.rail, { left: 0, width: 52 });
    assertNear(expanded.editor?.width, compactCase.editorWidth);

    if (compactCase.width === 720) {
      await compact.page.getByRole("button", { name: "Hide sidebar" }).click();
      await compact.page.getByRole("button", { name: "Show sidebar" }).waitFor();
      const collapsed = await readCompact();
      assert.equal(collapsed.documentOverflow, 0);
      assert.equal(collapsed.sidebarOpen, false);
      assert.deepEqual(collapsed.rail, { left: 0, width: 52 });
      assert.equal(collapsed.main?.left, 52);
      assertNear(collapsed.editor?.width, 608);
    }

    console.log(
      `current-composer-26-924-${compactCase.width}: editor ${compactCase.editorWidth}px expanded${compactCase.width === 720 ? " / 608px collapsed" : ""}; no overflow; own-fixture evidence only`,
    );
  } finally {
    await compact.app.close();
  }
}
