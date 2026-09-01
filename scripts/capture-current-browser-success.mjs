import { createHash } from "node:crypto";
import { writeFileSync, realpathSync } from "node:fs";
import { dirname } from "node:path";
import { sanitizeVisualAssetIcon } from "./visual-asset-contract.mjs";

const requiredEnvironment = [
  "CODEX_BROWSER_SUCCESS_APP_ASAR_SHA256",
  "CODEX_BROWSER_SUCCESS_APP_VERSION",
  "CODEX_BROWSER_SUCCESS_BUILD_NUMBER",
  "CODEX_BROWSER_SUCCESS_CDP_PORT",
  "CODEX_BROWSER_SUCCESS_OUTPUT",
  "CODEX_BROWSER_SUCCESS_PROFILE",
];
for (const name of requiredEnvironment) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const port = Number(process.env.CODEX_BROWSER_SUCCESS_CDP_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("CODEX_BROWSER_SUCCESS_CDP_PORT must be a non-system TCP port.");
}

const profile = realpathSync(process.env.CODEX_BROWSER_SUCCESS_PROFILE);
const output = process.env.CODEX_BROWSER_SUCCESS_OUTPUT;
if (dirname(output) !== profile) {
  throw new Error("The Browser success capture must be a direct child of the isolated profile.");
}

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

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
  (response) => response.json(),
);
const target = targets.find(
  (candidate) =>
    candidate.type === "page" && candidate.url === "app://-/index.html",
);
if (!target?.webSocketDebuggerUrl) {
  throw new Error("The isolated Codex page target is unavailable.");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const resolve = pending.get(message.id);
  if (resolve) {
    pending.delete(message.id);
    resolve(message);
  }
};
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });

const expression = `(() => {
  const allowedAttributes = new Set(${JSON.stringify([
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
    "gradientTransform",
    "gradientUnits",
    "height",
    "href",
    "id",
    "mask",
    "offset",
    "opacity",
    "points",
    "preserveAspectRatio",
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
  ])});
  const attributes = (element) => Object.fromEntries(
    [...element.attributes]
      .filter((attribute) => allowedAttributes.has(attribute.name))
      .map((attribute) => [attribute.name, attribute.value])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const computedStyle = (element) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      [...style]
        .filter((name) => !name.startsWith("--"))
        .map((name) => [name, style.getPropertyValue(name)])
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  };
  const serialize = (element) => ({
    attributes: attributes(element),
    ...(
      element.children.length > 0
        ? { children: [...element.children].map(serialize) }
        : {}
    ),
    computedStyle: computedStyle(element),
    tag: element.tagName.toLowerCase(),
  });
  const leaf = (label) => {
    const matches = [...document.querySelectorAll("*")].filter(
      (element) =>
        element.childElementCount === 0 && element.textContent?.trim() === label,
    );
    if (matches.length !== 1) {
      throw new Error("Expected one leaf for " + label + ", received " + matches.length + ".");
    }
    return matches[0];
  };
  const iconFor = (label, semanticId) => {
    let owner = leaf(label);
    for (let depth = 0; depth < 5 && owner; depth += 1, owner = owner.parentElement) {
      const svgs = [...owner.querySelectorAll("svg")].filter(
        (svg) => svg.getBoundingClientRect().width > 0,
      );
      if (svgs.length !== 1) continue;
      const svg = svgs[0];
      const bounds = svg.getBoundingClientRect();
      return {
        owner: { semanticId },
        primitives: [...svg.children].map(serialize),
        region: "conversation",
        renderSize: { height: bounds.height, width: bounds.width },
        rootAttributes: attributes(svg),
        rootComputedStyle: computedStyle(svg),
        sourceClassName: svg.getAttribute("class") ?? "",
        viewBox: svg.getAttribute("viewBox"),
      };
    }
    throw new Error("Visible SVG for " + label + " was not found.");
  };
  const answer = leaf("CURRENT BROWSER SUCCESS 26.825");
  const source = [...document.querySelectorAll("a")].find(
    (anchor) => anchor.href === "https://developers.openai.com/codex/",
  );
  return {
    answer: answer.textContent.trim(),
    browserWorkspaceCount: document.querySelectorAll(
      '[aria-label="Browser workspace"], [data-testid*="browser-workspace"]',
    ).length,
    duration: leaf("Worked for 50s").textContent.trim(),
    horizontalOverflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    icons: [
      iconFor("Used the browser, ran a command", "thread-browser"),
      iconFor("Connect to Browser", "thread-browser-connect"),
      iconFor("Verify Codex documentation", "thread-browser"),
    ],
    source: source?.href ?? null,
    steps: [
      "Load Browser instructions",
      "Connect to Browser",
      "Verify Codex documentation",
    ].map((label) => leaf(label).textContent.trim()),
    summary: leaf("Used the browser, ran a command").textContent.trim(),
    viewport: { height: innerHeight, width: innerWidth },
  };
})()`;

