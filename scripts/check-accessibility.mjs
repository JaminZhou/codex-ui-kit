import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import puppeteer from "puppeteer-core";
import {
  contrastRatio,
  partitionSemanticIncomplete,
  partitionWcagIncomplete,
} from "./accessibility-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const semanticRules = [
  "aria-prohibited-attr",
  "aria-valid-attr-value",
  "label",
  "scrollable-region-focusable",
];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function findExecutable(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    findExecutable("google-chrome"),
    findExecutable("google-chrome-stable"),
    findExecutable("chromium"),
    findExecutable("chromium-browser"),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function createDemoServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const withoutBase = requestUrl.pathname.replace(/^\/codex-ui-kit\/?/, "");
      const relativePath = withoutBase || "index.html";
      const filePath = normalize(join(demoRoot, relativePath));
      if (!filePath.startsWith(`${demoRoot}${sep}`) && filePath !== demoRoot) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

const chrome = findChrome();
if (!chrome) {
  throw new Error(
    "Chrome or Chromium is required for the accessibility contract. Set PUPPETEER_EXECUTABLE_PATH when it is installed in a non-standard location.",
  );
}

const server = createDemoServer();
const address = await listen(server);
if (!address || typeof address === "string") {
  server.close();
  throw new Error("failed to start the accessibility fixture server");
}

const cases = [
  { dark: false, height: 1_000, name: "desktop light", width: 1_440 },
  { dark: true, height: 1_000, name: "desktop dark", width: 1_440 },
  { dark: false, height: 680, name: "compact light", width: 820 },
];
const overlayCases = [
  {
    linkages: [
      {
        attribute: "aria-describedby",
        role: "tooltip",
        trigger: '.primitive-preview__toolbar button[aria-label="Create a chat"]',
      },
    ],
    name: "tooltip",
    open: async (page) => {
      await page.focus(
        '.primitive-preview__toolbar button[aria-label="Create a chat"]',
      );
      await page.waitForSelector('[role="tooltip"]');
    },
  },
  {
    linkages: [
      {
        attribute: "aria-controls",
        role: "menu",
        trigger: '.primitive-preview__toolbar button[aria-label="More actions"]',
      },
      {
        attribute: "aria-controls",
        role: "menu",
        trigger: ".codex-ui-menu-submenu-trigger",
      },
    ],
    name: "menu and submenu",
    open: async (page) => {
      await page.click(
        '.primitive-preview__toolbar button[aria-label="More actions"]',
      );
      await page.waitForSelector(".codex-ui-menu-submenu-trigger");
      await page.focus(".codex-ui-menu-submenu-trigger");
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        () => document.querySelectorAll('.codex-ui-menu[role="menu"]').length >= 2,
      );
    },
  },
  {
    linkages: [
      {
        attribute: "aria-controls",
        role: "dialog",
        trigger: '.primitive-preview__sample button[aria-haspopup="dialog"]',
      },
    ],
    name: "popover",
    open: async (page) => {
      await page.evaluate(() => {
        const trigger = Array.from(
          document.querySelectorAll(".primitive-preview__sample button"),
        ).find((element) => element.textContent?.trim() === "Workspace info");
        if (!(trigger instanceof HTMLButtonElement)) {
          throw new Error("workspace popover trigger is missing");
        }
        trigger.click();
      });
      await page.waitForSelector(
        '.primitive-preview__sample button[aria-haspopup="dialog"][aria-controls]',
      );
    },
  },
  {
    linkages: [
      {
        attribute: "aria-controls",
        role: "listbox",
        trigger: ".primitive-preview .codex-ui-select-trigger",
      },
    ],
    name: "select",
    open: async (page) => {
      await page.click(".primitive-preview .codex-ui-select-trigger");
      await page.waitForSelector(
        ".primitive-preview .codex-ui-select-trigger[aria-controls]",
      );
    },
  },
  {
    name: "choice dialog",
    open: async (page) => {
      await page.click('[data-choice-dialog-trigger="true"]');
      await page.waitForSelector('.codex-ui-dialog__surface[role="dialog"]');
    },
    targets: [
      {
        focusWithin: true,
        modal: true,
        role: "dialog",
        selector: '.codex-ui-dialog__surface[role="dialog"]',
      },
    ],
  },
  {
    name: "image preview dialog",
    open: async (page) => {
      await page.click(
        '.resource-preview .codex-ui-generated-image-gallery__image',
      );
      await page.waitForSelector('.codex-ui-image-preview[role="dialog"]');
    },
    targets: [
      {
        focusWithin: true,
        modal: true,
        role: "dialog",
        selector: '.codex-ui-image-preview[role="dialog"]',
      },
    ],
  },
  {
    linkages: [
      {
        attribute: "aria-controls",
        role: "menu",
        trigger: ".codex-ui-approval-request__options-toggle",
      },
    ],
    name: "approval options menu",
    open: async (page) => {
      await page.click(".codex-ui-approval-request__options-toggle");
      await page.waitForSelector(
        ".codex-ui-approval-request__options-toggle[aria-controls]",
      );
    },
  },
];
const failures = [];
let incompleteWcagChecks = 0;
let manualReviewSemanticChecks = 0;
let overlayStateChecks = 0;
let browser;

