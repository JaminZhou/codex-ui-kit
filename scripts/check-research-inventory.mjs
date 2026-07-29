import { readFile } from "node:fs/promises";

const inventoryUrl = new URL("../research/ui-inventory.json", import.meta.url);
const inventoryMarkdownUrl = new URL(
  "../research/UI_INVENTORY.md",
  import.meta.url,
);
const visualScenariosUrl = new URL(
  "../research/visual-scenarios.json",
  import.meta.url,
);
const inventory = JSON.parse(await readFile(inventoryUrl, "utf8"));
const inventoryMarkdown = await readFile(inventoryMarkdownUrl, "utf8");
const visualScenarios = JSON.parse(
  await readFile(visualScenariosUrl, "utf8"),
);
const currentRuntimeBuild = inventory.baseline?.appVersion;
const runtimeEvidenceBuilds = inventory.baseline?.runtimeEvidenceBuilds;

const allowedOwnership = new Set([
  "app",
  "cross-layer",
  "thread",
  "turn",
  "workspace",
]);
const allowedRuntime = new Set([
  "blocked_by_policy",
  "not_sampled",
  "runtime_observed",
]);
const allowedImplementation = new Set([
  "not_started",
  "partial",
  "scope_pending",
]);
const allowedVerification = new Set([
  "not_started",
  "partial_legacy",
  "verified",
]);
const allowedPriority = new Set(["p0", "p1", "p2"]);
const geometryResultProperties = new Set([
  "backgroundColor",
  "bottom",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "height",
  "left",
  "lineHeight",
  "padding",
  "top",
  "width",
]);

