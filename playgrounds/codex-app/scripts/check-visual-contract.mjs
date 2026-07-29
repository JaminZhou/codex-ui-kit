import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const root = process.cwd();
const baselineDirectory = join(root, "tests", "visual", "baselines");
const artifactDirectory = join(root, "artifacts", "visual");
const currentBuildMultiFileReference =
  process.env.CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE;
const currentBuildMultiFileReferenceSize = {
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
const currentBuildMcpReference =
  process.env.CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE;
const currentBuildMcpReferenceSize = {
  height: 820,
  width: 906,
};
await mkdir(baselineDirectory, { recursive: true });
await mkdir(artifactDirectory, { recursive: true });

function cropPng(source, left, top, width, height) {
  const crop = new PNG({ height, width });
  PNG.bitblt(source, crop, left, top, width, height, 0, 0);
  return crop;
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

function environmentRatio(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a ratio between 0 and 1.`);
  }
  return value;
}

for (const scene of visualScenes) {
  const { app, page } = await launchScene(scene);
  const actualPath = join(artifactDirectory, `${scene.id}.png`);
  const baselinePath = join(baselineDirectory, `${scene.id}.png`);
  const diffPath = join(artifactDirectory, `${scene.id}.diff.png`);

  try {
    if (scene.id === "multi-file-review") {
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    }
    if (scene.id === "markdown-complete") {
      await page.addStyleTag({
        content: `
          .codex-ui-conversation-thread-shell__viewport {
            scrollbar-width: none;
          }

          .codex-ui-conversation-thread-shell__viewport::-webkit-scrollbar {
            display: none;
          }
        `,
      });
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
  const ratio = pixels / (actual.width * actual.height);
  if (pixels > 0) await writeFile(diffPath, PNG.sync.write(diff));
  const maximumRatio = scene.maxPixelRatio ?? 0.0025;
  if (ratio > maximumRatio) {
    throw new Error(
      `${scene.id}: pixel drift ${(ratio * 100).toFixed(4)}% exceeds ${(maximumRatio * 100).toFixed(2)}%.`,
    );
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

  if (scene.id === "background-terminal" && currentBuildTerminalReference) {
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

    const comparison = comparePng(reference, main);
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
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(main, left, top, width, height),
      );
    const answerComparison = compareRegion(regions.answer);
    const composerComparison = compareRegion(regions.composer);
    const toolCallsComparison = compareRegion(regions.toolCalls);
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
}

console.log(
  update
    ? `Updated ${visualScenes.length} reviewed visual baselines.`
    : `Pixel contracts passed for ${visualScenes.length} lifecycle frames.`,
);
