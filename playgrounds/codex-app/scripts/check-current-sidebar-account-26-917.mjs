import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const referenceDirectory =
  process.env.CODEX_UI_KIT_ACCOUNT_MENU_26_917_REFERENCE_DIR;
const diffDirectory =
  process.env.CODEX_UI_KIT_ACCOUNT_MENU_26_917_DIFF_DIR;
const maximumProductPixelRatio = 0.008;
const scenes = [
  { compact: false, id: "dark-wide", theme: "dark", width: 1180, height: 820 },
  { compact: true, id: "dark-compact", theme: "dark", width: 720, height: 680 },
  { compact: false, id: "light-wide", theme: "light", width: 1180, height: 820 },
  { compact: true, id: "light-compact", theme: "light", width: 720, height: 680 },
].map(({ compact, height, id, theme, width }) => ({
  compact,
  scene: {
    currentSidebar: true,
    frame: `current-home-${theme}-${compact ? "compact" : "wide"}`,
    id: `current-sidebar-account-menu-26-917-${id}`,
    scenario: "streaming-recovery",
    sidebarState: "account-menu-current-26-917",
    theme,
    view: "workspace",
    windowSize: { height, width },
  },
}));

function near(actual, expected, tolerance = 0.125) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
}

function maskRect(image, rect) {
  const left = Math.max(0, Math.floor(rect.left));
  const top = Math.max(0, Math.floor(rect.top));
  const right = Math.min(image.width, Math.ceil(rect.left + rect.width));
  const bottom = Math.min(image.height, Math.ceil(rect.top + rect.height));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.width + x) * 4;
      image.data[offset] = 0;
      image.data[offset + 1] = 0;
      image.data[offset + 2] = 0;
      image.data[offset + 3] = 0;
    }
  }
  return (right - left) * (bottom - top);
}

function maskPrivateRowsAndText(image, contract) {
  const menuTop = contract.menuRect?.top;
  const privateRowsBottom =
    contract.itemRects[1].top +
    contract.itemRects[1].height -
    menuTop;
  let maskedPixels = maskRect(image, {
    height: privateRowsBottom,
    left: 0,
    top: 0,
    width: image.width,
  });
  for (const itemRect of contract.itemRects.slice(2)) {
    maskedPixels += maskRect(image, {
      height: itemRect.height - 8,
      left: 34,
      top: itemRect.top - menuTop + 4,
      width: 250,
    });
  }
  return maskedPixels;
}

