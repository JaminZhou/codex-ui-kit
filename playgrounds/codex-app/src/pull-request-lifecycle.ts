type PullRequestQueryStatus =
  | "empty"
  | "error"
  | "loading"
  | "refreshing";

type PullRequestMergeReadinessStatus =
  | "blocked"
  | "checking"
  | "conflicted"
  | "merged"
  | "merging"
  | "ready";

export type PullRequestReviewKind =
  | "approve"
  | "comment"
  | "request-changes";

type PullRequestSubmissionStatus =
  | "error"
  | "idle"
  | "submitted"
  | "submitting";

export type PullRequestDemoQueryStatus =
  | "ready"
  | PullRequestQueryStatus;

export type PullRequestDemoCheckStatus =
  | "failed"
  | "passed"
  | "running";

export type PullRequestDemoRequirementStatus =
  | "failed"
  | "passed"
  | "pending";

export interface PullRequestLifecycleState {
  checkStatus: PullRequestDemoCheckStatus;
  commentBody: string;
  commentError?: string;
  commentStatus: PullRequestSubmissionStatus;
  detailStatus: PullRequestDemoQueryStatus;
  indexStatus: PullRequestDemoQueryStatus;
  mergeStatus: PullRequestMergeReadinessStatus;
  reviewBody: string;
  reviewError?: string;
  reviewKind: PullRequestReviewKind;
  reviewRequirement: PullRequestDemoRequirementStatus;
  reviewStatus: PullRequestSubmissionStatus;
  selectedId: string | null;
}

export type PullRequestLifecycleAction =
  | { body: string; type: "comment/change" }
  | { error?: string; type: "comment/fail" }
  | { type: "comment/submit" }
  | { type: "comment/succeed" }
  | { type: "detail/fail" }
  | { type: "detail/load" }
  | { type: "detail/ready" }
  | { type: "index/fail" }
  | { type: "index/load" }
  | { type: "index/ready" }
  | { type: "merge/start" }
  | { type: "merge/succeed" }
  | { type: "checks/fail" }
  | { type: "checks/pass" }
  | { type: "checks/run" }
  | { body: string; type: "review/body" }
  | { error?: string; type: "review/fail" }
  | { kind: PullRequestReviewKind; type: "review/kind" }
  | { type: "review/submit" }
  | { type: "review/succeed" }
  | { id: string; type: "select" };

const basePullRequestLifecycleState: PullRequestLifecycleState = {
  checkStatus: "passed",
  commentBody: "",
  commentStatus: "idle",
  detailStatus: "ready",
  indexStatus: "ready",
  mergeStatus: "ready",
  reviewBody: "",
  reviewKind: "comment",
  reviewRequirement: "passed",
  reviewStatus: "idle",
  selectedId: "80",
};

export function initialPullRequestLifecycleState(
  frame: string | null,
): PullRequestLifecycleState {
  const state = { ...basePullRequestLifecycleState };
  switch (frame) {
    case "pr-index-loading":
    case "pr-index-current-26-825-loading":
      return {
        ...state,
        indexStatus: "loading",
        selectedId: null,
      };
    case "pr-index-failed":
      return {
        ...state,
        indexStatus: "error",
        selectedId: null,
      };
    case "pr-index-empty":
    case "pr-index-current-26-825-empty":
      return {
        ...state,
        indexStatus: "empty",
        selectedId: null,
      };
    case "pr-detail-loading":
      return { ...state, detailStatus: "loading" };
    case "pr-detail-failed":
      return { ...state, detailStatus: "error" };
    case "pr-checks-running":
      return {
        ...state,
        checkStatus: "running",
        mergeStatus: "checking",
      };
    case "pr-checks-failed":
    case "pr-merge-blocked":
      return {
        ...state,
        checkStatus: "failed",
        mergeStatus: "blocked",
        reviewRequirement: "failed",
      };
    case "pr-review-draft":
      return {
        ...state,
        mergeStatus: "blocked",
        reviewBody: "The interaction and responsive behavior match.",
        reviewRequirement: "pending",
      };
    case "pr-review-submitting":
      return {
        ...state,
        mergeStatus: "checking",
        reviewBody: "The interaction and responsive behavior match.",
        reviewRequirement: "pending",
        reviewStatus: "submitting",
      };
    case "pr-review-submitted":
      return {
        ...state,
        mergeStatus: "ready",
        reviewBody: "The interaction and responsive behavior match.",
        reviewRequirement: "passed",
        reviewStatus: "submitted",
      };
    case "pr-comment-submitting":
      return {
        ...state,
        commentBody: "Current-head checks are green.",
        commentStatus: "submitting",
      };
    case "pr-comment-failed":
      return {
        ...state,
        commentBody: "Current-head checks are green.",
        commentError: "The comment was not posted. Try again.",
        commentStatus: "error",
      };
    case "pr-merge-ready":
      return {
        ...state,
        mergeStatus: "ready",
        reviewRequirement: "passed",
      };
    case "pr-merged":
      return {
        ...state,
        mergeStatus: "merged",
        reviewRequirement: "passed",
      };
    default:
      return state;
  }
}

