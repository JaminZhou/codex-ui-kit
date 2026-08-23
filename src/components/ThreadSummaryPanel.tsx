import {
  cloneElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { Popover } from "./InteractivePrimitives.js";

export interface ThreadSummaryPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  label?: string;
}

export function ThreadSummaryPanel({
  children,
  className,
  label = "Thread summary",
  ...props
}: ThreadSummaryPanelProps) {
  return (
    <div
      {...props}
      aria-label={label}
      className={["codex-ui-thread-summary-panel", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="thread-summary-panel"
    >
      {children}
    </div>
  );
}

export interface ThreadSummaryDockProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  anchorRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  defaultOpen?: boolean;
  dismissOnOutsidePointerDown?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  pinned?: boolean;
}

export function ThreadSummaryDock({
  anchorRef,
  children,
  className,
  defaultOpen = false,
  dismissOnOutsidePointerDown = true,
  onOpenChange,
  open,
  pinned = false,
  ...props
}: ThreadSummaryDockProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const dockRef = useRef<HTMLDivElement>(null);
  const resolvedOpen = open ?? internalOpen;
  const updateOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!resolvedOpen || pinned || !dismissOnOutsidePointerDown) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dockRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      updateOpen(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [anchorRef, dismissOnOutsidePointerDown, pinned, resolvedOpen]);

  return (
    <div
      {...props}
      aria-hidden={!resolvedOpen}
      className={["codex-ui-thread-summary-dock", className]
        .filter(Boolean)
        .join(" ")}
      data-open={resolvedOpen}
      data-pinned={pinned}
      data-slot="thread-summary-dock"
      ref={dockRef}
    >
      <div className="codex-ui-thread-summary-dock__surface">{children}</div>
    </div>
  );
}

export interface ThreadSummarySectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  actions?: ReactNode;
  children?: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  title: ReactNode;
  toggleLabel?: string;
}

export function ThreadSummarySection({
  actions,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  title,
  toggleLabel = "Toggle summary section",
  ...props
}: ThreadSummarySectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const resolvedExpanded = expanded ?? internalExpanded;
  const updateExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <section
      {...props}
      className={["codex-ui-thread-summary-section", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={resolvedExpanded || undefined}
      data-slot="thread-summary-panel-section"
    >
      <header className="codex-ui-thread-summary-section__header">
        {collapsible ? (
          <button
            aria-expanded={resolvedExpanded}
            aria-label={toggleLabel}
            className="codex-ui-thread-summary-section__toggle"
            onClick={() => updateExpanded(!resolvedExpanded)}
            type="button"
          >
            <span>{title}</span>
            <span
              aria-hidden="true"
              className="codex-ui-thread-summary-section__chevron"
            />
          </button>
        ) : (
          <h3>{title}</h3>
        )}
        {actions ? (
          <span
            className="codex-ui-thread-summary-section__actions"
            data-slot="thread-summary-panel-section-actions"
          >
            {actions}
          </span>
        ) : null}
      </header>
      {resolvedExpanded ? (
        <div className="codex-ui-thread-summary-section__items">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export type ThreadSummaryItemTone =
  | "default"
  | "muted"
  | "negative"
  | "positive";

export interface ThreadSummaryItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  tone?: ThreadSummaryItemTone;
  trailing?: ReactNode;
}

export function ThreadSummaryItem({
  className,
  label,
  leading,
  meta,
  tone = "default",
  trailing,
  ...props
}: ThreadSummaryItemProps) {
  return (
    <button
      {...props}
      className={["codex-ui-thread-summary-item", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="thread-summary-panel-item-button"
      data-tone={tone}
      type={props.type ?? "button"}
    >
      {leading ? (
        <span
          aria-hidden="true"
          className="codex-ui-thread-summary-item__leading"
          data-slot="thread-summary-panel-item-leading"
        >
          {leading}
        </span>
      ) : null}
      <span
        className="codex-ui-thread-summary-item__label"
        data-slot="thread-summary-panel-item-label"
      >
        {label}
      </span>
      {meta ? (
        <span
          className="codex-ui-thread-summary-item__meta"
          data-slot="thread-summary-panel-item-meta"
        >
          {meta}
        </span>
      ) : null}
      {trailing ? (
        <span
          aria-hidden="true"
          className="codex-ui-thread-summary-item__trailing"
        >
          {trailing}
        </span>
      ) : null}
    </button>
  );
}

export interface ThreadSummaryDeltaProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  added: number;
  removed: number;
}

export function ThreadSummaryDelta({
  added,
  className,
  removed,
  ...props
}: ThreadSummaryDeltaProps) {
  return (
    <span
      {...props}
      aria-label={`${added} additions, ${removed} deletions`}
      className={["codex-ui-thread-summary-delta", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span data-tone="positive">+{added}</span>
      <span data-tone="negative">-{removed}</span>
    </span>
  );
}

export interface ThreadSummaryIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  label: string;
}

export function ThreadSummaryIconButton({
  className,
  icon,
  label,
  ...props
}: ThreadSummaryIconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={["codex-ui-thread-summary-icon-button", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="thread-summary-panel-icon-button"
      type={props.type ?? "button"}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export interface ThreadSummaryPopoverProps {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  trigger?: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  triggerIcon?: ReactNode;
  triggerLabel?: string;
}

function DefaultSummaryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M2.25 3.25h1.5v1.5h-1.5v-1.5Zm3.25.1h8.25M2.25 7.25h1.5v1.5h-1.5v-1.5Zm3.25.1h8.25M2.25 11.25h1.5v1.5h-1.5v-1.5Zm3.25.1h8.25" />
    </svg>
  );
}

export function ThreadSummaryPopover({
  children,
  className,
  defaultOpen = false,
  disabled = false,
  label = "Thread summary",
  onOpenChange,
  open,
  trigger,
  triggerIcon,
  triggerLabel = "Toggle summary",
}: ThreadSummaryPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const updateOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const resolvedTrigger = trigger ? (
    cloneElement(trigger, {
      "aria-label": trigger.props["aria-label"] ?? triggerLabel,
      "aria-pressed": resolvedOpen,
    })
  ) : (
    <button
      aria-label={triggerLabel}
      aria-pressed={resolvedOpen}
      className="codex-ui-thread-summary-toggle"
      type="button"
    >
      {triggerIcon ?? <DefaultSummaryIcon />}
    </button>
  );

  return (
    <Popover
      align="end"
      className={["codex-ui-thread-summary-popover", className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      initialFocus="none"
      label={label}
      onOpenChange={updateOpen}
      open={resolvedOpen}
      role="dialog"
      side="bottom"
      sideOffset={8}
      trigger={resolvedTrigger}
      width="auto"
    >
      {children}
    </Popover>
  );
}
