import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const requestedScenesArgument = process.argv.find((argument) =>
  argument.startsWith("--scenes="),
);
const requestedSceneIds = requestedScenesArgument
  ? new Set(
      requestedScenesArgument
        .slice("--scenes=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  : null;
const selectedScenes = requestedSceneIds
  ? visualScenes.filter(({ id }) => requestedSceneIds.has(id))
  : visualScenes;
if (
  requestedSceneIds &&
  selectedScenes.length !== requestedSceneIds.size
) {
  const knownIds = new Set(visualScenes.map(({ id }) => id));
  const unknownIds = [...requestedSceneIds].filter((id) => !knownIds.has(id));
  throw new Error(`Unknown visual scenes: ${unknownIds.join(", ")}`);
}
const root = process.cwd();
const baselineDirectory = join(root, "tests", "visual", "baselines");
const artifactDirectory = join(root, "artifacts", "visual");
const currentBuildMultiFileReference =
  process.env.CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE;
const currentBuildMultiFileReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildReviewRenameReference =
  process.env.CODEX_UI_KIT_CURRENT_REVIEW_REFERENCE;
const currentBuildReviewRenameReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildPullRequestReference =
  process.env.CODEX_UI_KIT_PULL_REQUEST_REFERENCE;
const currentBuildPullRequestReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildTerminalReference =
  process.env.CODEX_UI_KIT_TERMINAL_REFERENCE;
const currentBuildTerminalReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildMarkdownReference =
  process.env.CODEX_UI_KIT_MARKDOWN_REFERENCE;
const currentBuildMarkdownReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildMarkdownTablePreviewReference =
  process.env.CODEX_UI_KIT_MARKDOWN_TABLE_PREVIEW_REFERENCE;
const currentBuildMarkdownTablePreviewReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildMcpReference =
  process.env.CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE;
const currentBuildMcpReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildMcpRecoveryReference =
  process.env.CODEX_UI_KIT_MCP_RECOVERY_REFERENCE;
const currentBuildMcpRecoveryReferenceSize = {
  height: 820,
  width: 906,
};
const currentMcpSuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SUCCESS_REFERENCE;
const currentMcpSuccessReferenceSize = {
  height: 820,
  width: 905,
};
const currentMcpRecoveryCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_REFERENCE;
const currentMcpRecoveryCompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentIntegrationRecoveryReference =
  process.env.CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_REFERENCE;
const currentIntegrationRecoveryReferenceSize = {
  height: 680,
  width: 720,
};
const currentBuildComposerQueuedReference =
  process.env.CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE;
const currentBuildComposerContinuedReference =
  process.env.CODEX_UI_KIT_COMPOSER_CONTINUED_REFERENCE;
const currentBuildComposerPausedReference =
  process.env.CODEX_UI_KIT_COMPOSER_PAUSED_REFERENCE;
const currentBuildComposerReferenceSize = {
  height: 320,
  width: 792,
};
const currentBuildComposerMultilineReference =
  process.env.CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE;
const currentBuildComposerPermissionsReference =
  process.env.CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE;
const currentBuildComposerResourcesReference =
  process.env.CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE;
const currentBuildComposerGoalReference =
  process.env.CODEX_UI_KIT_COMPOSER_GOAL_REFERENCE;
const currentBuildComposerPlanReference =
  process.env.CODEX_UI_KIT_COMPOSER_PLAN_REFERENCE;
const currentBuildAttachmentReadyReference =
  process.env.CODEX_UI_KIT_ATTACHMENT_READY_REFERENCE;
const currentBuildAttachmentCompletedReference =
  process.env.CODEX_UI_KIT_ATTACHMENT_COMPLETED_REFERENCE;
const currentBuildAttachmentReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildComposerMenuReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildLongThreadReference =
  process.env.CODEX_UI_KIT_LONG_THREAD_REFERENCE;
const currentBuildLongThreadReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildApprovalPendingReference =
  process.env.CODEX_UI_KIT_APPROVAL_PENDING_REFERENCE;
const currentBuildApprovalDeniedReference =
  process.env.CODEX_UI_KIT_APPROVAL_DENIED_REFERENCE;
const currentBuildApprovalAllowOnceCompletedReference =
  process.env.CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_REFERENCE;
const currentBuildApprovalSimilarMenuReference =
  process.env.CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_REFERENCE;
const currentBuildApprovalSimilarCompletedReference =
  process.env.CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_REFERENCE;
const currentBuildApprovalReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildCommandOutputReference =
  process.env.CODEX_UI_KIT_COMMAND_OUTPUT_REFERENCE;
const currentBuildCommandOutputReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildCommandFailureReference =
  process.env.CODEX_UI_KIT_COMMAND_FAILURE_REFERENCE;
const currentBuildCommandFailureReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildCommandInterruptionReference =
  process.env.CODEX_UI_KIT_COMMAND_INTERRUPTION_REFERENCE;
const currentBuildCommandInterruptionReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildContextCompactionReference =
  process.env.CODEX_UI_KIT_CONTEXT_COMPACTION_REFERENCE;
const currentBuildContextCompactionReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildContextSummaryReference =
  process.env.CODEX_UI_KIT_CONTEXT_SUMMARY_REFERENCE;
const currentBuildContextSummaryReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildSubagentSummaryReference =
  process.env.CODEX_UI_KIT_SUBAGENT_SUMMARY_REFERENCE;
const currentBuildSubagentPanelReference =
  process.env.CODEX_UI_KIT_SUBAGENT_PANEL_REFERENCE;
const currentBuildSubagentTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_TRANSCRIPT_REFERENCE;
const currentBuildSubagentConcurrentSummaryReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_SUMMARY_REFERENCE;
const currentBuildSubagentConcurrentMixedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_MIXED_REFERENCE;
const currentBuildSubagentConcurrentCompletedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_COMPLETED_REFERENCE;
const currentBuildSubagentConcurrentTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_TRANSCRIPT_REFERENCE;
const currentBuildSubagentNestedRunningReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_RUNNING_REFERENCE;
const currentBuildSubagentNestedMixedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_MIXED_REFERENCE;
const currentBuildSubagentNestedCompletedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_COMPLETED_REFERENCE;
const currentBuildSubagentNestedTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_TRANSCRIPT_REFERENCE;
const currentBuildWorkspaceReference =
  process.env.CODEX_UI_KIT_WORKSPACE_REFERENCE;
const currentBuildWorkspaceReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildComposerIconReferenceBounds = [
  { height: 16, left: 387, name: "composer-project", top: 679, width: 16 },
  { height: 16, left: 505, name: "composer-worktree", top: 679, width: 16 },
  { height: 16, left: 581, name: "composer-branch", top: 679, width: 16 },
  { height: 16, left: 373, name: "composer-add-files", top: 774, width: 16 },
  { height: 16, left: 407, name: "composer-permission", top: 774, width: 16 },
  {
    height: 14,
    left: 998,
    name: "composer-model-chevron",
    top: 775,
    width: 14,
  },
  { height: 16, left: 1029, name: "composer-dictate", top: 774, width: 16 },
  { height: 16, left: 1065, name: "composer-voice", top: 774, width: 16 },
];
const currentBuildWorkspaceProjectReference =
  process.env.CODEX_UI_KIT_WORKSPACE_PROJECT_REFERENCE;
const currentBuildWorkspaceProjectReferenceSize = {
  height: 144,
  width: 252,
};
const currentBuildWorkspaceEnvironmentReference =
  process.env.CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_REFERENCE;
const currentBuildWorkspaceEnvironmentPickerReference =
  process.env.CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_PICKER_REFERENCE;
const currentBuildWorkspaceNewWorktreeReference =
  process.env.CODEX_UI_KIT_WORKSPACE_NEW_WORKTREE_REFERENCE;
const currentBuildWorkspaceNoProjectReference =
  process.env.CODEX_UI_KIT_WORKSPACE_NO_PROJECT_REFERENCE;
const currentBuildWorkspaceCompactReference =
  process.env.CODEX_UI_KIT_WORKSPACE_COMPACT_REFERENCE;
const currentBuildWorkspaceWorktreeReference =
  process.env.CODEX_UI_KIT_WORKSPACE_WORKTREE_REFERENCE;
const currentBuildSidebarReference =
  process.env.CODEX_UI_KIT_SIDEBAR_REFERENCE;
const currentBuildSidebarRecentsReference =
  process.env.CODEX_UI_KIT_SIDEBAR_RECENTS_REFERENCE;
const currentBuildWindowChromeReference =
  process.env.CODEX_UI_KIT_WINDOW_CHROME_REFERENCE;
const defaultLifecycleMainPixelRatio = 0.0025;
const defaultLifecycleSidebarPixelRatio = 0.05;
const internalSidebarWidth = 274;
const currentBuildSidebarReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildWindowChromeReferenceSize = {
  height: 46,
  width: 120,
};
await mkdir(baselineDirectory, { recursive: true });
await mkdir(artifactDirectory, { recursive: true });

function cropPng(source, left, top, width, height) {
  const crop = new PNG({ height, width });
  PNG.bitblt(source, crop, left, top, width, height, 0, 0);
  return crop;
}

function clonePng(source) {
  return PNG.sync.read(PNG.sync.write(source));
}

function comparePng(reference, actual, threshold = 0.05) {
  const diff = new PNG({ height: actual.height, width: actual.width });
  const pixels = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    {
      includeAA: false,
      threshold,
    },
  );
  return {
    diff,
    pixels,
    ratio: pixels / (actual.width * actual.height),
  };
}

function flattenPng(image, background) {
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3] / 255;
    if (alpha >= 1) continue;
    image.data[index] = Math.round(
      image.data[index] * alpha + background.red * (1 - alpha),
    );
    image.data[index + 1] = Math.round(
      image.data[index + 1] * alpha +
        background.green * (1 - alpha),
    );
    image.data[index + 2] = Math.round(
      image.data[index + 2] * alpha + background.blue * (1 - alpha),
    );
    image.data[index + 3] = 255;
  }
  return image;
}

