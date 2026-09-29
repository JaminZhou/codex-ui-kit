import { describe, expect, it } from "vitest";
import {
  createCurrentBuildAudit,
  formatCurrentBuildAuditSummary,
} from "../scripts/report-current-build-audit.mjs";

const inventory = {
  baseline: {
    appVersion: "26.903.71938",
    runtimeEvidenceBuilds: {
      "cdp-26.903": "26.903.71938",
      "cdp-26.924": "26.924.22138",
    },
  },
  surfaces: [
    {
      id: "thread.message",
      area: "conversation",
      priority: "p0",
      ownership: "thread",
      packageEvidence: [
        "package-26.924.22138:message-shell-label",
        "package-26.903.71938:legacy-message-label",
      ],
      runtimeStatus: "runtime_observed",
      runtimeEvidence: [
        "cdp-26.903:old-thread",
        "cdp-26.924:empty-thread-anchor",
      ],
      implementationStatus: "partial",
      browserStatus: "partial_legacy",
      electronStatus: "partial_legacy",
    },
    {
      id: "composer.context",
      area: "composer",
      priority: "p0",
      ownership: "turn",
      packageEvidence: ["package-26.903.71938:legacy-context-label"],
      runtimeStatus: "runtime_observed",
      runtimeEvidence: ["cdp-26.903:legacy-context"],
      implementationStatus: "partial",
      browserStatus: "partial_legacy",
      electronStatus: "partial_legacy",
    },
    {
      id: "settings.general",
      area: "settings",
      priority: "p1",
      ownership: "workspace",
      packageEvidence: [
        "settings-general-page",
        "package-26.924.22138:settings-general-label",
      ],
      runtimeStatus: "not_sampled",
      runtimeEvidence: [],
      implementationStatus: "not_started",
      browserStatus: "not_started",
      electronStatus: "not_started",
    },
  ],
};

describe("current-build audit report", () => {
  it("keeps candidate observations distinct from completed acceptance", () => {
    const report = createCurrentBuildAudit(inventory, "26.924.22138");

    expect(report.promotedBaseline).toBe("26.903.71938");
    expect(report.surfaceCount).toBe(3);
    expect(report.candidateEvidenceCount).toBe(1);
    expect(report.withoutCandidateEvidenceCount).toBe(2);
    expect(report.candidatePackageEvidenceCount).toBe(2);
    expect(report.withoutCandidatePackageEvidenceCount).toBe(1);
    expect(report.byPriority.p0).toMatchObject({
      total: 2,
      withCandidateEvidence: 1,
      withoutCandidateEvidence: 1,
      browserVerified: 0,
      electronVerified: 0,
    });
    expect(report.byArea).toMatchObject({
      conversation: {
        total: 1,
        withCandidateEvidence: 1,
        byPriority: { p0: { total: 1, withCandidateEvidence: 1 } },
      },
      composer: { total: 1, withCandidateEvidence: 0 },
      settings: { total: 1, withCandidateEvidence: 0 },
    });
    expect(report.surfaces.find(({ id }) => id === "thread.message"))
      .toMatchObject({
        candidateEvidenceState: "observed-fragments-only",
        candidateRuntimeEvidence: ["cdp-26.924:empty-thread-anchor"],
        packageEvidenceState: "package-fragments-present",
        candidatePackageEvidence: [
          "package-26.924.22138:message-shell-label",
        ],
        targetBuildAudit: {
          presence: "candidate-fragments-only",
          entryPoint: "unverified",
          ownerAndLifecycle: "unverified",
          affectedStates: "unverified",
          responsiveAndThemeVariants: "unverified",
        },
        outstandingEvidence: [
          "reconfirm-target-build-presence-and-entry-point",
          "reconfirm-target-build-owner-and-lifecycle",
          "reconfirm-target-build-affected-states-and-responsive-theme-variants",
          "target-build-browser-cdp-acceptance",
          "target-build-electron-acceptance",
          "target-build-regional-pixel-acceptance",
        ],
      });
    expect(report.surfaces.find(({ id }) => id === "settings.general"))
      .toMatchObject({
        candidateEvidenceState: "no-observation-for-target-build",
        packageEvidenceState: "package-fragments-present",
        targetBuildAudit: {
          presence: "unobserved",
          entryPoint: "unverified",
          ownerAndLifecycle: "unverified",
          affectedStates: "unverified",
          responsiveAndThemeVariants: "unverified",
        },
      });
  });

  it("sorts the audit queue by priority and then surface id", () => {
    const report = createCurrentBuildAudit(inventory, "26.924.22138");

    expect(report.surfaces.map(({ id }) => id)).toEqual([
      "composer.context",
      "thread.message",
      "settings.general",
    ]);
  });

  it("rejects a build absent from the inventory evidence map", () => {
    expect(() => createCurrentBuildAudit(inventory, "26.999.00000")).toThrow(
      "unknown runtime evidence build: 26.999.00000",
    );
  });

  it("summarizes candidate evidence without presenting it as acceptance", () => {
    const report = createCurrentBuildAudit(inventory, "26.924.22138");
    const summary = formatCurrentBuildAuditSummary(report);

    expect(summary).toContain("3 surfaces");
    expect(summary).toContain(
      "Target-build package string fragments are present on 2 surfaces; this is not runtime evidence.",
    );
    expect(summary).toContain("P0: 1/2 have target-build observation tags");
    expect(summary).toContain("By area (candidate-tagged/total): composer 0/1");
    expect(summary).toContain("Observation tags are fragments, not acceptance.");
    expect(summary).toContain("Use --json for the per-surface queue");
  });

  it("does not carry promoted-baseline Browser/Electron gates onto a candidate", () => {
    const report = createCurrentBuildAudit(
      {
        ...inventory,
        surfaces: [
          {
            ...inventory.surfaces[0],
            runtimeEvidence: ["cdp-26.903:thread"],
            browserStatus: "verified",
            electronStatus: "verified",
          },
        ],
      },
      "26.924.22138",
    );

    expect(report.byPriority.p0).toMatchObject({
      browserVerified: 0,
      electronVerified: 0,
    });
    expect(report.surfaces[0].outstandingEvidence).toContain(
      "target-build-browser-cdp-acceptance",
    );
    expect(report.surfaces[0].outstandingEvidence).toContain(
      "target-build-electron-acceptance",
    );
  });

  it("does not turn policy-blocked surfaces into runtime capture instructions", () => {
    const report = createCurrentBuildAudit(
      {
        ...inventory,
        surfaces: [
          {
            ...inventory.surfaces[2],
            id: "computer-use.execution",
            priority: "p0",
            runtimeStatus: "blocked_by_policy",
          },
        ],
      },
      "26.924.22138",
    );

    expect(report.surfaces[0].candidateEvidenceState).toBe("blocked-by-policy");
    expect(report.surfaces[0].outstandingEvidence).toContain(
      "policy-safe-presence-entry-point-or-explicit-exclusion",
    );
    expect(report.surfaces[0].outstandingEvidence).not.toContain(
      "target-build-runtime-observation",
    );
  });
});
