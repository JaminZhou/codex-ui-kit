import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-worktree-setup-26-915-"),
);

const scenes = [
  ...["queued", "creating", "failed", "created"].flatMap((phase) => [
    {
      frame: `current-worktree-setup-${phase}`,
      id: `current-worktree-setup-26-915-${phase}-wide`,
      scenario: "workspace-workflow",
      theme: "dark",
      view: "conversation",
      windowSize: { height: 820, width: 1180 },
    },
    {
      frame: `current-worktree-setup-${phase}`,
      id: `current-worktree-setup-26-915-${phase}-compact`,
      scenario: "workspace-workflow",
      theme: "dark",
      view: "conversation",
      windowSize: { height: 680, width: 720 },
    },
  ]),
];

function readContract(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const setup = document.querySelector(".demo-current-worktree-setup");
    const rect = (element) => {
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
    return {
      frame: root?.getAttribute("data-frame"),
      fixture: setup?.getAttribute("data-current-worktree-setup-fixture"),
      phase: setup?.getAttribute("data-phase"),
      ariaBusy: setup?.getAttribute("aria-busy"),
      role: setup?.getAttribute("role"),
      title: setup?.querySelector("h3")?.textContent?.trim(),
      steps: Array.from(
        setup?.querySelectorAll(".codex-ui-worktree-setup__steps li") ?? [],
        (step) => ({
          label: step.querySelector(
            ".codex-ui-worktree-setup__step-label",
          )?.textContent?.trim(),
          status: step.getAttribute("data-status"),
        }),
      ),
      actionLabels: Array.from(
        setup?.querySelectorAll("button") ?? [],
        (button) => button.textContent?.trim(),
      ),
      setupRect: rect(setup),
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function assertContract(contract, scene) {
  const phase = scene.frame.replace("current-worktree-setup-", "");
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.fixture, phase);
  assert.equal(contract.phase, phase);
  assert.equal(contract.overflow, 0);
  assert.ok(contract.setupRect);

  const expected = {
    queued: {
      ariaBusy: "true",
      role: "status",
      title: "Worktree setup queued",
      steps: ["pending", "pending"],
      actionLabels: ["More details", "Work locally", "Cancel"],
    },
    creating: {
      ariaBusy: "true",
      role: "status",
      title: "Creating a worktree",
      steps: ["completed", "in-progress"],
      actionLabels: ["More details", "Work locally", "Cancel"],
    },
    failed: {
      ariaBusy: null,
      role: "alert",
      title: "Worktree setup failed",
      steps: ["completed", "failed"],
      actionLabels: ["Less details", "Edit environment", "Retry"],
    },
    created: {
      ariaBusy: null,
      role: "status",
      title: "Worktree created",
      steps: [],
      actionLabels: [],
    },
  }[phase];
  assert.deepEqual(
    {
      ariaBusy: contract.ariaBusy,
      role: contract.role,
      title: contract.title,
      steps: contract.steps.map(({ status }) => status),
      actionLabels: contract.actionLabels,
    },
    expected,
  );
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const contract = readContract(page);
    assertContract(await contract, scene);
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(await contract, null, 2)}\n`,
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
      `${scene.id}: current 26.915 replay drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift across queued/creating/failed/created at 1180/720",
    replayEvidence: "current 26.915 worktree setup lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
