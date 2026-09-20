import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-collection-26-915-"),
);

const states = ["loading", "error", "empty", "long-list"];
const scenes = [
  ...states.map((state, index) => ({
    currentSidebar: true,
    frame: "sidebar-current",
    id: `current-sidebar-collection-26-915-${state}-wide`,
    scenario: "streaming-recovery",
    sidebarState: `collection-lifecycle-current-26-915-${state}`,
    theme: index % 2 === 0 ? "dark" : "light",
    windowSize: { height: 820, width: 1180 },
  })),
  ...states.map((state, index) => ({
    currentSidebar: true,
    frame: "sidebar-current",
    id: `current-sidebar-collection-26-915-${state}-compact`,
    scenario: "streaming-recovery",
    sidebarState: `collection-lifecycle-current-26-915-${state}`,
    theme: index % 2 === 0 ? "light" : "dark",
    windowSize: { height: 680, width: 720 },
  })),
];

function fixtureSelector(state) {
  return `[data-sidebar-collection-fixture="current-26-915-${state}"]`;
}

async function readShell(page, state) {
  return page.evaluate((fixture) => {
    const root = document.querySelector(".demo-root");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const element = document.querySelector(fixture);
    const sidebarBounds = sidebar?.getBoundingClientRect();
    return {
      frame: root?.getAttribute("data-frame"),
      marker: root?.getAttribute("data-current-sidebar-collection-26-915"),
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: sidebarBounds
        ? { height: sidebarBounds.height, width: sidebarBounds.width }
        : null,
      fixture: element
        ? {
            ariaLive: element.getAttribute("aria-live"),
            role: element.getAttribute("role"),
            state: element.getAttribute("data-state"),
            text: element.textContent?.trim(),
          }
        : null,
    };
  }, fixtureSelector(state));
}

async function capture(scene) {
  const state = scene.sidebarState.slice("collection-lifecycle-current-26-915-".length);
  assert.ok(state && states.includes(state));
  const { app, page } = await launchScene(scene);
  try {
    const shell = await readShell(page, state);
    const expectedShell = {
      frame: "sidebar-current",
      marker: state,
      sidebarState: scene.sidebarState,
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 321.875 },
    };
    if (state === "long-list") {
      assert.deepEqual(shell, {
        ...expectedShell,
        fixture: {
          ariaLive: null,
          role: null,
          state: null,
          text: shell.fixture?.text,
        },
      });
    } else {
      assert.deepEqual(shell, {
        ...expectedShell,
        fixture:
          state === "loading"
            ? {
                ariaLive: "polite",
                role: "status",
                state: "loading",
                text: "Loading chats",
              }
            : state === "error"
              ? {
                  ariaLive: null,
                  role: "alert",
                  state: "error",
                  text: "Could not load chats",
                }
              : state === "empty"
                ? {
                    ariaLive: null,
                    role: "status",
                    state: "empty",
                    text: "No chats",
                  }
                : null,
      });
    }

    const fixture = page.locator(fixtureSelector(state));
    if (state === "loading") {
      assert.equal(
        await fixture.locator(".codex-ui-app-sidebar__collection-loading-heading > span").count(),
        1,
      );
      assert.equal(
        await fixture.locator(".codex-ui-app-sidebar__collection-loading-rows > span").count(),
        4,
      );
    } else if (state === "error") {
      assert.equal(await fixture.getAttribute("data-state"), "error");
    } else if (state === "empty") {
      assert.equal(await fixture.getAttribute("data-state"), "empty");
      assert.equal(await fixture.getByText("No chats", { exact: true }).count(), 1);
    } else {
      assert.equal(
        await fixture
          .locator(
            ".codex-ui-app-sidebar__collection-item:not(.codex-ui-app-sidebar__collection-toggle-item)",
          )
          .count(),
        5,
      );
      const showMore = fixture.getByRole("button", { name: "Show more", exact: true });
      assert.equal(await showMore.count(), 1);
      await showMore.click();
      assert.equal(
        await fixture
          .locator(
            ".codex-ui-app-sidebar__collection-item:not(.codex-ui-app-sidebar__collection-toggle-item)",
          )
          .count(),
        12,
      );
      assert.equal(await fixture.getByRole("button", { name: "Show more", exact: true }).count(), 0);
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(shell, null, 2)}\n`,
    );
    return { app, screenshot: await page.screenshot() };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
    assert.equal(firstImage.width, secondImage.width);
    assert.equal(firstImage.height, secondImage.height);
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
      `${scene.id}: own-fixture pixel drift`,
    );
    await second.app.close();
  } catch (error) {
    await second.app.close();
    throw error;
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift across 1180/720 and dark/light",
    replayEvidence: "current 26.915 sidebar collection loading/error/empty/long-list",
    scenes: scenes.map(({ id }) => id),
  }),
);
