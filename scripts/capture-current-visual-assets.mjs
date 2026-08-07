import { createHash } from "node:crypto";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";

const port = Number(process.env.CODEX_VISUAL_ASSET_CDP_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(
    "Set CODEX_VISUAL_ASSET_CDP_PORT to an isolated loopback-only Codex CDP port.",
  );
}

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
            ariaLabel: owner.getAttribute("aria-label"),
            dataTestId: owner.getAttribute("data-testid"),
            role: owner.getAttribute("role") ?? owner.tagName.toLowerCase(),
            title: owner.getAttribute("title"),
          },
          primitives: [...svg.children].map((child) => ({
            attributes: Object.fromEntries(
              [...child.attributes]
                .map((attribute) => [attribute.name, attribute.value])
                .sort(([left], [right]) => left.localeCompare(right)),
            ),
            tag: child.tagName.toLowerCase(),
          })),
          region: targetRegion,
          rect: rect(svg),
          rootAttributes: Object.fromEntries(
            [...svg.attributes]
              .filter((attribute) =>
                [
                  "color",
                  "fill",
                  "stroke",
                  "stroke-linecap",
                  "stroke-linejoin",
                  "stroke-width",
                ].includes(attribute.name),
              )
              .map((attribute) => [attribute.name, attribute.value])
              .sort(([left], [right]) => left.localeCompare(right)),
          ),
          style: style(svg),
          viewBox: svg.getAttribute("viewBox"),
        };
      })
      .filter(Boolean);
    const fontSamples = [
      document.querySelector('[contenteditable="true"][role="textbox"]'),
      document.querySelector("main"),
      document.querySelector("nav"),
    ]
      .filter(Boolean)
      .map((element) => ({
        ariaLabel: element.getAttribute("aria-label"),
        rect: rect(element),
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
