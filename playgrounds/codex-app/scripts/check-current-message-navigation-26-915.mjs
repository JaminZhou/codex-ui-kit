import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-message-navigation-26-915-"),
);

// The fixture is the public long-thread replay already used by the Electron
// and Browser contracts. The current-version label is intentionally kept on
// this wrapper only: it is replay evidence, not installed-product evidence.
const scenes = [
  {
    currentSidebar: true,
    frame: "thread-current-26-825-middle",
    id: "current-message-navigation-26-915-wide",
    scenario: "conversation-lifecycle",
    sidebarState: "hidden",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "thread-current-26-825-compact-away",
    id: "current-message-navigation-26-915-compact",
    scenario: "conversation-lifecycle",
    sidebarState: "hidden",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page, scene) {
  const initialPosition =
    scene.windowSize.width === 1180
      ? { navigationLabel: "Jump to user message 11", scrollTop: -2394, selectedIndex: "15" }
      : { navigationLabel: "Jump to user message 20", scrollTop: -968, selectedIndex: "24" };
  await page.waitForFunction(({ navigationLabel, scrollTop, selectedIndex }) => {
    const root = document.querySelector(".demo-root");
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      root?.getAttribute("data-windowed-timeline") === "current-26-825" &&
      root?.getAttribute("data-thread-following") === "false" &&
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === selectedIndex &&
      document
        .querySelector('.codex-ui-message-navigation-rail__button[aria-current="true"]')
        ?.getAttribute("aria-label") === navigationLabel &&
      viewport instanceof HTMLElement &&
      Math.abs(viewport.scrollTop - scrollTop) <= 1 &&
      viewport.scrollHeight > viewport.clientHeight
    );
  }, initialPosition);

  const contract = await page.evaluate(() => {
    const bounds = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        right: value.right,
        top: value.top,
        width: value.width,
      };
    };
    const root = document.querySelector(".demo-root");
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    const rail = document.querySelector(
      ".codex-ui-message-navigation-rail",
    );
    const navigation = rail;
    const list = document.querySelector(
      ".codex-ui-message-navigation-rail__list",
    );
    const selected = document.querySelector(
      '.codex-ui-message-navigation-rail__button[aria-current="true"]',
    );
    const marker = selected?.querySelector(
      ".codex-ui-message-navigation-rail__marker",
    );
    const read = (selector) => bounds(document.querySelector(selector));
    return {
      composer: read(".codex-ui-composer"),
      frame: root?.getAttribute("data-frame"),
      floating: read(".codex-ui-thread-floating-button"),
      navigation: {
        ariaLabel: rail?.getAttribute("aria-label"),
        buttonCount: rail?.querySelectorAll(
          ".codex-ui-message-navigation-rail__button",
        ).length ?? 0,
        display: navigation ? getComputedStyle(navigation).display : null,
        rect: bounds(navigation),
        selectedLabel: selected?.getAttribute("aria-label"),
      },
      placeholders: document.querySelectorAll(
        ".codex-ui-thread-virtualized-placeholder",
      ).length,
      railList: {
        clientHeight: list?.clientHeight ?? null,
        scrollHeight: list?.scrollHeight ?? null,
        rect: bounds(list),
      },
      selectedButton: bounds(selected),
      selectedMarker: {
        height: marker?.getBoundingClientRect().height ?? null,
        opacity: marker ? getComputedStyle(marker).opacity : null,
        width: marker?.getBoundingClientRect().width ?? null,
      },
      threadFollowing: root?.getAttribute("data-thread-following"),
      viewport: viewport
        ? {
            flexDirection: getComputedStyle(viewport).flexDirection,
            latestOrigin: viewport.getAttribute("data-latest-origin"),
            rect: bounds(viewport),
            scrollHeight: viewport.scrollHeight,
            scrollTop: viewport.scrollTop,
          }
        : null,
      windowed: {
        mountedTurnCount: document.querySelectorAll("[data-windowed-turn]")
          .length,
        mountedUserBubbleCount: document.querySelectorAll(
          '[data-mounted-turn-count] .codex-ui-agent-message[data-role="user"]',
        ).length,
        selectedMessageIndex: document
          .querySelector("[data-selected-message-index]")
          ?.getAttribute("data-selected-message-index"),
        totalMessageCount: document
          .querySelector("[data-total-message-count]")
          ?.getAttribute("data-total-message-count"),
      },
    };
  });

  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.threadFollowing, "false");
  assert.equal(contract.placeholders, 2);
  assert.equal(contract.navigation.ariaLabel, "User messages");
  assert.equal(contract.navigation.buttonCount, 30);
  assert.equal(contract.viewport.flexDirection, "column-reverse");
  assert.equal(contract.viewport.latestOrigin, "start");
  assert.equal(contract.windowed.totalMessageCount, "30");

  if (scene.windowSize.width === 1180) {
    assert.equal(contract.navigation.display, "block");
    assert.equal(contract.navigation.selectedLabel, "Jump to user message 11");
    assert.equal(contract.selectedMarker.opacity, "1");
    assert.equal(contract.selectedMarker.width, 26);
    assert.equal(contract.selectedMarker.height, 2);
    assert.equal(contract.selectedButton.width, 36);
    assert.equal(contract.selectedButton.height, 10);
    assert.deepEqual(contract.navigation.rect, {
      bottom: 583.5,
      height: 300,
      left: 16,
      right: 52,
      top: 283.5,
      width: 36,
    });
    assert.deepEqual(contract.railList.rect, {
      bottom: 583.5,
      height: 300,
      left: 16,
      right: 52,
      top: 283.5,
      width: 36,
    });
    assert.equal(contract.railList.clientHeight, 300);
    assert.equal(contract.railList.scrollHeight, 300);
    assert.equal(contract.windowed.mountedTurnCount, 12);
    assert.equal(contract.windowed.mountedUserBubbleCount, 12);
    assert.equal(contract.windowed.selectedMessageIndex, "15");
    assert.equal(contract.viewport.scrollTop, -2394);
    assert.equal(contract.viewport.scrollHeight, 4687);
    assert.deepEqual(contract.viewport.rect, {
      bottom: 820,
      height: 773,
      left: 0,
      right: 1180,
      top: 47,
      width: 1180,
    });
    assert.deepEqual(contract.composer, {
      bottom: 804,
      height: 98,
      left: 222,
      right: 958,
      top: 706,
      width: 736,
    });
  } else {
    assert.equal(contract.navigation.display, "block");
    assert.equal(contract.navigation.selectedLabel, "Jump to user message 20");
    assert.deepEqual(contract.navigation.rect, {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
    });
    assert.equal(contract.windowed.mountedTurnCount, 9);
    assert.equal(contract.windowed.mountedUserBubbleCount, 9);
    assert.equal(contract.viewport.scrollTop, -968);
    assert.equal(contract.viewport.scrollHeight, 5118);
    assert.deepEqual(contract.viewport.rect, {
      bottom: 680,
      height: 633,
      left: 0,
      right: 720,
      top: 47,
      width: 720,
    });
    assert.deepEqual(contract.composer, {
      bottom: 664,
      height: 98,
      left: 16,
      right: 704,
      top: 566,
      width: 688,
    });
    assert.deepEqual(contract.floating, {
      bottom: 542,
      height: 32,
      left: 344,
      right: 376,
      top: 510,
      width: 32,
    });
  }

  if (scene.windowSize.width === 1180) {
    await page
      .getByRole("button", { name: "Jump to user message 29", exact: true })
      .click();
    await page.waitForSelector(
      '[data-selected-message-index="29"] [data-item-id="current-windowed-user-29"]',
    );
    await page
      .getByRole("button", { name: "Jump to user message 15", exact: true })
      .click();
    await page.waitForFunction(() => {
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      return (
        document
          .querySelector('.codex-ui-message-navigation-rail__button[aria-current="true"]')
          ?.getAttribute("aria-label") === "Jump to user message 11" &&
        document
          .querySelector("[data-selected-message-index]")
          ?.getAttribute("data-selected-message-index") === "15" &&
        viewport instanceof HTMLElement &&
        Math.abs(viewport.scrollTop + 2394) <= 1
      );
    });
  }
  await page.getByRole("button", { name: "Scroll to bottom" }).click();
  await page.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "28" &&
      viewport instanceof HTMLElement &&
      Math.abs(viewport.scrollTop + 402) <= 1
    );
  });
  await page.getByRole("button", { name: "Scroll to bottom" }).click();
  await page.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      root?.getAttribute("data-thread-following") === "true" &&
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "30" &&
      document.querySelectorAll("[data-windowed-turn]").length === 8 &&
      viewport instanceof HTMLElement &&
      viewport.scrollTop === 0
    );
  });

  await writeFile(
    join(artifactDirectory, `${scene.id}.json`),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  return { contract, screenshot: await page.screenshot() };
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    return await readContract(page, scene);
  } finally {
    await app.close();
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
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
    `${scene.id}: current 26.915 message-navigation replay drifted`,
  );
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayBaseline: "current-26.825-public-long-thread",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    scenes: scenes.map(({ id }) => id),
  }),
);
