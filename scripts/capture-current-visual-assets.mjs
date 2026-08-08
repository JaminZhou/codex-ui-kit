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
  interactionState: "resting",
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
  ["Back to ChatGPT", "window-back-to-chatgpt"],
  ["Dictate", "composer-dictate"],
  ["Don't work in a project", "composer-clear-project"],
  ["New chat", "sidebar-new-chat"],
  ["Plugins", "sidebar-plugins"],
  ["Pull requests", "sidebar-pull-request"],
  ["Quick chat", "sidebar-quick-chat"],
  ["Search", "sidebar-search"],
  ["Scheduled", "sidebar-scheduled"],
  ["Sites", "sidebar-sites"],
  ["Start new voice chat", "composer-voice"],
  ["Switch mode, current mode: Codex", "sidebar-mode-chevron"],
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
      if (value.left >= 274 && value.top > window.innerHeight - 220) {
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
    const icons = [...document.querySelectorAll("svg")]
      .map((svg) => {
        const bounds = svg.getBoundingClientRect();
        const owner = svg.closest(
          'a, button, [role="button"], [role="tab"], [role="menuitem"]',
        );
        const targetRegion = region(bounds);
        if (
          !owner ||
          !targetRegion ||
          bounds.width === 0 ||
          bounds.height === 0
        ) {
          return null;
        }
        const ariaLabel = owner.getAttribute("aria-label");
        const fixedTextLabel = owner.textContent?.trim() ?? "";
        return {
          owner: {
            role: owner.getAttribute("role") ?? owner.tagName.toLowerCase(),
            semanticId:
              semanticLabels.get(ariaLabel) ??
              semanticLabels.get(fixedTextLabel) ??
              null,
          },
          primitives: [...svg.children].map(serializeSvgElement),
          region: targetRegion,
          rect: rect(svg),
          renderSize: { height: round(bounds.height), width: round(bounds.width) },
          rootAttributes: attributes(svg, true),
          rootComputedStyle: computedStyle(svg),
          sourceClassName: svg.getAttribute("class"),
          viewBox: svg.getAttribute("viewBox"),
        };
      })
      .filter(Boolean);
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
      fontSamples,
      icons,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  }, [...semanticLabels]);
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
