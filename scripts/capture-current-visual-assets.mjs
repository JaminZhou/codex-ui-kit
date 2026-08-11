import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  sanitizeVisualAssetIcon,
  sanitizeVisualScalarRecord,
} from "./visual-asset-contract.mjs";

const port = Number(process.env.CODEX_VISUAL_ASSET_CDP_PORT);
const expectedProfile = process.env.CODEX_VISUAL_ASSET_PROFILE;
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    "Set CODEX_VISUAL_ASSET_CDP_PORT to an isolated loopback-only Codex CDP port.",
  );
}
if (!expectedProfile?.startsWith("/") || /\s/.test(expectedProfile)) {
  throw new Error(
    "Set CODEX_VISUAL_ASSET_PROFILE to the absolute unique codex-ui-kit profile used by the isolated Codex process.",
  );
}
const normalizedProfile = realpathSync(expectedProfile);
const allowedProfilePrefixes = [
  "/private/tmp/codex-ui-kit-",
  `${homedir()}/.Trash/codex-ui-kit-`,
];
if (!allowedProfilePrefixes.some((prefix) => normalizedProfile.startsWith(prefix))) {
  throw new Error(
    "The isolated Codex profile must use a unique codex-ui-kit path in /private/tmp or Trash.",
  );
}
const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const baselineContext = {
  appAsarSha256: execFileSync("/usr/bin/shasum", ["-a", "256", appAsar], {
    encoding: "utf8",
  }).split(/\s+/)[0],
  appVersion: plistValue("CFBundleShortVersionString"),
  buildNumber: plistValue("CFBundleVersion"),
  interactionState: "resting-and-open-sidebar-menus",
  theme: "dark",
  viewport: { height: 820, width: 1180 },
};

const listenerFields = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const listeners = [];
for (const field of listenerFields) {
  if (field.startsWith("p")) {
    listeners.push({ addresses: [], pid: field.slice(1) });
  } else if (field.startsWith("n")) {
    listeners.at(-1)?.addresses.push(field.slice(1));
  }
}
const expectedEndpoint = `127.0.0.1:${port}`;
if (
  listeners.length === 0 ||
  listeners.some(
    (listener) =>
      listener.addresses.length === 0 ||
      listener.addresses.some((address) => address !== expectedEndpoint),
  )
) {
  throw new Error(
    `CDP listeners must bind only ${expectedEndpoint}.`,
  );
}

const processInfoScript = fileURLToPath(
  new URL("./read-macos-process-info.py", import.meta.url),
);
const processInfo = (pid) =>
  JSON.parse(
    execFileSync("/usr/bin/python3", [processInfoScript, pid], {
      encoding: "utf8",
    }),
  );