function parseComputedRgb(value) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) {
    throw new Error(`could not parse computed color: ${value}`);
  }
  return channels;
}

async function sampleThemeTransitionContrast(page) {
  const samples = [];
  let elapsed = 0;
  for (const sampleAt of [0, 25, 50, 100, 175]) {
    if (sampleAt > elapsed) {
      await new Promise((resolve) => setTimeout(resolve, sampleAt - elapsed));
      elapsed = sampleAt;
    }
    const colors = await page.evaluate(() => {
      const label = document.querySelector(
        '.codex-ui-button[data-tone="danger"] > .codex-ui-button__label',
      );
      const control = label?.closest("button");
      if (!label || !control) return null;
      return {
        background: getComputedStyle(control).backgroundColor,
        foreground: getComputedStyle(label).color,
      };
    });
    if (!colors) {
      throw new Error("danger control is missing from the accessibility fixture");
    }
    samples.push({
      at: sampleAt,
      background: colors.background,
      foreground: colors.foreground,
      ratio: contrastRatio(
        parseComputedRgb(colors.foreground),
        parseComputedRgb(colors.background),
      ),
    });
  }
  return samples;
}

async function addAxe(page) {
  await page.addScriptTag({ content: axe.source });
}

async function runAxe(page, wcagSelectors = []) {
  return page.evaluate(async ({ rules, tags, wcagSelectors }) => {
    const simplify = (entry) => ({
      id: entry.id,
      impact: entry.impact,
      nodeCount: entry.nodes.length,
      nodes: entry.nodes.map((node) => ({
        failureSummary: node.failureSummary,
        reviews: [...node.any, ...node.all, ...node.none]
          .map((check) => ({
            messageKey: check.data?.messageKey,
            needsReview: check.data?.needsReview,
          }))
          .filter((review) => review.messageKey || review.needsReview),
        target: node.target,
      })).slice(0, 20),
    });
    const semanticReport = await globalThis.axe.run(document, {
      runOnly: { type: "rule", values: rules },
    });
    const wcagContext =
      wcagSelectors.length > 0
        ? { include: wcagSelectors.map((selector) => [selector]) }
        : document;
    const wcagReport = await globalThis.axe.run(
      wcagContext,
      { runOnly: { type: "tag", values: tags } },
    );
    return {
      semantic: {
        incomplete: semanticReport.incomplete.map(simplify),
        violations: semanticReport.violations.map(simplify),
      },
      wcag: {
        incomplete: wcagReport.incomplete.map(simplify),
        violations: wcagReport.violations.map(simplify),
      },
    };
  }, { rules: semanticRules, tags: wcagTags, wcagSelectors });
}

function applyIncompletePolicy(result, verifiedControlIds = new Set()) {
  const semantic = partitionSemanticIncomplete(
    result.semantic.incomplete,
    verifiedControlIds,
  );
  const wcagPopupControls = partitionSemanticIncomplete(
    result.wcag.incomplete,
    verifiedControlIds,
  );
  const wcag = partitionWcagIncomplete(wcagPopupControls.unexpected);
  result.semantic.incomplete = semantic.unexpected;
  result.wcag.incomplete = wcag.unexpected;
  manualReviewSemanticChecks += semantic.manualReview.reduce(
    (total, entry) => total + entry.nodeCount,
    0,
  );
  incompleteWcagChecks += wcag.manualReview.reduce(
    (total, entry) => total + entry.nodeCount,
    0,
  );
}

