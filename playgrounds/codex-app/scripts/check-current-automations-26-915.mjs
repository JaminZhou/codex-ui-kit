import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

// The installed 26.915 capture is deliberately read-only. This gate keeps the
// same measured route identity in the private playground without pretending to
// own cloud scheduling, permissions, delivery, or provider mutations.
const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-automations-26-915-"),
);

const scenes = [
  {
    frame: "scheduled-current-26-915",
    id: "scheduled-current-26-915",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "scheduled-current-26-915",
    id: "scheduled-current-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 720 },
  },
  {
    frame: "scheduled-current-26-915-manual",
    id: "scheduled-current-26-915-manual",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "scheduled-current-26-915-manual",
    id: "scheduled-current-26-915-manual-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 720 },
  },
  {
    frame: "scheduled-current-26-915-detail",
    id: "scheduled-current-26-915-detail",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "scheduled-current-26-915-detail",
    id: "scheduled-current-26-915-detail-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 720 },
  },
  {
    frame: "scheduled-current-26-915-detail-error",
    id: "scheduled-current-26-915-detail-error",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "scheduled-current-26-915-detail-error",
    id: "scheduled-current-26-915-detail-error-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "automations",
    windowSize: { height: 820, width: 720 },
  },
];

async function inspect(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const compact = scene.windowSize.width === 720;
    const detail = scene.frame.includes("detail");
    const manual = scene.frame.endsWith("manual");
    const contract = await page.evaluate((isManual) => {
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
      const root = document.querySelector(
        isManual ? ".codex-ui-scheduled-task-navigator" : ".codex-ui-scheduled-tasks",
      );
      const detail = document.querySelector(".codex-ui-scheduled-task-detail");
      const pageRoot = document.querySelector(".demo-current-scheduled-route");
      const navigator = document.querySelector(
        ".codex-ui-scheduled-task-navigator",
      );
      const editor = document.querySelector(".codex-ui-scheduled-task-editor");
      return {
        editor: rect(editor),
        detail: rect(detail),
        detailFacts: detail?.querySelectorAll(".codex-ui-scheduled-task-detail__facts > div").length ?? 0,
        detailStatus: detail?.getAttribute("data-status"),
        detailTitle: detail?.querySelector("h2")?.textContent?.trim(),
        filters: [...(root?.querySelectorAll(".codex-ui-scheduled-task-filters [role=tab]") ?? [])]
          .map((button) => button.textContent?.trim()),
        frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
        heading: rect(root?.querySelector("h1")),
        headingText: root?.querySelector("h1")?.textContent?.trim(),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        navigator: rect(navigator),
        pageRoot: rect(pageRoot),
        search: rect(root?.querySelector(".codex-ui-scheduled-tasks__search")),
        suggestionCount: root?.querySelectorAll(
          ".codex-ui-scheduled-tasks__suggestion",
        ).length,
        taskCount: root?.querySelectorAll(".codex-ui-scheduled-tasks__task").length,
      };
    }, manual);

    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.horizontalOverflow, 0);

    if (detail) {
      assert.ok(contract.detail);
      assert.equal(contract.detailFacts, 4);
      assert.equal(contract.detailTitle, "Workspace brief");
      assert.equal(
        contract.detailStatus,
        scene.frame.includes("detail-error") ? "error" : "ready",
      );
      assert.ok(Math.abs(contract.detail.width - (compact ? 680 : 768)) <= 3);
      const detailRoot = page.getByRole("region", { name: "Scheduled task details" });
      if (scene.frame.includes("detail-error")) {
        await detailRoot.getByRole("button", { name: "Retry" }).click();
      } else {
        await detailRoot.getByRole("button", { name: "Run now" }).click();
      }
      await page.locator('.codex-ui-scheduled-task-detail[data-status="ready"]').waitFor();
      await detailRoot.getByRole("button", { name: "Pause" }).click();
      await detailRoot.getByRole("button", { name: "Resume" }).waitFor();
      await detailRoot.getByRole("button", { name: "Edit" }).click();
      const editorRoot = page.getByRole("region", { name: "Scheduled task editor" });
      await editorRoot.getByRole("textbox", { name: "Name" }).fill("Workspace brief revised");
      await editorRoot.getByRole("textbox", { name: "Instructions" }).fill("Run workspace brief revised");
      await editorRoot.getByRole("button", { name: "Save" }).click();
      await page.getByRole("region", { name: "Scheduled task details" }).waitFor();
    } else if (manual) {
      assert.ok(contract.navigator && contract.editor);
      assert.ok(
        Math.abs(contract.navigator.width - (compact ? 374 : 437.125)) <= 1.5,
      );
      assert.ok(
        Math.abs(contract.editor.width - (compact ? 346 : 420)) <= 1.5,
      );
      assert.ok(contract.search);
      assert.ok(Math.abs(contract.search.left - (compact ? 21 : 342.875)) <= 1);
    } else {
      assert.ok(contract.heading && contract.search && contract.pageRoot);
      assert.equal(contract.headingText, "Scheduled tasks");
      assert.deepEqual(contract.filters, ["All", "Active", "Paused", "Completed"]);
      assert.ok(Math.abs(contract.heading.left - (compact ? 29 : 395.4375)) <= 1);
      assert.ok(Math.abs(contract.search.left - (compact ? 21 : 387.4375)) <= 1);
      assert.ok(Math.abs(contract.search.width - (compact ? 679 : 728)) <= 1);
      assert.equal(contract.suggestionCount, 0);
      assert.equal(contract.taskCount, 3);
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
      `${scene.id}: current 26.915 scheduled replay drifted`,
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