const response = await call("Runtime.evaluate", {
  awaitPromise: true,
  expression,
  returnByValue: true,
});
socket.close();
if (response.result?.exceptionDetails) {
  throw new Error(
    response.result.exceptionDetails.exception?.description ??
      response.result.exceptionDetails.text,
  );
}
const observation = response.result.result.value;
const expected = {
  answer: "CURRENT BROWSER SUCCESS 26.825",
  browserWorkspaceCount: 0,
  duration: "Worked for 50s",
  horizontalOverflow: 0,
  source: "https://developers.openai.com/codex/",
  steps: [
    "Load Browser instructions",
    "Connect to Browser",
    "Verify Codex documentation",
  ],
  summary: "Used the browser, ran a command",
  viewport: { height: 820, width: 1180 },
};
for (const [key, value] of Object.entries(expected)) {
  if (canonicalize(observation[key]) !== canonicalize(value)) {
    throw new Error(
      `Current Browser success ${key} changed: ${canonicalize(observation[key])}.`,
    );
  }
}

const baselineContext = {
  appAsarSha256: process.env.CODEX_BROWSER_SUCCESS_APP_ASAR_SHA256,
  appVersion: process.env.CODEX_BROWSER_SUCCESS_APP_VERSION,
  buildNumber: process.env.CODEX_BROWSER_SUCCESS_BUILD_NUMBER,
  capturedAt: new Date().toISOString().slice(0, 10),
  interactionState: "completed-browser-success-expanded-compact",
  theme: "dark",
  viewport: observation.viewport,
};
const ownerEvidence = {
  "thread-browser":
    "current Browser success summary and navigation row glyph selected by exact stable activity text",
  "thread-browser-connect":
    "current Browser success connection-row glyph selected by exact stable activity text",
};
const primitiveGeometry = (primitive) => ({
  attributes: primitive.attributes,
  ...(primitive.children
    ? { children: primitive.children.map(primitiveGeometry) }
    : {}),
  tag: primitive.tag,
});
const icons = [];
for (const semanticId of ["thread-browser", "thread-browser-connect"]) {
  const candidates = observation.icons.filter(
    (icon) => icon.owner.semanticId === semanticId,
  );
  if (candidates.length === 0) {
    throw new Error(`Missing ${semanticId} capture.`);
  }
  if (
    new Set(
      candidates.map((candidate) =>
        canonicalize({
          primitives: candidate.primitives.map(primitiveGeometry),
          viewBox: candidate.viewBox,
        }),
      ),
    ).size !== 1
  ) {
    throw new Error(`${semanticId} repeated captures changed geometry.`);
  }
  const observed = sanitizeVisualAssetIcon(
    candidates[0],
    `currentBrowserSuccess.icons.${semanticId}`,
  );
  const icon = {
    baselineContext,
    id: semanticId,
    ownerAriaLabel: null,
    ownerEvidence: ownerEvidence[semanticId],
    primitives: observed.primitives,
    region: observed.region,
    renderSize: observed.renderSize,
    rootAttributes: observed.rootAttributes,
    rootComputedStyle: observed.rootComputedStyle,
    sourceClassName: observed.sourceClassName,
    status: "runtime-observed",
    viewBox: observed.viewBox,
  };
  icon.sha256 = createHash("sha256")
    .update(
      canonicalize({
        baselineContext,
        primitives: icon.primitives,
        renderSize: icon.renderSize,
        rootAttributes: icon.rootAttributes,
        rootComputedStyle: icon.rootComputedStyle,
        sourceClassName: icon.sourceClassName,
        viewBox: icon.viewBox,
      }),
    )
    .digest("hex");
  icons.push(icon);
}

writeFileSync(
  output,
  `${JSON.stringify(
    {
      baselineContext,
      evidence: { ...observation, icons: undefined },
      icons,
      schemaVersion: 1,
    },
    null,
    2,
  )}\n`,
);
console.log(`Captured current Browser success evidence at ${output}`);