function mergeStatusAfterRequirements(
  state: PullRequestLifecycleState,
  reviewRequirement = state.reviewRequirement,
) {
  if (state.checkStatus === "failed" || reviewRequirement === "failed") {
    return "blocked";
  }
  if (state.checkStatus === "running" || reviewRequirement === "pending") {
    return "checking";
  }
  return "ready";
}

export function reducePullRequestLifecycle(
  state: PullRequestLifecycleState,
  action: PullRequestLifecycleAction,
): PullRequestLifecycleState {
  switch (action.type) {
    case "index/load":
      return { ...state, indexStatus: "loading" };
    case "index/ready":
      return { ...state, indexStatus: "ready" };
    case "index/fail":
      return { ...state, indexStatus: "error" };
    case "select":
      return {
        ...state,
        detailStatus: "loading",
        selectedId: action.id,
      };
    case "detail/load":
      return { ...state, detailStatus: "loading" };
    case "detail/ready":
      return { ...state, detailStatus: "ready" };
    case "detail/fail":
      return { ...state, detailStatus: "error" };
    case "checks/run":
      return {
        ...state,
        checkStatus: "running",
        mergeStatus: "checking",
      };
    case "checks/pass": {
      const next = { ...state, checkStatus: "passed" as const };
      return {
        ...next,
        mergeStatus: mergeStatusAfterRequirements(next),
      };
    }
    case "checks/fail":
      return {
        ...state,
        checkStatus: "failed",
        mergeStatus: "blocked",
      };
    case "comment/change":
      return {
        ...state,
        commentBody: action.body,
        commentError: undefined,
        commentStatus: "idle",
      };
    case "comment/submit":
      return {
        ...state,
        commentError: undefined,
        commentStatus: "submitting",
      };
    case "comment/succeed":
      return {
        ...state,
        commentBody: "",
        commentError: undefined,
        commentStatus: "submitted",
      };
    case "comment/fail":
      return {
        ...state,
        commentError:
          action.error ?? "The comment was not posted. Try again.",
        commentStatus: "error",
      };
    case "review/body":
      return {
        ...state,
        reviewBody: action.body,
        reviewError: undefined,
        reviewStatus: "idle",
      };
    case "review/kind":
      return {
        ...state,
        reviewKind: action.kind,
        reviewStatus: "idle",
      };
    case "review/submit":
      return {
        ...state,
        mergeStatus: "checking",
        reviewError: undefined,
        reviewRequirement: "pending",
        reviewStatus: "submitting",
      };
    case "review/succeed": {
      const next = {
        ...state,
        reviewRequirement: "passed" as const,
        reviewStatus: "submitted" as const,
      };
      return {
        ...next,
        mergeStatus: mergeStatusAfterRequirements(
          next,
          next.reviewRequirement,
        ),
      };
    }
    case "review/fail":
      return {
        ...state,
        mergeStatus: "blocked",
        reviewError:
          action.error ?? "The review could not be submitted. Try again.",
        reviewRequirement: "failed",
        reviewStatus: "error",
      };
    case "merge/start":
      return state.mergeStatus === "ready"
        ? { ...state, mergeStatus: "merging" }
        : state;
    case "merge/succeed":
      return state.mergeStatus === "merging"
        ? { ...state, mergeStatus: "merged" }
        : state;
  }
}
