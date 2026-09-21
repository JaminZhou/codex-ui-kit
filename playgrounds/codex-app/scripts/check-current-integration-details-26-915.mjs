import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

// The installed 26.915 detail captures are navigation/read-only evidence. This
// gate keeps their measured wide/compact containers and public menu labels in a
// deterministic replay without claiming install, OAuth, execution, or product
// pixel parity for host-owned artwork and dynamic copy.
const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-integration-details-26-915-"),
);

const scenes = [
  {
    frame: "integration-plugin-detail-current-26-915-installed",
    id: "integration-plugin-detail-current-26-915-installed",
    kind: "plugin",
    installed: true,
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-installed",
    id: "integration-plugin-detail-current-26-915-installed-compact",
    kind: "plugin",
    installed: true,
    sidebarState: "compact-collapsed",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-discovery",
    id: "integration-plugin-detail-current-26-915-discovery",
    kind: "plugin",
    installed: false,
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-actions",
    id: "integration-plugin-detail-current-26-915-actions",
    kind: "plugin",
    installed: true,
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-connection",
    id: "integration-plugin-detail-current-26-915-connection",
    kind: "plugin",
    installed: true,
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-discovery-failure",
    id: "integration-plugin-detail-current-26-915-discovery-failure",
    kind: "plugin",
    installed: false,
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugin-detail-current-26-915-discovery-failure",
    id: "integration-plugin-detail-current-26-915-discovery-failure-compact",
    kind: "plugin",
    installed: false,
    sidebarState: "compact-collapsed",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "integration-skill-detail-current-26-915-installed",
    id: "integration-skill-detail-current-26-915-installed",
    kind: "skill",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-skill-detail-current-26-915-installed",
    id: "integration-skill-detail-current-26-915-installed-compact",
    kind: "skill",
    sidebarState: "compact-collapsed",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "integration-skill-detail-current-26-915-actions",
    id: "integration-skill-detail-current-26-915-actions",
    kind: "skill",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-skill-detail-current-26-915-failure",
    id: "integration-skill-detail-current-26-915-failure",
    kind: "skill",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-skill-detail-current-26-915-failure",
    id: "integration-skill-detail-current-26-915-failure-compact",
    kind: "skill",
    sidebarState: "compact-collapsed",
    windowSize: { height: 680, width: 720 },
  },
];

const rect = (element) => {
  if (!(element instanceof Element)) return null;
  const value = element.getBoundingClientRect();
  return {
    height: value.height,
    left: value.left,
    top: value.top,
    width: value.width,
  };
};

function closeTo(actual, expected, tolerance = 1.5) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
}

