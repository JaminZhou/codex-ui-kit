export type LiveApprovalDecision = "accept" | "decline";
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
