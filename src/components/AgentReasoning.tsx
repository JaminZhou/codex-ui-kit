import { useState, type HTMLAttributes, type ReactNode } from "react";

export type AgentReasoningStatus = "running" | "completed";

export interface AgentReasoningProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  defaultOpen?: boolean;
  label?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  status: AgentReasoningStatus;
}

export function AgentReasoning({
  children,
  className,
  defaultOpen,
  label,
  onOpenChange,
  open,
  status,
  ...props
}: AgentReasoningProps) {
  const [internalOpen, setInternalOpen] = useState(
    () => defaultOpen ?? status === "running",
  );
  const resolvedOpen = open ?? internalOpen;
  const classes = ["codex-ui-reasoning", className]
    .filter(Boolean)
    .join(" ");
  const resolvedLabel = label ?? (status === "running" ? "Thinking" : "Thought");

  return (
    <div className={classes} data-status={status} {...props}>
      <details
        className="codex-ui-reasoning__disclosure"
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open;
          if (open !== undefined) {
            if (nextOpen !== open) {
              onOpenChange?.(nextOpen);
              event.currentTarget.open = open;
            }
            return;
          }

          setInternalOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
        open={resolvedOpen}
      >
        <summary
          aria-expanded={resolvedOpen}
          className="codex-ui-reasoning__summary"
          onClick={(event) => {
            if (open === undefined) return;
            event.preventDefault();
            onOpenChange?.(!open);
          }}
        >
          <span className="codex-ui-reasoning__label">{resolvedLabel}</span>
          <span aria-hidden="true" className="codex-ui-reasoning__chevron" />
        </summary>
        <div
          className="codex-ui-reasoning__body"
          data-testid="reasoning-accordion-body"
        >
          {children}
        </div>
      </details>
    </div>
  );
}
