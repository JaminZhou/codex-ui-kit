import { describe, expect, it } from "vitest";
import { liveWorkspacePolicy } from "../electron/live-workspace-policy";

describe("live workspace policy", () => {
  it("defaults to read only with approvals and no network", () => {
    for (const flag of [undefined, "", "0", "true", "yes", " 1", "1 "]) {
      expect(liveWorkspacePolicy("/projects/demo", flag)).toEqual({
        approvalPolicy: "on-request",
        sandbox: "read-only",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
      });
    }
  });

  it("limits explicit host write mode to the selected workspace", () => {
    expect(liveWorkspacePolicy("/projects/selected", "1")).toEqual({
      approvalPolicy: "on-request",
      sandbox: "workspace-write",
      sandboxPolicy: {
        type: "workspaceWrite",
        writableRoots: ["/projects/selected"],
        networkAccess: false,
        excludeTmpdirEnvVar: true,
        excludeSlashTmp: true,
      },
    });
  });

  it("rebuilds writable roots on project changes without retaining the old project", () => {
    liveWorkspacePolicy("/projects/first", "1");
    const next = liveWorkspacePolicy("/projects/second", "1");
    expect(next.sandboxPolicy).toMatchObject({ writableRoots: ["/projects/second"] });
  });

  it("rejects relative or empty workspace paths", () => {
    for (const directory of ["", ".", "../other"]) {
      expect(() => liveWorkspacePolicy(directory, "1")).toThrow("absolute path");
    }
  });
});
