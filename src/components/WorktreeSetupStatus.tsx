import {
  useId,
  useState,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";

export type WorktreeSetupPhase = "created" | "creating" | "failed";

export type WorktreeSetupStepStatus =
  | "completed"
  | "failed"
  | "in-progress"
  | "pending";

export interface WorktreeSetupStep {
  id: string;
  label: ReactNode;
  status: WorktreeSetupStepStatus;
}

export interface WorktreeSetupAction {
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export interface WorktreeSetupStatusProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  cancelAction?: WorktreeSetupAction;
  createdDescription?: ReactNode;
  defaultExpanded?: boolean;
  details?: ReactNode;
  editEnvironmentAction?: WorktreeSetupAction;
  expanded?: boolean;
  moreDetailsLabel?: ReactNode;
  lessDetailsLabel?: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  phase: WorktreeSetupPhase;
  retryAction?: WorktreeSetupAction;
  steps?: readonly WorktreeSetupStep[];
  title?: ReactNode;
  workLocallyAction?: WorktreeSetupAction;
}

const defaultSteps: Record<
  Exclude<WorktreeSetupPhase, "created">,
  readonly WorktreeSetupStep[]
> = {
  creating: [
    {
      id: "preparing-workspace",
      label: "Preparing workspace",
      status: "in-progress",
    },
    {
      id: "checking-out-files",
      label: "Checking out files",
      status: "pending",
    },
  ],
  failed: [
    {
      id: "preparing-workspace",
      label: "Preparing workspace",
      status: "completed",
    },
    {
      id: "checking-out-files",
      label: "Checking out files",
      status: "failed",
    },
  ],
};

const stepStatusLabels: Record<WorktreeSetupStepStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  "in-progress": "In progress",
  pending: "Pending",
};

function WorktreeBranchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M15.8 11.535c.367 0 .665.298.665.665v5a.665.665 0 0 1-.665.665h-5a.665.665 0 1 1 0-1.33h3.394l-3.565-3.564a.666.666 0 0 1 .942-.942l3.564 3.565V12.2c0-.367.298-.665.665-.665Zm0-9.4c.367 0 .665.298.665.665v5a.665.665 0 0 1-1.33 0V4.405l-5.128 5.128c-.323.324-.558.565-.842.74a2.668 2.668 0 0 1-.771.319c-.324.078-.662.073-1.12.073H1.93a.665.665 0 1 1 0-1.33h5.345c.52 0 .673-.005.809-.037.136-.033.266-.086.385-.16.12-.072.23-.177.598-.545l5.128-5.128H10.8a.665.665 0 0 1 0-1.33h5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeCompletedIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 21">
      <path
        d="M12.1599 7.63617C12.3713 7.33596 12.7863 7.26372 13.0866 7.47504C13.3867 7.68642 13.4589 8.10153 13.2477 8.40179L9.28876 14.0268C9.17264 14.1917 8.98808 14.2954 8.7868 14.308C8.61044 14.319 8.43764 14.2592 8.30634 14.144L8.25262 14.0912L6.16962 11.7993L6.08954 11.6918C5.93136 11.4259 5.97666 11.0761 6.21454 10.8598C6.45225 10.6439 6.80379 10.6326 7.05341 10.8149L7.15399 10.9047L8.67841 12.5815L12.1599 7.63617Z"
        fill="currentColor"
      />
      <path
        d="M9.99506 2.81226C14.3664 2.81226 17.9101 6.35596 17.9101 10.7273C17.9101 15.0986 14.3664 18.6423 9.99506 18.6423C5.62372 18.6423 2.08002 15.0986 2.08002 10.7273C2.08002 6.35596 5.62372 2.81226 9.99506 2.81226ZM9.99506 4.14233C6.35826 4.14233 3.4101 7.0905 3.4101 10.7273C3.4101 14.3641 6.35826 17.3123 9.99506 17.3123C13.6319 17.3123 16.58 14.3641 16.58 10.7273C16.58 7.0905 13.6319 4.14233 9.99506 4.14233Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeFailedIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M7.231 7.231a.665.665 0 0 1 .94 0L10 9.06l1.828-1.829.104-.085a.666.666 0 0 1 .921.922l-.084.104L10.94 10l1.829 1.828a.665.665 0 0 1-.94.94L10 10.94l-1.828 1.83a.665.665 0 0 1-.94-.94L9.06 10 7.23 8.172a.665.665 0 0 1 0-.94Z"
        fill="currentColor"
      />
      <path
        d="M10 2.085a7.915 7.915 0 1 1 0 15.83 7.915 7.915 0 0 1 0-15.83Zm0 1.33a6.585 6.585 0 1 0 0 13.17 6.585 6.585 0 0 0 0-13.17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeProgressIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12ZM20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12H6C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6V4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreePendingIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 2.085a7.915 7.915 0 1 1 0 15.83 7.915 7.915 0 0 1 0-15.83Zm0 1.33a6.585 6.585 0 1 0 0 13.17 6.585 6.585 0 0 0 0-13.17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeStepIcon({ status }: { status: WorktreeSetupStepStatus }) {
  if (status === "completed") return <WorktreeCompletedIcon />;
  if (status === "failed") return <WorktreeFailedIcon />;
  if (status === "in-progress") return <WorktreeProgressIcon />;
  return <WorktreePendingIcon />;
}

function WorktreeChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeRetryIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M16.585 9.335A6.585 6.585 0 0 0 5.09 5.002L3.665 6.427V3.8a.665.665 0 1 0-1.33 0v4.23c0 .367.298.665.665.665h4.23a.665.665 0 1 0 0-1.33H4.61L6.03 5.942A5.255 5.255 0 0 1 15.255 9.4a.665.665 0 0 0 1.33-.065Zm.415 1.97h-4.23a.665.665 0 1 0 0 1.33h2.62l-1.42 1.423A5.255 5.255 0 0 1 4.745 10.6a.665.665 0 0 0-1.33.065A6.585 6.585 0 0 0 14.91 14.998l1.425-1.425V16.2a.665.665 0 1 0 1.33 0v-4.23a.665.665 0 0 0-.665-.665Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeComputerIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.25 3.75h13.5c.69 0 1.25.56 1.25 1.25v8.25c0 .69-.56 1.25-1.25 1.25h-5.585v1.415h2.085a.665.665 0 1 1 0 1.33h-6.5a.665.665 0 1 1 0-1.33h2.085V14.5H3.25c-.69 0-1.25-.56-1.25-1.25V5c0-.69.56-1.25 1.25-1.25Zm.08 1.33v8.09h13.34V5.08H3.33Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeCancelIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M7.231 7.231a.665.665 0 0 1 .94 0L10 9.06l1.828-1.829a.665.665 0 1 1 .941.941L10.94 10l1.829 1.828a.665.665 0 0 1-.94.94L10 10.94l-1.828 1.829a.665.665 0 1 1-.941-.941L9.06 10 7.23 8.172a.665.665 0 0 1 0-.94Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WorktreeActionButton({
  action,
  defaultIcon,
  kind,
}: {
  action: WorktreeSetupAction;
  defaultIcon?: ReactNode;
  kind: "cancel" | "edit-environment" | "retry" | "work-locally";
}) {
  const icon = action.icon === undefined ? defaultIcon : action.icon;
  return (
    <button
      className="codex-ui-worktree-setup__action"
      data-kind={kind}
      disabled={action.disabled}
      onClick={action.onClick}
      type="button"
    >
      {icon ? (
        <span aria-hidden="true" className="codex-ui-worktree-setup__action-icon">
          {icon}
        </span>
      ) : null}
      <span>{action.label}</span>
    </button>
  );
}

function WorktreeSetupCreated({
  description,
  title,
}: {
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="codex-ui-worktree-setup__created-copy">
      <div className="codex-ui-worktree-setup__heading">
        <span className="codex-ui-worktree-setup__heading-icon">
          <WorktreeBranchIcon />
        </span>
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
    </div>
  );
}

