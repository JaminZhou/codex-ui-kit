import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";

const port = Number(process.env.CODEX_VISUAL_ASSET_CDP_PORT);
const expectedProfile = process.env.CODEX_VISUAL_ASSET_PROFILE;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    "Set CODEX_VISUAL_ASSET_CDP_PORT to an isolated loopback-only Codex CDP port.",
  );
}
if (
  !expectedProfile?.startsWith("/") ||
  (!expectedProfile.includes("/codex-ui-kit-") &&
    !expectedProfile.includes("/.Trash/codex-ui-kit-"))
) {
  throw new Error(
    "Set CODEX_VISUAL_ASSET_PROFILE to the absolute unique codex-ui-kit profile used by the isolated Codex process.",
  );
}

const listenerPids = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\s+/)
  .filter(Boolean);
const isolatedOwner = listenerPids.find((pid) => {
  const command = execFileSync("/bin/ps", ["-p", pid, "-o", "command="], {
    encoding: "utf8",
  });
  return (
    command.includes("/Applications/ChatGPT.app/Contents/MacOS/ChatGPT") &&
    command.includes("--remote-debugging-address=127.0.0.1") &&
    command.includes(`--remote-debugging-port=${port}`) &&
    command.includes(`--user-data-dir=${expectedProfile}`)
  );
});
if (!isolatedOwner) {
  throw new Error(
    "CDP listener does not belong to the declared isolated Codex profile.",
  );
}

const semanticLabels = new Map([
  ["Add files and more", "composer-add-files"],
  ["Back to ChatGPT", "window-back-to-chatgpt"],
  ["Dictate", "composer-dictate"],
  ["Don't work in a project", "composer-clear-project"],
  ["Quick chat", "sidebar-quick-chat"],
  ["Search", "sidebar-search"],
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

  await main.evaluate(async () => {
    await document.fonts.ready;
  });

  const result = await main.evaluate(() => {
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
      "style",
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
    const attributes = (element) =>
      Object.fromEntries(
        [...element.attributes]
          .filter((attribute) =>
            allowedSvgAttributes.has(attribute.name.toLowerCase()),
          )
          .map((attribute) => [attribute.name, attribute.value])
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    const serializeSvgElement = (element) => {
      const tag = element.tagName.toLowerCase();
      if (!allowedSvgTags.has(tag)) {
        throw new Error(`Unsupported SVG element: ${tag}`);
      }
      const children = [...element.children].map(serializeSvgElement);
      return {
        attributes: attributes(element),
        ...(children.length > 0 ? { children } : {}),
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
      if (value.left < 274 && value.top < 180) return "sidebar-primary";
      if (value.left < 274 && value.top > window.innerHeight - 60) {
        return "sidebar-footer";
      }
      if (value.left >= 274 && value.top > window.innerHeight - 220) {
        return "composer";
      }
      return null;
    };
    const style = (element) => {
      const value = getComputedStyle(element);
      return {
        color: value.color,
        fill: value.fill,
        fontFamily: value.fontFamily,
        fontSize: value.fontSize,
        fontWeight: value.fontWeight,
        height: value.height,
        lineHeight: value.lineHeight,
        stroke: value.stroke,
        strokeWidth: value.strokeWidth,
        width: value.width,
      };
    };
    const icons = [...document.querySelectorAll("svg")]
      .map((svg) => {
        const bounds = svg.getBoundingClientRect();
        const owner = svg.closest(
          'button, [role="button"], [role="tab"], [role="menuitem"]',
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
        return {
          owner: {
            rawSemanticLabel: owner.getAttribute("aria-label"),
            role: owner.getAttribute("role") ?? owner.tagName.toLowerCase(),
          },
          primitives: [...svg.children].map(serializeSvgElement),
          region: targetRegion,
          rect: rect(svg),
          rootAttributes: attributes(svg),
          style: style(svg),
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
        style: style(element),
        tag: element.tagName,
      }));
    return {
      fontSamples,
      icons,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });

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
  result.icons = result.icons.map((icon) => ({
    ...icon,
    owner: {
      role: icon.owner.role,
      semanticId: semanticLabels.get(icon.owner.rawSemanticLabel) ?? null,
    },
    sha256: createHash("sha256")
      .update(
        canonicalize({
          primitives: icon.primitives,
          rootAttributes: icon.rootAttributes,
          viewBox: icon.viewBox,
        }),
      )
      .digest("hex"),
  }));

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