async function inspect(scene) {
  const { app, page } = await launchScene(
    { ...scene, scenario: "workspace-workflow", view: "plugins" },
    { capture: false },
  );
  try {
    const errorScene = scene.id.includes("-failure");
    const contract = await page.evaluate((kind) => {
      const root = document.querySelector(
        kind === "plugin"
          ? ".codex-ui-plugin-detail"
          : ".codex-ui-skill-detail",
      );
      const nodeRect = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const labels = (selector) =>
        Array.from(root?.querySelectorAll(selector) ?? [], (item) =>
          item.textContent?.trim(),
        );
      const menuItems = labels('[role="menuitem"]');
      if (kind === "plugin") {
        return {
          actions: labels(".codex-ui-plugin-detail__actions button"),
          appCount: root?.querySelectorAll(
            ".codex-ui-plugin-detail__app-list article",
          ).length ?? 0,
          artwork: nodeRect(
            root?.querySelector(".codex-ui-plugin-detail__artwork"),
          ),
          className: root?.className,
          frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
          header: nodeRect(root?.querySelector(".codex-ui-plugin-detail__header")),
          infoLabels: labels(".codex-ui-plugin-detail__information dt"),
          menuItems,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          scroller: nodeRect(root),
          scrollHeight: root?.scrollHeight ?? 0,
          suggestions: root?.querySelectorAll(
            ".codex-ui-plugin-detail__suggestions > button",
          ).length ?? 0,
          title: root?.querySelector(".codex-ui-plugin-detail__title-row h1")
            ?.textContent?.trim(),
          viewport: { height: innerHeight, width: innerWidth },
        };
      }
      const dialog = root?.closest(".codex-ui-dialog")?.querySelector(
        '[role="dialog"]',
      );
      const content = root?.querySelector(".codex-ui-skill-detail__content");
      return {
        dialog: nodeRect(dialog),
        frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
        menuItems,
        overflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scroller: nodeRect(content),
        scrollHeight: content?.scrollHeight ?? 0,
        title: root?.querySelector(".codex-ui-skill-detail__name-row h2")
          ?.textContent?.trim(),
        viewport: { height: innerHeight, width: innerWidth },
      };
    }, scene.kind);

    const compact = scene.windowSize.width === 720;
    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.overflow, 0);
    assert.deepEqual(contract.viewport, scene.windowSize);

    if (scene.kind === "plugin") {
      assert.ok(contract.scroller);
      assert.ok(
        closeTo(contract.scroller.left, compact ? 0 : 322.875) &&
          closeTo(contract.scroller.top, 46) &&
          closeTo(contract.scroller.width, compact ? 720 : 857.125) &&
          closeTo(contract.scroller.height, compact ? 634 : 774),
      );
      assert.ok(
        contract.header &&
          closeTo(contract.header.width, compact ? 688 : 736) &&
          closeTo(contract.artwork?.width, 58) &&
          closeTo(contract.artwork?.height, 58),
      );
      assert.equal(contract.suggestions, 3);
      assert.deepEqual(contract.infoLabels, [
        "Capabilities",
        "Developer",
        "Category",
        "Version",
        "Website",
        "Privacy Policy",
        "Terms of Service",
      ]);
      assert.equal(contract.appCount, scene.installed ? 2 : 1);
      assert.ok(
        scene.installed
          ? contract.actions.some((label) => label.includes("Copy link")) &&
            contract.actions.some((label) => label.includes("Try now"))
          : contract.actions.some((label) => label.includes("Install plugin")),
        JSON.stringify(contract),
      );
      if (scene.id.endsWith("-actions")) {
        assert.deepEqual(contract.menuItems, ["Uninstall"]);
      }
      if (scene.id.endsWith("-connection")) {
        assert.deepEqual(
          contract.menuItems,
          ["Rename account", "Reconnect", "Disconnect"],
          JSON.stringify(contract),
        );
      }
    } else {
      assert.ok(contract.dialog && contract.scroller, JSON.stringify(contract));
      assert.ok(
        closeTo(contract.dialog.left, compact ? 60 : 290) &&
          closeTo(contract.dialog.top, compact ? 0 : 50) &&
          closeTo(contract.dialog.width, 600) &&
          closeTo(contract.dialog.height, compact ? 680 : 720),
      );
      assert.ok(
        closeTo(contract.scroller.left, compact ? 81 : 311) &&
          (errorScene
            ? contract.scroller.top >= 0
            : closeTo(contract.scroller.top, compact ? 169 : 219)) &&
          closeTo(contract.scroller.width, 558) &&
          (errorScene
            ? contract.scroller.height > 0
            : closeTo(contract.scroller.height, compact ? 450 : 490)),
        JSON.stringify(contract),
      );
      assert.equal(contract.title, "OpenAI Docs");
      if (scene.id.endsWith("-actions")) {
        assert.deepEqual(contract.menuItems, [
          "Open",
          "Reveal in Finder",
          "Copy Markdown",
        ]);
      }
    }

    if (scene.id.includes("-failure")) {
      const alert = page.locator(
        ".codex-ui-plugin-detail [role=\"alert\"], .codex-ui-skill-detail [role=\"alert\"]",
      );
      await alert.waitFor();
      assert.match(
        await alert.innerText(),
        /did not complete|Check the connection/,
      );
      await page.getByRole("button", { name: "Retry" }).click();
      await page.waitForFunction(() =>
        !document.querySelector(
          '.codex-ui-plugin-detail [role="alert"], .codex-ui-skill-detail [role="alert"]',
        ),
      );
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    return { app, screenshot: await page.screenshot() };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await inspect(scene);
  await first.app.close();
  const second = await inspect(scene);
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
      `${scene.id}: current 26.915 detail replay drifted`,
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
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.915.31945",
    scenes: scenes.map(({ id }) => id),
  }),
);
