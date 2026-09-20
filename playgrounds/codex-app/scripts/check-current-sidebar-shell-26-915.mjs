import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-shell-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-shell-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "shell-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-shell-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "shell-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-shell-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "shell-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-shell-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "shell-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

function rect(element) {
  const bounds = element?.getBoundingClientRect();
  return bounds
    ? {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      }
    : null;
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await page.evaluate(() => {
      const readRect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              bottom: bounds.bottom,
              height: bounds.height,
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const root = document.querySelector(".demo-root");
      const sidebar = document.querySelector(".codex-ui-app-sidebar");
      const header = document.querySelector(".codex-ui-app-sidebar__header");
      const headerInner = document.querySelector(".demo-sidebar-header");
      const brandRow = document.querySelector(".demo-sidebar-brand-row");
      const newChatRow = document.querySelector(".demo-sidebar-new-chat-row");
      const navigation = document.querySelector(
        ".codex-ui-app-sidebar__navigation",
      );
      const primary = document.querySelector(".codex-ui-app-sidebar__primary");
      const footer = document.querySelector(".codex-ui-app-sidebar__footer");
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute("data-current-sidebar-shell-26-915"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        titlebarInset: sidebar?.getAttribute("data-titlebar-inset"),
        navigationLabel: navigation?.getAttribute("aria-label"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: readRect(sidebar),
        header: readRect(header),
        headerInner: readRect(headerInner),
        brandRow: readRect(brandRow),
        newChatRow: readRect(newChatRow),
        newChat: readRect(document.querySelector(".demo-sidebar-new-chat")),
        quickChat: readRect(document.querySelector(".demo-sidebar-quick-chat")),
        navigation: readRect(navigation),
        primary: readRect(primary),
        primaryItems: Array.from(
          primary?.querySelectorAll(".codex-ui-app-sidebar__item") ?? [],
          (item) => ({
            label: item.querySelector(
              ".codex-ui-app-sidebar__item-label",
            )?.textContent?.trim(),
            rect: readRect(item),
          }),
        ),
        sections: Array.from(
          document.querySelectorAll(".codex-ui-app-sidebar__section"),
          (section) => ({
            expanded: section.getAttribute("data-expanded"),
            kind: section.getAttribute("data-kind"),
            title: section.querySelector("h2")?.textContent?.trim(),
          }),
        ),
        footer: readRect(footer),
        footerInner: readRect(document.querySelector(".codex-ui-app-sidebar-footer")),
        account: document.querySelector(
          ".codex-ui-app-sidebar-footer__account-label",
        )?.textContent?.trim(),
        footerActions: Array.from(
          document.querySelectorAll(
            ".codex-ui-app-sidebar-footer__actions button",
          ),
          (button) => button.getAttribute("aria-label"),
        ),
        main: readRect(document.querySelector(".codex-ui-app-shell__main")),
      };
    });
    assert.deepEqual(
      {
        frame: shell.frame,
        marker: shell.marker,
        sidebarState: shell.sidebarState,
        theme: shell.theme,
        titlebarInset: shell.titlebarInset,
        navigationLabel: shell.navigationLabel,
        horizontalOverflow: shell.horizontalOverflow,
      },
      {
        frame: "sidebar-current",
        marker: "true",
        sidebarState: scene.sidebarState,
        theme: scene.theme,
        titlebarInset: "true",
        navigationLabel: "Primary",
        horizontalOverflow: 0,
      },
    );
    const sidebarWidth = 321.875;
    assert.deepEqual(shell.sidebar && {
      height: shell.sidebar.height,
      left: shell.sidebar.left,
      top: shell.sidebar.top,
      width: shell.sidebar.width,
    }, {
      height: scene.windowSize.height,
      left: 0,
      top: 0,
      width: sidebarWidth,
    });
    assert.deepEqual(shell.header && {
      height: shell.header.height,
      top: shell.header.top,
      width: shell.header.width,
    }, { height: 70, top: 46, width: sidebarWidth });
    assert.deepEqual(shell.headerInner && {
      height: shell.headerInner.height,
      left: shell.headerInner.left,
      width: shell.headerInner.width,
    }, { height: 66, left: 8, width: 305.875 });
    assert.deepEqual(shell.brandRow && {
      height: shell.brandRow.height,
      left: shell.brandRow.left,
      width: shell.brandRow.width,
    }, { height: 32, left: 8, width: 305.875 });
    assert.deepEqual(shell.newChatRow && {
      height: shell.newChatRow.height,
      left: shell.newChatRow.left,
      width: shell.newChatRow.width,
    }, { height: 30, left: 8, width: 305.875 });
    assert.deepEqual(shell.newChat && {
      height: shell.newChat.height,
      width: shell.newChat.width,
    }, { height: 30, width: 285.875 });
    assert.deepEqual(shell.quickChat && {
      height: shell.quickChat.height,
      width: shell.quickChat.width,
    }, { height: 20, width: 20 });
    assert.deepEqual(shell.navigation && {
      height: shell.navigation.height,
      top: shell.navigation.top,
      width: shell.navigation.width,
    }, { height: scene.windowSize.height - 162, top: 116, width: sidebarWidth });
    assert.deepEqual(shell.primary && {
      height: shell.primary.height,
      top: shell.primary.top,
      width: shell.primary.width,
    }, { height: 120, top: 116, width: sidebarWidth });
    assert.deepEqual(
      shell.primaryItems.map(({ label }) => label),
      ["Pull requests", "Sites", "Scheduled", "Plugins"],
    );
    for (const item of shell.primaryItems) {
      assert.deepEqual(item.rect && {
        height: item.rect.height,
        left: item.rect.left,
        width: item.rect.width,
      }, { height: 30, left: 8, width: 305.875 });
    }
    assert.deepEqual(shell.sections, [
      { expanded: "true", kind: "pinned", title: "Pinned" },
      { expanded: "false", kind: "projects", title: "Projects" },
      { expanded: "true", kind: "threads", title: "Recents" },
      { expanded: null, kind: "custom", title: "Connection" },
    ]);
    assert.deepEqual(shell.footer && {
      height: shell.footer.height,
      top: shell.footer.top,
      width: shell.footer.width,
    }, { height: 46, top: scene.windowSize.height - 46, width: sidebarWidth });
    assert.deepEqual(shell.footerInner && {
      height: shell.footerInner.height,
      left: shell.footerInner.left,
      width: shell.footerInner.width,
    }, { height: 45, left: 8, width: 305.875 });
    assert.equal(shell.account, "Demo account");
    assert.deepEqual(shell.footerActions, ["Start new voice chat", "Open help menu"]);
    assert.deepEqual(shell.main && {
      height: shell.main.height,
      left: shell.main.left,
      width: shell.main.width,
    }, {
      height: scene.windowSize.height,
      left: sidebarWidth,
      width: scene.windowSize.width - sidebarWidth,
    });
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
    replayEvidence: "current 26.915 sidebar shell",
    scenes: scenes.map(({ id }) => id),
  }),
);
