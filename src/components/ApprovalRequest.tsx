import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ApprovalDecision } from "../types";

export type ApprovalRequestKind =
  | "generic"
  | "command"
  | "file"
  | "network"
  | "permission"
  | "mcp";

export interface ApprovalAction {
  info?: string;
  label?: ReactNode;
  onClick: () => void;
}

const defaultDecisionLabels: Record<ApprovalDecision, string> = {
  approved: "Approved",
  pending: "Awaiting approval",
  rejected: "Rejected",
};

const defaultIdentityLabels: Record<ApprovalRequestKind, string> = {
  command: "Terminal",
  file: "Edit files",
  generic: "Approval",
  mcp: "Tool request",
  network: "Internet access",
  permission: "Permissions",
};

function ApprovalIdentityIcon({ kind }: { kind: ApprovalRequestKind }) {
  if (kind === "file") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M4.75 3.5h6l4.5 4.5v8.5h-10.5z" />
        <path d="M10.75 3.5V8h4.5M7.25 11h5.5M7.25 13.75h4" />
      </svg>
    );
  }

  if (kind === "network") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="6.5" />
        <path d="M3.75 10h12.5M10 3.5c2 1.9 3 4.1 3 6.5s-1 4.6-3 6.5c-2-1.9-3-4.1-3-6.5s1-4.6 3-6.5Z" />
      </svg>
    );
  }

  if (kind === "command") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <rect height="12" rx="2" width="15" x="2.5" y="4" />
        <path d="m5.5 8 2 2-2 2M9.5 12h4.5" />
      </svg>
    );
  }

  if (kind === "permission") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M10 2.75 16 5v4.5c0 3.75-2.3 6.25-6 7.75-3.7-1.5-6-4-6-7.75V5z" />
        <path d="m7.25 10 1.75 1.75 3.75-4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.25v4.5M10 13.75v.01" />
    </svg>
  );
}

export interface ApprovalRequestProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  approvalOptionsLabel?: string;
  approveDisabled?: boolean;
  approveLabel?: ReactNode;
  autoFocus?: boolean;
  children?: ReactNode;
  decision?: ApprovalDecision;
  decisionLabel?: ReactNode;
  description?: ReactNode;
  details?: ReactNode;
  disableHotkeys?: boolean;
  disabled?: boolean;
  identity?: ReactNode;
  identityIcon?: ReactNode;
  kind?: ApprovalRequestKind;
  leadingAction?: ApprovalAction;
  loading?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  reason?: ReactNode;
  rejectLabel?: ReactNode;
  scopedApproveAction?: ApprovalAction;
  title: ReactNode;
}

