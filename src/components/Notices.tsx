import {
  useId,
  useState,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";

export type NoticeTone = "neutral" | "info" | "warning" | "error";
export type StatusBannerLayout = "horizontal" | "vertical" | "icon";
export type StatusBannerActionVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export interface StatusBannerAction {
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: StatusBannerActionVariant;
}

export interface StatusBannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  actions?: StatusBannerAction[];
  children?: ReactNode;
  customActions?: ReactNode;
  dismissLabel?: string;
  heading?: ReactNode;
  icon?: ReactNode;
  layout?: StatusBannerLayout;
  onDismiss?: MouseEventHandler<HTMLButtonElement>;
  stackOnNarrow?: boolean;
  tone?: NoticeTone;
}

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  if (tone === "info") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 7.25v4M8 4.6v.1" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M7 2.5a1.16 1.16 0 0 1 2 0l5.2 9a1.16 1.16 0 0 1-1 1.75H2.8a1.16 1.16 0 0 1-1-1.75l5.2-9Z" />
        <path d="M8 6v3.25M8 11.5v.1" />
      </svg>
    );
  }

  if (tone === "error") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.75v4.5M8 11.5v.1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.75" />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4.25 4.25 7.5 7.5M11.75 4.25l-7.5 7.5" />
    </svg>
  );
}

function LoadingIndicator() {
  return <span aria-hidden="true" className="codex-ui-notice-action__spinner" />;
}

function ReconnectingIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-stream-notice__reconnecting-icon"
      fill="currentColor"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path d="M8.09313 11.916C8.55971 11.9632 8.92406 12.3579 8.92418 12.8369C8.92397 13.3475 8.50993 13.7615 7.99938 13.7617C7.5204 13.7616 7.12563 13.3972 7.07848 12.9307L7.0736 12.8369L7.07848 12.7422C7.12582 12.2758 7.52054 11.9113 7.99938 11.9111L8.09313 11.916Z" />
      <path d="M7.99938 8.68555C9.12143 8.68562 10.199 9.1257 11.0004 9.91113C11.2072 10.1141 11.2101 10.4473 11.0072 10.6543C10.8043 10.8606 10.4719 10.8636 10.265 10.6611C9.65996 10.0682 8.84654 9.7364 7.99938 9.73633C7.15204 9.73633 6.3379 10.068 5.73278 10.6611C5.52583 10.8637 5.19349 10.8608 4.99059 10.6543C4.7877 10.4473 4.79157 10.1141 4.9984 9.91113C5.79976 9.1258 6.87735 8.68555 7.99938 8.68555Z" />
      <path d="M7.99938 5.45312C9.86602 5.45317 11.6672 6.10185 13.1 7.27539C13.3242 7.45905 13.3567 7.79035 13.1732 8.01465C12.9895 8.2387 12.6592 8.27137 12.4349 8.08789C11.1891 7.06742 9.62252 6.50395 7.99938 6.50391C6.37641 6.50394 4.8106 7.06764 3.56481 8.08789C3.34052 8.2716 3.00929 8.2389 2.82555 8.01465C2.64188 7.79037 2.67457 7.45912 2.89879 7.27539C4.33155 6.10192 6.13278 5.45316 7.99938 5.45312Z" />
      <path d="M7.99938 2.23828C10.539 2.23836 13.0018 3.05691 15.0277 4.55664C15.2603 4.72917 15.3093 5.05812 15.1371 5.29102C14.9646 5.52398 14.6357 5.57269 14.4027 5.40039C12.557 4.03405 10.3132 3.28914 7.99938 3.28906C5.68573 3.28915 3.44269 4.03422 1.59703 5.40039C1.36405 5.57286 1.03521 5.5239 0.862659 5.29102C0.690155 5.05798 0.739017 4.72916 0.972034 4.55664C2.99784 3.05703 5.45984 2.23837 7.99938 2.23828Z" />
    </svg>
  );
}

