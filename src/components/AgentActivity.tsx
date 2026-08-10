import {
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { AgentActivityKind } from "../types.js";
import {
  StatusIndicator,
  type StatusIndicatorStatus,
} from "./StatusIndicator.js";

export type AgentActivityStatus = StatusIndicatorStatus;

export interface AgentActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  defaultOpen?: boolean;
  description?: ReactNode;
  detail?: ReactNode;
  disclosureIndicator?: boolean;
  disclosureMode?: "button" | "details" | "overlay-button";
  indicator?: ReactNode;
  kind?: AgentActivityKind;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  status: AgentActivityStatus;
  summary: ReactNode;
}

export function AgentActivity({
  children,
  className,
  defaultOpen = false,
  description,
  detail,
  disclosureIndicator = false,
  disclosureMode = "details",
  indicator,
  kind = "generic",
  onOpenChange,
  open,
  status,
  summary,
  ...props
}: AgentActivityProps) {
  const generatedSummaryId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const classes = ["codex-ui-activity", className].filter(Boolean).join(" ");
  const hasBody = children !== undefined && children !== null;
  const summaryId =
    disclosureMode === "overlay-button" ? generatedSummaryId : undefined;
  const updateOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };
  const header = (
    <>
      {indicator === undefined ? <StatusIndicator status={status} /> : indicator}
      <span className="codex-ui-activity__summary" id={summaryId}>
        {summary}
      </span>
      {detail ? (
        <span className="codex-ui-activity__detail">{detail}</span>
      ) : null}
    </>
  );
  const buttonChevron = (
    <span
      aria-hidden="true"
      className="codex-ui-activity__button-chevron"
      data-visible={disclosureIndicator || resolvedOpen || undefined}
    />
  );

  return (
    <div
      className={classes}
      data-kind={kind}
      data-status={status}
      data-expandable={hasBody || undefined}
      {...props}
    >
      {hasBody && disclosureMode === "overlay-button" ? (
        <div
          className="codex-ui-activity__disclosure"
          data-disclosure-mode="overlay-button"
          data-open={resolvedOpen || undefined}
        >
          <div className="codex-ui-activity__header">
            {header}
            {buttonChevron}
            <button
              aria-expanded={resolvedOpen}
              aria-labelledby={summaryId}
              className="codex-ui-activity__overlay-toggle"
              onClick={() => updateOpen(!resolvedOpen)}
              type="button"
            />
          </div>
          <div
            aria-hidden={!resolvedOpen}
            className="codex-ui-activity__body"
            hidden={!resolvedOpen}
          >
            {children}
          </div>
        </div>
      ) : hasBody && disclosureMode === "button" ? (
        <div
          className="codex-ui-activity__disclosure"
          data-disclosure-mode="button"
          data-open={resolvedOpen || undefined}
        >
          <button
            aria-expanded={resolvedOpen}
            className="codex-ui-activity__header"
            onClick={() => updateOpen(!resolvedOpen)}
            type="button"
          >
            {header}
            {buttonChevron}
          </button>
          <div
            aria-hidden={!resolvedOpen}
            className="codex-ui-activity__body"
            hidden={!resolvedOpen}
          >
            {children}
          </div>
        </div>
      ) : hasBody ? (
        <details
          className="codex-ui-activity__disclosure"
          onToggle={(event) => {
            const nextOpen = event.currentTarget.open;
            if (open !== undefined) {
              if (nextOpen !== open) {
                updateOpen(nextOpen);
                event.currentTarget.open = open;
              }
              return;
            }

            updateOpen(nextOpen);
          }}
          open={resolvedOpen}
        >
          <summary
            aria-expanded={resolvedOpen}
            className="codex-ui-activity__header"
            onClick={(event) => {
              if (open === undefined) return;
              event.preventDefault();
              updateOpen(!open);
            }}
          >
            {header}
          </summary>
          <div className="codex-ui-activity__body">{children}</div>
        </details>
      ) : (
        <div className="codex-ui-activity__header">{header}</div>
      )}
      {description ? (
        <div className="codex-ui-activity__description">{description}</div>
      ) : null}
    </div>
  );
}
