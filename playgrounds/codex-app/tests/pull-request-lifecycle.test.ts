import { describe, expect, it } from "vitest";
import {
  initialPullRequestLifecycleState,
  reducePullRequestLifecycle,
} from "../src/pull-request-lifecycle";

describe("pull request lifecycle", () => {
  it("maps deterministic capture frames to observable states", () => {
    expect(initialPullRequestLifecycleState("pr-index-loading")).toMatchObject({
      indexStatus: "loading",
      selectedId: null,
    });
    expect(initialPullRequestLifecycleState("pr-comment-failed")).toMatchObject({
      commentStatus: "error",
      commentError: "The comment was not posted. Try again.",
    });
    expect(initialPullRequestLifecycleState("pr-merge-ready")).toMatchObject({
      checkStatus: "passed",
      mergeStatus: "ready",
      reviewRequirement: "passed",
    });
  });

  it("moves a selected pull request through loading and ready detail states", () => {
    const initial = initialPullRequestLifecycleState("pr-index-empty");
    const loading = reducePullRequestLifecycle(initial, {
      id: "80",
      type: "select",
    });
    expect(loading).toMatchObject({
      detailStatus: "loading",
      selectedId: "80",
    });
    expect(
      reducePullRequestLifecycle(loading, { type: "detail/ready" }),
    ).toMatchObject({
      detailStatus: "ready",
      selectedId: "80",
    });
  });

  it("keeps merge blocked until checks and the review requirement pass", () => {
    const initial = initialPullRequestLifecycleState("pr-merge-blocked");
    const checksPassed = reducePullRequestLifecycle(initial, {
      type: "checks/pass",
    });
    expect(checksPassed.mergeStatus).toBe("blocked");
    const reviewSubmitting = reducePullRequestLifecycle(checksPassed, {
      type: "review/submit",
    });
    expect(reviewSubmitting).toMatchObject({
      mergeStatus: "checking",
      reviewRequirement: "pending",
      reviewStatus: "submitting",
    });
    const reviewPassed = reducePullRequestLifecycle(reviewSubmitting, {
      type: "review/succeed",
    });
    expect(reviewPassed).toMatchObject({
      mergeStatus: "ready",
      reviewRequirement: "passed",
      reviewStatus: "submitted",
    });
    const merging = reducePullRequestLifecycle(reviewPassed, {
      type: "merge/start",
    });
    expect(merging.mergeStatus).toBe("merging");
    expect(
      reducePullRequestLifecycle(merging, { type: "merge/succeed" })
        .mergeStatus,
    ).toBe("merged");
  });

  it("keeps merge checking when a review succeeds before checks finish", () => {
    const initial = initialPullRequestLifecycleState("pr-checks-running");
    const submitting = reducePullRequestLifecycle(initial, {
      type: "review/submit",
    });
    const reviewed = reducePullRequestLifecycle(submitting, {
      type: "review/succeed",
    });

    expect(reviewed).toMatchObject({
      checkStatus: "running",
      mergeStatus: "checking",
      reviewRequirement: "passed",
      reviewStatus: "submitted",
    });
  });

  it("preserves comment text on failure and clears it on success", () => {
    const initial = initialPullRequestLifecycleState(null);
    const edited = reducePullRequestLifecycle(initial, {
      body: "Current-head checks are green.",
      type: "comment/change",
    });
    const submitting = reducePullRequestLifecycle(edited, {
      type: "comment/submit",
    });
    const failed = reducePullRequestLifecycle(submitting, {
      type: "comment/fail",
    });
    expect(failed).toMatchObject({
      commentBody: "Current-head checks are green.",
      commentStatus: "error",
    });
    const submitted = reducePullRequestLifecycle(submitting, {
      type: "comment/succeed",
    });
    expect(submitted).toMatchObject({
      commentBody: "",
      commentStatus: "submitted",
    });
  });
});