function maskPng(image, masks) {
  for (const { height, left, top, width } of masks) {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        const index = (y * image.width + x) * 4;
        image.data[index] = 0;
        image.data[index + 1] = 0;
        image.data[index + 2] = 0;
        image.data[index + 3] = 0;
      }
    }
  }
  return image;
}

function environmentRatio(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a ratio between 0 and 1.`);
  }
  return value;
}

async function compareCurrentBuildOverlay({
  actual,
  actualBounds,
  defaultMaximumRatio,
  masks,
  maximumRatioName,
  referenceCrop,
  referencePath,
  sceneId,
}) {
  const referenceFull = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  if (
    referenceFull.width !== currentBuildWorkspaceReferenceSize.width ||
    referenceFull.height !== currentBuildWorkspaceReferenceSize.height
  ) {
    throw new Error(
      `${sceneId}: current-build overlay reference must be exactly ${currentBuildWorkspaceReferenceSize.width}x${currentBuildWorkspaceReferenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
    );
  }
  if (
    !actualBounds ||
    actualBounds.width !== referenceCrop.width ||
    actualBounds.height !== referenceCrop.height
  ) {
    throw new Error(
      `${sceneId}: current-build overlay bounds do not match ${referenceCrop.width}x${referenceCrop.height}: ${JSON.stringify(actualBounds)}.`,
    );
  }
  const reference = cropPng(
    referenceFull,
    referenceCrop.left,
    referenceCrop.top,
    referenceCrop.width,
    referenceCrop.height,
  );
  const overlayActual = cropPng(
    actual,
    actualBounds.left,
    actualBounds.top,
    actualBounds.width,
    actualBounds.height,
  );
  const comparison = comparePng(
    maskPng(reference, masks),
    maskPng(overlayActual, masks),
  );
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  await writeFile(
    join(artifactDirectory, `${sceneId}.current-build.png`),
    PNG.sync.write(overlayActual),
  );
  if (comparison.pixels > 0) {
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.current-build.diff.png`,
      ),
      PNG.sync.write(comparison.diff),
    );
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: current-build overlay pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: current-build overlay pixel ratio ${comparison.ratio}`,
  );
}

