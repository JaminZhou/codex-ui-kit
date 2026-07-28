export type LiveApprovalSubmissionId = number | string;

function submissionKey(requestId: LiveApprovalSubmissionId) {
  return `${typeof requestId}:${requestId}`;
}

export class LiveApprovalSubmissionGate {
  private readonly submitting = new Set<string>();

  begin(requestId: LiveApprovalSubmissionId) {
    const key = submissionKey(requestId);
    if (this.submitting.has(key)) return false;
    this.submitting.add(key);
    return true;
  }

  finish(requestId: LiveApprovalSubmissionId) {
    this.submitting.delete(submissionKey(requestId));
  }

  retainPending(requestIds: readonly LiveApprovalSubmissionId[]) {
    const pending = new Set(requestIds.map(submissionKey));
    this.submitting.forEach((key) => {
      if (!pending.has(key)) this.submitting.delete(key);
    });
  }
}
