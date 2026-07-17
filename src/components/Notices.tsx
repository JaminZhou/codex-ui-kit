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
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
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
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle className="codex-ui-stream-notice__track" cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" />
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
  const classes = ["codex-ui-status-banner", className]
    .filter(Boolean)
    .join(" ");
  const resolvedIcon = icon === undefined ? <NoticeIcon tone={tone} /> : icon;
  const hasCustomActions =
    customActions !== undefined &&
    customActions !== null &&
    customActions !== false;
  const hasActions =
    hasCustomActions || actions.length > 0 || onDismiss !== undefined;

  return (
    <aside
      className={classes}
      data-layout={layout}
      data-stack-on-narrow={stackOnNarrow || undefined}
      data-tone={tone}
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-status-banner__backdrop" />
      {resolvedIcon ? (
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
    </aside>
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
