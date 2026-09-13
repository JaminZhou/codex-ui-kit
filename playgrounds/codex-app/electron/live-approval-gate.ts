type LivePermissionPath =
  | { type: "path"; path: string }
  | { type: "glob_pattern"; pattern: string }
  | {
      type: "special";
      value:
        | { kind: "root" }
        | { kind: "minimal" }
        | { kind: "project_roots"; subpath: string | null }
        | { kind: "tmpdir" }
        | { kind: "slash_tmp" }
        | { kind: "unknown"; path: string; subpath: string | null };
    };

export type LivePermissionEntry = {
  access: "deny" | "read" | "write";
  path: LivePermissionPath;
};

export type LivePermissionProfile = {
  fileSystem?: {
    read: string[] | null;
    write: string[] | null;
    entries?: LivePermissionEntry[];
    globScanMaxDepth?: number;
  };
  network?: { enabled: boolean | null };
};

export type LivePermissionApprovalResponse = {
  permissions: LivePermissionProfile;
  scope: "session" | "turn";
  strictAutoReview?: boolean;
};

export type LiveApprovalDecision =
  | "accept"
  | "acceptForSession"
  | "decline"
  | {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: string[];
      };
    }
  | LivePermissionApprovalResponse;
export type LiveApprovalRequestId = number | string;

function approvalKey(requestId: LiveApprovalRequestId) {
  return `${typeof requestId}:${requestId}`;
}

export class LiveApprovalGate {
  private readonly pending = new Map<
    string,
    (decision: LiveApprovalDecision) => void
  >();

  request(requestId: LiveApprovalRequestId) {
    return new Promise<{ decision: LiveApprovalDecision }>((resolve) => {
      const key = approvalKey(requestId);
      this.pending.get(key)?.("decline");
      this.pending.set(key, (decision) => {
        this.pending.delete(key);
        resolve({ decision });
      });
    });
  }

  resolve(
    requestId: LiveApprovalRequestId,
    decision: LiveApprovalDecision,
  ) {
    const resolveApproval = this.pending.get(approvalKey(requestId));
    if (!resolveApproval) return false;
    resolveApproval(decision);
    return true;
  }

  declineAll() {
    [...this.pending.values()].forEach((resolveApproval) =>
      resolveApproval("decline"),
    );
    this.pending.clear();
  }
}
