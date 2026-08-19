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
const threadOnly = process.env.CODEX_VISUAL_ASSET_THREAD_ONLY === "1";
const mcpOnly = process.env.CODEX_VISUAL_ASSET_MCP_ONLY === "1";
const projectPickerOnly =
  process.env.CODEX_VISUAL_ASSET_PROJECT_PICKER_ONLY === "1";
if ([threadOnly, mcpOnly, projectPickerOnly].filter(Boolean).length > 1) {
  throw new Error("Current visual asset capture modes are mutually exclusive.");
}
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
  interactionState: mcpOnly
    ? "completed-current-mcp-thread"
    : projectPickerOnly
      ? "open-current-project-picker"
    : "resting-and-open-sidebar-menus",
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
  ["New project", "composer-new-project"],
  ["New chat", "sidebar-new-chat"],
  ["Open help menu", "sidebar-help"],
  ["Open settings", "sidebar-settings"],
  ["Forward", "window-chrome-forward"],
  ["Bad response", "thread-assistant-bad"],
  ["Chat actions", "thread-header-actions"],
  ["Fork chat from here", "thread-assistant-fork"],
  ["Copy", "thread-assistant-copy"],
  ["Copy message", "thread-user-copy"],
  ["Edit message", "thread-user-edit"],
  ["Good response", "thread-assistant-good"],
  ["Hide sidebar", "window-chrome-sidebar"],
  ["Plugins", "sidebar-plugins"],
  ["Pull requests", "sidebar-pull-request"],
  ["Quick chat", "sidebar-quick-chat"],
  ["Search", "sidebar-search"],
  ["Secondary action", "thread-header-open-in-chevron"],
  ["Send", "composer-send"],
  ["Scheduled", "sidebar-scheduled"],
  ["Settings", "sidebar-settings"],
  ["Sites", "sidebar-sites"],
  ["Start new voice chat", "composer-voice"],
  ["Switch mode, current mode: Codex", "sidebar-mode-chevron"],
  ["Show sidebar", "window-chrome-sidebar"],
  ["Toggle bottom panel", "thread-header-bottom-panel"],
  ["Toggle summary", "thread-header-summary"],
  ["Toggle side panel", "thread-header-side-panel"],
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
      Boolean(document.querySelector("nav")) &&
      document.querySelectorAll("svg").length > 0,
    undefined,
    { timeout: 15_000 },
  );
  if (
    (await main.locator('[contenteditable="true"][role="textbox"]').count()) ===
    0
  ) {
    const backToApp = main.locator('button[aria-label="Back to ChatGPT"]');
    const backToAppFallback = main.getByText("Back to app", { exact: true });
    const backToAppControl =
      (await backToApp.count()) === 1
        ? backToApp
        : (await backToAppFallback.count()) > 0
          ? backToAppFallback.first()
          : null;
    if (backToAppControl) {
      // The native settings route intercepts a normal Playwright click while it
      // swaps back to the app shell. Dispatching the DOM activation preserves
      // that product path without waiting on a navigation that never commits.
      await backToAppControl.evaluate((control) => control.click());
      await main.waitForFunction(
        () => document.body.textContent?.includes("New chat") ?? false,
        undefined,
        { timeout: 15_000 },
      );
    }
    if (
      (await main.locator('[contenteditable="true"][role="textbox"]').count()) ===
      0
    ) {
      const newChat = main.locator("nav").getByText("New chat", {
        exact: true,
      });
      if ((await newChat.count()) !== 1) {
        throw new Error("Could not resolve one fixed New chat route.");
      }
      await newChat.click();
    }
    await main.waitForSelector('[contenteditable="true"][role="textbox"]', {
      timeout: 15_000,
    });
  }
  if (
    !threadOnly &&
    !mcpOnly &&
    (await main.locator('[data-testid="home-icon"]:visible').count()) === 0
  ) {
    const newChat = main
      .locator("nav:visible")
      .getByText("New chat", { exact: true });
    if ((await newChat.count()) !== 1) {
      throw new Error("Could not resolve one visible New chat route.");
    }
    await newChat.click();
    await main.waitForSelector('[data-testid="home-icon"]:visible', {
      timeout: 15_000,
    });
    await main.waitForSelector('[contenteditable="true"][role="textbox"]', {
      timeout: 15_000,
    });
  }
  await main.waitForFunction(
    () =>
      Boolean(document.querySelector("main")) &&
      Boolean(document.querySelector("nav")),
    undefined,
    { timeout: 15_000 },
  );
  const initialRunLocationTrigger = main.locator(
    'main button[data-composer-navigation-target="run-location"]:visible',
  );
  if (
    (await initialRunLocationTrigger.count()) === 1 &&
    (await initialRunLocationTrigger.textContent())
      ?.trim()
      .endsWith("New worktree")
  ) {
    await initialRunLocationTrigger.click();
    const initialWorkInMenu = main.locator('[role="menu"]:visible');
    await initialWorkInMenu.waitFor();
    await initialWorkInMenu
      .getByRole("menuitem", { name: "Local", exact: true })
      .click();
  }
  await main.evaluate(async () => {
    await document.fonts.ready;
  });
  if (
    (threadOnly || mcpOnly) &&
    (await main.locator(".group\\/activity-header:visible").count()) === 0
  ) {
    const workedFor = main.getByText(/^Worked for /);
    if ((await workedFor.count()) === 0) {
      throw new Error(
        "Completed-thread capture requires a visible Worked for disclosure.",
      );
    }
    await workedFor.last().click();
    await main.waitForSelector(".group\\/activity-header:visible", {
      timeout: 15_000,
    });
  }
  if (mcpOnly) {
    const workedFor = main.getByRole("button", { name: /^Worked for / });
    for (let index = 0; index < (await workedFor.count()); index += 1) {
      const disclosure = workedFor.nth(index);
      if ((await disclosure.getAttribute("aria-expanded")) !== "true") {
        await disclosure.click();
      }
    }
    const groups = main.getByText("Used OpenAI Developer Docs integration", {
      exact: true,
    });
    if ((await groups.count()) === 0) {
      throw new Error(
        "Current MCP capture requires a completed OpenAI Developer Docs group.",
      );
    }
    for (let index = 0; index < (await groups.count()); index += 1) {
      const groupButton = groups.nth(index).locator("xpath=ancestor::button[1]");
      if (
        (await groupButton.count()) === 1 &&
        (await groupButton.getAttribute("aria-expanded")) !== "true"
      ) {
        await groupButton.click();
      }
    }
    const callToggles = main.locator(
      'button[aria-labelledby][aria-expanded="true"]',
    );
    for (let index = (await callToggles.count()) - 1; index >= 0; index -= 1) {
      const toggle = callToggles.nth(index);
      const labelId = await toggle.getAttribute("aria-labelledby");
      const text = labelId
        ? await main.evaluate(
            (id) => document.getElementById(id)?.textContent?.trim() ?? null,
            labelId,
          )
        : null;
      if (text === "Search OpenAI docs" || text === "Fetch OpenAI doc") {
        await toggle.click();
      }
    }
  }

  const result = await main.evaluate(({
    mcpOnly,
    projectPickerOnly,
    semanticLabelEntries,
    threadOnly,
  }) => {
    const semanticLabels = new Map(semanticLabelEntries);
    const resolveSemanticId = (
      label,
      targetRegion,
      allowControlPatternFallback,
    ) => {
      if (
        targetRegion === "sidebar-footer" &&
        label === "Start new voice chat"
      ) {
        return "sidebar-voice";
      }
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
    const navigationBounds = [...document.querySelectorAll("nav")]
      .map((navigation) => navigation.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0)
      .sort(
        (left, right) =>
          right.width * right.height - left.width * left.height,
      )[0];
    if (!navigationBounds && !threadOnly && !mcpOnly) {
      throw new Error("Current visual capture requires one visible navigation.");
    }
    const navigationRight =
      threadOnly || mcpOnly ? 0 : navigationBounds?.right ?? 0;
    const region = (value) => {
      if (value.top < 52) return "titlebar";
      if (value.left < navigationRight && value.top < 250) {
        return "sidebar-primary";
      }
      if (
        value.left < navigationRight &&
        value.top > window.innerHeight - 60
      ) {
        return "sidebar-footer";
      }
      if (value.left < navigationRight) return "sidebar-projects";
      if (
        value.left >= navigationRight &&
        value.top > window.innerHeight - 160
      ) {
        return "composer";
      }
      if (value.left >= navigationRight) return "conversation";
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
    const captureSettingsNavigationIcons = ({ items }) => {
      const navigations = [...document.querySelectorAll("nav")].filter(
        isActuallyVisible,
      );
      if (navigations.length !== 1) {
        throw new Error(
          `Expected one visible settings navigation, received ${navigations.length}.`,
        );
      }
      const navigation = navigations[0];
      const captureSvg = (svg, semanticId, ownerRole) => {
        const bounds = svg.getBoundingClientRect();
        return {
          owner: { role: ownerRole, semanticId },
          primitives: [...svg.children].map(serializeSvgElement),
          region: "settings-navigation",
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
      };
      const icons = items.flatMap(({ id, label, secondaryId }) => {
        const controls = [...navigation.querySelectorAll("button")].filter(
          (button) =>
            button.getAttribute("aria-label") === label &&
            isActuallyVisible(button),
        );
        if (controls.length !== 1) {
          throw new Error(
            `Expected one visible settings item ${label}, received ${controls.length}.`,
          );
        }
        const svgs = [...controls[0].querySelectorAll("svg")].filter(
          isActuallyVisible,
        );
        const expectedSvgCount = secondaryId ? 2 : 1;
        if (svgs.length !== expectedSvgCount) {
          throw new Error(
            `Expected ${expectedSvgCount} visible settings icons for ${label}, received ${svgs.length}.`,
          );
        }
        return [
          captureSvg(svgs[0], id, "button"),
          ...(secondaryId
            ? [captureSvg(svgs[1], secondaryId, "button")]
            : []),
        ];
      });
      const searchboxes = [
        ...navigation.querySelectorAll('[role="searchbox"]'),
      ].filter(isActuallyVisible);
      if (searchboxes.length !== 1) {
        throw new Error(
          `Expected one visible settings searchbox, received ${searchboxes.length}.`,
        );
      }
      const searchSvgs = [
        ...(searchboxes[0].parentElement?.querySelectorAll("svg") ?? []),
      ].filter(isActuallyVisible);
      if (searchSvgs.length !== 1) {
        throw new Error(
          `Expected one visible settings search icon, received ${searchSvgs.length}.`,
        );
      }
      icons.unshift(captureSvg(searchSvgs[0], "settings-search", "searchbox"));

      const backSvgs = [...navigation.querySelectorAll("svg")].filter((svg) => {
        if (!isActuallyVisible(svg)) return false;
        for (
          let current = svg.parentElement;
          current && current !== navigation;
          current = current.parentElement
        ) {
          const bounds = current.getBoundingClientRect();
          if (
            current.textContent?.trim() === "Back to app" &&
            bounds.height > 0 &&
            bounds.height <= 48
          ) {
            return true;
          }
        }
        return false;
      });
      if (backSvgs.length !== 1) {
        throw new Error(
          `Expected one visible settings Back to app icon, received ${backSvgs.length}.`,
        );
      }
      icons.unshift(captureSvg(backSvgs[0], "settings-back", "button"));
      return {
        icons,
        observation: {
          iconCount: icons.length,
          itemCount: items.length,
          navigationRect: rect(navigation),
          selectedLabels: [...navigation.querySelectorAll('button[aria-current="page"]')]
            .map((button) => button.getAttribute("aria-label"))
            .filter(Boolean),
        },
      };
    };
    const captureSettingsActionIcon = ({ ariaLabel, id }) => {
      const controls = [...document.querySelectorAll("button")].filter(
        (button) =>
          button.getAttribute("aria-label") === ariaLabel &&
          isActuallyVisible(button),
      );
      if (controls.length !== 1) {
        throw new Error(
          `Expected one visible settings action ${ariaLabel}, received ${controls.length}.`,
        );
      }
      const svgs = [...controls[0].querySelectorAll("svg")].filter(
        isActuallyVisible,
      );
      if (svgs.length !== 1) {
        throw new Error(
          `Expected one visible SVG for settings action ${ariaLabel}, received ${svgs.length}.`,
        );
      }
      const svg = svgs[0];
      const bounds = svg.getBoundingClientRect();
      return {
        owner: { role: "button", semanticId: id },
        primitives: [...svg.children].map(serializeSvgElement),
        region: "settings-page-action",
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
    };
    const captureVisibleControlIcon = ({ ariaLabel, id, targetRegion }) => {
      const controls = [...document.querySelectorAll("button")].filter(
        (button) =>
          button.getAttribute("aria-label") === ariaLabel &&
          isActuallyVisible(button),
      );
      if (controls.length !== 1) {
        throw new Error(
          `Expected one visible ${ariaLabel} control, received ${controls.length}.`,
        );
      }
      const svgs = [...controls[0].querySelectorAll("svg")].filter(
        isActuallyVisible,
      );
      if (svgs.length !== 1) {
        throw new Error(
          `Expected one visible SVG for ${ariaLabel}, received ${svgs.length}.`,
        );
      }
      const svg = svgs[0];
      const bounds = svg.getBoundingClientRect();
      if (region(bounds) !== targetRegion) {
        throw new Error(
          `Visible ${ariaLabel} control did not belong to ${targetRegion}.`,
        );
      }
      return {
        owner: { role: "button", semanticId: id },
        primitives: [...svg.children].map(serializeSvgElement),
        region: targetRegion,
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
    };
    Object.defineProperty(window, "__codexUiKitCaptureVisibleMenuIcons", {
      configurable: true,
      value: captureVisibleMenuIcons,
    });
    Object.defineProperty(window, "__codexUiKitCaptureVisibleMenuIconSlots", {
      configurable: true,
      value: captureVisibleMenuIconSlots,
    });
    Object.defineProperty(window, "__codexUiKitCaptureSettingsNavigationIcons", {
      configurable: true,
      value: captureSettingsNavigationIcons,
    });
    Object.defineProperty(window, "__codexUiKitCaptureSettingsActionIcon", {
      configurable: true,
      value: captureSettingsActionIcon,
    });
    Object.defineProperty(window, "__codexUiKitCaptureVisibleControlIcon", {
      configurable: true,
      value: captureVisibleControlIcon,
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
    const currentThreadNewChatInputs = iconInputs.filter(
      ({ bounds, owner, svg, targetRegion }) =>
        targetRegion === "titlebar" &&
        bounds.top >= 9 &&
        owner.tagName === "BUTTON" &&
        !(owner.getAttribute("aria-label") ?? "").trim() &&
        !(owner.textContent ?? "").trim() &&
        svg.getAttribute("viewBox") === "0 0 16 16",
    );
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
        const titleLabel = owner.getAttribute("title") ?? "";
        const fixedTextLabel = owner.textContent?.trim() ?? "";
        return {
          owner: {
            role: owner.getAttribute("role") ?? owner.tagName.toLowerCase(),
            semanticId:
              resolveSemanticId(ariaLabel ?? "", targetRegion, true) ??
              resolveSemanticId(titleLabel, targetRegion, false) ??
              resolveSemanticId(fixedTextLabel, targetRegion, false) ??
              composerStructuralSemanticIds.get(svg) ?? null,
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
    let projectPickerObservation = null;
    if (projectPickerOnly) {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(
        (dialog) =>
          isActuallyVisible(dialog) &&
          dialog.querySelector('input[placeholder="Search projects"]'),
      );
      if (dialogs.length !== 1) {
        throw new Error(
          `Expected one visible current Project picker, received ${dialogs.length}.`,
        );
      }
      const dialog = dialogs[0];
      const search = dialog.querySelector('input[placeholder="Search projects"]');
      const listbox = dialog.querySelector('[role="listbox"]');
      if (!(search instanceof HTMLInputElement) || !listbox) {
        throw new Error("Current Project picker is missing its search or listbox.");
      }
      const actionLabels = ["New project", "Don't work in a project"];
      const actions = actionLabels.map((label) => {
        const matches = [...dialog.querySelectorAll("button")].filter(
          (button) =>
            isActuallyVisible(button) &&
            !button.disabled &&
            button.textContent?.trim() === label,
        );
        if (matches.length !== 1) {
          throw new Error(
            `Expected one enabled current Project picker action ${label}, received ${matches.length}.`,
          );
        }
        const svgs = [...matches[0].querySelectorAll("svg")].filter(
          isActuallyVisible,
        );
        if (svgs.length !== 1) {
          throw new Error(
            `Expected one visible SVG for current Project picker action ${label}, received ${svgs.length}.`,
          );
        }
        return {
          iconRect: rect(svgs[0]),
          iconViewBox: svgs[0].getAttribute("viewBox"),
          label,
          rect: rect(matches[0]),
        };
      });
      const exactIds = new Set([
        "composer-new-project",
        "composer-clear-project",
      ]);
      const exactIcons = icons.filter(({ owner }) =>
        exactIds.has(owner.semanticId),
      );
      if (
        exactIcons.length !== exactIds.size ||
        exactIcons.some(({ owner }) => !exactIds.delete(owner.semanticId)) ||
        exactIds.size !== 0
      ) {
        throw new Error(
          "Current Project picker action icons did not map one-to-one to their semantic IDs.",
        );
      }
      const listboxStyle = getComputedStyle(listbox);
      const options = [...listbox.querySelectorAll('[role="option"]')];
      projectPickerObservation = {
        actionLabels,
        actions,
        activePlaceholder:
          document.activeElement === search ? search.placeholder : null,
        listbox: {
          clientHeight: listbox.clientHeight,
          overflowY: listboxStyle.overflowY,
          rect: rect(listbox),
          scrollHeight: listbox.scrollHeight,
        },
        optionCount: options.length,
        search: {
          rect: rect(search),
          style: {
            fontFamily: getComputedStyle(search).fontFamily,
            fontSize: getComputedStyle(search).fontSize,
            lineHeight: getComputedStyle(search).lineHeight,
          },
        },
        selectedCount: options.filter(
          (option) => option.getAttribute("aria-selected") === "true",
        ).length,
        surface: {
          rect: rect(dialog),
          style: {
            backgroundColor: getComputedStyle(dialog).backgroundColor,
            borderRadius: getComputedStyle(dialog).borderRadius,
            boxShadow: getComputedStyle(dialog).boxShadow,
          },
        },
      };
    }
    const captureSemanticSvg = (svg, semanticId) => {
      const bounds = svg.getBoundingClientRect();
      return {
        owner: { role: "presentation", semanticId },
        primitives: [...svg.children].map(serializeSvgElement),
        region: "conversation",
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
    };
    let mcpObservation = null;
    if (mcpOnly) {
      const groupButtons = [...document.querySelectorAll("button")].filter(
        (button) =>
          isActuallyVisible(button) &&
          button.textContent?.trim() ===
            "Used OpenAI Developer Docs integration",
      );
      const callButtons = [
        ...document.querySelectorAll("button[aria-labelledby][aria-expanded]"),
      ].filter((button) => {
        if (!isActuallyVisible(button)) return false;
        const labelId = button.getAttribute("aria-labelledby");
        const label = labelId ? document.getElementById(labelId) : null;
        const text = label?.textContent?.trim();
        return text === "Search OpenAI docs" || text === "Fetch OpenAI doc";
      });
      const findToolIcon = (owner) => {
        const svgs = [
          ...(owner?.querySelectorAll("svg") ?? []),
        ].filter(isActuallyVisible);
        return svgs.find(
          (svg) =>
            svg.getAttribute("viewBox") === "0 0 20 20" &&
            Math.abs(svg.getBoundingClientRect().width - 16) <= 0.1,
        );
      };
      const groupToolIcons = groupButtons
        .map((button) => findToolIcon(button))
        .filter(Boolean);
      const callToolIcons = callButtons
        .map((button) => findToolIcon(button.parentElement))
        .filter(Boolean);
      for (const svg of [...groupToolIcons, ...callToolIcons]) {
        icons.push(captureSemanticSvg(svg, "thread-mcp-tool"));
      }
      const closedCall = callButtons.find(
        (button) => button.getAttribute("aria-expanded") === "false",
      );
      const closedCallSvgs = [
        ...(closedCall?.parentElement?.querySelectorAll("svg") ?? []),
      ].filter((svg) => {
        const bounds = svg.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });
      const activityChevron = closedCallSvgs.find(
        (svg) =>
          svg.getAttribute("viewBox") === "0 0 20 20" &&
          Math.abs(svg.getBoundingClientRect().width - 14) <= 0.1,
      );
      if (activityChevron) {
        icons.push(
          captureSemanticSvg(activityChevron, "thread-activity-chevron"),
        );
      }
      const reconnectingRows = [...document.querySelectorAll("div")]
        .filter(
          (element) =>
            isActuallyVisible(element) &&
            element.textContent?.trim().startsWith("Reconnecting") &&
            element.querySelectorAll("svg").length >= 1,
        )
        .sort(
          (left, right) =>
            left.getBoundingClientRect().width -
            right.getBoundingClientRect().width,
        );
      const reconnectingIcon = [
        ...(reconnectingRows[0]?.querySelectorAll("svg") ?? []),
      ].find(
        (svg) =>
          svg.getAttribute("viewBox") === "0 0 16 16" &&
          Math.abs(svg.getBoundingClientRect().width - 16) <= 0.1,
      );
      if (reconnectingIcon) {
        icons.push(
          captureSemanticSvg(reconnectingIcon, "thread-reconnecting"),
        );
      }
      const groupBounds = groupButtons[0]?.getBoundingClientRect();
      const callBounds = callButtons[0]?.getBoundingClientRect();
      const openGroupChevron = groupButtons[0]
        ? [...groupButtons[0].querySelectorAll("svg")].find(
            (svg) =>
              svg.getAttribute("viewBox") === "0 0 20 20" &&
              Math.abs(svg.getBoundingClientRect().width - 14) <= 0.1,
          )
        : null;
      mcpObservation = {
        activityChevronCount: activityChevron ? 1 : 0,
        callCount: callButtons.length,
        callHeight: callBounds ? round(callBounds.height) : null,
        callToolIconCount: callToolIcons.length,
        groupCount: groupButtons.length,
        groupHeight: groupBounds ? round(groupBounds.height) : null,
        groupToolIconCount: groupToolIcons.length,
        openGroupChevronRotate: openGroupChevron
          ? getComputedStyle(openGroupChevron).rotate
          : null,
        reconnectingIconCount: reconnectingIcon ? 1 : 0,
      };
    }
    const currentCommandTerminalIcons = [
      ...document.querySelectorAll(".group\\/activity-header"),
    ]
      .filter((activity) => {
        const text = activity.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return /^(Ran|Running)\b/.test(text);
      })
      .map((activity) => activity.querySelector("svg"))
      .filter((svg) => {
        if (!(svg instanceof SVGElement) || !isActuallyVisible(svg)) return false;
        const bounds = svg.getBoundingClientRect();
        return (
          region(bounds) === "conversation" &&
          bounds.width === 16 &&
          bounds.height === 16 &&
          svg.getAttribute("viewBox") === "0 0 20 20"
        );
      });
    if (currentCommandTerminalIcons.length === 1) {
      const svg = currentCommandTerminalIcons[0];
      const bounds = svg.getBoundingClientRect();
      icons.push({
        owner: { role: "presentation", semanticId: "thread-command-terminal" },
        primitives: [...svg.children].map(serializeSvgElement),
        region: "conversation",
        rect: rect(svg),
        renderSize: {
          height: round(bounds.height),
          width: round(bounds.width),
        },
        rootAttributes: attributes(svg, true),
        rootComputedStyle: computedStyle(svg),
        sourceClassName: svg.getAttribute("class") ?? "",
        viewBox: svg.getAttribute("viewBox"),
      });
    }
    const currentThreadProjectIcons = [
      ...document.querySelectorAll("header svg"),
    ].filter((svg) => {
      const bounds = svg.getBoundingClientRect();
      return (
        !svg.closest(
          'a, button, [role="button"], [role="tab"], [role="menuitem"]',
        ) &&
        isActuallyVisible(svg) &&
        bounds.top >= 9 &&
        bounds.bottom < 52 &&
        bounds.width === 16 &&
        bounds.height === 16 &&
        svg.getAttribute("viewBox") === "0 0 16 16"
      );
    });
    if (currentThreadProjectIcons.length === 1) {
      const svg = currentThreadProjectIcons[0];
      const bounds = svg.getBoundingClientRect();
      icons.push({
        owner: { role: "presentation", semanticId: "thread-header-project" },
        primitives: [...svg.children].map(serializeSvgElement),
        region: "titlebar",
        rect: rect(svg),
        renderSize: {
          height: round(bounds.height),
          width: round(bounds.width),
        },
        rootAttributes: attributes(svg, true),
        rootComputedStyle: computedStyle(svg),
        sourceClassName: svg.getAttribute("class") ?? "",
        viewBox: svg.getAttribute("viewBox"),
      });
    }
    const exactComposerSemanticIds = new Set([
      "composer-project",
      "composer-worktree",
      "composer-branch",
      "composer-add-files",
      "composer-permission",
      "composer-model-chevron",
      "composer-dictate",
      "composer-voice",
      "composer-send",
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
    const threadObservation = {
      structuralNewChatIconCount: currentThreadNewChatInputs.length,
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
      footerVoiceControlCount: controlsForSemanticId(
        "sidebar-voice",
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
      mcpObservation,
      projectPickerObservation,
      sidebarObservation,
      threadObservation,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  }, {
    mcpOnly,
    projectPickerOnly,
    semanticLabelEntries: [...semanticLabels],
    threadOnly,
  });
  if (
    !threadOnly &&
    !mcpOnly &&
    !result.icons.some(
      (icon) =>
        icon.region === "composer" &&
        icon.owner?.semanticId === "composer-send",
    )
  ) {
    const composerEditor = main.locator(
      '[contenteditable="true"][role="textbox"]:visible',
    );
    if ((await composerEditor.count()) !== 1) {
      throw new Error("Expected one visible Composer editor for Send capture.");
    }
    try {
      await composerEditor.fill("current visual asset probe");
      await main.waitForSelector('button[aria-label="Send"]:visible');
      const sendIcon = await main.evaluate(() =>
        window.__codexUiKitCaptureVisibleControlIcon({
          ariaLabel: "Send",
          id: "composer-send",
          targetRegion: "composer",
        }),
      );
      result.icons.push(sendIcon);
    } finally {
      await composerEditor.fill("").catch(() => {});
    }
  }
  if (threadOnly) {
    result.rasterAssets = await main.evaluate(async () => {
      const candidates = [
        ...document.querySelectorAll('img[src="/apps/vscode.png"]'),
      ].filter((image) => {
        const bounds = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.right > 0 &&
          bounds.bottom > 0 &&
          bounds.left < innerWidth &&
          bounds.top < innerHeight &&
          image.src === "app://-/apps/vscode.png" &&
          style.visibility === "visible"
        );
      });
      if (candidates.length !== 1) {
        throw new Error(
          `Expected one visible VS Code titlebar image, received ${candidates.length}.`,
        );
      }
      const image = candidates[0];
      const bounds = image.getBoundingClientRect();
      const response = await fetch(image.src);
      if (!response.ok) {
        throw new Error(`VS Code titlebar image fetch failed: ${response.status}.`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return [
        {
          dataBase64: btoa(binary),
          id: "thread-header-editor-vscode",
          mimeType: response.headers.get("content-type")?.split(";")[0] ?? "",
          naturalSize: {
            height: image.naturalHeight,
            width: image.naturalWidth,
          },
          renderSize: {
            height: Math.round(bounds.height * 100) / 100,
            width: Math.round(bounds.width * 100) / 100,
          },
          sourceUrl: image.src,
          status: "runtime-observed",
        },
      ];
    });
  }
  fullCapture: try {
    if (threadOnly || mcpOnly || projectPickerOnly) break fullCapture;
    const projectRows = main.locator(
      'nav div[role="button"][aria-expanded]:not([aria-haspopup])',
    );
    if ((await projectRows.count()) === 0) {
      throw new Error("Current visual capture requires a sidebar project row.");
    }
    let projectRow = projectRows.first();
    let projectMenuLabels = [];
    let markedProjectMenuFound = false;
    for (let index = 0; index < (await projectRows.count()); index += 1) {
      const candidate = projectRows.nth(index);
      await candidate.hover();
      await candidate
        .locator('button[aria-haspopup="menu"]')
        .first()
        .click();
      await main.waitForSelector('[role="menu"]:visible');
      const labels = await main
        .locator('[role="menu"]:visible [role="menuitem"]')
        .allTextContents();
      if (labels.some((label) => label.trim() === "Mark all as read")) {
        projectRow = candidate;
        projectMenuLabels = labels;
        markedProjectMenuFound = true;
        break;
      }
      await main.keyboard.press("Escape");
      await main.waitForSelector('[role="menu"]', { state: "hidden" });
    }
    if (!markedProjectMenuFound) {
      await projectRow.hover();
      await projectRow
        .locator('button[aria-haspopup="menu"]')
        .first()
        .click();
      await main.waitForSelector('[role="menu"]:visible');
      projectMenuLabels = await main
        .locator('[role="menu"]:visible [role="menuitem"]')
        .allTextContents();
    }
    const projectMenuHasMarkAllAsRead = projectMenuLabels.some(
      (label) => label.trim() === "Mark all as read",
    );
    const projectMenuIcons = await main.evaluate(() =>
      window.__codexUiKitCaptureVisibleMenuIcons({
        ids: [
          "sidebar-project-menu-unpin",
          "sidebar-project-menu-reveal",
          "sidebar-project-menu-worktree",
          "sidebar-project-menu-edit",
          ...([...document.querySelectorAll('[role="menu"]')]
            .find((menu) => {
              const bounds = menu.getBoundingClientRect();
              return bounds.width > 0 && bounds.height > 0;
            })
            ?.textContent?.includes("Mark all as read")
            ? ["sidebar-project-menu-mark-read"]
            : []),
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
    const helpMenuCapture = await main.evaluate(() =>
      window.__codexUiKitCaptureVisibleMenuIconSlots({
        itemCount: 8,
        region: "sidebar-help-menu",
        slots: [
          { id: "sidebar-help-menu-release-note", itemIndex: 0, svgIndex: 0 },
          { id: "sidebar-help-menu-release-note", itemIndex: 1, svgIndex: 0 },
          { id: "sidebar-help-menu-release-note", itemIndex: 2, svgIndex: 0 },
          { id: "sidebar-help-menu-changelog", itemIndex: 3, svgIndex: 0 },
          {
            id: "sidebar-help-menu-changelog-external",
            itemIndex: 3,
            svgIndex: 1,
          },
          { id: "sidebar-help-menu-chrome", itemIndex: 4, svgIndex: 0 },
          { id: "sidebar-help-menu-remote", itemIndex: 5, svgIndex: 0 },
          { id: "sidebar-help-menu-keyboard", itemIndex: 6, svgIndex: 0 },
          { id: "sidebar-help-menu-support", itemIndex: 7, svgIndex: 0 },
        ],
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

    const runLocationTrigger = main.locator(
      'main button[data-composer-navigation-target="run-location"]:visible',
    );
    if ((await runLocationTrigger.count()) !== 1) {
      throw new Error("Expected one structural current run-location trigger.");
    }
    if (!(await runLocationTrigger.textContent())?.trim().endsWith("Local")) {
      await runLocationTrigger.click();
      const workInMenu = main.locator('[role="menu"]:visible');
      await workInMenu.waitFor();
      await workInMenu
        .getByRole("menuitem", { name: "Local", exact: true })
        .click();
      await main.waitForFunction(
        () =>
          document
            .querySelector(
              'main button[data-composer-navigation-target="run-location"]',
            )
            ?.textContent?.trim()
            .endsWith("Local") ?? false,
      );
    }
    await runLocationTrigger.click();
    const workInMenu = main.locator('[role="menu"]:visible');
    await workInMenu.waitFor();
    const workInCapture = await main.evaluate(() => {
      const capture = window.__codexUiKitCaptureVisibleMenuIconSlots({
        itemCount: 5,
        region: "workspace-run-location-menu",
        slots: [
          { id: "workspace-run-location-local", itemIndex: 0, svgIndex: 0 },
          { id: "workspace-selection-check", itemIndex: 0, svgIndex: 1 },
          {
            id: "workspace-run-location-worktree",
            itemIndex: 1,
            svgIndex: 0,
          },
          {
            id: "workspace-run-location-codex-web",
            itemIndex: 2,
            svgIndex: 0,
          },
          {
            id: "workspace-run-location-external",
            itemIndex: 2,
            svgIndex: 1,
          },
          {
            id: "workspace-run-location-send-cloud",
            itemIndex: 3,
            svgIndex: 0,
          },
          { id: "workspace-run-location-usage", itemIndex: 4, svgIndex: 0 },
          {
            id: "workspace-run-location-usage-chevron",
            itemIndex: 4,
            svgIndex: 1,
          },
        ],
      });
      const menu = [...document.querySelectorAll('[role="menu"]')].find(
        (candidate) => {
          const bounds = candidate.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0;
        },
      );
      const items = [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])];
      return {
        ...capture,
        observation: {
          ...capture.observation,
          codexWebHrefIsExpected:
            items[2]?.tagName === "A" &&
            items[2]?.getAttribute("href") ===
              "https://chatgpt.com/codex/cloud",
          disabled: items.map(
            (item) =>
              item.getAttribute("aria-disabled") === "true" ||
              (item instanceof HTMLButtonElement && item.disabled),
          ),
          labels: items.map((item) => item.textContent?.trim() ?? ""),
          roles: items.map((item) => item.getAttribute("role")),
          tags: items.map((item) => item.tagName),
          sectionLabel:
            [...(menu?.querySelectorAll("*") ?? [])]
              .find(
                (element) =>
                  element.children.length === 0 &&
                  element.textContent?.trim() === "Work in",
              )
              ?.textContent?.trim() ??
            null,
        },
      };
    });
    await main.keyboard.press("Escape");
    await workInMenu.waitFor({ state: "hidden" });

    await runLocationTrigger.click();
    await workInMenu.waitFor();
    await workInMenu
      .getByRole("menuitem", { name: "New worktree", exact: true })
      .click();
    const environmentTrigger = main
      .locator('main button[aria-haspopup="menu"]:visible')
      .filter({ hasText: /^No environment$/ });
    if ((await environmentTrigger.count()) !== 1) {
      throw new Error("Expected one current No environment trigger.");
    }
    await environmentTrigger.click();
    const environmentMenu = main.locator('[role="menu"]:visible');
    await environmentMenu.waitFor();
    const environmentCapture = await main.evaluate(() => {
      const capture = window.__codexUiKitCaptureVisibleMenuIconSlots({
        itemCount: 2,
        region: "workspace-environment-menu",
        slots: [
          { id: "workspace-selection-check", itemIndex: 0, svgIndex: 0 },
          {
            id: "workspace-environment-settings",
            itemIndex: 1,
            svgIndex: 0,
          },
        ],
      });
      const menu = [...document.querySelectorAll('[role="menu"]')].find(
        (candidate) => {
          const bounds = candidate.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0;
        },
      );
      const items = [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])];
      return {
        ...capture,
        observation: {
          ...capture.observation,
          emptyText: [...(menu?.querySelectorAll("*") ?? [])]
            .find((element) => element.children.length === 0 && element.textContent?.trim() === "No environments found")
            ?.textContent?.trim() ?? null,
          labels: items.map((item) => item.textContent?.trim() ?? ""),
          roles: items.map((item) => item.getAttribute("role")),
        },
      };
    });
    const environmentSettings = environmentMenu.getByRole("menuitem", {
      name: "Environment settings",
      exact: true,
    });
    await environmentSettings.click();
    await main.getByRole("heading", { name: "Environments", exact: true }).waitFor();
    const environmentSettingsObservation = await main.evaluate(() => {
      const round = (value) => Math.round(value * 100) / 100;
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          height: round(bounds.height),
          left: round(bounds.left),
          top: round(bounds.top),
          width: round(bounds.width),
        };
      };
      const style = (element) => {
        if (!element) return null;
        const computed = getComputedStyle(element);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderRadius: computed.borderRadius,
          color: computed.color,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          padding: computed.padding,
        };
      };
      const exactLeaf = (text) =>
        [...document.querySelectorAll("*")].find(
          (element) =>
            element.children.length === 0 && element.textContent?.trim() === text,
        );
      const heading = document.querySelector("h1");
      const unavailableHeading = exactLeaf("Local environments unavailable");
      const message = exactLeaf(
        "We could not load local environment settings for this project",
      );
      const card = message?.parentElement ?? null;
      return {
        card: { rect: rect(card), style: style(card) },
        heading: {
          rect: rect(heading),
          style: style(heading),
          text: heading?.textContent?.trim() ?? null,
        },
        message: {
          rect: rect(message),
          style: style(message),
          text: message?.textContent?.trim() ?? null,
        },
        unavailableHeading: {
          rect: rect(unavailableHeading),
          style: style(unavailableHeading),
          text: unavailableHeading?.textContent?.trim() ?? null,
        },
      };
    });
    const settingsNavigationItems = [
      { id: "settings-general", label: "General" },
      { id: "settings-import", label: "Import" },
      { id: "settings-profile", label: "Profile" },
      { id: "settings-appearance", label: "Appearance" },
      { id: "settings-voice", label: "Voice" },
      { id: "settings-configuration", label: "Configuration" },
      { id: "settings-personalization", label: "Personalization" },
      { id: "settings-pets", label: "Pets" },
      { id: "settings-keyboard-shortcuts", label: "Keyboard shortcuts" },
      { id: "settings-usage-billing", label: "Usage & billing" },
      {
        id: "settings-account",
        label: "Account",
        secondaryId: "settings-account-external",
      },
      { id: "settings-appshots", label: "Appshots" },
      { id: "settings-plugins", label: "Plugins" },
      { id: "settings-browser", label: "Browser" },
      { id: "settings-computer-use", label: "Computer use" },
      { id: "settings-hooks", label: "Hooks" },
      { id: "settings-connections", label: "Connections" },
      { id: "settings-git", label: "Git" },
      { id: "settings-environments", label: "Environments" },
      { id: "settings-worktrees", label: "Worktrees" },
      { id: "settings-archived-chats", label: "Archived chats" },
    ];
    const gitNavigation = main
      .locator("nav:visible")
      .getByRole("button", {
        name: "Git",
        exact: true,
      });
    if ((await gitNavigation.count()) !== 1) {
      throw new Error("Settings route lost its unique Git navigation item.");
    }
    await gitNavigation.click();
    await main.getByRole("heading", { name: "Git", exact: true }).waitFor();
    const settingsCapture = await main.evaluate(
      (items) => window.__codexUiKitCaptureSettingsNavigationIcons({ items }),
      settingsNavigationItems,
    );
    const settingsPageObservation = await main.evaluate(() => {
      const round = (value) => Math.round(value * 100) / 100;
      const visible = (element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      };
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          height: round(bounds.height),
          left: round(bounds.left),
          top: round(bounds.top),
          width: round(bounds.width),
        };
      };
      const style = (element) => {
        if (!element) return null;
        const computed = getComputedStyle(element);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderRadius: computed.borderRadius,
          color: computed.color,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          overflowX: computed.overflowX,
          overflowY: computed.overflowY,
          padding: computed.padding,
        };
      };
      const heading = [...document.querySelectorAll("h1")].find(visible) ?? null;
      const navigation =
        [...document.querySelectorAll("nav")].find(visible) ?? null;
      const searchbox = navigation?.querySelector('[role="searchbox"]') ?? null;
      const branchPrefix = [
        ...document.querySelectorAll('input[placeholder="codex/"]'),
      ].find(visible) ?? null;
      const firstCard = branchPrefix?.closest("section") ??
        branchPrefix?.parentElement?.parentElement ??
        null;
      const controls = [...document.querySelectorAll("button, input, textarea")]
        .filter(visible)
        .filter((element) => !navigation?.contains(element))
        .map((element) => ({
          ariaChecked: element.getAttribute("aria-checked"),
          ariaLabel: element.getAttribute("aria-label"),
          disabled:
            "disabled" in element && typeof element.disabled === "boolean"
              ? element.disabled
              : null,
          placeholder:
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? element.placeholder
              : null,
          rect: rect(element),
          role: element.getAttribute("role"),
          tagName: element.tagName,
          text:
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? "<redacted-value>"
              : element.textContent?.trim() ?? "",
        }));
      let scrollOwner = navigation?.querySelector('button[aria-label="Git"]')
        ?.parentElement ?? null;
      while (scrollOwner) {
        const computed = getComputedStyle(scrollOwner);
        if (
          ["auto", "scroll"].includes(computed.overflowY) &&
          scrollOwner.scrollHeight > scrollOwner.clientHeight
        ) {
          break;
        }
        scrollOwner = scrollOwner.parentElement;
      }
      return {
        controls,
        document: {
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          viewport: { height: window.innerHeight, width: window.innerWidth },
        },
        firstCard: { rect: rect(firstCard), style: style(firstCard) },
        heading: {
          rect: rect(heading),
          style: style(heading),
          text: heading?.textContent?.trim() ?? null,
        },
        navigation: { rect: rect(navigation), style: style(navigation) },
        navigationLabels: [
          ...(navigation?.querySelectorAll("button[aria-label]") ?? []),
        ].map((button) => button.getAttribute("aria-label")),
        scrollOwner: scrollOwner
          ? {
              clientHeight: scrollOwner.clientHeight,
              rect: rect(scrollOwner),
              scrollHeight: scrollOwner.scrollHeight,
              style: style(scrollOwner),
            }
          : null,
        searchbox: { rect: rect(searchbox), style: style(searchbox) },
      };
    });
    const settingsSearch = main.locator("nav:visible").getByRole("searchbox");
    await settingsSearch.fill("git");
    await main.waitForTimeout(150);
    const searchResultLines = await main
      .locator("nav:visible")
      .evaluate((navigation) =>
        navigation.innerText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      );
    await settingsSearch.fill("");
    await main.waitForTimeout(100);
    const hooksNavigation = main
      .locator("nav:visible")
      .getByRole("button", {
        name: "Hooks",
        exact: true,
      });
    await hooksNavigation.click();
    await main.getByRole("heading", { name: "Hooks", exact: true }).waitFor();
    await main.getByText("No hooks found", { exact: true }).waitFor();
    const hooksReloadIcon = await main.evaluate(() =>
      window.__codexUiKitCaptureSettingsActionIcon({
        ariaLabel: "Reload hooks",
        id: "settings-hooks-reload",
      }),
    );
    const settingsObservation = {
      ...settingsCapture.observation,
      page: settingsPageObservation,
      search: {
        query: "git",
        resultLines: searchResultLines,
      },
    };
    const backToApp = main.locator('button[aria-label="Back to ChatGPT"]');
    const backToAppFallback = main.getByText("Back to app", { exact: true });
    const backToAppControl =
      (await backToApp.count()) === 1
        ? backToApp
        : (await backToAppFallback.count()) > 0
          ? backToAppFallback.first()
          : null;
    if (!backToAppControl) {
      throw new Error("Settings route lost its Back to app control.");
    }
    await backToAppControl.evaluate((control) => control.click());
    await main.waitForSelector('[contenteditable="true"][role="textbox"]', {
      timeout: 15_000,
    });
    const restoredRunLocationTrigger = main.locator(
      'main button[data-composer-navigation-target="run-location"]:visible',
    );
    if ((await restoredRunLocationTrigger.count()) !== 1) {
      throw new Error("Environment settings route did not restore New worktree state.");
    }
    if (
      !(await restoredRunLocationTrigger.textContent())
        ?.trim()
        .endsWith("New worktree")
    ) {
      throw new Error("Environment settings route changed its New worktree state.");
    }
    await restoredRunLocationTrigger.click();
    const restoredWorkInMenu = main.locator('[role="menu"]:visible');
    await restoredWorkInMenu.waitFor();
    await restoredWorkInMenu
      .getByRole("menuitem", { name: "Local", exact: true })
      .click();

    result.icons.push(...projectMenuIcons, ...helpMenuCapture.icons);
    result.icons.push(...accountMenuCapture.icons);
    result.icons.push(...workInCapture.icons, ...environmentCapture.icons);
    result.icons.push(...settingsCapture.icons, hooksReloadIcon);
    result.sidebarObservation.projectMenuItemCount = projectMenuIcons.length;
    result.sidebarObservation.projectMenuHasMarkAllAsRead =
      projectMenuHasMarkAllAsRead;
    result.sidebarObservation.helpMenuIconCount =
      helpMenuCapture.observation.iconCount;
    result.sidebarObservation.helpMenuItemCount =
      helpMenuCapture.observation.itemCount;
    result.sidebarObservation.helpMenu = helpMenuCapture.observation;
    result.sidebarObservation.accountMenu = accountMenuCapture.observation;
    result.workspaceObservation = {
      environmentMenu: environmentCapture.observation,
      environmentSettings: environmentSettingsObservation,
      workInMenu: workInCapture.observation,
    };
    result.settingsObservation = settingsObservation;
  } finally {
    if ((await main.locator('[role="menu"]:visible').count()) > 0) {
      await main.keyboard.press("Escape").catch(() => {});
    }
    await main
      .evaluate(() => {
        delete window.__codexUiKitCaptureVisibleMenuIcons;
        delete window.__codexUiKitCaptureVisibleMenuIconSlots;
        delete window.__codexUiKitCaptureSettingsNavigationIcons;
        delete window.__codexUiKitCaptureSettingsActionIcon;
        delete window.__codexUiKitCaptureVisibleControlIcon;
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
  result.captureMode = threadOnly
    ? "completed-thread"
    : mcpOnly
      ? "completed-mcp-thread"
      : projectPickerOnly
        ? "project-picker"
      : "full";

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
  for (const [surface, observation] of Object.entries(
    result.workspaceObservation?.environmentSettings ?? {},
  )) {
    if (observation?.style) {
      sanitizeVisualScalarRecord(
        observation.style,
        `capture.workspaceObservation.environmentSettings.${surface}.style`,
      );
    }
  }
  for (const [surface, observation] of Object.entries(
    result.settingsObservation?.page ?? {},
  )) {
    if (observation?.style) {
      sanitizeVisualScalarRecord(
        observation.style,
        `capture.settingsObservation.page.${surface}.style`,
      );
    }
  }
  for (const [surface, observation] of Object.entries({
    search: result.projectPickerObservation?.search,
    surface: result.projectPickerObservation?.surface,
  })) {
    if (observation?.style) {
      sanitizeVisualScalarRecord(
        observation.style,
        `capture.projectPickerObservation.${surface}.style`,
      );
    }
  }
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
  result.rasterAssets = (result.rasterAssets ?? []).map((asset, index) => {
    if (
      asset.id !== "thread-header-editor-vscode" ||
      asset.mimeType !== "image/png" ||
      asset.sourceUrl !== "app://-/apps/vscode.png" ||
      asset.status !== "runtime-observed" ||
      asset.naturalSize?.height !== 64 ||
      asset.naturalSize?.width !== 64 ||
      asset.renderSize?.height !== 16 ||
      asset.renderSize?.width !== 16 ||
      typeof asset.dataBase64 !== "string"
    ) {
      throw new Error(`Unexpected current-thread raster asset at index ${index}.`);
    }
    const bytes = Buffer.from(asset.dataBase64, "base64");
    if (
      bytes.length === 0 ||
      bytes.length > 64 * 1024 ||
      bytes.toString("base64") !== asset.dataBase64 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    ) {
      throw new Error(`Invalid current-thread PNG payload at index ${index}.`);
    }
    return {
      ...asset,
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
