import type {
  LivePermissionProfile,
  LivePermissionApprovalResponse,
  LivePermissionEntry,
} from "./live-approval-gate.js";

export type LivePermissionRequestProfile = {
  fileSystem?: {
    entries?: LivePermissionEntry[];
    globScanMaxDepth?: number | null;
    read?: string[] | null;
    write?: string[] | null;
  } | null;
  network?: { enabled?: boolean | null } | null;
};

export function normalizePermissionProfile(
  params: LivePermissionRequestProfile,
): LivePermissionProfile {
  return {
    ...(params.fileSystem
      ? {
          fileSystem: {
            ...(params.fileSystem.entries
              ? { entries: params.fileSystem.entries }
              : {}),
            ...(params.fileSystem.globScanMaxDepth == null
              ? {}
              : { globScanMaxDepth: params.fileSystem.globScanMaxDepth }),
            read: params.fileSystem.read ?? null,
            write: params.fileSystem.write ?? null,
          },
        }
      : {}),
    ...(params.network
      ? { network: { enabled: params.network.enabled ?? null } }
      : {}),
  };
}

export function permissionApprovalResponse(
  profile: LivePermissionProfile,
  decision: "accept" | "acceptForSession" | "decline",
): LivePermissionApprovalResponse {
  return {
    permissions: decision === "decline" ? {} : profile,
    scope: decision === "acceptForSession" ? "session" : "turn",
  };
}