async function capture({ compact, scene }) {
  const { app, page } = await launchScene(scene);
  try {
    const nativeBounds = await app.evaluate(({ BrowserWindow }) => {
      const bounds = BrowserWindow.getAllWindows()[0]?.getContentBounds();
      return bounds ? { height: bounds.height, width: bounds.width } : null;
    });
    assert.deepEqual(nativeBounds, {
      height: compact ? 680 : 820,
      width: compact ? 720 : 1180,
    });

    const menu = page.getByRole("menu", { name: "Account menu" });
    const trigger = page.getByRole("button", {
      exact: true,
      name: "Demo account",
    });
    await menu.waitFor({ state: "visible" });
    const contract = await menu.evaluate((element) => {
      const rect = (target) => {
        const bounds = target?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const style = getComputedStyle(element);
      const items = Array.from(element.querySelectorAll('[role="menuitem"]'));
      const root = document.querySelector(".demo-root");
      return {
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        dividerCount: element.querySelectorAll(
          ".demo-current-sidebar-account-menu__divider",
        ).length,
        focusRole: document.activeElement?.getAttribute("role"),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        imageCount: element.querySelectorAll("img").length,
        itemRects: items.map(rect),
        itemStyles: items.map((item) => {
          const itemStyle = getComputedStyle(item);
          return {
            backgroundColor: itemStyle.backgroundColor,
            borderRadius: itemStyle.borderRadius,
            fontSize: itemStyle.fontSize,
            fontWeight: itemStyle.fontWeight,
            lineHeight: itemStyle.lineHeight,
            padding: itemStyle.padding,
          };
        }),
        labels: items.map((item) => item.textContent?.trim()),
        menuRect: rect(element),
        menuStyle: {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          color: style.color,
        },
        rootMarkers: {
          account: root?.getAttribute("data-current-sidebar-account-26-917"),
          shell: root?.getAttribute("data-current-sidebar-shell-26-917"),
        },
        separatorCount: element.querySelectorAll('[role="separator"]').length,
        sidebarRect: rect(
          document.querySelector(".codex-ui-app-shell__sidebar"),
        ),
        triggerRect: rect(
          document.querySelector(
            ".codex-ui-app-sidebar-footer__account-control button",
          ),
        ),
      };
    });
    const expectedTop = compact ? 432 : 572;
    const expectedItemTops = [
      expectedTop + 4,
      expectedTop + 55.5625,
      expectedTop + 84.125,
      expectedTop + 112.6875,
      expectedTop + 141.25,
      expectedTop + 169.8125,
    ];
    const expectedBackground =
      scene.theme === "light"
        ? "oklab(0.999994 0.0000455678 0.0000200868 / 0.9)"
        : "oklab(0.297161 0.0000135154 0.00000594556 / 0.9)";
    const expectedColor =
      scene.theme === "light" ? "rgb(26, 28, 31)" : "rgb(255, 255, 255)";
    assert.deepEqual(contract.rootMarkers, { account: "true", shell: "true" });
    assert.equal(contract.colorScheme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.equal(contract.focusRole, "menu");
    assert.equal(contract.imageCount, 1);
    assert.equal(contract.separatorCount, 0);
    assert.equal(contract.dividerCount, 0);
    assert(near(contract.sidebarRect?.width, 321.875));
    assert(near(contract.menuRect?.left, 9));
    assert(near(contract.menuRect?.top, expectedTop));
    assert(near(contract.menuRect?.width, 305.875));
    assert(near(contract.menuRect?.height, 202.375));
    assert(near(contract.triggerRect?.left, 8));
    assert(near(contract.triggerRect?.top, compact ? 641 : 781));
    assert(near(contract.triggerRect?.width, 186.53125));
    assert.equal(contract.triggerRect?.height, 32);
    assert.deepEqual(contract.icons, [
      "sidebar-account-menu-usage-26-917-71314",
      "sidebar-account-menu-pet-26-917-71314",
      "sidebar-account-menu-invite-26-917-71314",
      "sidebar-account-menu-settings-26-917-71314",
      "sidebar-account-menu-logout-26-917-71314",
    ]);
    assert.deepEqual(contract.labels, [
      "Demo account",
      "Usage80% left",
      "Show pet⌥Space",
      "Invite a friend",
      "Settings⌘,",
      "Log out",
    ]);
    assert.equal(contract.menuStyle.backgroundColor, expectedBackground);
    assert.equal(contract.menuStyle.color, expectedColor);
    assert.equal(contract.menuStyle.borderRadius, "20px");
    assert(contract.menuStyle.boxShadow.includes(
      scene.theme === "light"
        ? "rgba(26, 28, 31, 0.08)"
        : "rgba(255, 255, 255, 0.082)",
    ));
    assert.equal(contract.itemRects.length, 6);
    assert(
      contract.itemRects.every(
        (rect, index) =>
          near(rect?.left, 13) &&
          near(rect?.top, expectedItemTops[index]) &&
          near(rect?.width, 297.875) &&
          near(rect?.height, index === 0 ? 42.5625 : 28.5625),
      ),
    );
    assert(
      contract.itemStyles.every(
        (style) =>
          style.backgroundColor === "rgba(0, 0, 0, 0)" &&
          style.borderRadius === "15px" &&
          style.fontSize === "13px" &&
          style.fontWeight === "430" &&
          style.lineHeight === "18.5714px" &&
          style.padding === "5px 8px",
      ),
    );
    await page.waitForTimeout(120);
    const screenshot = await page.screenshot({
      clip: { height: 202, width: 305, x: 9, y: expectedTop },
    });

    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.includes("Demo account"),
    );
    assert.equal(
      await trigger.evaluate((element) => document.activeElement === element),
      true,
    );
    await trigger.click();
    await menu.waitFor({ state: "visible" });
    return { contract, screenshot };
  } finally {
    await app.close();
  }
}

const productPixelRatios = [];
for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
  const firstImage = PNG.sync.read(first.screenshot);
  const secondImage = PNG.sync.read(second.screenshot);
  assert.equal(firstImage.width, 305);
  assert.equal(firstImage.height, 202);
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
    `${scene.scene.id}: own-fixture regional pixel drift`,
  );

  if (referenceDirectory) {
    const referencePath = join(referenceDirectory, `${scene.scene.theme}-${scene.compact ? "compact" : "wide"}.png`);
    const reference = PNG.sync.read(await readFile(referencePath));
    assert.equal(reference.width, 305, `${scene.scene.id}: reference width`);
    assert.equal(reference.height, 202, `${scene.scene.id}: reference height`);
    const actual = PNG.sync.read(second.screenshot);
    const maskedPixels = maskPrivateRowsAndText(reference, first.contract);
    maskPrivateRowsAndText(actual, second.contract);
    const diff = new PNG({ height: reference.height, width: reference.width });
    const differentPixels = pixelmatch(
      reference.data,
      actual.data,
      diff.data,
      reference.width,
      reference.height,
      { threshold: 0.08 },
    );
    if (diffDirectory) {
      await mkdir(diffDirectory, { recursive: true });
      await writeFile(
        join(diffDirectory, `${scene.scene.id}.diff.png`),
        PNG.sync.write(diff),
      );
      await writeFile(
        join(diffDirectory, `${scene.scene.id}.actual.png`),
        second.screenshot,
      );
    }
    const comparedPixels = reference.width * reference.height - maskedPixels;
    productPixelRatios.push({
      differentPixels,
      id: scene.scene.id,
      ratio: Number((differentPixels / comparedPixels).toFixed(6)),
    });
  }
}

console.log(
  JSON.stringify(
    {
      replayContract: "passed: 26.917.71314 account-menu Browser/CDP and Electron",
      productPixelReference: referenceDirectory ? "local-only, masked" : "not supplied",
      productPixelGate: referenceDirectory
        ? productPixelRatios.every(({ ratio }) => ratio <= maximumProductPixelRatio)
          ? "passed"
          : "not met"
        : "not run",
      maximumProductPixelRatio,
      productPixelRatios,
      scenes: scenes.map(({ scene }) => scene.id),
      ownFixturePixelGate: "0% regional drift across dark/light and wide/compact",
    },
    null,
    2,
  ),
);
