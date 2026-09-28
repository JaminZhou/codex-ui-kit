import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function createCurrentBuildAudit(inventory, targetBuild) {
  if (typeof targetBuild !== "string" || targetBuild.trim().length === 0) {
    throw new Error("a target app build is required");
  }

  const runtimeEvidenceBuilds = inventory.baseline?.runtimeEvidenceBuilds;
  if (!runtimeEvidenceBuilds || typeof runtimeEvidenceBuilds !== "object") {
    throw new Error("inventory must map runtime evidence prefixes to builds");
  }

  const targetPrefixes = new Set(
    Object.entries(runtimeEvidenceBuilds)
      .filter(([, build]) => build === targetBuild)
      .map(([prefix]) => prefix),
  );
  if (targetPrefixes.size === 0) {
    throw new Error(`unknown runtime evidence build: ${targetBuild}`);
  }

  const isPromotedBaseline = targetBuild === inventory.baseline?.appVersion;
  const surfaces = inventory.surfaces.map((surface) => {
    const candidatePackageEvidence = (surface.packageEvidence ?? []).filter(
      (evidence) => evidence.startsWith(`package-${targetBuild}:`),
    );
    const candidateRuntimeEvidence = (surface.runtimeEvidence ?? []).filter(
      (evidence) => targetPrefixes.has(evidence.split(":", 1)[0]),
    );
    const browserVerifiedForTargetBuild =
      isPromotedBaseline && surface.browserStatus === "verified";
    const electronVerifiedForTargetBuild =
      isPromotedBaseline && surface.electronStatus === "verified";
    const candidateEvidenceState = candidateRuntimeEvidence.length > 0
      ? "observed-fragments-only"
      : surface.runtimeStatus === "blocked_by_policy"
        ? "blocked-by-policy"
        : "no-observation-for-target-build";
    const targetBuildAudit = {
      presence: candidateRuntimeEvidence.length > 0
        ? "candidate-fragments-only"
        : surface.runtimeStatus === "blocked_by_policy"
          ? "policy-blocked"
          : "unobserved",
      entryPoint: "unverified",
      ownerAndLifecycle: "unverified",
      affectedStates: "unverified",
      responsiveAndThemeVariants: "unverified",
    };

    return {
      id: surface.id,
      area: surface.area ?? "unspecified",
      priority: surface.priority,
      ownership: surface.ownership,
      runtimeStatus: surface.runtimeStatus,
      implementationStatus: surface.implementationStatus,
      browserStatus: surface.browserStatus,
      electronStatus: surface.electronStatus,
      candidatePackageEvidence,
      packageEvidenceState: candidatePackageEvidence.length > 0
        ? "package-fragments-present"
        : "no-package-fragments-for-target-build",
      browserVerifiedForTargetBuild,
      electronVerifiedForTargetBuild,
      candidateRuntimeEvidence,
      candidateEvidenceState,
      targetBuildAudit,
      outstandingEvidence: [
        ...(candidateRuntimeEvidence.length === 0
          ? [
              surface.runtimeStatus === "blocked_by_policy"
                ? "policy-safe-presence-entry-point-or-explicit-exclusion"
                : "target-build-surface-presence-and-entry-point",
            ]
          : ["reconfirm-target-build-presence-and-entry-point"]),
        "reconfirm-target-build-owner-and-lifecycle",
        "reconfirm-target-build-affected-states-and-responsive-theme-variants",
        ...(browserVerifiedForTargetBuild
          ? []
          : ["target-build-browser-cdp-acceptance"]),
        ...(electronVerifiedForTargetBuild
          ? []
          : ["target-build-electron-acceptance"]),
        "target-build-regional-pixel-acceptance",
      ],
    };
  });

  const byPriority = Object.fromEntries(
    ["p0", "p1", "p2"].map((priority) => {
      const prioritySurfaces = surfaces.filter(
        (surface) => surface.priority === priority,
      );
      return [
        priority,
        {
          total: prioritySurfaces.length,
          withCandidateEvidence: prioritySurfaces.filter(
            (surface) => surface.candidateRuntimeEvidence.length > 0,
          ).length,
          withoutCandidateEvidence: prioritySurfaces.filter(
            (surface) => surface.candidateRuntimeEvidence.length === 0,
          ).length,
          browserVerified: prioritySurfaces.filter(
            (surface) => surface.browserVerifiedForTargetBuild,
          ).length,
          electronVerified: prioritySurfaces.filter(
            (surface) => surface.electronVerifiedForTargetBuild,
          ).length,
        },
      ];
    }),
  );
  const byArea = Object.fromEntries(
    [...new Set(surfaces.map((surface) => surface.area))]
      .sort((left, right) => left.localeCompare(right))
      .map((area) => {
        const areaSurfaces = surfaces.filter((surface) => surface.area === area);
        return [
          area,
          {
            total: areaSurfaces.length,
            withCandidateEvidence: areaSurfaces.filter(
              (surface) => surface.candidateRuntimeEvidence.length > 0,
            ).length,
            withoutCandidateEvidence: areaSurfaces.filter(
              (surface) => surface.candidateRuntimeEvidence.length === 0,
            ).length,
            byPriority: Object.fromEntries(
              ["p0", "p1", "p2"].map((priority) => {
                const prioritySurfaces = areaSurfaces.filter(
                  (surface) => surface.priority === priority,
                );
                return [
                  priority,
                  {
                    total: prioritySurfaces.length,
                    withCandidateEvidence: prioritySurfaces.filter(
                      (surface) => surface.candidateRuntimeEvidence.length > 0,
                    ).length,
                    withoutCandidateEvidence: prioritySurfaces.filter(
                      (surface) => surface.candidateRuntimeEvidence.length === 0,
                    ).length,
                  },
                ];
              }),
            ),
          },
        ];
      }),
  );

  return {
    schemaVersion: 1,
    targetBuild,
    promotedBaseline: inventory.baseline?.appVersion ?? null,
    surfaceCount: surfaces.length,
    candidateEvidenceCount: surfaces.filter(
      (surface) => surface.candidateRuntimeEvidence.length > 0,
    ).length,
    candidatePackageEvidenceCount: surfaces.filter(
      (surface) => surface.candidatePackageEvidence.length > 0,
    ).length,
    withoutCandidateEvidenceCount: surfaces.filter(
      (surface) => surface.candidateRuntimeEvidence.length === 0,
    ).length,
    withoutCandidatePackageEvidenceCount: surfaces.filter(
      (surface) => surface.candidatePackageEvidence.length === 0,
    ).length,
    byPriority,
    byArea,
    surfaces: surfaces.sort((left, right) => {
      const priorityOrder = { p0: 0, p1: 1, p2: 2 };
      return (
        priorityOrder[left.priority] - priorityOrder[right.priority] ||
        left.id.localeCompare(right.id)
      );
    }),
  };
}