export function ApprovalRequest({
  approvalOptionsLabel = "Approval options",
  approveDisabled = false,
  approveLabel,
  autoFocus = true,
  children,
  className,
  decision = "pending",
  decisionLabel = defaultDecisionLabels[decision],
  description,
  details,
  disableHotkeys = false,
  disabled = false,
  identity,
  identityIcon,
  kind = "generic",
  leadingAction,
  loading = false,
  onApprove,
  onReject,
  reason,
  rejectLabel,
  scopedApproveAction,
  title,
  "aria-label": ariaLabel = "Approval request",
  ...props
}: ApprovalRequestProps) {
  const classes = ["codex-ui-approval-request", className]
    .filter(Boolean)
    .join(" ");
  const rootRef = useRef<HTMLElement>(null);
  const optionsId = useId();
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const optionsRootRef = useRef<HTMLDivElement>(null);
  const optionsToggleRef = useRef<HTMLButtonElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState<CSSProperties>();
  const isPending = decision === "pending";
  const actionsDisabled = disabled || loading;
  const primaryDisabled = actionsDisabled || approveDisabled || !onApprove;
  const resolvedApproveLabel =
    approveLabel ?? (kind === "generic" ? "Approve" : "Allow once");
  const resolvedRejectLabel =
    rejectLabel ?? (kind === "generic" ? "Reject" : "Deny");
  const resolvedIdentity = identity ?? defaultIdentityLabels[kind];

  useEffect(() => {
    if (!isPending) setOptionsOpen(false);
  }, [isPending]);

  useEffect(() => {
    if (!optionsOpen) return;

    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !optionsRootRef.current?.contains(event.target) &&
        !optionsMenuRef.current?.contains(event.target)
      ) {
        setOptionsOpen(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOptionsOpen(false);
      optionsToggleRef.current?.focus();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [optionsOpen]);

  useLayoutEffect(() => {
    if (!optionsOpen) return;

    const updatePosition = () => {
      const toggle = optionsToggleRef.current;
      if (!toggle) return;
      const rect = toggle.getBoundingClientRect();
      const menuWidth = optionsMenuRef.current?.offsetWidth || 224;
      const menuHeight = optionsMenuRef.current?.offsetHeight || 84;
      const space = 4;
      const edge = 8;
      const left = Math.max(
        edge,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - edge),
      );
      const top =
        rect.bottom + space + menuHeight <= window.innerHeight - edge
          ? rect.bottom + space
          : Math.max(edge, rect.top - menuHeight - space);
      setOptionsPosition({ left, top });
    };

    updatePosition();
    optionsMenuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [optionsOpen]);

  useEffect(() => {
    if (
      !isPending ||
      disableHotkeys ||
      actionsDisabled ||
      (!onApprove && !onReject)
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const activeSurfaces = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-codex-approval-surface][data-decision="pending"]:not([data-hotkeys-disabled])',
        ),
      );
      if (activeSurfaces.at(-1) !== rootRef.current) return;

      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="menu"]',
        )
      ) {
        return;
      }

      if (
        event.key === "Enter" &&
        onApprove &&
        !approveDisabled &&
        !target?.closest("button, a")
      ) {
        event.preventDefault();
        setOptionsOpen(false);
        onApprove();
      } else if (event.key === "Escape" && onReject) {
        event.preventDefault();
        setOptionsOpen(false);
        onReject();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    actionsDisabled,
    approveDisabled,
    disableHotkeys,
    isPending,
    onApprove,
    onReject,
  ]);

  const optionsPortalTarget = optionsOpen
    ? (rootRef.current?.parentElement?.closest<HTMLElement>(
        "[data-theme], [data-codex-ui]",
      ) ?? document.body)
    : null;
  const optionsPortalTheme = optionsOpen
    ? rootRef.current?.closest<HTMLElement>("[data-theme]")?.dataset.theme
    : undefined;
  const handleOptionsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      setOptionsOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }
    const items = Array.from(
      optionsMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };
  const approveOnce = () => {
    setOptionsOpen(false);
    if (!primaryDisabled) onApprove?.();
  };
  const optionsMenu =
    optionsOpen && isPending && scopedApproveAction && optionsPortalTarget
      ? createPortal(
          <div
            className="codex-ui-approval-request__options-menu"
            data-theme={optionsPortalTheme}
            id={optionsId}
            onKeyDown={handleOptionsKeyDown}
            ref={optionsMenuRef}
            role="menu"
            style={optionsPosition}
          >
            <button
              disabled={primaryDisabled}
              onClick={approveOnce}
              role="menuitem"
              type="button"
            >
              {resolvedApproveLabel}
            </button>
            <button
              disabled={actionsDisabled}
              onClick={() => {
                setOptionsOpen(false);
                scopedApproveAction.onClick();
              }}
              role="menuitem"
              title={scopedApproveAction.info}
              type="button"
            >
              <span>
                {scopedApproveAction.label ?? "Allow this conversation"}
              </span>
              {scopedApproveAction.info ? (
                <span
                  aria-label={scopedApproveAction.info}
                  className="codex-ui-approval-request__option-info"
                  role="img"
                >
                  i
                </span>
              ) : null}
            </button>
          </div>,
          optionsPortalTarget,
        )
      : null;

  return (
    <section
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={classes}
      data-codex-approval-surface
      data-decision={decision}
      data-hotkeys-disabled={disableHotkeys || undefined}
      data-kind={kind}
      ref={rootRef}
      {...props}
    >
      <header className="codex-ui-approval-request__header">
        <div className="codex-ui-approval-request__identity">
          <span className="codex-ui-approval-request__identity-icon">
            {identityIcon ?? <ApprovalIdentityIcon kind={kind} />}
          </span>
          <span>{resolvedIdentity}</span>
          {!isPending ? (
            <span
              aria-live="polite"
              className="codex-ui-approval-request__decision"
            >
              {decisionLabel}
            </span>
          ) : null}
        </div>
        <div className="codex-ui-approval-request__heading">
          <h3>{title}</h3>
          {description ? (
            <div className="codex-ui-approval-request__description">
              {description}
            </div>
          ) : null}
        </div>
        {reason || details ? (
          <div className="codex-ui-approval-request__context">
            {reason ? (
              <dl className="codex-ui-approval-request__reason">
                <dt>Reason</dt>
                <dd>{reason}</dd>
              </dl>
            ) : null}
            {details ? (
              <div className="codex-ui-approval-request__details">{details}</div>
            ) : null}
          </div>
        ) : null}
      </header>

      {children ? (
        <div className="codex-ui-approval-request__body">{children}</div>
      ) : null}

      {isPending ? (
        <div
          aria-label="Approval actions"
          className="codex-ui-approval-request__actions"
          role="group"
        >
          {leadingAction ? (
            <button
              className="codex-ui-approval-request__button"
              data-action="leading"
              disabled={actionsDisabled}
              onClick={leadingAction.onClick}
              title={leadingAction.info}
              type="button"
            >
              {leadingAction.label ?? "Always allow"}
            </button>
          ) : null}

          <div className="codex-ui-approval-request__action-cluster">
            <button
              className="codex-ui-approval-request__button"
              data-action="reject"
              disabled={actionsDisabled || !onReject}
              onClick={onReject}
              type="button"
            >
              {resolvedRejectLabel}
            </button>

            {scopedApproveAction ? (
              <div
                className="codex-ui-approval-request__split"
                ref={optionsRootRef}
              >
                <button
                  autoFocus={autoFocus}
                  className="codex-ui-approval-request__button codex-ui-approval-request__button--primary"
                  data-action="approve"
                  disabled={primaryDisabled}
                  onClick={approveOnce}
                  type="button"
                >
                  {loading ? (
                    <span
                      aria-hidden="true"
                      className="codex-ui-approval-request__spinner"
                    />
                  ) : null}
                  {resolvedApproveLabel}
                </button>
                <button
                  aria-controls={optionsId}
                  aria-expanded={optionsOpen}
                  aria-haspopup="menu"
                  aria-label={approvalOptionsLabel}
                  className="codex-ui-approval-request__button codex-ui-approval-request__button--primary codex-ui-approval-request__options-toggle"
                  disabled={actionsDisabled}
                  onClick={() => setOptionsOpen((value) => !value)}
                  ref={optionsToggleRef}
                  type="button"
                >
                  <span aria-hidden="true" />
                </button>
                {optionsMenu}
              </div>
            ) : (
              <button
                autoFocus={autoFocus}
                className="codex-ui-approval-request__button codex-ui-approval-request__button--primary"
                data-action="approve"
                disabled={primaryDisabled}
                onClick={approveOnce}
                type="button"
              >
                {loading ? (
                  <span
                    aria-hidden="true"
                    className="codex-ui-approval-request__spinner"
                  />
                ) : null}
                {resolvedApproveLabel}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export interface ApprovalCommandPreviewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  collapseLabel?: ReactNode;
  collapsedLines?: number;
  command: ReactNode;
  defaultExpanded?: boolean;
  expandLabel?: ReactNode;
  forceCollapsible?: boolean;
}

export function ApprovalCommandPreview({
  className,
  collapseLabel = "Collapse",
  collapsedLines = 3,
  command,
  defaultExpanded = false,
  expandLabel = "Expand",
  forceCollapsible,
  style,
  ...props
}: ApprovalCommandPreviewProps) {
  const contentRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [measuredCollapsible, setMeasuredCollapsible] = useState(() => {
    if (typeof command !== "string") return false;
    return command.split(/\r?\n/u).length > collapsedLines || command.length > 96;
  });
  const collapsible = forceCollapsible ?? measuredCollapsible;
  const visuallyExpanded = expanded || forceCollapsible === false;

  useLayoutEffect(() => {
    if (forceCollapsible !== undefined) return;
    const element = contentRef.current;
    if (!element) return;

    const measure = () => {
      const computed = getComputedStyle(element);
      const lineHeight = Number.parseFloat(computed.lineHeight);
      if (!Number.isFinite(lineHeight)) return;
      const paddingBlock =
        Number.parseFloat(computed.paddingTop) +
        Number.parseFloat(computed.paddingBottom);
      setMeasuredCollapsible(
        element.scrollHeight > lineHeight * collapsedLines + paddingBlock + 1,
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [collapsedLines, command, forceCollapsible]);

  return (
    <div
      aria-label="Command preview"
      className={["codex-ui-approval-command", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={visuallyExpanded || undefined}
      role="region"
      style={
        {
          ...style,
          "--codex-ui-approval-command-lines": collapsedLines,
        } as CSSProperties
      }
      {...props}
    >
      <div className="codex-ui-approval-command__surface">
        <code ref={contentRef}>{command}</code>
        {collapsible ? (
          <div className="codex-ui-approval-command__actions">
            <button onClick={() => setExpanded((value) => !value)} type="button">
              {expanded ? collapseLabel : expandLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
