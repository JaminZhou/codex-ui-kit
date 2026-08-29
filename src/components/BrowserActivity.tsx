import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types.js";
import { AgentActivity } from "./AgentActivity.js";

export type BrowserActivityStepKind =
  | "instruction"
  | "connection"
  | "navigation";

export interface BrowserActivityStep {
  completed?: boolean;
  id: string;
  icon?: ReactNode;
  kind?: BrowserActivityStepKind;
  label: ReactNode;
}

export interface BrowserActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  activeLabel?: ReactNode;
  completedLabel?: ReactNode;
  defaultOpen?: boolean;
  failedLabel?: ReactNode;
  indicator?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  onStepOpen?: (step: BrowserActivityStep) => void;
  open?: boolean;
  status: AgentItemStatus;
  steps?: readonly BrowserActivityStep[];
  summary?: ReactNode;
}

function BrowserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-browser-activity__icon"
      viewBox="0 0 16 16"
    >
      <rect height="10.5" rx="2" width="12.5" x="1.75" y="2.75" />
      <path d="M5 13.25v1M11 13.25v1M5.5 6.25h5M8 4.75v3" />
    </svg>
  );
}

function StepIcon({ kind }: { kind: BrowserActivityStepKind }) {
  if (kind === "connection") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="10" rx="2" width="12" x="2" y="3" />
        <path d="m5 7 2 1.5L5 10M8.5 10H11" />
      </svg>
    );
  }

  if (kind === "navigation") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="10.5" rx="2" width="12.5" x="1.75" y="2.75" />
        <path d="m7 7 4 1.5-1.75.75L8.5 11Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 2.5h7l3 3v8H3Z" />
      <path d="M10 2.5v3h3M5.5 8h5M5.5 10.5h3.5" />
    </svg>
  );
}

function defaultSummary(
  status: AgentItemStatus,
  activeLabel: ReactNode,
  completedLabel: ReactNode,
  failedLabel: ReactNode,
) {
  if (status === "running" || status === "pending") return activeLabel;
  if (status === "failed") return failedLabel;
  return completedLabel;
}

export function BrowserActivity({
  activeLabel = "Using the browser",
  className,
  completedLabel = "Used the browser",
  defaultOpen = false,
  failedLabel = "Browser use failed",
  indicator,
  onOpenChange,
  onStepOpen,
  open,
  status,
  steps = [],
  summary,
  ...props
}: BrowserActivityProps) {
  const classes = ["codex-ui-browser-activity", className]
    .filter(Boolean)
    .join(" ");
  const resolvedSummary =
    summary ??
    defaultSummary(status, activeLabel, completedLabel, failedLabel);
  const body =
    steps.length > 0 ? (
      <ol className="codex-ui-browser-activity__steps">
        {steps.map((step) => {
          const content = (
            <>
              {step.icon ?? <StepIcon kind={step.kind ?? "navigation"} />}
              <span>{step.label}</span>
            </>
          );

          return (
            <li data-completed={step.completed || undefined} key={step.id}>
              {onStepOpen ? (
                <button onClick={() => onStepOpen(step)} type="button">
                  {content}
                </button>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    ) : undefined;

  return (
    <AgentActivity
      className={classes}
      defaultOpen={defaultOpen}
      indicator={indicator ?? <BrowserIcon />}
      kind="tool"
      onOpenChange={onOpenChange}
      open={open}
      status={status}
      summary={resolvedSummary}
      {...props}
    >
      {body}
    </AgentActivity>
  );
}