export function StatusBanner({
  actions = [],
  children,
  className,
  customActions,
  dismissLabel = "Dismiss",
  heading,
  icon,
  layout = "horizontal",
  onDismiss,
  stackOnNarrow = false,
  tone = "neutral",
  ...props
}: StatusBannerProps) {
  const resolvedIcon = icon === undefined ? <NoticeIcon tone={tone} /> : icon;
  const hasIcon =
    resolvedIcon !== undefined &&
    resolvedIcon !== null &&
    resolvedIcon !== false;
  const classes = [
    "codex-ui-status-banner",
    !hasIcon && "codex-ui-status-banner--iconless",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const hasCustomActions =
    customActions !== undefined &&
    customActions !== null &&
    customActions !== false;
  const hasActions =
    hasCustomActions || actions.length > 0 || onDismiss !== undefined;

  return (
    <div
      className={classes}
      data-layout={layout}
      data-stack-on-narrow={stackOnNarrow || undefined}
      data-tone={tone}
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-status-banner__backdrop" />
      {hasIcon ? (
        <span className="codex-ui-status-banner__icon">{resolvedIcon}</span>
      ) : null}
      <div className="codex-ui-status-banner__main">
        <div className="codex-ui-status-banner__body">
          {heading ? (
            <h3 className="codex-ui-status-banner__heading">{heading}</h3>
          ) : null}
          {children ? (
            <div className="codex-ui-status-banner__content">{children}</div>
          ) : null}
        </div>
        {hasActions ? (
          <div className="codex-ui-status-banner__actions">
            {hasCustomActions
              ? customActions
              : actions.map((action, index) => (
                <button
                  aria-label={action.ariaLabel}
                  aria-busy={action.loading || undefined}
                  className="codex-ui-notice-action"
                  data-variant={action.variant ?? "secondary"}
                  disabled={action.disabled || action.loading}
                  key={action.id ?? index}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.loading ? <LoadingIndicator /> : null}
                  <span>{action.label}</span>
                </button>
              ))}
            {onDismiss ? (
              <button
                aria-label={dismissLabel}
                className="codex-ui-notice-action codex-ui-status-banner__dismiss"
                data-variant="ghost"
                onClick={onDismiss}
                title={dismissLabel}
                type="button"
              >
                <DismissIcon />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface InlineNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  icon?: ReactNode;
  shimmering?: boolean;
  tone?: NoticeTone;
  trailingContent?: ReactNode;
  wrap?: boolean;
}

export interface WorkingDirectoryNoticeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  children?: ReactNode;
  heading?: ReactNode;
}

/**
 * Reports that a persisted conversation no longer has a reachable working
 * directory. The notice is intentionally informational: the current desktop
 * client keeps the Composer available for model-only turns and clears the
 * latched warning when the host restores the conversation lifecycle.
 */
export function WorkingDirectoryNotice({
  children = "This chat's working directory no longer exists",
  className,
  heading = "Current working directory missing",
  ...props
}: WorkingDirectoryNoticeProps) {
  return (
    <aside
      {...props}
      className={["codex-ui-working-directory-notice", className]
        .filter(Boolean)
        .join(" ")}
      data-status="missing"
    >
      <span className="codex-ui-working-directory-notice__heading">
        {heading}
      </span>
      {children ? (
        <span className="codex-ui-working-directory-notice__message">
          {children}
        </span>
      ) : null}
    </aside>
  );
}

export function InlineNotice({
  children,
  className,
  icon,
  shimmering = false,
  tone = "neutral",
  trailingContent,
  wrap = false,
  ...props
}: InlineNoticeProps) {
  const classes = ["codex-ui-inline-notice", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-tone={tone} {...props}>
      <span aria-hidden="true" className="codex-ui-inline-notice__rule" />
      <span
        className="codex-ui-inline-notice__label"
        data-wrap={wrap || undefined}
      >
        {icon ? (
          <span className="codex-ui-inline-notice__icon">{icon}</span>
        ) : null}
        <span
          className="codex-ui-inline-notice__message"
          data-shimmering={shimmering || undefined}
        >
          {children}
        </span>
        {trailingContent ? (
          <span className="codex-ui-inline-notice__trailing">
            {trailingContent}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="codex-ui-inline-notice__rule" />
    </div>
  );
}

export type StreamNoticeStatus = "reconnecting" | "failed";

export interface SystemErrorNoticeProps
  extends Omit<StatusBannerProps, "layout" | "role" | "tone"> {}

export function SystemErrorNotice({
  children,
  className,
  icon,
  ...props
}: SystemErrorNoticeProps) {
  return (
    <StatusBanner
      className={["codex-ui-system-error-notice", className]
        .filter(Boolean)
        .join(" ")}
      icon={icon}
      layout="icon"
      role="alert"
      tone="error"
      {...props}
    >
      <span className="codex-ui-system-error-notice__content">
        {children}
      </span>
    </StatusBanner>
  );
}

export interface StreamNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  additionalDetails?: ReactNode;
  children?: ReactNode;
  defaultExpanded?: boolean;
  detailsLabel?: string;
  expanded?: boolean;
  icon?: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  onRetry?: MouseEventHandler<HTMLButtonElement>;
  reconnectAttempt?: number;
  reconnectMaxAttempts?: number;
  retryLabel?: ReactNode;
  serverBusy?: boolean;
  status?: StreamNoticeStatus;
}

export function StreamNotice({
  additionalDetails,
  children,
  className,
  defaultExpanded = false,
  detailsLabel = "Show connection details",
  expanded,
  icon,
  onExpandedChange,
  onRetry,
  reconnectAttempt,
  reconnectMaxAttempts,
  retryLabel = "Try again",
  serverBusy = false,
  status = "reconnecting",
  ...props
}: StreamNoticeProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const detailsId = useId();
  const hasDetails =
    typeof additionalDetails === "string"
      ? additionalDetails.trim().length > 0
      : additionalDetails !== undefined &&
        additionalDetails !== null &&
        additionalDetails !== false;
  const progress =
    reconnectAttempt !== undefined && reconnectMaxAttempts !== undefined
      ? ` ${reconnectAttempt}/${reconnectMaxAttempts}`
      : "";
  const resolvedMessage =
    children ??
    (status === "failed"
      ? "Connection lost"
      : serverBusy
        ? `Server is busy, reconnecting${progress}`
        : `Reconnecting${progress}`);
  const classes = ["codex-ui-stream-notice", className]
    .filter(Boolean)
    .join(" ");

  function setExpanded(next: boolean) {
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  }

  return (
    <div
      aria-live={status === "reconnecting" ? "polite" : undefined}
      className={classes}
      data-expanded={isExpanded || undefined}
      data-status={status}
      role={status === "failed" ? "alert" : "status"}
      {...props}
    >
      <div className="codex-ui-stream-notice__summary">
        {icon === undefined ? (
          <span className="codex-ui-stream-notice__icon">
            {status === "failed" ? (
              <NoticeIcon tone="error" />
            ) : (
              <ReconnectingIcon />
            )}
          </span>
        ) : icon ? (
          <span className="codex-ui-stream-notice__icon">{icon}</span>
        ) : null}
        <span className="codex-ui-stream-notice__message">
          {resolvedMessage}
        </span>
        {hasDetails ? (
          <button
            aria-controls={detailsId}
            aria-expanded={isExpanded}
            aria-label={detailsLabel}
            className="codex-ui-stream-notice__toggle"
            onClick={() => setExpanded(!isExpanded)}
            title={detailsLabel}
            type="button"
          >
            <span aria-hidden="true" className="codex-ui-stream-notice__chevron" />
          </button>
        ) : null}
        {status === "failed" && onRetry ? (
          <button
            className="codex-ui-stream-notice__retry"
            onClick={onRetry}
            type="button"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
      {hasDetails ? (
        <div
          className="codex-ui-stream-notice__details"
          hidden={!isExpanded}
          id={detailsId}
        >
          {additionalDetails}
        </div>
      ) : null}
    </div>
  );
}
