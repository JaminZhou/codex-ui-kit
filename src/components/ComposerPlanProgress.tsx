import {
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import type {
  AgentPlanStep,
  AgentPlanStepStatus,
} from "./AgentPlan.js";

export interface ComposerPlanProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  closeDelayMs?: number;
  defaultOpen?: boolean;
  open?: boolean;
  openDelayMs?: number;
  onOpenChange?: (open: boolean) => void;
  steps: readonly AgentPlanStep[];
}

function currentPlanStep(
  steps: readonly AgentPlanStep[],
): number {
  const activeIndex = steps.findIndex(
    ({ status }) => status === "in_progress",
  );
  if (activeIndex >= 0) return activeIndex;
  const nextIndex = steps.findIndex(
    ({ status }) => status !== "completed",
  );
  return nextIndex >= 0 ? nextIndex : Math.max(steps.length - 1, 0);
}

function PlanProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-composer-plan-progress__summary-ring"
      viewBox="0 0 12 12"
    >
      <circle cx="6" cy="6" pathLength="100" r="5" />
      <circle
        cx="6"
        cy="6"
        data-visible={progress > 0 || undefined}
        pathLength="100"
        r="5"
        style={{ strokeDashoffset: 100 - progress }}
      />
    </svg>
  );
}

function PlanStepStatus({ status }: { status: AgentPlanStepStatus }) {
  return (
    <span
      aria-hidden="true"
      className="codex-ui-composer-plan-progress__step-status"
      data-status={status}
    >
      <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" />
        {status === "in_progress" ? (
          <circle cx="8" cy="8" pathLength="100" r="6" />
        ) : null}
        {status === "completed" ? (
          <path d="m5.25 8.15 1.7 1.7 3.8-3.9" />
        ) : null}
      </svg>
    </span>
  );
}

export function ComposerPlanProgress({
  className,
  closeDelayMs = 80,
  defaultOpen = false,
  onOpenChange,
  open,
  openDelayMs = 150,
  steps,
  ...props
}: ComposerPlanProgressProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const contentId = useId();
  const closeTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const resolvedOpen = open ?? internalOpen;
  const completedCount = steps.filter(
    ({ status }) => status === "completed",
  ).length;
  const complete = steps.length === 0 || completedCount === steps.length;
  const currentIndex = currentPlanStep(steps);
  const summary = `Step ${currentIndex + 1} / ${steps.length}`;

  const clearTimers = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };
  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const scheduleOpen = () => {
    clearTimers();
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpen(true);
    }, openDelayMs);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, closeDelayMs);
  };

  useEffect(() => clearTimers, []);
  useEffect(() => {
    if (!complete) return;
    clearTimers();
    if (resolvedOpen) setOpen(false);
  }, [complete, resolvedOpen]);

  if (complete) return null;

  return (
    <div
      className={["codex-ui-composer-plan-progress", className]
        .filter(Boolean)
        .join(" ")}
      data-open={resolvedOpen || undefined}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      {...props}
    >
      <button
        aria-controls={contentId}
        aria-expanded={resolvedOpen}
        aria-label={`${summary}. Show plan`}
        className="codex-ui-composer-plan-progress__trigger"
        onBlur={scheduleClose}
        onClick={() => {
          clearTimers();
          setOpen(!resolvedOpen);
        }}
        onFocus={scheduleOpen}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          clearTimers();
          setOpen(false);
        }}
        type="button"
      >
        <span className="codex-ui-composer-plan-progress__summary">
          <PlanProgressRing
            completed={completedCount}
            total={steps.length}
          />
          <span className="codex-ui-composer-plan-progress__summary-text">
            {summary}
          </span>
        </span>
      </button>
      {resolvedOpen ? (
        <div
          className="codex-ui-composer-plan-progress__tooltip"
          id={contentId}
          onFocus={scheduleOpen}
          onMouseEnter={scheduleOpen}
          role="tooltip"
        >
          <ol className="codex-ui-composer-plan-progress__steps">
            {steps.map((item, index) => (
              <li
                aria-current={index === currentIndex ? "step" : undefined}
                className="codex-ui-composer-plan-progress__step"
                data-status={item.status}
                key={item.id ?? index}
              >
                <PlanStepStatus status={item.status} />
                <span className="codex-ui-composer-plan-progress__step-text">
                  {item.step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
