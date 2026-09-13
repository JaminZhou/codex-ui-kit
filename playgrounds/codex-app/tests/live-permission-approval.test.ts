import { describe, expect, it } from "vitest";
import {
  normalizePermissionProfile,
  permissionApprovalResponse,
} from "../electron/live-permission-approval";

describe("live permission approval mapping", () => {
  const request = {
    fileSystem: {
      entries: [
        {
          access: "write" as const,
          path: { type: "path", path: "/tmp/codex-ui-kit" } as const,
        },
      ],
      read: null,
      write: null,
    },
    network: { enabled: true },
  };

  it("normalizes a public request profile without widening its grant", () => {
    expect(
      normalizePermissionProfile({
        fileSystem: request.fileSystem,
        network: request.network,
      }),
    ).toEqual(request);
  });

  it("maps once and session grants to the requested profile", () => {
    const profile = normalizePermissionProfile(request);

    expect(permissionApprovalResponse(profile, "accept")).toEqual({
      permissions: profile,
      scope: "turn",
    });
    expect(permissionApprovalResponse(profile, "acceptForSession")).toEqual({
      permissions: profile,
      scope: "session",
    });
  });

  it("fails closed for a declined permission request", () => {
    expect(
      permissionApprovalResponse(
        normalizePermissionProfile(request),
        "decline",
      ),
    ).toEqual({
      permissions: {},
      scope: "turn",
    });
  });
});