async function validateOverlayState(page, overlayCase) {
  return page.evaluate(({ linkages = [], targets = [] }) => {
    const errors = [];
    const scanSelectors = [];
    const verifiedControlIds = [];

    for (const linkage of linkages) {
      const trigger = document.querySelector(linkage.trigger);
      if (!(trigger instanceof HTMLElement)) {
        errors.push(`missing trigger: ${linkage.trigger}`);
        continue;
      }
      scanSelectors.push(linkage.trigger);
      const id = trigger.getAttribute(linkage.attribute);
      if (!id) {
        errors.push(`missing ${linkage.attribute}: ${linkage.trigger}`);
        continue;
      }
      const target = document.getElementById(id);
      if (!target) {
        errors.push(`missing referenced target: ${linkage.attribute}=${id}`);
        continue;
      }
      if (target.getAttribute("role") !== linkage.role) {
        errors.push(
          `unexpected role for #${id}: ${target.getAttribute("role")} !== ${linkage.role}`,
        );
      }
      if (!target.isConnected || target.getRootNode() !== trigger.getRootNode()) {
        errors.push(`disconnected relationship: ${linkage.attribute}=${id}`);
      }
      const targetStyle = getComputedStyle(target);
      if (
        target.hidden ||
        targetStyle.display === "none" ||
        targetStyle.visibility === "hidden"
      ) {
        errors.push(`hidden relationship target: ${linkage.attribute}=${id}`);
      }
      if (
        linkage.attribute === "aria-controls" &&
        trigger.getAttribute("aria-expanded") !== "true"
      ) {
        errors.push(`closed popup trigger: ${linkage.attribute}=${id}`);
      }
      scanSelectors.push(`[id="${CSS.escape(id)}"]`);
      if (linkage.attribute === "aria-controls") verifiedControlIds.push(id);
    }

    for (const expectation of targets) {
      const target = document.querySelector(expectation.selector);
      if (!(target instanceof HTMLElement)) {
        errors.push(`missing overlay target: ${expectation.selector}`);
        continue;
      }
      scanSelectors.push(expectation.selector);
      if (target.getAttribute("role") !== expectation.role) {
        errors.push(
          `unexpected role for ${expectation.selector}: ${target.getAttribute("role")} !== ${expectation.role}`,
        );
      }
      if (
        expectation.modal &&
        target.getAttribute("aria-modal") !== "true"
      ) {
        errors.push(`missing modal state: ${expectation.selector}`);
      }
      if (
        expectation.focusWithin &&
        (!(document.activeElement instanceof HTMLElement) ||
          !target.contains(document.activeElement))
      ) {
        errors.push(`focus is outside overlay: ${expectation.selector}`);
      }
    }

    return { errors, scanSelectors, verifiedControlIds };
  }, overlayCase);
}

function hasAccessibilityFailures(result) {
  return (
    result.semantic.violations.length > 0 ||
    result.semantic.incomplete.length > 0 ||
    result.wcag.violations.length > 0 ||
    result.wcag.incomplete.length > 0
  );
}

try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  for (const testCase of cases) {
    const page = await browser.newPage();
    let themeTransitionViolations = [];
    await page.setViewport({
      height: testCase.height,
      width: testCase.width,
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/codex-ui-kit/`,
      { waitUntil: "networkidle0" },
    );
    if (testCase.dark) {
      await page.click(".showcase__topbar-actions button");
      const transitionSamples = await sampleThemeTransitionContrast(page);
      themeTransitionViolations = transitionSamples.filter(
        (sample) => sample.ratio < 4.5,
      );
    }
    await addAxe(page);
    const result = await runAxe(page);
    await page.close();

    applyIncompletePolicy(result);
    if (
      hasAccessibilityFailures(result) ||
      themeTransitionViolations.length > 0
    ) {
      failures.push({
        case: testCase.name,
        themeTransitionViolations,
        ...result,
      });
    }

    for (const overlayCase of overlayCases) {
      const overlayPage = await browser.newPage();
      await overlayPage.setViewport({
        height: testCase.height,
        width: testCase.width,
      });
      await overlayPage.goto(
        `http://127.0.0.1:${address.port}/codex-ui-kit/`,
        { waitUntil: "networkidle0" },
      );
      if (testCase.dark) {
        await overlayPage.click(".showcase__topbar-actions button");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      await overlayCase.open(overlayPage);
      const overlayValidation = await validateOverlayState(
        overlayPage,
        overlayCase,
      );
      await addAxe(overlayPage);
      const overlayResult = await runAxe(
        overlayPage,
        overlayValidation.scanSelectors,
      );
      await overlayPage.close();
      applyIncompletePolicy(
        overlayResult,
        new Set(overlayValidation.verifiedControlIds),
      );
      overlayStateChecks += 1;
      if (
        overlayValidation.errors.length > 0 ||
        hasAccessibilityFailures(overlayResult)
      ) {
        failures.push({
          case: `${testCase.name} / ${overlayCase.name}`,
          overlayErrors: overlayValidation.errors,
          ...overlayResult,
        });
      }
    }
  }
} finally {
  await browser?.close();
  await closeServer(server);
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error("accessibility contract failed");
}

console.log(
  `accessibility contract ok: ${semanticRules.length} strict semantic rules and WCAG A/AA/2.2 across ${cases.length} viewports and ${overlayStateChecks} open overlay states (${incompleteWcagChecks} contrast and ${manualReviewSemanticChecks} verified popup-control manual-review nodes)`,
);