export function formatCurrentBuildAuditSummary(report) {
  const priorityLines = ["p0", "p1", "p2"].map((priority) => {
    const counts = report.byPriority[priority];
    return `${priority.toUpperCase()}: ${counts.withCandidateEvidence}/${counts.total} have target-build observation tags; ${counts.withoutCandidateEvidence} have none; Browser ${counts.browserVerified}, Electron ${counts.electronVerified}.`;
  });
  const areaLine = Object.entries(report.byArea)
    .map(([area, counts]) =>
      `${area} ${counts.withCandidateEvidence}/${counts.total}`,
    )
    .join(", ");
  const packageSurfaceNoun = report.candidatePackageEvidenceCount === 1
    ? "surface"
    : "surfaces";

  return [
    `Build ${report.targetBuild} audit queue (${report.promotedBaseline === report.targetBuild ? "promoted baseline" : `candidate; promoted baseline is ${report.promotedBaseline}`}):`,
    `${report.surfaceCount} surfaces; ${report.candidateEvidenceCount} have candidate observation tags and ${report.withoutCandidateEvidenceCount} have no target-build observation.`,
    `Target-build package string fragments are present on ${report.candidatePackageEvidenceCount} ${packageSurfaceNoun}; this is not runtime evidence.`,
    ...priorityLines,
    `By area (candidate-tagged/total): ${areaLine}.`,
    "Observation tags are fragments, not acceptance. Use --json for the per-surface queue and outstanding gates.",
  ].join("\n");
}

const invokedPath = process.argv[1];
if (
  invokedPath &&
  fileURLToPath(import.meta.url) === resolve(invokedPath)
) {
  const argumentsWithoutSeparator = process.argv.slice(2).filter(
    (argument) => argument !== "--",
  );
  const jsonOutput = argumentsWithoutSeparator.includes("--json");
  const targetBuild = argumentsWithoutSeparator.find(
    (argument) => argument !== "--json",
  );
  if (!targetBuild) {
    throw new Error(
      "usage: node scripts/report-current-build-audit.mjs <app-build> [--json]",
    );
  }

  const inventoryUrl = new URL("../research/ui-inventory.json", import.meta.url);
  const inventory = JSON.parse(await readFile(inventoryUrl, "utf8"));
  const report = createCurrentBuildAudit(inventory, targetBuild);
  process.stdout.write(
    jsonOutput
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatCurrentBuildAuditSummary(report)}\n`,
  );
}
