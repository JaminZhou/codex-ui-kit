import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus, ApprovalDecision } from "../types";
import { StatusIndicator } from "./StatusIndicator";

const decisionStatus: Record<ApprovalDecision, AgentItemStatus> = {
  approved: "completed",
  pending: "pending",
  rejected: "failed",
};

const defaultDecisionLabels: Record<ApprovalDecision, string> = {
  approved: "Approved",
  pending: "Awaiting approval",
  rejected: "Rejected",
};

export interface ApprovalRequestProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  approveLabel?: string;
  children?: ReactNode;
  decision?: ApprovalDecision;
  decisionLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  rejectLabel?: string;
  title: ReactNode;
}

export function ApprovalRequest({
  approveLabel = "Approve",
  children,
  className,
  decision = "pending",
  decisionLabel = defaultDecisionLabels[decision],
  description,
  disabled = false,
  onApprove,
  onReject,
  rejectLabel = "Reject",
  title,
  "aria-label": ariaLabel = "Approval request",
  ...props
}: ApprovalRequestProps) {
  const classes = ["codex-ui-approval-request", className]
    .filter(Boolean)
    .join(" ");
  const isPending = decision === "pending";

  return (
    <section
      aria-label={ariaLabel}
      className={classes}
      data-decision={decision}
      {...props}
    >
      <header className="codex-ui-approval-request__header">
        <StatusIndicator status={decisionStatus[decision]} />
        <h3>{title}</h3>
        <span
          aria-live="polite"
          className="codex-ui-approval-request__decision"
        >
          {decisionLabel}
        </span>
      </header>

      {description || children ? (
        <div className="codex-ui-approval-request__body">
          {description ? (
            <div className="codex-ui-approval-request__description">
              {description}
            </div>
          ) : null}
          {children ? (
            <div className="codex-ui-approval-request__detail">{children}</div>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <fieldset
          aria-label="Approval actions"
          className="codex-ui-approval-request__actions"
          disabled={disabled}
        >
          <button
            data-action="reject"
            disabled={!onReject}
            onClick={onReject}
            type="button"
          >
            {rejectLabel}
          </button>
          <button
            data-action="approve"
            disabled={!onApprove}
            onClick={onApprove}
            type="button"
          >
            {approveLabel}
          </button>
        </fieldset>
      ) : null}
    </section>
  );
}
