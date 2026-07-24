import { readFile } from "node:fs/promises";

const inventoryUrl = new URL("../research/ui-inventory.json", import.meta.url);
const inventory = JSON.parse(await readFile(inventoryUrl, "utf8"));

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

if (inventory.schemaVersion !== 1) {
  throw new Error("research inventory schemaVersion must be 1");
}

if (!Array.isArray(inventory.surfaces) || inventory.surfaces.length === 0) {
  throw new Error("research inventory must contain surfaces");
}

const ids = new Set();

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
}

const priorities = inventory.surfaces.reduce(
  (counts, surface) => {
    counts[surface.priority] += 1;
    return counts;
  },
  { p0: 0, p1: 0, p2: 0 },
);

console.log(
  `research inventory ok: ${inventory.surfaces.length} surfaces (${priorities.p0} P0, ${priorities.p1} P1, ${priorities.p2} P2)`,
);