const parentPid = (pid) => {
  const value = execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], {
    encoding: "utf8",
  }).trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Could not prove parentage for CDP listener PID ${pid}.`);
  }
  return value;
};

const isolatedOwners = listeners.filter(({ pid }) => {
  let argv;
  let executablePath;
  try {
    ({ argv, executablePath } = processInfo(pid));
  } catch {
    return false;
  }
  const valuesFor = (prefix) =>
    argv
      .filter((argument) => argument.startsWith(prefix))
      .map((argument) => argument.slice(prefix.length));
  const addresses = valuesFor("--remote-debugging-address=");
  const ports = valuesFor("--remote-debugging-port=");
  const profiles = valuesFor("--user-data-dir=");
  let candidateProfile;
  try {
    candidateProfile = profiles.length === 1 ? realpathSync(profiles[0]) : null;
  } catch {
    return false;
  }
  return (
    executablePath === "/Applications/ChatGPT.app/Contents/MacOS/ChatGPT" &&
    argv[0] === executablePath &&
    addresses.length === 1 &&
    addresses[0] === "127.0.0.1" &&
    ports.length === 1 &&
    ports[0] === String(port) &&
    profiles.length === 1 &&
    candidateProfile === normalizedProfile
  );
});
if (isolatedOwners.length !== 1) {
  throw new Error(
    "CDP listener ownership is ambiguous or does not exactly match the declared isolated Codex profile.",
  );
}
const isolatedOwnerPid = isolatedOwners[0].pid;
for (const listener of listeners) {
  if (listener.pid === isolatedOwnerPid) continue;
  const visited = new Set();
  let descendantPid = listener.pid;
  while (descendantPid !== isolatedOwnerPid && descendantPid !== "1") {
    if (visited.has(descendantPid)) {
      throw new Error(`Cycle detected while proving listener PID ${listener.pid}.`);
    }
    visited.add(descendantPid);
    descendantPid = parentPid(descendantPid);
  }
  if (descendantPid !== isolatedOwnerPid) {
    throw new Error(
      `CDP listener PID ${listener.pid} does not descend from isolated owner PID ${isolatedOwnerPid}.`,
    );
  }
}

const semanticLabels = new Map([
  ["Add files and more", "composer-add-files"],
  ["Back", "window-chrome-back"],
  ["Back to ChatGPT", "window-back-to-chatgpt"],
  ["Dictate", "composer-dictate"],
  ["Don't work in a project", "composer-clear-project"],
  ["New chat", "sidebar-new-chat"],
  ["Open help menu", "sidebar-help"],
  ["Open settings", "sidebar-settings"],
  ["Forward", "window-chrome-forward"],
  ["Hide sidebar", "window-chrome-sidebar"],
  ["Plugins", "sidebar-plugins"],
  ["Pull requests", "sidebar-pull-request"],
  ["Quick chat", "sidebar-quick-chat"],
  ["Search", "sidebar-search"],
  ["Scheduled", "sidebar-scheduled"],
  ["Settings", "sidebar-settings"],
  ["Sites", "sidebar-sites"],
  ["Start new voice chat", "composer-voice"],
  ["Switch mode, current mode: Codex", "sidebar-mode-chevron"],
  ["Show sidebar", "window-chrome-sidebar"],
  ["View activity", "sidebar-activity"],
  ["View activity, needs attention", "sidebar-activity-attention"],
]);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const candidates = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter(
      (page) =>
        page.url() === "app://-/index.html" ||
        page.url().startsWith("app://-/index.html?"),
    );
  const ranked = await Promise.all(
    candidates.map(async (page) => ({
      area: await page.evaluate(() => window.innerWidth * window.innerHeight),
      page,
    })),
  );
  ranked.sort((left, right) => right.area - left.area);
  const main = ranked[0]?.page;
  if (!main) throw new Error("Main Codex Renderer target not found.");

  await main.bringToFront();
  await main.waitForFunction(() => document.hasFocus(), undefined, {
    timeout: 15_000,
  });
  await main.setViewportSize({ height: 820, width: 1180 });
  await main.waitForFunction(
    () =>
      Boolean(document.querySelector("main")) &&
      Boolean(document.querySelector("nav")) &&
      document.querySelectorAll("svg").length > 0,
    undefined,
    { timeout: 15_000 },
  );
  await main.evaluate(async () => {
    await document.fonts.ready;
  });

  const result = await main.evaluate((semanticLabelEntries) => {
    const semanticLabels = new Map(semanticLabelEntries);
    const resolveSemanticId = (
      label,
      targetRegion,
      allowControlPatternFallback,
    ) => {
      const exact = semanticLabels.get(label);
      if (exact) return exact;
      if (!allowControlPatternFallback) return null;
      if (targetRegion === "sidebar-footer" && /\bhelp\b/i.test(label)) {
        return "sidebar-help";
      }
      if (targetRegion === "sidebar-projects" && /\bactions?\b/i.test(label)) {
        return "sidebar-more";
      }
      if (targetRegion === "sidebar-projects" && /^pin\b/i.test(label)) {
        return "sidebar-pin";
      }
      if (targetRegion === "sidebar-projects" && /^archive\b/i.test(label)) {
        return "sidebar-archive";
      }
      return null;
    };
    const allowedSvgTags = new Set([
      "circle",
      "clippath",
      "defs",
      "ellipse",
      "g",
      "line",
      "lineargradient",
      "mask",
      "path",
      "polygon",
      "polyline",
      "radialgradient",
      "rect",
      "stop",
      "use",
    ]);
    const allowedSvgAttributes = new Set([
      "clip-path",
      "clip-rule",
      "color",
      "cx",
      "cy",
      "d",
      "fill",
      "fill-opacity",
      "fill-rule",
      "filter",
      "gradienttransform",
      "gradientunits",
      "height",
      "href",
      "id",
      "mask",
      "offset",
      "opacity",
      "points",
      "preserveaspectratio",
      "r",
      "rx",
      "ry",
      "stop-color",
      "stop-opacity",
      "stroke",
      "stroke-dasharray",
      "stroke-dashoffset",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-opacity",
      "stroke-width",
      "transform",
      "vector-effect",
      "width",
      "x",
      "x1",
      "x2",
      "xlink:href",
      "y",
      "y1",
      "y2",
    ]);
    const ignoredNonVisualSvgAttributes = new Set([
      "aria-describedby",
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "focusable",
      "role",
      "tabindex",
      "version",
      "xmlns",
      "xmlns:xlink",
    ]);
    const separatelyCapturedRootSvgAttributes = new Set(["class", "viewbox"]);
    const attributes = (element, isRoot = false) => {
      if (element.hasAttribute("style")) {
        throw new Error(
          `Inline SVG style attributes are unsupported: ${element.tagName.toLowerCase()}`,
        );
      }
      const unsupportedAttributes = [...element.attributes]
        .map((attribute) => attribute.name.toLowerCase())
        .filter(
          (name) =>
            !allowedSvgAttributes.has(name) &&
            !ignoredNonVisualSvgAttributes.has(name) &&
            !(isRoot && separatelyCapturedRootSvgAttributes.has(name)),
        );
      if (unsupportedAttributes.length > 0) {
        throw new Error(
          `Unsupported SVG attributes on ${element.tagName.toLowerCase()}: ${unsupportedAttributes.join(", ")}`,
        );
      }
      return Object.fromEntries(
        [...element.attributes]
          .filter((attribute) =>
            allowedSvgAttributes.has(attribute.name.toLowerCase()),
          )
          .map((attribute) => [attribute.name, attribute.value])
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    };
    const computedStyle = (element) => {
      const value = getComputedStyle(element);
      return Object.fromEntries(
        [...value]
          .filter((name) => !name.startsWith("--"))
          .map((name) => [name, value.getPropertyValue(name)])
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    };
    const serializeSvgElement = (element) => {
      const tag = element.tagName.toLowerCase();
      if (!allowedSvgTags.has(tag)) {
        throw new Error(`Unsupported SVG element: ${tag}`);
      }
      const children = [...element.children].map(serializeSvgElement);
      return {
        attributes: attributes(element),
        ...(children.length > 0 ? { children } : {}),
        computedStyle: computedStyle(element),
        tag,
      };
    };
    const round = (value) => Math.round(value * 100) / 100;
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        height: round(value.height),
        left: round(value.left),
        top: round(value.top),
        width: round(value.width),
      };
    };
    const region = (value) => {
      if (value.top < 52) return "titlebar";
      if (value.left < 274 && value.top < 250) return "sidebar-primary";
      if (value.left < 274 && value.top > window.innerHeight - 60) {
        return "sidebar-footer";
      }
      if (value.left < 274) return "sidebar-projects";
      if (value.left >= 274 && value.top > window.innerHeight - 160) {
        return "composer";
      }
      return null;
    };
    const fontStyle = (element) => {
      const value = getComputedStyle(element);
      return {
        clipPath: value.clipPath,
        color: value.color,
        display: value.display,
        fill: value.fill,
        fillOpacity: value.fillOpacity,
        filter: value.filter,
        flexBasis: value.flexBasis,
        flexGrow: value.flexGrow,
        flexShrink: value.flexShrink,
        fontFamily: value.fontFamily,
        fontSize: value.fontSize,
        fontWeight: value.fontWeight,
        height: value.height,
        lineHeight: value.lineHeight,
        mask: value.mask,
        opacity: value.opacity,
        overflow: value.overflow,
        paintOrder: value.paintOrder,
        shapeRendering: value.shapeRendering,
        stroke: value.stroke,
        strokeDasharray: value.strokeDasharray,
        strokeDashoffset: value.strokeDashoffset,
        strokeLinecap: value.strokeLinecap,
        strokeLinejoin: value.strokeLinejoin,
        strokeMiterlimit: value.strokeMiterlimit,
        strokeOpacity: value.strokeOpacity,
        strokeWidth: value.strokeWidth,
        transform: value.transform,
        transformOrigin: value.transformOrigin,
        vectorEffect: value.vectorEffect,
        visibility: value.visibility,
        width: value.width,
      };
    };
    const isActuallyVisible = (element) => {
      if (typeof element.checkVisibility === "function") {
        return element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      }
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          style.display === "none" ||
          style.opacity === "0" ||
          style.visibility !== "visible"
        ) {
          return false;
        }
      }
      return true;
    };
    const captureVisibleMenuIcons = ({ ids, region: menuRegion }) => {
      const visibleMenus = [...document.querySelectorAll('[role="menu"]')].filter(
        isActuallyVisible,
      );
      if (visibleMenus.length !== 1) {
        throw new Error(
          `Expected one visible ${menuRegion}, received ${visibleMenus.length}.`,
        );
      }
      const items = [
        ...visibleMenus[0].querySelectorAll('[role="menuitem"]'),
      ];
      if (items.length !== ids.length) {
        throw new Error(
          `Expected ${ids.length} ${menuRegion} items, received ${items.length}.`,
        );
      }
      return items.map((item, index) => {
        const svgs = [...item.querySelectorAll("svg")].filter(
          isActuallyVisible,
        );
        if (svgs.length !== 1) {
          throw new Error(
            `Expected one visible icon for ${menuRegion} item ${index}, received ${svgs.length}.`,
          );
        }
        const svg = svgs[0];
        const bounds = svg.getBoundingClientRect();
        return {
          owner: { role: "menuitem", semanticId: ids[index] },
          primitives: [...svg.children].map(serializeSvgElement),
          region: menuRegion,
          rect: rect(svg),
          renderSize: {
            height: round(bounds.height),
            width: round(bounds.width),
          },
          rootAttributes: attributes(svg, true),
          rootComputedStyle: computedStyle(svg),
          sourceClassName: svg.getAttribute("class") ?? "",
          viewBox: svg.getAttribute("viewBox"),
        };
      });
    };
    const captureVisibleMenuIconSlots = ({
      itemCount,
      region: menuRegion,
      slots,
    }) => {
      const visibleMenus = [...document.querySelectorAll('[role="menu"]')].filter(
        isActuallyVisible,
      );
      if (visibleMenus.length !== 1) {
        throw new Error(
          `Expected one visible ${menuRegion}, received ${visibleMenus.length}.`,
        );
      }
      const menu = visibleMenus[0];
      const items = [...menu.querySelectorAll('[role="menuitem"]')];
      if (items.length !== itemCount) {
        throw new Error(
          `Expected ${itemCount} ${menuRegion} items, received ${items.length}.`,
        );
      }
      const icons = slots.map(({ id, itemIndex, svgIndex }) => {
        const item = items[itemIndex];
        if (!item) {
          throw new Error(
            `Missing ${menuRegion} item ${itemIndex} for ${id}.`,
          );
        }
        const svgs = [...item.querySelectorAll("svg")].filter(
          isActuallyVisible,
        );
        const svg = svgs[svgIndex];
        if (!svg) {
          throw new Error(
            `Missing ${menuRegion} icon ${svgIndex} on item ${itemIndex} for ${id}.`,
          );
        }
        const bounds = svg.getBoundingClientRect();
        return {
          owner: { role: "menuitem", semanticId: id },
          primitives: [...svg.children].map(serializeSvgElement),
          region: menuRegion,
          rect: rect(svg),
          renderSize: {
            height: round(bounds.height),
            width: round(bounds.width),
          },
          rootAttributes: attributes(svg, true),
          rootComputedStyle: computedStyle(svg),
          sourceClassName: svg.getAttribute("class") ?? "",
          viewBox: svg.getAttribute("viewBox"),
        };
      });
      return {
        icons,
        observation: {
          iconCount: menu.querySelectorAll("svg").length,
          imageCount: menu.querySelectorAll("img").length,
          itemCount: items.length,
          menuRect: rect(menu),
          separatorCount: menu.querySelectorAll('[role="separator"]').length,
        },
      };
    };
    Object.defineProperty(window, "__codexUiKitCaptureVisibleMenuIcons", {
      configurable: true,
      value: captureVisibleMenuIcons,
    });
    Object.defineProperty(window, "__codexUiKitCaptureVisibleMenuIconSlots", {
      configurable: true,
      value: captureVisibleMenuIconSlots,
    });
    const navigation = document.querySelector("nav");
    const recentsSections = [
      ...new Set(
        (navigation ? [...navigation.querySelectorAll("*")] : [])
          .filter(
            (element) =>
              element.children.length === 0 &&
              element.textContent?.trim() === "Recents",
          )
          .map((element) => element.closest("section"))
          .filter(Boolean),
      ),
    ];
    const recentsSection =
      recentsSections.length === 1 ? recentsSections[0] : null;
    let recentsScrollContainer = recentsSection?.parentElement ?? null;
    while (recentsScrollContainer) {
      const overflowY = getComputedStyle(recentsScrollContainer).overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        recentsScrollContainer.scrollHeight >
          recentsScrollContainer.clientHeight
      ) {
        break;
      }
      recentsScrollContainer = recentsScrollContainer.parentElement;
    }
    if (recentsScrollContainer) recentsScrollContainer.scrollTop = 0;
    const iconInputs = [...document.querySelectorAll("svg")]
      .map((svg) => {
        const bounds = svg.getBoundingClientRect();
        const owner = svg.closest(
          'a, button, [role="button"], [role="tab"], [role="menuitem"]',
        );
        const targetRegion = region(bounds);
        if (
          !owner ||
          !targetRegion ||
          (targetRegion === "composer"
            ? !isActuallyVisible(svg)
            : getComputedStyle(svg).visibility !== "visible") ||
          bounds.width === 0 ||
          bounds.height === 0 ||
          bounds.right <= 0 ||
          bounds.left >= window.innerWidth ||
          bounds.bottom <= 0 ||
          bounds.top >= window.innerHeight
        ) {
          return null;
        }
        return { bounds, owner, svg, targetRegion };
      })
      .filter(Boolean);
    const composerInputs = iconInputs.filter(
      ({ targetRegion }) => targetRegion === "composer",
    );
    const composerTopInputs = composerInputs
      .filter(({ bounds }) => bounds.top < window.innerHeight - 100)
      .sort((left, right) => left.bounds.left - right.bounds.left);
    const composerBottomInputs = composerInputs
      .filter(({ bounds }) => bounds.top >= window.innerHeight - 100)
      .sort((left, right) => left.bounds.left - right.bounds.left);
    const composerStructuralSemanticIds = new Map();
    if (composerTopInputs.length === 3) {
      ["composer-project", "composer-worktree", "composer-branch"].forEach(
        (semanticId, index) => {
          composerStructuralSemanticIds.set(
            composerTopInputs[index].svg,
            semanticId,
          );
        },
      );
    }
    const composerBottomUnlabelledInputs = composerBottomInputs.filter(
      ({ owner }) => {
        const ariaLabel = owner.getAttribute("aria-label") ?? "";
        const fixedTextLabel = owner.textContent?.trim() ?? "";
        return (
          resolveSemanticId(ariaLabel, "composer", true) === null &&
          resolveSemanticId(fixedTextLabel, "composer", false) === null
        );
      },
    );
    const composerPermissionInput = composerBottomUnlabelledInputs.find(
      ({ bounds, svg }) =>
        bounds.width === 16 && svg.getAttribute("viewBox") === "0 0 20 20",
    );
    const composerModelChevronInput = composerBottomUnlabelledInputs.find(
      ({ bounds, svg }) =>
        bounds.width === 14 && svg.getAttribute("viewBox") === "0 0 16 16",
    );
    if (
      composerBottomUnlabelledInputs.length === 2 &&
      composerPermissionInput &&
      composerModelChevronInput
    ) {
      composerStructuralSemanticIds.set(
        composerPermissionInput.svg,
        "composer-permission",
      );
      composerStructuralSemanticIds.set(
        composerModelChevronInput.svg,
        "composer-model-chevron",
      );
    }
    const icons = iconInputs.map(({ bounds, owner, svg, targetRegion }) => {
        const ariaLabel = owner.getAttribute("aria-label");
        const fixedTextLabel = owner.textContent?.trim() ?? "";
        return {
          owner: {
            role: owner.getAttribute("role") ?? owner.tagName.toLowerCase(),
            semanticId:
              resolveSemanticId(ariaLabel ?? "", targetRegion, true) ??
              resolveSemanticId(fixedTextLabel, targetRegion, false) ??
              composerStructuralSemanticIds.get(svg) ??
              null,
          },
          primitives: [...svg.children].map(serializeSvgElement),
          region: targetRegion,
          rect: rect(svg),
          renderSize: { height: round(bounds.height), width: round(bounds.width) },
          rootAttributes: attributes(svg, true),
          rootComputedStyle: computedStyle(svg),
          sourceClassName: svg.getAttribute("class") ?? "",
          viewBox: svg.getAttribute("viewBox"),
        };
      });
    const exactComposerSemanticIds = new Set([
      "composer-project",
      "composer-worktree",
      "composer-branch",
      "composer-add-files",
      "composer-permission",
      "composer-model-chevron",
      "composer-dictate",
      "composer-voice",
    ]);
    const composerObservation = {
      bottomActionIconCount: composerBottomInputs.length,
      exactSemanticIconCount: icons.filter(
        ({ owner, region: iconRegion }) =>
          iconRegion === "composer" &&
          exactComposerSemanticIds.has(owner.semanticId),
      ).length,
      topContextIconCount: composerTopInputs.length,
    };
    const visibleControlsFor = (root = document) =>
      [
        ...root.querySelectorAll(
          'a, button, [role="button"], [role="tab"], [role="menuitem"]',
        ),
      ]
        .map((control) => ({
          ariaLabel: control.getAttribute("aria-label") ?? "",
          bounds: control.getBoundingClientRect(),
          control,
          fixedTextLabel: control.textContent?.trim() ?? "",
        }))
        .filter(
          ({ bounds }) =>
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.right > 0 &&
            bounds.left < window.innerWidth &&
            bounds.bottom > 0 &&
            bounds.top < window.innerHeight,
        );
    const visibleControls = visibleControlsFor();
    const controlsForSemanticId = (
      semanticId,
      targetRegion,
      controls = visibleControls,
    ) =>
      controls.filter(
        ({ ariaLabel, bounds, fixedTextLabel }) =>
          region(bounds) === targetRegion &&
          (resolveSemanticId(ariaLabel, targetRegion, true) === semanticId ||
            resolveSemanticId(fixedTextLabel, targetRegion, false) ===
              semanticId),
      );
    const pairTaskActionRows = (pinControls, archiveControls) =>
      pinControls
        .map(({ bounds: pinBounds }) => {
          const archive = archiveControls.find(({ bounds }) => {
            const pinCenter = pinBounds.top + pinBounds.height / 2;
            const archiveCenter = bounds.top + bounds.height / 2;
            return Math.abs(pinCenter - archiveCenter) < 1;
          });
          return archive
            ? {
                bottom: pinBounds.bottom,
                left: pinBounds.left,
                top: pinBounds.top,
              }
            : null;
        })
        .filter(Boolean);
    const leadingSvgCountForRows = (rows, root = document) =>
      rows.reduce(
        (count, row) =>
          count +
          [...root.querySelectorAll("svg")].filter((svg) => {
            const bounds = svg.getBoundingClientRect();
            const center = bounds.top + bounds.height / 2;
            return (
              region(bounds) === "sidebar-projects" &&
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.right > 0 &&
              bounds.left < window.innerWidth &&
              bounds.right <= row.left &&
              center >= row.top &&
              center <= row.bottom
            );
          }).length,
        0,
      );
    const projectPinControls = controlsForSemanticId(
      "sidebar-pin",
      "sidebar-projects",
    );
    const projectArchiveControls = controlsForSemanticId(
      "sidebar-archive",
      "sidebar-projects",
    );
    const projectTaskActionRows = pairTaskActionRows(
      projectPinControls,
      projectArchiveControls,
    );
    const projectTaskLeadingSvgCount = leadingSvgCountForRows(
      projectTaskActionRows,
    );
    if (recentsSection && recentsScrollContainer) {
      recentsSection.scrollIntoView({ block: "end", inline: "nearest" });
    }
    const recentsVisibleControls = recentsSection
      ? visibleControlsFor(recentsSection)
      : [];
    const recentsTaskActionRows = pairTaskActionRows(
      controlsForSemanticId(
        "sidebar-pin",
        "sidebar-projects",
        recentsVisibleControls,
      ),
      controlsForSemanticId(
        "sidebar-archive",
        "sidebar-projects",
        recentsVisibleControls,
      ),
    );
    const recentsTaskLeadingSvgCount = recentsSection
      ? leadingSvgCountForRows(recentsTaskActionRows, recentsSection)
      : 0;
    if (recentsScrollContainer) recentsScrollContainer.scrollTop = 0;
    const sidebarObservation = {
      footerHelpControlCount: controlsForSemanticId(
        "sidebar-help",
        "sidebar-footer",
      ).length,
      settingsControlCount: controlsForSemanticId(
        "sidebar-settings",
        "sidebar-footer",
      ).length,
      projectTaskActionRowCount: projectTaskActionRows.length,
      projectTaskLeadingSvgCount,
      recentsSectionCount: recentsSections.length,
      recentsTaskActionRowCount: recentsTaskActionRows.length,
      recentsTaskLeadingSvgCount,
    };
    const fontSamples = [
      ["composer", document.querySelector('[contenteditable="true"][role="textbox"]')],
      ["main", document.querySelector("main")],
      ["navigation", document.querySelector("nav")],
    ]
      .filter(([, element]) => Boolean(element))
      .map(([sample, element]) => ({
        rect: rect(element),
        sample,
        style: fontStyle(element),
        tag: element.tagName,
      }));
    return {
      composerObservation,
      fontSamples,
      icons,
      sidebarObservation,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  }, [...semanticLabels]);
  try {
    const projectRow = main
      .locator(
        'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
      )
      .first();
    await projectRow.hover();
    await projectRow.locator('button[aria-haspopup="menu"]').first().click();
    await main.waitForSelector('[role="menu"]:visible');
    const projectMenuIcons = await main.evaluate(() =>
      window.__codexUiKitCaptureVisibleMenuIcons({
        ids: [
          "sidebar-project-menu-unpin",
          "sidebar-project-menu-reveal",
          "sidebar-project-menu-worktree",
          "sidebar-project-menu-edit",
          "sidebar-project-menu-archive",
          "sidebar-project-menu-remove",
        ],
        region: "sidebar-project-menu",
      }),
    );
    await main.keyboard.press("Escape");
    await main.waitForSelector('[role="menu"]', { state: "hidden" });

    await main
      .locator('button[aria-label="Open help menu"]:visible')
      .first()
      .click();
    await main.waitForSelector('[role="menu"]:visible');
    const helpMenuIcons = await main.evaluate(() =>
      window.__codexUiKitCaptureVisibleMenuIcons({
        ids: [
          "sidebar-help-menu-release-note",
          "sidebar-help-menu-release-note",
          "sidebar-help-menu-release-note",
          "sidebar-help-menu-changelog",
          "sidebar-help-menu-chrome",
          "sidebar-help-menu-remote",
          "sidebar-help-menu-keyboard",
          "sidebar-help-menu-support",
        ],
        region: "sidebar-help-menu",
      }),
    );
    await main.keyboard.press("Escape");
    await main.waitForSelector('[role="menu"]', { state: "hidden" });

    const accountTriggerIndices = await main
      .locator('button[aria-haspopup="menu"]:visible')
      .evaluateAll((buttons) =>
        buttons
          .map((button, index) => ({
            bounds: button.getBoundingClientRect(),
            index,
          }))
          .filter(
            ({ bounds }) =>
              bounds.left < 20 &&
              bounds.top > window.innerHeight - 60 &&
              bounds.width > 100,
          )
          .map(({ index }) => index),
      );
    if (accountTriggerIndices.length !== 1) {
      throw new Error(
        `Expected one structural sidebar account trigger, received ${accountTriggerIndices.length}.`,
      );
    }
    const accountTrigger = main
      .locator('button[aria-haspopup="menu"]:visible')
      .nth(accountTriggerIndices[0]);
    await accountTrigger.click();
    await main.waitForSelector('[role="menu"]:visible');
    const accountMenuCapture = await main.evaluate(() =>
      window.__codexUiKitCaptureVisibleMenuIconSlots({
        itemCount: 6,
        region: "sidebar-account-menu",
        slots: [
          { id: "sidebar-account-menu-usage", itemIndex: 1, svgIndex: 0 },
          {
            id: "sidebar-account-menu-usage-chevron",
            itemIndex: 1,
            svgIndex: 1,
          },
          { id: "sidebar-account-menu-pet", itemIndex: 2, svgIndex: 0 },
          { id: "sidebar-account-menu-invite", itemIndex: 3, svgIndex: 0 },
          { id: "sidebar-account-menu-settings", itemIndex: 4, svgIndex: 0 },
          { id: "sidebar-account-menu-logout", itemIndex: 5, svgIndex: 0 },
        ],
      }),
    );
    await main.keyboard.press("Escape");
    await main.waitForSelector('[role="menu"]', { state: "hidden" });
    const accountTriggerHandle = await accountTrigger.elementHandle();
    if (!accountTriggerHandle) {
      throw new Error("Sidebar account trigger detached while closing its menu.");
    }
    await main.waitForFunction(
      (button) => document.activeElement === button,
      accountTriggerHandle,
    );
    accountMenuCapture.observation.focusReturned =
      await accountTrigger.evaluate(
        (button) => document.activeElement === button,
      );
    accountMenuCapture.observation.triggerExpanded =
      await accountTrigger.getAttribute("aria-expanded");
    result.icons.push(...projectMenuIcons, ...helpMenuIcons);
    result.icons.push(...accountMenuCapture.icons);
    result.sidebarObservation.projectMenuItemCount = projectMenuIcons.length;
    result.sidebarObservation.helpMenuItemCount = helpMenuIcons.length;
    result.sidebarObservation.accountMenu = accountMenuCapture.observation;
  } finally {
    if ((await main.locator('[role="menu"]:visible').count()) > 0) {
      await main.keyboard.press("Escape").catch(() => {});
    }
    await main
      .evaluate(() => {
        delete window.__codexUiKitCaptureVisibleMenuIcons;
        delete window.__codexUiKitCaptureVisibleMenuIconSlots;
      })
      .catch(() => {});
  }
  if (
    result.viewport.height !== baselineContext.viewport.height ||
    result.viewport.width !== baselineContext.viewport.width
  ) {
    throw new Error("Captured viewport does not match the baseline context.");
  }
  result.baselineContext = baselineContext;

  const canonicalize = (value) =>
    JSON.stringify(value, (_key, nested) => {
      if (!nested || Array.isArray(nested) || typeof nested !== "object") {
        return nested;
      }
      return Object.fromEntries(
        Object.entries(nested).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    });
  result.fontSamples.forEach((fontSample, index) =>
    sanitizeVisualScalarRecord(
      fontSample.style,
      `capture.fontSamples[${index}].style`,
    ),
  );
  result.icons = result.icons.map((icon, index) => {
    const sanitized = sanitizeVisualAssetIcon(
      {
        ...icon,
        owner: icon.owner,
      },
      `capture.icons[${index}]`,
    );
    return {
      ...sanitized,
      sha256: createHash("sha256")
        .update(
          canonicalize({
            baselineContext,
            primitives: sanitized.primitives,
            renderSize: sanitized.renderSize,
            rootAttributes: sanitized.rootAttributes,
            rootComputedStyle: sanitized.rootComputedStyle,
            sourceClassName: sanitized.sourceClassName,
            viewBox: sanitized.viewBox,
          }),
        )
        .digest("hex"),
    };
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
