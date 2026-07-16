import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type SVGProps,
} from "react";

export type ProposedPlanStatus = "writing" | "completed";

export interface ProposedPlanProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  actions?: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  completedTitle?: ReactNode;
  collapseLabel?: string;
  copiedLabel?: string;
  copyLabel?: string;
  defaultCollapsed?: boolean;
  downloadLabel?: string;
  expandLabel?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  onCopy?: () => void | Promise<void>;
  onDownload?: () => void;
  status: ProposedPlanStatus;
  writingTitle?: ReactNode;
}

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="12"
      viewBox="0 0 16 16"
      width="12"
      {...props}
    >
      {children}
    </svg>
  );
}

function DownloadIcon() {
  return (
    <Icon>
      <path d="M8 2v7m0 0 2.5-2.5M8 9 5.5 6.5M3 12.5h10" />
    </Icon>
  );
}

function CopyIcon() {
  return (
    <Icon>
      <rect height="8" rx="1.5" width="8" x="5" y="5" />
      <path d="M11 5V4.5A1.5 1.5 0 0 0 9.5 3h-5A1.5 1.5 0 0 0 3 4.5v5A1.5 1.5 0 0 0 4.5 11H5" />
    </Icon>
  );
}

function ChevronIcon() {
  return (
    <Icon>
      <path d="m4.5 10 3.5-3.5 3.5 3.5" />
    </Icon>
  );
}

export function ProposedPlan({
  actions,
  children,
  className,
  collapsed,
  completedTitle = "Plan",
  collapseLabel = "Collapse plan summary",
  copiedLabel = "Copied",
  copyLabel = "Copy plan",
  defaultCollapsed,
  downloadLabel = "Download plan",
  expandLabel = "Expand plan summary",
  onCollapsedChange,
  onCopy,
  onDownload,
  status,
  writingTitle = "Writing plan",
  ...props
}: ProposedPlanProps) {
  // Seed the disclosure once, matching the sampled client: streaming completion
  // must not override a user's current choice. Hosts can control `collapsed`
  // when their product intentionally changes that state on completion.
  const [internalCollapsed, setInternalCollapsed] = useState(
    () => defaultCollapsed ?? status === "writing",
  );
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const resolvedCollapsed = collapsed ?? internalCollapsed;
  const isCompleted = status === "completed";
  const classes = ["codex-ui-proposed-plan", className]
    .filter(Boolean)
    .join(" ");

  useEffect(
    () => () => {
      if (copyResetTimer.current !== undefined) {
        clearTimeout(copyResetTimer.current);
      }
    },
    [],
  );

  const setCollapsed = (nextCollapsed: boolean) => {
    if (collapsed === undefined) setInternalCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  };

  const handleCopy = async () => {
    if (!onCopy) return;

    try {
      await onCopy();
    } catch {
      return;
    }

    setCopied(true);
    if (copyResetTimer.current !== undefined) {
      clearTimeout(copyResetTimer.current);
    }
    copyResetTimer.current = setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <div
      className={classes}
      data-collapsed={resolvedCollapsed || undefined}
      data-status={status}
      {...props}
    >
      <header className="codex-ui-proposed-plan__header">
        <h3 className="codex-ui-proposed-plan__title">
          {isCompleted ? completedTitle : writingTitle}
        </h3>
        <div className="codex-ui-proposed-plan__actions">
          {isCompleted && onDownload ? (
            <button
              aria-label={downloadLabel}
              className="codex-ui-proposed-plan__action"
              onClick={onDownload}
              title={downloadLabel}
              type="button"
            >
              <DownloadIcon />
            </button>
          ) : null}
          {isCompleted && onCopy ? (
            <button
              aria-label={copied ? copiedLabel : copyLabel}
              className="codex-ui-proposed-plan__action"
              data-copied={copied || undefined}
              onClick={() => void handleCopy()}
              title={copied ? copiedLabel : copyLabel}
              type="button"
            >
              <CopyIcon />
            </button>
          ) : null}
          {actions}
          <button
            aria-expanded={!resolvedCollapsed}
            aria-label={resolvedCollapsed ? expandLabel : collapseLabel}
            className="codex-ui-proposed-plan__action codex-ui-proposed-plan__toggle"
            onClick={() => setCollapsed(!resolvedCollapsed)}
            type="button"
          >
            <ChevronIcon />
          </button>
        </div>
      </header>
      <div
        aria-hidden={resolvedCollapsed}
        className="codex-ui-proposed-plan__body"
        hidden={resolvedCollapsed}
      >
        {children}
      </div>
    </div>
  );
}
