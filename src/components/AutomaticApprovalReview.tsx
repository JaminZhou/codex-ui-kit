import type { HTMLAttributes, ReactNode } from "react";

export type AutomaticApprovalReviewStatus =
  | "aborted"
  | "approved"
  | "denied"
  | "inProgress"
  | "timedOut";

const defaultTitles: Record<AutomaticApprovalReviewStatus, string> = {
  aborted: "Auto-review stopped",
  approved: "Auto-review approved",
  denied: "Auto-review denied",
  inProgress: "Auto-reviewing",
  timedOut: "Auto-review timed out",
};

const defaultSummaries: Partial<
  Record<AutomaticApprovalReviewStatus, string>
> = {
  timedOut:
    "A carefully prompted reviewer agent timed out before ChatGPT ran this request",
};

export interface AutomaticApprovalReviewProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  action?: ReactNode;
  icon?: ReactNode;
  rationale?: ReactNode;
  riskLevel?: string | null;
  status: AutomaticApprovalReviewStatus;
  summary?: ReactNode;
  title?: ReactNode;
}

function AutomaticApprovalReviewIcon({
  status,
}: {
  status: AutomaticApprovalReviewStatus;
}) {
  if (status === "inProgress") {
    return <span className="codex-ui-auto-review__spinner" />;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="6.5" />
      {status === "approved" ? (
        <path d="m6.75 10 2 2 4.5-4.5" />
      ) : (
        <path d="M10 6.5v4M10 13.5v.01" />
      )}
    </svg>
  );
}

export function AutomaticApprovalReview({
  action,
  className,
  icon,
  rationale,
  riskLevel,
  status,
  summary = defaultSummaries[status],
  title =
    status === "denied" && riskLevel === "high"
      ? "Auto-review denied high risk"
      : defaultTitles[status],
  ...props
}: AutomaticApprovalReviewProps) {
  const liveRole =
    status === "denied" || status === "timedOut" ? "alert" : "status";

  return (
    <article
      {...props}
      aria-busy={status === "inProgress" || undefined}
      aria-live={status === "inProgress" ? "polite" : undefined}
      className={["codex-ui-auto-review", className]
        .filter(Boolean)
        .join(" ")}
      data-risk-level={riskLevel || undefined}
      data-status={status}
      role={liveRole}
    >
      <span aria-hidden="true" className="codex-ui-auto-review__icon">
        {icon ?? <AutomaticApprovalReviewIcon status={status} />}
      </span>
      <div className="codex-ui-auto-review__main">
        <div className="codex-ui-auto-review__title">{title}</div>
        {action ? (
          <div className="codex-ui-auto-review__action">{action}</div>
        ) : null}
        {summary ? (
          <div className="codex-ui-auto-review__summary">{summary}</div>
        ) : null}
        {rationale ? (
          <div className="codex-ui-auto-review__rationale">{rationale}</div>
        ) : null}
      </div>
    </article>
  );
}