function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function ratio(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function optionalEnvironmentName(value) {
  return value === undefined || /^[A-Z0-9_]+$/.test(value);
}

function geometryExpectation(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length > 0;
  return (
    value &&
    typeof value === "object" &&
    Number.isFinite(value.value) &&
    (value.tolerance === undefined ||
      (Number.isFinite(value.tolerance) && value.tolerance >= 0))
  );
}

if (inventory.schemaVersion !== 1) {
  throw new Error("research inventory schemaVersion must be 1");
}

if (!Array.isArray(inventory.surfaces) || inventory.surfaces.length === 0) {
  throw new Error("research inventory must contain surfaces");
}

if (
  visualScenarios.version !== 1 ||
  !Array.isArray(visualScenarios.scenarios) ||
  visualScenarios.scenarios.length === 0
) {
  throw new Error("visual scenarios must contain v1 scenarios");
}

if (
  typeof currentRuntimeBuild !== "string" ||
  !runtimeEvidenceBuilds ||
  typeof runtimeEvidenceBuilds !== "object"
) {
  throw new Error("research inventory must map runtime evidence prefixes to builds");
}

const ids = new Set();
const visualScenarioIds = new Set();

for (const scenario of visualScenarios.scenarios) {
  if (typeof scenario.id !== "string" || scenario.id.length === 0) {
    throw new Error("visual scenario id must be a non-empty string");
  }
  if (visualScenarioIds.has(scenario.id)) {
    throw new Error(`duplicate visual scenario id: ${scenario.id}`);
  }
  visualScenarioIds.add(scenario.id);
  if (
    typeof scenario.capture !== "string" ||
    typeof scenario.referenceEnv !== "string" ||
    !/^[A-Z0-9_]+$/.test(scenario.referenceEnv)
  ) {
    throw new Error(`invalid visual reference contract for ${scenario.id}`);
  }
  if (
    !ratio(scenario.maximumDiffRatio) ||
    !ratio(scenario.pixelThreshold) ||
    !optionalEnvironmentName(scenario.maximumDiffRatioEnv) ||
    !optionalEnvironmentName(scenario.pixelThresholdEnv)
  ) {
    throw new Error(`invalid visual thresholds for ${scenario.id}`);
  }
  if (
    !scenario.geometry ||
    Object.values(scenario.geometry).some(
      (selector) => typeof selector !== "string" || selector.length === 0,
    )
  ) {
    throw new Error(`missing visual geometry selectors for ${scenario.id}`);
  }
  const geometryNames = Object.keys(scenario.geometry);
  if (
    !scenario.expectedGeometry ||
    Object.keys(scenario.expectedGeometry).length !== geometryNames.length ||
    geometryNames.some((name) => {
      const expected = scenario.expectedGeometry[name];
      return (
        !expected ||
        typeof expected !== "object" ||
        Object.keys(expected).length === 0 ||
        Object.entries(expected).some(
          ([property, value]) =>
            !geometryResultProperties.has(property) ||
            !geometryExpectation(value),
        )
      );
    })
  ) {
    throw new Error(`invalid expected visual geometry for ${scenario.id}`);
  }
  if (
    !Array.isArray(scenario.regions) ||
    scenario.regions.length === 0 ||
    scenario.regions.some(
      (region) =>
        typeof region.name !== "string" ||
        !positiveInteger(region.height) ||
        (region.left !== undefined &&
          !nonNegativeInteger(region.left)) ||
        (region.width !== undefined && !positiveInteger(region.width)) ||
        (region.top !== undefined && !nonNegativeInteger(region.top)) ||
        (region.fromBottom !== undefined &&
          !nonNegativeInteger(region.fromBottom)) ||
        !ratio(region.maximumDiffRatio) ||
        !optionalEnvironmentName(region.maximumDiffRatioEnv) ||
        (region.top === undefined && region.fromBottom === undefined),
    )
  ) {
    throw new Error(`invalid visual regions for ${scenario.id}`);
  }
  if (
    !Array.isArray(scenario.masks) ||
    scenario.masks.some(
      (mask) =>
        typeof mask.name !== "string" ||
        typeof mask.reason !== "string" ||
        mask.reason.trim().length === 0 ||
        !positiveNumber(mask.height) ||
        !positiveNumber(mask.width) ||
        typeof mask.left !== "number" ||
        typeof mask.top !== "number",
    )
  ) {
    throw new Error(`invalid visual ownership masks for ${scenario.id}`);
  }
}

for (const surface of inventory.surfaces) {
  if (typeof surface.id !== "string" || !surface.id.includes(".")) {
    throw new Error(`invalid inventory id: ${String(surface.id)}`);
  }

  if (ids.has(surface.id)) {
    throw new Error(`duplicate inventory id: ${surface.id}`);
  }
  ids.add(surface.id);

  if (!allowedOwnership.has(surface.ownership)) {
    throw new Error(`invalid ownership for ${surface.id}: ${surface.ownership}`);
  }
  if (!allowedRuntime.has(surface.runtimeStatus)) {
    throw new Error(
      `invalid runtimeStatus for ${surface.id}: ${surface.runtimeStatus}`,
    );
  }
  if (!allowedImplementation.has(surface.implementationStatus)) {
    throw new Error(
      `invalid implementationStatus for ${surface.id}: ${surface.implementationStatus}`,
    );
  }
  if (!allowedVerification.has(surface.browserStatus)) {
    throw new Error(
      `invalid browserStatus for ${surface.id}: ${surface.browserStatus}`,
    );
  }
  if (!allowedVerification.has(surface.electronStatus)) {
    throw new Error(
      `invalid electronStatus for ${surface.id}: ${surface.electronStatus}`,
    );
  }
  if (!allowedPriority.has(surface.priority)) {
    throw new Error(`invalid priority for ${surface.id}: ${surface.priority}`);
  }
  if (
    !Array.isArray(surface.packageEvidence) ||
    surface.packageEvidence.length === 0
  ) {
    throw new Error(`missing package evidence for ${surface.id}`);
  }
  if (
    surface.runtimeStatus === "runtime_observed" &&
    (!Array.isArray(surface.runtimeEvidence) ||
      surface.runtimeEvidence.length === 0)
  ) {
    throw new Error(`missing runtime evidence for ${surface.id}`);
  }
  const runtimeBuilds = (surface.runtimeEvidence ?? []).map((evidence) => {
    const prefix = evidence.split(":", 1)[0];
    const build = runtimeEvidenceBuilds[prefix];
    if (typeof build !== "string") {
      throw new Error(
        `unknown runtime evidence prefix for ${surface.id}: ${prefix}`,
      );
    }
    return build;
  });

  const serializedStatuses = [
    surface.runtimeStatus,
    surface.implementationStatus,
    surface.browserStatus,
    surface.electronStatus,
  ].join(" ");
  if (/\bcomplete\b/i.test(serializedStatuses)) {
    throw new Error(`unsupported Complete claim for ${surface.id}`);
  }
  if (
    surface.runtimeStatus !== "runtime_observed" &&
    (surface.browserStatus === "verified" ||
      surface.electronStatus === "verified")
  ) {
    throw new Error(
      `${surface.id} cannot be verified without current runtime evidence`,
    );
  }
  if (
    (surface.browserStatus === "verified" ||
      surface.electronStatus === "verified") &&
    !runtimeBuilds.includes(currentRuntimeBuild)
  ) {
    throw new Error(
      `${surface.id} cannot be verified against a previous runtime build`,
    );
  }
}

const priorities = inventory.surfaces.reduce(
  (counts, surface) => {
    counts[surface.priority] += 1;
    return counts;
  },
  { p0: 0, p1: 0, p2: 0 },
);

const statuses = inventory.surfaces.reduce(
  (counts, surface) => {
    counts.runtime[surface.runtimeStatus] += 1;
    counts.browser[surface.browserStatus] += 1;
    counts.electron[surface.electronStatus] += 1;
    return counts;
  },
  {
    runtime: { blocked_by_policy: 0, not_sampled: 0, runtime_observed: 0 },
    browser: { not_started: 0, partial_legacy: 0, verified: 0 },
    electron: { not_started: 0, partial_legacy: 0, verified: 0 },
  },
);
const visibleMarkdownSummary = [
  `Current inventory: ${inventory.surfaces.length} surface groups;`,
  `${statuses.runtime.runtime_observed} have scoped runtime evidence from`,
  `earlier builds and ${statuses.runtime.not_sampled} remain \`not_sampled\`.`,
  "Current-build Browser verification covers",
  `${statuses.browser.verified} groups and Electron verification covers`,
  `${statuses.electron.verified}.`,
].join(" ");
const normalizedInventoryMarkdown = inventoryMarkdown.replace(/\s+/g, " ");

if (!normalizedInventoryMarkdown.includes(visibleMarkdownSummary)) {
  throw new Error(
    `UI_INVENTORY.md visible summary is stale; expected ${visibleMarkdownSummary}`,
  );
}

console.log(
  `research inventory ok: ${inventory.surfaces.length} surfaces (${priorities.p0} P0, ${priorities.p1} P1, ${priorities.p2} P2)`,
);