export function WorktreeSetupStatus({
  cancelAction,
  className,
  createdDescription = "Starting a task",
  defaultExpanded = false,
  details,
  editEnvironmentAction,
  expanded,
  lessDetailsLabel = "Less details",
  moreDetailsLabel = "More details",
  onExpandedChange,
  phase,
  retryAction,
  steps,
  title,
  workLocallyAction,
  ...props
}: WorktreeSetupStatusProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const detailsId = useId();
  const resolvedTitle =
    title ??
    (phase === "failed"
      ? "Worktree setup failed"
      : phase === "created"
        ? "Worktree created"
        : "Creating a worktree");
  const resolvedSteps = phase === "created" ? [] : (steps ?? defaultSteps[phase]);
  const hasDetails = details !== undefined && details !== null && details !== false;
  const classes = ["codex-ui-worktree-setup", className]
    .filter(Boolean)
    .join(" ");

  function setExpanded(nextExpanded: boolean) {
    if (expanded === undefined) setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  }

  if (phase === "created") {
    return (
      <div
        aria-live="polite"
        className={classes}
        data-phase={phase}
        role="status"
        {...props}
      >
        <WorktreeSetupCreated
          description={createdDescription}
          title={resolvedTitle}
        />
      </div>
    );
  }

  return (
    <div
      aria-busy={phase === "creating" || undefined}
      aria-live={phase === "creating" ? "polite" : undefined}
      className={classes}
      data-expanded={isExpanded || undefined}
      data-phase={phase}
      role={phase === "failed" ? "alert" : "status"}
      {...props}
    >
      <div className="codex-ui-worktree-setup__heading">
        <span className="codex-ui-worktree-setup__heading-icon">
          <WorktreeBranchIcon />
        </span>
        <h3>{resolvedTitle}</h3>
      </div>
      <div className="codex-ui-worktree-setup__card">
        <ol aria-label="Worktree setup progress" className="codex-ui-worktree-setup__steps">
          {resolvedSteps.map((step) => (
            <li data-status={step.status} key={step.id}>
              <span className="codex-ui-worktree-setup__step-icon">
                <WorktreeStepIcon status={step.status} />
              </span>
              <span className="codex-ui-worktree-setup__sr-only">
                {stepStatusLabels[step.status]}:{" "}
              </span>
              <span className="codex-ui-worktree-setup__step-label">
                {step.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="codex-ui-worktree-setup__footer">
          {hasDetails ? (
            <button
              aria-controls={detailsId}
              aria-expanded={isExpanded}
              className="codex-ui-worktree-setup__details-toggle"
              onClick={() => setExpanded(!isExpanded)}
              type="button"
            >
              <span className="codex-ui-worktree-setup__details-chevron">
                <WorktreeChevronIcon />
              </span>
              <span>{isExpanded ? lessDetailsLabel : moreDetailsLabel}</span>
            </button>
          ) : (
            <span />
          )}
          <div className="codex-ui-worktree-setup__actions">
            {phase === "failed" ? (
              <>
                {editEnvironmentAction ? (
                  <WorktreeActionButton
                    action={editEnvironmentAction}
                    kind="edit-environment"
                  />
                ) : null}
                {retryAction ? (
                  <WorktreeActionButton
                    action={retryAction}
                    defaultIcon={<WorktreeRetryIcon />}
                    kind="retry"
                  />
                ) : null}
              </>
            ) : (
              <>
                {workLocallyAction ? (
                  <WorktreeActionButton
                    action={workLocallyAction}
                    defaultIcon={<WorktreeComputerIcon />}
                    kind="work-locally"
                  />
                ) : null}
                {cancelAction ? (
                  <WorktreeActionButton
                    action={cancelAction}
                    defaultIcon={<WorktreeCancelIcon />}
                    kind="cancel"
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
        {hasDetails ? (
          <div
            className="codex-ui-worktree-setup__details"
            hidden={!isExpanded}
            id={detailsId}
          >
            <pre>{details}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