async function compareCurrentBuildWorkspaceFrame({
  actual,
  defaultMaximumRatio,
  masks,
  maximumRatioName,
  referencePath,
  sceneId,
}) {
  const reference = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  if (
    reference.width !== actual.width ||
    reference.height !== actual.height
  ) {
    throw new Error(
      `${sceneId}: current-build workspace frame must match ${actual.width}x${actual.height}, received ${reference.width}x${reference.height}.`,
    );
  }
  const comparison = comparePng(
    maskPng(reference, masks),
    maskPng(actual, masks),
  );
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  await writeFile(
    join(artifactDirectory, `${sceneId}.current-build.png`),
    PNG.sync.write(actual),
  );
  if (comparison.pixels > 0) {
    await writeFile(
      join(artifactDirectory, `${sceneId}.current-build.diff.png`),
      PNG.sync.write(comparison.diff),
    );
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: current-build workspace frame pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: current-build workspace frame pixel ratio ${comparison.ratio}`,
  );
}

const regionalFailures = [];

for (const scene of selectedScenes) {
  const { app, page } = await launchScene(scene);
  const actualPath = join(artifactDirectory, `${scene.id}.png`);
  const baselinePath = join(baselineDirectory, `${scene.id}.png`);
  const diffPath = join(artifactDirectory, `${scene.id}.diff.png`);
  let sidebarSelectedTop;
  let sidebarRecentsBounds;
  let workspaceCurrentIconBounds;
  let workspaceEnvironmentMenuBounds;
  let workspaceEnvironmentPickerBounds;
  let workspaceProjectListboxBounds;
  let workspaceWorktreeMenuBounds;

  try {
    if (scene.id === "workspace-ready") {
      workspaceCurrentIconBounds = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            ".demo-workspace-start [data-current-build-icon]",
          ),
          (icon) => {
            const value = icon.getBoundingClientRect();
            return {
              height: Math.round(value.height),
              left: Math.round(value.left),
              name: icon.getAttribute("data-current-build-icon"),
              top: Math.round(value.top),
              width: Math.round(value.width),
            };
          },
        ),
      );
    }
    if (scene.id === "current-sidebar") {
      sidebarSelectedTop = await page.evaluate(() => {
        const current = Array.from(
          document.querySelectorAll(
            ".codex-ui-app-sidebar__project-group > .codex-ui-app-sidebar__item-row > [aria-current=\"page\"]",
          ),
        );
        if (current.length !== 1) {
          throw new Error(
            `Expected one current sidebar page, received ${current.length}.`,
          );
        }
        return Math.round(current[0].getBoundingClientRect().top);
      });
    }
    if (scene.id === "current-sidebar-recents") {
      sidebarRecentsBounds = await page
        .locator(
          '.codex-ui-app-sidebar__section[data-kind="threads"]',
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "multi-file-review") {
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    }
    if (scene.id === "workspace-project-menu") {
      workspaceProjectListboxBounds = await page
        .locator(
          ".demo-workspace-project-dialog .codex-ui-conversation-project-options",
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.ceil(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-environment-menu") {
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
      workspaceEnvironmentMenuBounds = await page
        .locator(".demo-workspace-environment-menu[role=\"menu\"]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-environment-picker") {
      workspaceEnvironmentPickerBounds = await page
        .locator(
          ".demo-workspace-worktree-environment-menu[role=\"menu\"]",
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-worktree-menu") {
      workspaceWorktreeMenuBounds = await page
        .locator(".demo-workspace-worktree-menu[role=\"menu\"]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (
      scene.id === "markdown-complete" ||
      scene.scenario === "markdown-streaming-large" ||
      scene.scenario === "markdown-table-actions"
    ) {
      await page.addStyleTag({
        content: `
          .codex-ui-conversation-thread-shell__viewport,
          .codex-ui-markdown__table-scroll,
          .codex-ui-markdown-table-preview__surface {
            scrollbar-width: none;
          }

          .codex-ui-conversation-thread-shell__viewport::-webkit-scrollbar,
          .codex-ui-markdown__table-scroll::-webkit-scrollbar,
          .codex-ui-markdown-table-preview__surface::-webkit-scrollbar {
            display: none;
          }
        `,
      });
    }
    if (scene.markdownTableState) {
      const tableContainer = page.locator(
        '[data-item-id="assistant-markdown-table-actions"] [data-markdown-table]',
      );
      await tableContainer.scrollIntoViewIfNeeded();
      await tableContainer.hover();
      await page.waitForTimeout(150);
      if (scene.id === "markdown-table-actions-narrow") {
        const actions = tableContainer.locator(
          ".codex-ui-markdown__table-actions",
        );
        const actionBounds = await actions.boundingBox();
        const buttonBounds = await Promise.all(
          (await actions.locator("button").all()).map((button) =>
            button.boundingBox(),
          ),
        );
        if (
          !actionBounds ||
          actionBounds.left < 0 ||
          actionBounds.left + actionBounds.width > 720 ||
          buttonBounds.some(
            (bounds) =>
              !bounds || bounds.left < 0 || bounds.left + bounds.width > 720,
          )
        ) {
          throw new Error(
            `${scene.id}: narrow table actions are clipped: ${JSON.stringify({ actionBounds, buttonBounds })}`,
          );
        }
      }
      if (scene.markdownTableState === "preview") {
        await tableContainer
          .getByRole("button", { name: "Expand table" })
          .click();
        await page
          .getByRole("dialog", { name: "Table preview" })
          .waitFor({ state: "visible" });
      }
    }
    if (
      scene.id === "approval-current-similar-menu" ||
      scene.id === "approval-current-session-menu"
    ) {
      await page
        .getByTestId("current-approval-request")
        .getByRole("button", { name: "Approval options" })
        .click();
      await page
        .locator(
          '.codex-ui-approval-request__options-menu [role="menuitem"]',
        )
        .filter({
          hasText:
            scene.id === "approval-current-session-menu"
              ? "Allow all edits"
              : "Allow similar commands",
        })
        .waitFor();
    }
    if (scene.id === "mcp-current-success") {
      await page
        .locator(
          '[data-item-id="mcp-current-fetch"] .codex-ui-activity__header',
        )
        .hover();
    }
    await page.screenshot({
      animations: "disabled",
      path: actualPath,
      type: "png",
    });
  } finally {
    await app.close();
  }

  if (update || !existsSync(baselinePath)) {
    if (!update) {
      throw new Error(
        `Missing ${baselinePath}. Run pnpm visual:update after reviewing the artifact.`,
      );
    }
    await writeFile(baselinePath, await readFile(actualPath));
    continue;
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(await readFile(actualPath));
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `${scene.id}: image dimensions changed from ${baseline.width}x${baseline.height} to ${actual.width}x${actual.height}.`,
    );
  }

  const diff = new PNG({ height: actual.height, width: actual.width });
  const pixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    {
      includeAA: false,
      threshold: 0.12,
    },
  );
  if (pixels > 0) await writeFile(diffPath, PNG.sync.write(diff));
  if (actual.width <= internalSidebarWidth) {
    throw new Error(
      `${scene.id}: frame width ${actual.width}px cannot be split at the ${internalSidebarWidth}px sidebar boundary.`,
    );
  }
  const mainComparison = comparePng(
    cropPng(
      baseline,
      internalSidebarWidth,
      0,
      baseline.width - internalSidebarWidth,
      baseline.height,
    ),
    cropPng(
      actual,
      internalSidebarWidth,
      0,
      actual.width - internalSidebarWidth,
      actual.height,
    ),
    0.12,
  );
  const sidebarComparison = comparePng(
    cropPng(baseline, 0, 0, internalSidebarWidth, baseline.height),
    cropPng(actual, 0, 0, internalSidebarWidth, actual.height),
    0.12,
  );
  const maximumMainPixelRatio =
    scene.maxPixelRatio ?? defaultLifecycleMainPixelRatio;
  if (
    mainComparison.ratio > maximumMainPixelRatio ||
    sidebarComparison.ratio > defaultLifecycleSidebarPixelRatio
  ) {
    const failure =
      `${scene.id}: regional pixel drift ${JSON.stringify({
        main: mainComparison.ratio,
        sidebar: sidebarComparison.ratio,
      })} exceeds ${JSON.stringify({
        main: maximumMainPixelRatio,
        sidebar: defaultLifecycleSidebarPixelRatio,
      })}.`;
    regionalFailures.push(failure);
    console.error(failure);
    continue;
  }

  if (scene.id === "workspace-ready" && currentBuildWorkspaceReference) {
    const referenceFull = flattenPng(
      PNG.sync.read(await readFile(currentBuildWorkspaceReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      referenceFull.width !== currentBuildWorkspaceReferenceSize.width ||
      referenceFull.height !== currentBuildWorkspaceReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build workspace reference must be exactly ${currentBuildWorkspaceReferenceSize.width}x${currentBuildWorkspaceReferenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
      );
    }
    if (
      actual.width !== referenceFull.width ||
      actual.height !== referenceFull.height
    ) {
      throw new Error(
        `${scene.id}: current-build workspace comparison requires matching ${referenceFull.width}x${referenceFull.height} frames.`,
      );
    }
    const reference = cropPng(
      referenceFull,
      internalSidebarWidth,
      0,
      referenceFull.width - internalSidebarWidth,
      referenceFull.height,
    );
    const workspaceActual = cropPng(
      actual,
      internalSidebarWidth,
      0,
      actual.width - internalSidebarWidth,
      actual.height,
    );
    const masks = [
      {
        height: 72,
        left: 170,
        top: 350,
        width: 620,
      },
      {
        height: 54,
        left: 100,
        top: 596,
        width: 706,
      },
      {
        height: 22,
        left: 134,
        top: 676,
        width: 94,
      },
      {
        height: 22,
        left: 252,
        top: 676,
        width: 38,
      },
      {
        height: 22,
        left: 330,
        top: 676,
        width: 174,
      },
      {
        height: 24,
        left: 155,
        top: 768,
        width: 149,
      },
      {
        height: 24,
        left: 606,
        top: 768,
        width: 112,
      },
    ];
    // Align only the recorded integration band: the reference is a main-only
    // crop and the playground retains its 274px application sidebar.
    const comparison = comparePng(
      maskPng(reference, masks),
      maskPng(workspaceActual, masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WORKSPACE_MAX_DIFF_RATIO",
      0.075,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(workspaceActual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build workspace pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build workspace pixel ratio ${comparison.ratio}`,
    );

    if (
      JSON.stringify(workspaceCurrentIconBounds) !==
      JSON.stringify(currentBuildComposerIconReferenceBounds)
    ) {
      throw new Error(
        `${scene.id}: current Composer icon bounds drifted from the current-build reference: ${JSON.stringify(workspaceCurrentIconBounds)}.`,
      );
    }
    const iconComparisons = currentBuildComposerIconReferenceBounds.map(
      (referenceBounds) => {
        return {
          comparison: comparePng(
            cropPng(
              referenceFull,
              referenceBounds.left,
              referenceBounds.top,
              referenceBounds.width,
              referenceBounds.height,
            ),
            cropPng(
              actual,
              referenceBounds.left,
              referenceBounds.top,
              referenceBounds.width,
              referenceBounds.height,
            ),
            0.12,
          ),
          name: referenceBounds.name,
        };
      },
    );
    const composerIconPixels = iconComparisons.reduce(
      (total, { comparison: iconComparison }) =>
        total + iconComparison.pixels,
      0,
    );
    const composerIconArea = currentBuildComposerIconReferenceBounds.reduce(
      (total, { height, width }) => total + height * width,
      0,
    );
    const composerIconRatio = composerIconPixels / composerIconArea;
    const maximumComposerIconRatio = environmentRatio(
      "CODEX_UI_KIT_COMPOSER_ICON_MAX_DIFF_RATIO",
      0.16,
    );
    for (const { comparison: iconComparison, name } of iconComparisons) {
      if (iconComparison.pixels > 0) {
        await writeFile(
          join(
            artifactDirectory,
            `${scene.id}.current-build.${name}.diff.png`,
          ),
          PNG.sync.write(iconComparison.diff),
        );
      }
      if (iconComparison.ratio > maximumComposerIconRatio) {
        throw new Error(
          `${scene.id}: current-build Composer icon ${name} pixel ratio ${iconComparison.ratio} exceeds ${maximumComposerIconRatio}.`,
        );
      }
    }
    if (composerIconRatio > maximumComposerIconRatio) {
      throw new Error(
        `${scene.id}: current-build Composer icon pixel ratio ${composerIconRatio} exceeds ${maximumComposerIconRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer icon pixel ratio ${composerIconRatio}`,
    );
  }

  if (
    scene.id === "workspace-new-worktree" &&
    currentBuildWorkspaceNewWorktreeReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.02,
      masks: [
        { height: 820, left: 0, top: 0, width: 274 },
        { height: 52, left: 480, top: 350, width: 500 },
        { height: 92, left: 406, top: 558, width: 650 },
        { height: 28, left: 402, top: 672, width: 470 },
        { height: 24, left: 367, top: 716, width: 180 },
        { height: 28, left: 398, top: 767, width: 150 },
        { height: 28, left: 870, top: 767, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_NEW_WORKTREE_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceNewWorktreeReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-no-project" &&
    currentBuildWorkspaceNoProjectReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.02,
      masks: [
        { height: 820, left: 0, top: 0, width: 274 },
        { height: 52, left: 520, top: 350, width: 430 },
        { height: 28, left: 402, top: 672, width: 160 },
        { height: 24, left: 367, top: 716, width: 180 },
        { height: 28, left: 398, top: 767, width: 150 },
        { height: 28, left: 870, top: 767, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_NO_PROJECT_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceNoProjectReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-compact-ready" &&
    currentBuildWorkspaceCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.025,
      masks: [
        { height: 42, left: 125, top: 290, width: 480 },
        { height: 90, left: 62, top: 420, width: 610 },
        { height: 28, left: 58, top: 532, width: 400 },
        { height: 24, left: 26, top: 576, width: 180 },
        { height: 28, left: 56, top: 627, width: 150 },
        { height: 28, left: 480, top: 627, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-project-menu" &&
    currentBuildWorkspaceProjectReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildWorkspaceProjectReference),
      ),
      { blue: 48, green: 48, red: 48 },
    );
    if (
      reference.width !== currentBuildWorkspaceProjectReferenceSize.width ||
      reference.height !== currentBuildWorkspaceProjectReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build project reference must be exactly ${currentBuildWorkspaceProjectReferenceSize.width}x${currentBuildWorkspaceProjectReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      !workspaceProjectListboxBounds ||
      workspaceProjectListboxBounds.width !== reference.width ||
      workspaceProjectListboxBounds.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: project listbox bounds do not match the current-build reference: ${JSON.stringify(workspaceProjectListboxBounds)}.`,
      );
    }
    const projectActual = cropPng(
      actual,
      workspaceProjectListboxBounds.left,
      workspaceProjectListboxBounds.top,
      workspaceProjectListboxBounds.width,
      workspaceProjectListboxBounds.height,
    );
    const masks = Array.from({ length: 5 }, (_, index) => ({
      height: 20,
      left: 25,
      top: Math.round(index * 28.5 + 4),
      width: 190,
    }));
    // The product card begins 12px outside the compact viewport. Compare the
    // shared visible interior against the same card-relative playground span.
    const comparison = comparePng(
      maskPng(reference, masks),
      maskPng(projectActual, masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WORKSPACE_PROJECT_MAX_DIFF_RATIO",
      0.08,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.current-build.png`,
      ),
      PNG.sync.write(projectActual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build project list pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build project list pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "workspace-environment-menu" &&
    currentBuildWorkspaceEnvironmentReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceEnvironmentMenuBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 18, left: 12, top: 10, width: 96 },
        ...[39, 68, 97, 126, 163].map((top) => ({
          height: 18,
          left: 34,
          top,
          width: 142,
        })),
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 189,
        left: 495,
        top: 483,
        width: 216,
      },
      referencePath: currentBuildWorkspaceEnvironmentReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-environment-picker" &&
    currentBuildWorkspaceEnvironmentPickerReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceEnvironmentPickerBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 18, left: 12, top: 10, width: 96 },
        { height: 18, left: 34, top: 39, width: 180 },
        { height: 18, left: 12, top: 68, width: 180 },
        { height: 18, left: 34, top: 97, width: 180 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_PICKER_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 126,
        left: 625,
        top: 545,
        width: 264,
      },
      referencePath: currentBuildWorkspaceEnvironmentPickerReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-worktree-menu" &&
    currentBuildWorkspaceWorktreeReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceWorktreeMenuBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 18, left: 14, top: 11, width: 170 },
        { height: 18, left: 14, top: 55, width: 90 },
        { height: 18, left: 36, top: 83, width: 210 },
        { height: 18, left: 36, top: 112, width: 210 },
        { height: 20, left: 36, top: 250, width: 230 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_WORKTREE_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 280,
        left: 569,
        top: 392,
        width: 296,
      },
      referencePath: currentBuildWorkspaceWorktreeReference,
      sceneId: scene.id,
    });
  }

  if (scene.id === "current-sidebar" && currentBuildSidebarReference) {
    if (!Number.isInteger(sidebarSelectedTop)) {
      throw new Error(
        `${scene.id}: current sidebar row position was not captured.`,
      );
    }
    const referenceFull = flattenPng(
      PNG.sync.read(await readFile(currentBuildSidebarReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      referenceFull.width !== currentBuildSidebarReferenceSize.width ||
      referenceFull.height !== currentBuildSidebarReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar reference must be exactly ${currentBuildSidebarReferenceSize.width}x${currentBuildSidebarReferenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
      );
    }
    if (
      actual.width !== referenceFull.width ||
      actual.height !== referenceFull.height
    ) {
      throw new Error(
        `${scene.id}: sidebar comparison requires matching ${referenceFull.width}x${referenceFull.height} frames.`,
      );
    }

    const referenceTop = cropPng(referenceFull, 0, 0, 274, 250);
    const actualTop = cropPng(actual, 0, 0, 274, 250);
    const topComparison = comparePng(referenceTop, actualTop);

    const selectedMasks = [
      { height: 22, left: 8, top: 4, width: 242 },
    ];
    const referenceSelected = maskPng(
      cropPng(referenceFull, 8, 426, 258, 30),
      selectedMasks,
    );
    const actualSelected = maskPng(
      cropPng(actual, 8, sidebarSelectedTop, 258, 30),
      selectedMasks,
    );
    const selectedComparison = comparePng(
      referenceSelected,
      actualSelected,
    );

    const footerMasks = [
      { height: 32, left: 8, top: 7, width: 218 },
    ];
    const referenceFooter = maskPng(
      cropPng(referenceFull, 0, 774, 274, 46),
      footerMasks,
    );
    const actualFooter = maskPng(
      cropPng(actual, 0, 774, 274, 46),
      footerMasks,
    );
    const footerComparison = comparePng(
      referenceFooter,
      actualFooter,
    );
    for (const [region, comparison] of [
      ["footer", footerComparison],
      ["selected", selectedComparison],
      ["top", topComparison],
    ]) {
      if (comparison.pixels > 0) {
        await writeFile(
          join(
            artifactDirectory,
            `${scene.id}.current-build.${region}.diff.png`,
          ),
          PNG.sync.write(comparison.diff),
        );
      }
    }
    const maximumTopRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_TOP_MAX_DIFF_RATIO",
      0.045,
    );
    const maximumSelectedRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_SELECTED_MAX_DIFF_RATIO",
      0.01,
    );
    const maximumFooterRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_FOOTER_MAX_DIFF_RATIO",
      0.005,
    );
    if (
      topComparison.ratio > maximumTopRatio ||
      selectedComparison.ratio > maximumSelectedRatio ||
      footerComparison.ratio > maximumFooterRatio
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar pixel ratios ${JSON.stringify({
          footer: footerComparison.ratio,
          selected: selectedComparison.ratio,
          top: topComparison.ratio,
        })} exceed ${JSON.stringify({
          footer: maximumFooterRatio,
          selected: maximumSelectedRatio,
          top: maximumTopRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build sidebar pixel ratios ${JSON.stringify({
        footer: footerComparison.ratio,
        selected: selectedComparison.ratio,
        top: topComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "current-sidebar-recents" &&
    currentBuildSidebarRecentsReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarRecentsBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 26, left: 8, top: 0, width: 220 },
        { height: 26, left: 8, top: 27, width: 220 },
        { height: 26, left: 8, top: 58, width: 220 },
        { height: 26, left: 8, top: 89, width: 220 },
        { height: 26, left: 8, top: 120, width: 220 },
        { height: 26, left: 8, top: 151, width: 220 },
        { height: 26, left: 8, top: 182, width: 220 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_SIDEBAR_RECENTS_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 210,
        left: 0,
        top: 556,
        width: 274,
      },
      referencePath: currentBuildSidebarRecentsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "shell-loading" &&
    currentBuildWindowChromeReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildWindowChromeReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildWindowChromeReferenceSize.width ||
      reference.height !== currentBuildWindowChromeReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build window chrome reference must be exactly ${currentBuildWindowChromeReferenceSize.width}x${currentBuildWindowChromeReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    const actualChrome = cropPng(actual, 80, 0, 120, 46);
    const comparison = comparePng(reference, actualChrome);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WINDOW_CHROME_MAX_DIFF_RATIO",
      0.05,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build window chrome pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build window chrome pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildComposerReference =
    scene.id === "composer-queued"
      ? currentBuildComposerQueuedReference
      : scene.id === "composer-auto-continued"
        ? currentBuildComposerContinuedReference
      : scene.id === "composer-queue-paused"
        ? currentBuildComposerPausedReference
        : undefined;
  if (currentBuildComposerReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildComposerReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildComposerReferenceSize.width ||
      reference.height !== currentBuildComposerReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build Composer reference must be exactly ${currentBuildComposerReferenceSize.width}x${currentBuildComposerReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build Composer comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 331, 500, 792, 320);
    const masks =
      scene.id === "composer-auto-continued"
        ? [
            { height: 65, left: 0, top: 0, width: 792 },
            { height: 35, left: 46, top: 65, width: 200 },
            { height: 90, left: 0, top: 115, width: 792 },
            { height: 45, left: 65, top: 255, width: 220 },
            { height: 40, left: 530, top: 255, width: 155 },
          ]
        : [
            {
              height: scene.id === "composer-queued" ? 150 : 130,
              left: 0,
              top: 0,
              width: 792,
            },
            { height: 42, left: 45, top: 166, width: 505 },
            { height: 45, left: 65, top: 255, width: 220 },
            { height: 40, left: 530, top: 255, width: 155 },
            ...(scene.id === "composer-queue-paused"
              ? [{ height: 34, left: 45, top: 136, width: 590 }]
              : []),
          ];
    const maskedReference = maskPng(reference, masks);
    const maskedActual = maskPng(
      cropPng(actual, 331, 500, 792, 320),
      masks,
    );
    const comparison = comparePng(maskedReference, maskedActual);
    const maximumRatio = environmentRatio(
      scene.id === "composer-queued"
        ? "CODEX_UI_KIT_COMPOSER_QUEUED_MAX_DIFF_RATIO"
        : scene.id === "composer-auto-continued"
          ? "CODEX_UI_KIT_COMPOSER_CONTINUED_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_COMPOSER_PAUSED_MAX_DIFF_RATIO",
      scene.id === "composer-queue-paused" ? 0.08 : 0.02,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build Composer pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildComposerLifecycleReference =
    scene.id === "composer-multiline"
      ? currentBuildComposerMultilineReference
      : scene.id === "composer-permissions-menu"
        ? currentBuildComposerPermissionsReference
        : scene.id === "composer-resources-menu"
          ? currentBuildComposerResourcesReference
          : scene.id === "composer-goal"
            ? currentBuildComposerGoalReference
            : scene.id === "composer-plan"
              ? currentBuildComposerPlanReference
          : undefined;
  if (currentBuildComposerLifecycleReference) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildComposerLifecycleReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    const isMultiline = scene.id === "composer-multiline";
    const expectedSize = isMultiline
      ? currentBuildComposerReferenceSize
      : currentBuildComposerMenuReferenceSize;
    if (
      reference.width !== expectedSize.width ||
      reference.height !== expectedSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle reference must be exactly ${expectedSize.width}x${expectedSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = isMultiline
      ? cropPng(actual, 331, 500, 792, 320)
      : cropPng(actual, 274, 0, 906, 820);
    const masks = isMultiline
      ? [
          { height: 165, left: 0, top: 0, width: 792 },
          { height: 88, left: 38, top: 177, width: 570 },
          { height: 40, left: 38, top: 270, width: 610 },
        ]
      : scene.id === "composer-permissions-menu"
        ? [
            { height: 535, left: 0, top: 0, width: 906 },
            { height: 240, left: 0, top: 535, width: 120 },
            { height: 240, left: 615, top: 535, width: 291 },
            { height: 210, left: 140, top: 550, width: 455 },
            { height: 45, left: 0, top: 775, width: 80 },
            { height: 45, left: 825, top: 775, width: 81 },
            { height: 90, left: 95, top: 675, width: 600 },
            { height: 45, left: 95, top: 765, width: 710 },
          ]
        : scene.id === "composer-resources-menu"
          ? [
            { height: 335, left: 0, top: 0, width: 906 },
            { height: 335, left: 0, top: 335, width: 80 },
            { height: 335, left: 825, top: 335, width: 81 },
            { height: 300, left: 100, top: 360, width: 710 },
            { height: 45, left: 0, top: 775, width: 80 },
            { height: 45, left: 825, top: 775, width: 81 },
            { height: 90, left: 95, top: 675, width: 600 },
            { height: 45, left: 95, top: 765, width: 710 },
            ]
          : [
              { height: 665, left: 0, top: 0, width: 906 },
              { height: 155, left: 0, top: 665, width: 75 },
              { height: 155, left: 835, top: 665, width: 71 },
              { height: 55, left: 600, top: 765, width: 235 },
            ];
    const maskedReference = maskPng(clonePng(reference), masks);
    const maskedActual = maskPng(clonePng(actualRegion), masks);
    const comparison = comparePng(maskedReference, maskedActual);
    const maximumRatio = environmentRatio(
      scene.id === "composer-multiline"
        ? "CODEX_UI_KIT_COMPOSER_MULTILINE_MAX_DIFF_RATIO"
        : scene.id === "composer-permissions-menu"
          ? "CODEX_UI_KIT_COMPOSER_PERMISSIONS_MAX_DIFF_RATIO"
          : scene.id === "composer-resources-menu"
            ? "CODEX_UI_KIT_COMPOSER_RESOURCES_MAX_DIFF_RATIO"
            : scene.id === "composer-goal"
              ? "CODEX_UI_KIT_COMPOSER_GOAL_MAX_DIFF_RATIO"
              : "CODEX_UI_KIT_COMPOSER_PLAN_MAX_DIFF_RATIO",
      scene.id === "composer-resources-menu" ? 0.008 : 0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer lifecycle pixel ratio ${comparison.ratio}`,
    );
  }

  if (scene.id === "thread-windowed" && currentBuildLongThreadReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildLongThreadReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildLongThreadReferenceSize.width ||
      reference.height !== currentBuildLongThreadReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build long-thread reference must be exactly ${currentBuildLongThreadReferenceSize.width}x${currentBuildLongThreadReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build long-thread comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks = [
      { height: 140, left: 0, top: 0, width: 906 },
      { height: 430, left: 60, top: 140, width: 846 },
      { height: 100, left: 60, top: 570, width: 360 },
      { height: 100, left: 490, top: 570, width: 416 },
      { height: 60, left: 60, top: 670, width: 846 },
      { height: 90, left: 0, top: 730, width: 906 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_LONG_THREAD_MAX_DIFF_RATIO",
      0.01,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build long-thread pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build long-thread pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildApprovalReference =
    scene.id === "approval-current-pending" ||
    scene.id === "approval-current-allow-once-pending"
      ? currentBuildApprovalPendingReference
      : scene.id === "approval-current-similar-menu"
        ? currentBuildApprovalSimilarMenuReference
      : scene.id === "approval-current-denied"
        ? currentBuildApprovalDeniedReference
        : scene.id === "approval-current-allow-once-completed"
          ? currentBuildApprovalAllowOnceCompletedReference
          : scene.id ===
              "approval-current-similar-repeated-completed"
            ? currentBuildApprovalSimilarCompletedReference
        : undefined;
  const currentBuildAttachmentReference =
    scene.id === "attachment-current-ready"
      ? currentBuildAttachmentReadyReference
      : scene.id === "attachment-current-completed"
        ? currentBuildAttachmentCompletedReference
        : undefined;
  if (currentBuildAttachmentReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildAttachmentReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildAttachmentReferenceSize.width ||
      reference.height !== currentBuildAttachmentReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build attachment reference must be exactly ${currentBuildAttachmentReferenceSize.width}x${currentBuildAttachmentReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build attachment comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks =
      scene.id === "attachment-current-ready"
        ? [
            { height: 624, left: 0, top: 0, width: 906 },
            { height: 180, left: 0, top: 624, width: 85 },
            { height: 180, left: 821, top: 624, width: 85 },
            { height: 16, left: 0, top: 804, width: 906 },
          ]
        : [
            { height: 70, left: 0, top: 0, width: 906 },
            { height: 250, left: 0, top: 70, width: 85 },
            { height: 250, left: 821, top: 70, width: 85 },
            { height: 386, left: 0, top: 320, width: 906 },
            { height: 98, left: 0, top: 706, width: 85 },
            { height: 98, left: 821, top: 706, width: 85 },
            { height: 16, left: 0, top: 804, width: 906 },
          ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      scene.id === "attachment-current-ready"
        ? "CODEX_UI_KIT_ATTACHMENT_READY_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_ATTACHMENT_COMPLETED_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build attachment pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build attachment pixel ratio ${comparison.ratio}`,
    );
  }
  if (currentBuildApprovalReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildApprovalReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildApprovalReferenceSize.width ||
      reference.height !== currentBuildApprovalReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build approval reference must be exactly ${currentBuildApprovalReferenceSize.width}x${currentBuildApprovalReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build approval comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks =
      scene.id === "approval-current-pending" ||
      scene.id === "approval-current-allow-once-pending"
        ? [
            { height: 55, left: 0, top: 0, width: 906 },
            { height: 48, left: 264, top: 70, width: 548 },
            { height: 25, left: 80, top: 168, width: 135 },
            { height: 26, left: 104, top: 215, width: 260 },
            { height: 29, left: 94, top: 682, width: 700 },
            { height: 750, left: 890, top: 55, width: 16 },
          ]
        : scene.id === "approval-current-similar-menu"
          ? [
              { height: 55, left: 0, top: 0, width: 906 },
              { height: 68, left: 264, top: 55, width: 548 },
              { height: 25, left: 80, top: 168, width: 220 },
              { height: 26, left: 104, top: 215, width: 300 },
              { height: 72, left: 95, top: 680, width: 480 },
              { height: 750, left: 890, top: 55, width: 16 },
            ]
        : [
            { height: 55, left: 0, top: 0, width: 906 },
            { height: 26, left: 80, top: 139, width: 550 },
            { height: 120, left: 500, top: 470, width: 260 },
            { height: 82, left: 95, top: 714, width: 710 },
            { height: 750, left: 890, top: 55, width: 16 },
          ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      scene.id === "approval-current-pending" ||
      scene.id === "approval-current-allow-once-pending"
        ? "CODEX_UI_KIT_APPROVAL_PENDING_MAX_DIFF_RATIO"
        : scene.id === "approval-current-similar-menu"
          ? "CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_MAX_DIFF_RATIO"
        : scene.id === "approval-current-allow-once-completed"
          ? "CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_MAX_DIFF_RATIO"
          : scene.id ===
              "approval-current-similar-repeated-completed"
            ? "CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_MAX_DIFF_RATIO"
          : "CODEX_UI_KIT_APPROVAL_DENIED_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build approval pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build approval pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-output-expanded" &&
    currentBuildCommandOutputReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildCommandOutputReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandOutputReferenceSize.width ||
      reference.height !== currentBuildCommandOutputReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-output reference must be exactly ${currentBuildCommandOutputReferenceSize.width}x${currentBuildCommandOutputReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandOutputReferenceSize.width ||
      actual.height !== currentBuildCommandOutputReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-output comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 54, left: 274, top: 47, width: 906 },
      { height: 21, left: 282, top: 105, width: 42 },
      { height: 22, left: 282, top: 134, width: 104 },
      { height: 145, left: 282, top: 156, width: 58 },
      { height: 55, left: 967, top: 132, width: 38 },
      { height: 24, left: 922, top: 300, width: 82 },
      { height: 90, left: 274, top: 328, width: 736 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 75, left: 284, top: 716, width: 714 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_OUTPUT_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.current-build.png`,
      ),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-output pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-output pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-failure-expanded" &&
    currentBuildCommandFailureReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildCommandFailureReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandFailureReferenceSize.width ||
      reference.height !== currentBuildCommandFailureReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-failure reference must be exactly ${currentBuildCommandFailureReferenceSize.width}x${currentBuildCommandFailureReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandFailureReferenceSize.width ||
      actual.height !== currentBuildCommandFailureReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-failure comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 24, left: 274, top: 398, width: 736 },
      { height: 42, left: 274, top: 428, width: 736 },
      { height: 48, left: 474, top: 449, width: 536 },
      { height: 70, left: 274, top: 539, width: 736 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 75, left: 284, top: 716, width: 714 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_FAILURE_MAX_DIFF_RATIO",
      0.01,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-failure pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-failure pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-interruption-stopping" &&
    currentBuildCommandInterruptionReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildCommandInterruptionReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandInterruptionReferenceSize.width ||
      reference.height !== currentBuildCommandInterruptionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-interruption reference must be exactly ${currentBuildCommandInterruptionReferenceSize.width}x${currentBuildCommandInterruptionReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandInterruptionReferenceSize.width ||
      actual.height !== currentBuildCommandInterruptionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-interruption comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 26, left: 350, top: 47, width: 210 },
      { height: 30, left: 375, top: 87, width: 670 },
      { height: 40, left: 1010, top: 47, width: 80 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 80, left: 368, top: 714, width: 680 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_INTERRUPTION_MAX_DIFF_RATIO",
      0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-interruption pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-interruption pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "context-compaction-running" &&
    currentBuildContextCompactionReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildContextCompactionReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildContextCompactionReferenceSize.width ||
      reference.height !== currentBuildContextCompactionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-compaction reference must be exactly ${currentBuildContextCompactionReferenceSize.width}x${currentBuildContextCompactionReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildContextCompactionReferenceSize.width ||
      actual.height !== currentBuildContextCompactionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-compaction comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 168, left: 350, top: 47, width: 745 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 650, left: 1168, top: 47, width: 12 },
      { height: 80, left: 368, top: 714, width: 680 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CONTEXT_COMPACTION_MAX_DIFF_RATIO",
      0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build context-compaction pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build context-compaction pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "context-summary-open" &&
    currentBuildContextSummaryReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildContextSummaryReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildContextSummaryReferenceSize.width ||
      reference.height !== currentBuildContextSummaryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-summary reference must be exactly ${currentBuildContextSummaryReferenceSize.width}x${currentBuildContextSummaryReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildContextSummaryReferenceSize.width ||
      actual.height !== currentBuildContextSummaryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-summary comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const panelBounds = {
      height: 199,
      left: 804,
      top: 45,
      width: 300,
    };
    const referencePanel = cropPng(
      reference,
      panelBounds.left,
      panelBounds.top,
      panelBounds.width,
      panelBounds.height,
    );
    const actualPanel = cropPng(
      actual,
      panelBounds.left,
      panelBounds.top,
      panelBounds.width,
      panelBounds.height,
    );
    const comparison = comparePng(referencePanel, actualPanel);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CONTEXT_SUMMARY_MAX_DIFF_RATIO",
      0.03,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualPanel),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build context-summary pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build context-summary pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "subagent-current-summary-completed" &&
    currentBuildSubagentSummaryReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      defaultMaximumRatio: 0.055,
      masks: [],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_SUMMARY_MAX_DIFF_RATIO",
      referenceCrop: { height: 241, left: 804, top: 45, width: 300 },
      referencePath: currentBuildSubagentSummaryReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-current-panel-completed" &&
    currentBuildSubagentPanelReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      defaultMaximumRatio: 0.045,
      masks: [{ height: 32, left: 328, top: 170, width: 42 }],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_PANEL_MAX_DIFF_RATIO",
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentPanelReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-current-transcript" &&
    currentBuildSubagentTranscriptReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      defaultMaximumRatio: 0.045,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_SUBAGENT_TRANSCRIPT_MAX_DIFF_RATIO",
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentTranscriptReference,
      sceneId: scene.id,
    });
  }

  const currentSubagentCollaborationOverlay = {
    "subagent-concurrent-summary-running": {
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      referenceCrop: { height: 241, left: 504, top: 45, width: 300 },
      referencePath: currentBuildSubagentConcurrentSummaryReference,
    },
    "subagent-concurrent-summary-mixed": {
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      referenceCrop: { height: 241, left: 504, top: 45, width: 300 },
      referencePath: currentBuildSubagentConcurrentMixedReference,
    },
    "subagent-concurrent-panel-mixed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [{ height: 32, left: 328, top: 66, width: 42 }],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentMixedReference,
    },
    "subagent-concurrent-panel-completed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 170, width: 42 },
        { height: 32, left: 328, top: 228, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentCompletedReference,
    },
    "subagent-concurrent-transcript-beta": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentTranscriptReference,
    },
    "subagent-nested-panel-running": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 66, width: 42 },
        { height: 32, left: 328, top: 124, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedRunningReference,
    },
    "subagent-nested-panel-mixed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 66, width: 42 },
        { height: 32, left: 328, top: 170, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedMixedReference,
    },
    "subagent-nested-panel-completed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 170, width: 42 },
        { height: 32, left: 328, top: 228, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedCompletedReference,
    },
    "subagent-nested-transcript-child": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedTranscriptReference,
    },
  }[scene.id];
  if (currentSubagentCollaborationOverlay?.referencePath) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentSubagentCollaborationOverlay.actualBounds,
      defaultMaximumRatio: 0.055,
      masks: currentSubagentCollaborationOverlay.masks ?? [],
      maximumRatioName:
        "CODEX_UI_KIT_SUBAGENT_COLLABORATION_MAX_DIFF_RATIO",
      referenceCrop: currentSubagentCollaborationOverlay.referenceCrop,
      referencePath: currentSubagentCollaborationOverlay.referencePath,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-nested-panel-running" &&
    currentBuildSubagentNestedRunningReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 115, left: 290, top: 232, width: 205 },
      // This compact text-heavy crop has little blank surface to dilute
      // one-pixel font-rasterization differences between packaged Electron
      // and the local harness, so it uses its own regional budget.
      defaultMaximumRatio: 0.125,
      masks: [
        { height: 28, left: 0, top: 0, width: 24 },
        { height: 28, left: 0, top: 87, width: 24 },
      ],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_ACTIVITY_MAX_DIFF_RATIO",
      referenceCrop: { height: 115, left: 290, top: 45, width: 205 },
      referencePath: currentBuildSubagentNestedRunningReference,
      sceneId: "subagent-nested-main-activity-running",
    });
  }

  if (scene.id === "multi-file-review" && currentBuildMultiFileReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMultiFileReference),
    );
    if (
      reference.width !== currentBuildMultiFileReferenceSize.width ||
      reference.height !== currentBuildMultiFileReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMultiFileReferenceSize.width}x${currentBuildMultiFileReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const split = Math.round(reference.width * (536 / 906));
    const conversationComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const reviewComparison = comparePng(
      cropPng(
        reference,
        split,
        0,
        reference.width - split,
        reference.height,
      ),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_MAX_DIFF_RATIO",
      0.07,
    );
    const maximumConversationRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_CONVERSATION_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumReviewRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_PANEL_MAX_DIFF_RATIO",
      0.08,
    );
    if (
      comparison.ratio > maximumRatio ||
      conversationComparison.ratio > maximumConversationRatio ||
      reviewComparison.ratio > maximumReviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          conversation: conversationComparison.ratio,
          full: comparison.ratio,
          review: reviewComparison.ratio,
        })} exceed ${JSON.stringify({
          conversation: maximumConversationRatio,
          full: maximumRatio,
          review: maximumReviewRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        conversation: conversationComparison.ratio,
        full: comparison.ratio,
        review: reviewComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "current-review-rename" &&
    currentBuildReviewRenameReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildReviewRenameReference),
    );
    if (
      reference.width !== currentBuildReviewRenameReferenceSize.width ||
      reference.height !== currentBuildReviewRenameReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildReviewRenameReferenceSize.width}x${currentBuildReviewRenameReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const split = 536;
    const comparison = comparePng(reference, main);
    const conversationComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const reviewComparison = comparePng(
      cropPng(reference, split, 0, reference.width - split, reference.height),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumConversationRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_CONVERSATION_MAX_DIFF_RATIO",
      0.055,
    );
    const maximumReviewRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_PANEL_MAX_DIFF_RATIO",
      0.08,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(main),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (
      comparison.ratio > maximumRatio ||
      conversationComparison.ratio > maximumConversationRatio ||
      reviewComparison.ratio > maximumReviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          conversation: conversationComparison.ratio,
          full: comparison.ratio,
          review: reviewComparison.ratio,
        })} exceed ${JSON.stringify({
          conversation: maximumConversationRatio,
          full: maximumRatio,
          review: maximumReviewRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        conversation: conversationComparison.ratio,
        full: comparison.ratio,
        review: reviewComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "pull-request-detail" && currentBuildPullRequestReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildPullRequestReference),
    );
    if (
      reference.width !== currentBuildPullRequestReferenceSize.width ||
      reference.height !== currentBuildPullRequestReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildPullRequestReferenceSize.width}x${currentBuildPullRequestReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const split = 353;
    const indexComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const detailComparison = comparePng(
      cropPng(
        reference,
        split,
        0,
        reference.width - split,
        reference.height,
      ),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumIndexRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_INDEX_MAX_DIFF_RATIO",
      0.055,
    );
    const maximumDetailRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_DETAIL_MAX_DIFF_RATIO",
      0.07,
    );
    if (
      comparison.ratio > maximumRatio ||
      indexComparison.ratio > maximumIndexRatio ||
      detailComparison.ratio > maximumDetailRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          detail: detailComparison.ratio,
          full: comparison.ratio,
          index: indexComparison.ratio,
        })} exceed ${JSON.stringify({
          detail: maximumDetailRatio,
          full: maximumRatio,
          index: maximumIndexRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        detail: detailComparison.ratio,
        full: comparison.ratio,
        index: indexComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "terminal-current-single" &&
    currentBuildTerminalReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildTerminalReference),
    );
    if (
      reference.width !== currentBuildTerminalReferenceSize.width ||
      reference.height !== currentBuildTerminalReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildTerminalReferenceSize.width}x${currentBuildTerminalReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const terminalTop = 548;
    const terminalHeaderHeight = 33;
    const terminalHeight = 272;
    const panelComparison = comparePng(
      cropPng(reference, 0, terminalTop, reference.width, terminalHeight),
      cropPng(main, 0, terminalTop, main.width, terminalHeight),
    );
    const contentComparison = comparePng(
      cropPng(
        reference,
        0,
        terminalTop + terminalHeaderHeight,
        reference.width,
        terminalHeight - terminalHeaderHeight,
      ),
      cropPng(
        main,
        0,
        terminalTop + terminalHeaderHeight,
        main.width,
        terminalHeight - terminalHeaderHeight,
      ),
    );
    const maximumPanelRatio = environmentRatio(
      "CODEX_UI_KIT_TERMINAL_PANEL_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumContentRatio = environmentRatio(
      "CODEX_UI_KIT_TERMINAL_CONTENT_MAX_DIFF_RATIO",
      0.01,
    );
    if (
      panelComparison.ratio > maximumPanelRatio ||
      contentComparison.ratio > maximumContentRatio
    ) {
      throw new Error(
        `${scene.id}: current-build Terminal pixel ratios ${JSON.stringify({
          content: contentComparison.ratio,
          full: comparison.ratio,
          panel: panelComparison.ratio,
        })} exceed ${JSON.stringify({
          content: maximumContentRatio,
          panel: maximumPanelRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Terminal pixel ratios ${JSON.stringify({
        content: contentComparison.ratio,
        full: comparison.ratio,
        panel: panelComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "markdown-complete" && currentBuildMarkdownReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMarkdownReference),
    );
    if (
      reference.width !== currentBuildMarkdownReferenceSize.width ||
      reference.height !== currentBuildMarkdownReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMarkdownReferenceSize.width}x${currentBuildMarkdownReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      assistant: { height: 389, left: 84, top: 235, width: 738 },
      code: { height: 72, left: 84, top: 520, width: 738 },
      composer: { height: 99, left: 84, top: 706, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(main, left, top, width, height),
      );
    const assistantComparison = compareRegion(regions.assistant);
    const codeComparison = compareRegion(regions.code);
    const composerComparison = compareRegion(regions.composer);
    const maximumAssistantRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_ASSISTANT_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumCodeRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_CODE_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_COMPOSER_MAX_DIFF_RATIO",
      0.025,
    );
    if (
      assistantComparison.ratio > maximumAssistantRatio ||
      codeComparison.ratio > maximumCodeRatio ||
      composerComparison.ratio > maximumComposerRatio
    ) {
      throw new Error(
        `${scene.id}: current-build Markdown pixel ratios ${JSON.stringify({
          assistant: assistantComparison.ratio,
          code: codeComparison.ratio,
          composer: composerComparison.ratio,
          full: comparison.ratio,
        })} exceed ${JSON.stringify({
          assistant: maximumAssistantRatio,
          code: maximumCodeRatio,
          composer: maximumComposerRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Markdown pixel ratios ${JSON.stringify({
        assistant: assistantComparison.ratio,
        code: codeComparison.ratio,
        composer: composerComparison.ratio,
        full: comparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "markdown-table-actions-preview" &&
    currentBuildMarkdownTablePreviewReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMarkdownTablePreviewReference),
    );
    if (
      reference.width !== currentBuildMarkdownTablePreviewReferenceSize.width ||
      reference.height !== currentBuildMarkdownTablePreviewReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference and actual must both be 1180x820, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const regions = {
      close: { height: 44, left: 1124, top: 10, width: 46 },
      preview: { height: 392, left: 142, top: 212, width: 896 },
    };
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(actual, left, top, width, height),
      );
    const closeComparison = compareRegion(regions.close);
    const previewComparison = compareRegion(regions.preview);
    const maximumCloseRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_TABLE_CLOSE_MAX_DIFF_RATIO",
      0.01,
    );
    const maximumPreviewRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_TABLE_PREVIEW_MAX_DIFF_RATIO",
      0.04,
    );
    if (
      closeComparison.ratio > maximumCloseRatio ||
      previewComparison.ratio > maximumPreviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build table-preview pixel ratios ${JSON.stringify({ close: closeComparison.ratio, preview: previewComparison.ratio })} exceed ${JSON.stringify({ close: maximumCloseRatio, preview: maximumPreviewRatio })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build table-preview pixel ratios ${JSON.stringify({ close: closeComparison.ratio, preview: previewComparison.ratio })}`,
    );
  }

  if (scene.id === "mcp-tool-calls" && currentBuildMcpReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMcpReference),
    );
    if (
      reference.width !== currentBuildMcpReferenceSize.width ||
      reference.height !== currentBuildMcpReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMcpReferenceSize.width}x${currentBuildMcpReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const currentBuildMcpTextMasks = [
      { height: 46, left: 0, top: 0, width: 906 },
      { height: 82, left: 266, top: 90, width: 540 },
      { height: 28, left: 84, top: 225, width: 135 },
      { height: 47, left: 84, top: 272, width: 738 },
      { height: 82, left: 106, top: 328, width: 300 },
      { height: 600, left: 895, top: 48, width: 11 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), currentBuildMcpTextMasks),
      maskPng(clonePng(main), currentBuildMcpTextMasks),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      answer: { height: 76, left: 84, top: 344, width: 738 },
      composer: { height: 99, left: 84, top: 706, width: 738 },
      toolCalls: { height: 214, left: 84, top: 135, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }, masks = []) =>
      comparePng(
        maskPng(
          cropPng(reference, left, top, width, height),
          masks,
        ),
        maskPng(cropPng(main, left, top, width, height), masks),
      );
    const answerComparison = compareRegion(regions.answer);
    const composerComparison = compareRegion(regions.composer);
    const toolCallsComparison = compareRegion(regions.toolCalls, [
      { height: 42, left: 182, top: 0, width: 540 },
      { height: 28, left: 0, top: 90, width: 135 },
      { height: 47, left: 0, top: 137, width: 738 },
      { height: 21, left: 22, top: 193, width: 300 },
    ]);
    const maximumAnswerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_ANSWER_MAX_DIFF_RATIO",
      0.04,
    );
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_COMPOSER_MAX_DIFF_RATIO",
      0.025,
    );
    const maximumToolCallsRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_TOOL_CALLS_MAX_DIFF_RATIO",
      0.04,
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_MAX_DIFF_RATIO",
      0.03,
    );
    if (
      answerComparison.ratio > maximumAnswerRatio ||
      composerComparison.ratio > maximumComposerRatio ||
      comparison.ratio > maximumRatio ||
      toolCallsComparison.ratio > maximumToolCallsRatio
    ) {
      throw new Error(
        `${scene.id}: current-build MCP pixel ratios ${JSON.stringify({
          answer: answerComparison.ratio,
          composer: composerComparison.ratio,
          full: comparison.ratio,
          toolCalls: toolCallsComparison.ratio,
        })} exceed ${JSON.stringify({
          answer: maximumAnswerRatio,
          composer: maximumComposerRatio,
          full: maximumRatio,
          toolCalls: maximumToolCallsRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build MCP pixel ratios ${JSON.stringify({
        answer: answerComparison.ratio,
        composer: composerComparison.ratio,
        full: comparison.ratio,
        toolCalls: toolCallsComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "mcp-recovery-completed" &&
    currentBuildMcpRecoveryReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMcpRecoveryReference),
    );
    if (
      reference.width !== currentBuildMcpRecoveryReferenceSize.width ||
      reference.height !== currentBuildMcpRecoveryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build recovery reference must be exactly ${currentBuildMcpRecoveryReferenceSize.width}x${currentBuildMcpRecoveryReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build recovery reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const currentBuildRecoveryTextMasks = [
      { height: 46, left: 0, top: 0, width: 906 },
      { height: 18, left: 84, top: 46, width: 160 },
      { height: 45, left: 84, top: 76, width: 738 },
      { height: 25, left: 106, top: 134, width: 170 },
      { height: 60, left: 92, top: 163, width: 180 },
      { height: 28, left: 84, top: 272, width: 738 },
      { height: 120, left: 106, top: 313, width: 310 },
      { height: 600, left: 895, top: 48, width: 11 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), currentBuildRecoveryTextMasks),
      maskPng(clonePng(main), currentBuildRecoveryTextMasks),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      composer: { height: 99, left: 84, top: 706, width: 738 },
      recovery: { height: 340, left: 84, top: 245, width: 738 },
      upper: { height: 145, left: 84, top: 70, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }, masks = []) =>
      comparePng(
        maskPng(
          cropPng(reference, left, top, width, height),
          masks,
        ),
        maskPng(cropPng(main, left, top, width, height), masks),
      );
    const composerComparison = compareRegion(regions.composer);
    const recoveryComparison = compareRegion(regions.recovery, [
      { height: 35, left: 0, top: 25, width: 738 },
      { height: 125, left: 22, top: 65, width: 310 },
    ]);
    const upperComparison = compareRegion(regions.upper, [
      { height: 47, left: 0, top: 6, width: 738 },
      { height: 30, left: 22, top: 60, width: 170 },
      { height: 55, left: 8, top: 90, width: 180 },
    ]);
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_COMPOSER_MAX_DIFF_RATIO",
      0.03,
    );
    const maximumRecoveryRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_TOOL_MAX_DIFF_RATIO",
      0.07,
    );
    const maximumUpperRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_UPPER_MAX_DIFF_RATIO",
      Number(
        process.env.CODEX_UI_KIT_MCP_RECOVERY_USER_MAX_DIFF_RATIO ??
          0.05,
      ),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_MAX_DIFF_RATIO",
      0.045,
    );
    if (
      composerComparison.ratio > maximumComposerRatio ||
      comparison.ratio > maximumRatio ||
      recoveryComparison.ratio > maximumRecoveryRatio ||
      upperComparison.ratio > maximumUpperRatio
    ) {
      throw new Error(
        `${scene.id}: current-build MCP recovery pixel ratios ${JSON.stringify({
          composer: composerComparison.ratio,
          full: comparison.ratio,
          recovery: recoveryComparison.ratio,
          upper: upperComparison.ratio,
        })} exceed ${JSON.stringify({
          composer: maximumComposerRatio,
          full: maximumRatio,
          recovery: maximumRecoveryRatio,
          upper: maximumUpperRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build MCP recovery pixel ratios ${JSON.stringify({
        composer: composerComparison.ratio,
        full: comparison.ratio,
        recovery: recoveryComparison.ratio,
        upper: upperComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "mcp-current-success" && currentMcpSuccessReference) {
    const reference = PNG.sync.read(
      await readFile(currentMcpSuccessReference),
    );
    if (
      reference.width !== currentMcpSuccessReferenceSize.width ||
      reference.height !== currentMcpSuccessReferenceSize.height ||
      actual.width !== 1180 ||
      actual.height !== 820
    ) {
      throw new Error(
        `${scene.id}: current MCP success comparison requires a 905x820 product main crop and an exact 1180x820 playground frame, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 85, 103, 736, 100),
      cropPng(actual, 359, 227, 736, 100),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current MCP success tool-group ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current MCP success tool-group pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-recovery-compact" &&
    currentMcpRecoveryCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcpRecoveryCompactReference),
    );
    if (
      reference.width !== currentMcpRecoveryCompactReferenceSize.width ||
      reference.height !== currentMcpRecoveryCompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current MCP recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 0, 207, 676, 67),
      cropPng(actual, 28, 271, 676, 67),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_MAX_DIFF_RATIO",
      0.012,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current MCP compact recovery-card ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current MCP compact recovery-card pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-integration-recovered-compact" &&
    currentIntegrationRecoveryReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentIntegrationRecoveryReference),
    );
    if (
      reference.width !== currentIntegrationRecoveryReferenceSize.width ||
      reference.height !== currentIntegrationRecoveryReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current integration recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 387, 688, 71),
      cropPng(actual, 16, 335, 688, 71),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_MAX_DIFF_RATIO",
      0.013,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current integration recovery group ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current integration recovery group pixel ratio ${comparison.ratio}`,
    );
  }
}

if (regionalFailures.length > 0) {
  throw new Error(
    `Regional pixel contracts failed for ${regionalFailures.length} lifecycle frames:\n${regionalFailures.join("\n")}`,
  );
}

console.log(
  update
    ? `Updated ${selectedScenes.length} reviewed visual baselines.`
    : `Pixel contracts passed for ${selectedScenes.length} lifecycle frames.`,
);
