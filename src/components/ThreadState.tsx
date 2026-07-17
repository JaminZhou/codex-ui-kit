import type { HTMLAttributes, ReactNode } from "react";

export interface LoadingShimmerProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function LoadingShimmer({
  children,
  className,
  ...props
}: LoadingShimmerProps) {
  return (
    <span
      className={["codex-ui-loading-shimmer", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export type ThreadLoadingKind = "loading" | "reconnecting";

export interface ThreadLoadingStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  kind?: ThreadLoadingKind;
  label?: ReactNode;
}

export function ThreadLoadingState({
  className,
  kind = "loading",
  label,
  ...props
}: ThreadLoadingStateProps) {
  const resolvedLabel =
    label ?? (kind === "reconnecting" ? "Reconnecting to ChatGPT…" : "Loading task…");
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={["codex-ui-thread-loading", className]
        .filter(Boolean)
        .join(" ")}
      data-kind={kind}
      role="status"
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-thread-loading__spinner" />
      <span>{resolvedLabel}</span>
    </div>
  );
}

export interface ThreadThinkingPlaceholderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: ReactNode;
}

export function ThreadThinkingPlaceholder({
  className,
  label = "Thinking",
  ...props
}: ThreadThinkingPlaceholderProps) {
  return (
    <div
      aria-live="polite"
      className={["codex-ui-thread-thinking", className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      {...props}
    >
      <LoadingShimmer>{label}</LoadingShimmer>
    </div>
  );
}

export interface ThreadSkeletonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: string;
  lines?: number;
}

export function ThreadSkeleton({
  className,
  label = "Loading thread",
  lines = 3,
  ...props
}: ThreadSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={["codex-ui-thread-skeleton", className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      {...props}
    >
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <span
          aria-hidden="true"
          className="codex-ui-thread-skeleton__line"
          key={index}
          style={{ width: `${Math.max(42, 100 - index * 18)}%` }}
        />
      ))}
    </div>
  );
}

export interface ThreadRenderErrorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  children?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  title?: ReactNode;
}

export function ThreadRenderError({
  children,
  className,
  onRetry,
  retryLabel = "Try again",
  title = "This turn could not be displayed",
  ...props
}: ThreadRenderErrorProps) {
  return (
    <div
      className={["codex-ui-thread-render-error", className]
        .filter(Boolean)
        .join(" ")}
      role="alert"
      {...props}
    >
      <div className="codex-ui-thread-render-error__title">{title}</div>
      {children ? (
        <div className="codex-ui-thread-render-error__message">{children}</div>
      ) : null}
      {onRetry ? (
        <button
          className="codex-ui-thread-render-error__retry"
          onClick={onRetry}
          type="button"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
