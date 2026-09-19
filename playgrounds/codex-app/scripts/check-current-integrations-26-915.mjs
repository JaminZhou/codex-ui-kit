import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

// The installed 26.915 catalog observation is read-only. This gate preserves
// its current labels/counts and compact search ownership without claiming
// install, OAuth, permission, registry, execution, or product-pixel effects.
const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-integrations-26-915-"),
);

const pluginTitles = [
  "Gmail",
  "GitHub",
  "Google Drive",
  "Google Calendar",
  "Notion",
  "Slack",
  "Tableau",
  "Microsoft Power BI",
  "AWS Data Analytics",
  "ClickHouse",
  "Firebase",
  "Dropbox",
  "HubSpot",
  "Stripe",
  "Canva",
  "Figma",
  "Slack",
];
const skillTitles = [
  "ASC Tooling",
  "Image Gen",
  "OpenAI Docs",
  "Plugin Creator",
  "RedRocket Market",
  "Review Agent",
  "ASC Tooling",
  "RedRocket Market",
];

const scenes = [
  {
    frame: "integration-plugins-current-26-915",
    id: "integration-plugins-current-26-915",
    kind: "plugins",
    scenario: "workspace-workflow",
    view: "plugins",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-plugins-current-26-915",
    id: "integration-plugins-current-26-915-compact",
    kind: "plugins",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "plugins",
    windowSize: { height: 820, width: 720 },
  },
  {
    frame: "integration-skills-current-26-915",
    id: "integration-skills-current-26-915",
    kind: "skills",
    scenario: "workspace-workflow",
    view: "plugins",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-skills-current-26-915",
    id: "integration-skills-current-26-915-compact",
    kind: "skills",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "plugins",
    windowSize: { height: 820, width: 720 },
  },
];

async function inspect(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await page.evaluate((expectedKind) => {
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
        ".demo-current-integration-catalog",
      );
      return {
        body: rect(root?.querySelector(".codex-ui-integration-catalog__body")),
        description: root?.querySelector(".codex-ui-integration-catalog__intro p")
          ?.textContent?.trim(),
        frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
        heading: rect(root?.querySelector("h1")),
        headingText: root?.querySelector("h1")?.textContent?.trim(),
        installedCount: root?.querySelectorAll(
          ".codex-ui-integration-catalog__installed-icon",
        ).length,
        itemTitles: [
          ...(root?.querySelectorAll(
            ".codex-ui-integration-catalog__item-title",
          ) ?? []),
        ].map((item) => item.textContent?.trim()),
        kind: root?.getAttribute("data-kind"),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        search: rect(root?.querySelector(".codex-ui-integration-catalog__search")),
      };
    }, scene.kind);

    const compact = scene.windowSize.width === 720;
    const expectedTitles = scene.kind === "plugins" ? pluginTitles : skillTitles;
    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.kind, scene.kind);
    assert.equal(contract.headingText, scene.kind === "plugins" ? "Plugins" : "Skills");
    assert.equal(
      contract.description,
      scene.kind === "plugins"
        ? "Work with Codex across your favorite tools"
        : "Extend Codex with task-specific skills",
    );
    assert.deepEqual(contract.itemTitles, expectedTitles);
    assert.equal(contract.overflow, 0);
    assert.ok(contract.heading && contract.search && contract.body);
    assert.ok(Math.abs(contract.heading.left - (compact ? 29 : 395.9375)) <= 1.5);
    assert.ok(Math.abs(contract.search.left - (compact ? 21 : 387.9375)) <= 1.5);
    assert.ok(Math.abs(contract.search.width - (compact ? 679 : 728)) <= 1);
    if (scene.kind === "plugins") assert.equal(contract.installedCount, 13);
    else assert.equal(contract.installedCount, 0);

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
      `${scene.id}: current 26.915 integration replay drifted`,
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
