import { describe, expect, it } from "vitest";
import {
  validateContext,
  validateJobs,
  validateNewVersion,
} from "../scripts/trusted-release.mjs";

describe("npm publication gates", () => {
  it("allows only the initial 0.1.0 bootstrap for an absent package", () => {
    expect(() => validateNewVersion(null, null, "0.1.0")).not.toThrow();
    expect(() => validateNewVersion(null, null, "0.2.0")).toThrow();
    expect(() => validateNewVersion({ version: "0.1.0" }, null, "0.1.0")).toThrow();
    expect(() => validateNewVersion(null, { "dist-tags": { latest: "0.2.0" } }, "0.1.0")).toThrow();
  });

  it("rejects release dispatch from a tag, PR, fork or different revision", () => {
    const source = "a".repeat(40);
    const context = {
      GITHUB_REPOSITORY: "JaminZhou/codex-ui-kit",
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_REF: "refs/heads/main",
      GITHUB_SHA: source,
    };
    expect(() => validateContext(context, source)).not.toThrow();
    for (const change of [
      { GITHUB_REPOSITORY: "someone/codex-ui-kit" },
      { GITHUB_EVENT_NAME: "pull_request" },
      { GITHUB_REF: "refs/tags/v0.1.0" },
      { GITHUB_SHA: "b".repeat(40) },
    ]) {
      expect(() => validateContext({ ...context, ...change }, source)).toThrow();
    }
  });

  it("requires all macOS acceptance shards as well as package and consumer CI", () => {
    const names = ["quality", "React 18 / Bundler consumer", "React 19 / Bundler consumer",
      "React 19 / NodeNext consumer", "Codex app / cdp", "Codex app / electron",
      "Codex app / visual-1", "Codex app / visual-2", "Codex app / visual-3",
      "Codex app / visual-4", "check"];
    const jobs = names.map((name) => ({ name, status: "completed", conclusion: "success" }));
    expect(() => validateJobs(jobs)).not.toThrow();
    expect(() => validateJobs(jobs.filter((job) => job.name !== "Codex app / visual-4"))).toThrow();
    expect(() => validateJobs(jobs.map((job) => job.name === "check"
      ? { ...job, conclusion: "failure" } : job))).toThrow();
  });
});
