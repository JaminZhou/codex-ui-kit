import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { AgentItemStatus } from "../types.js";
import { AgentActivity } from "./AgentActivity.js";

export type CommandExecutionStatus =
  | AgentItemStatus
  | "interrupted"
  | "background-running"
  | "background-finished";

export function formatCommandDuration(durationMs: number) {
  const totalSeconds = Math.floor(Math.max(durationMs, 0) / 1_000);
  if (totalSeconds < 1) return null;
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const secondsPerHour = 3_600;
  const days = Math.floor(totalSeconds / (secondsPerHour * 24));
  const hours = Math.floor(totalSeconds / secondsPerHour) % 24;
  const minutes = Math.floor((totalSeconds % secondsPerHour) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0 || hours > 0) {
    return [
      days > 0 ? `${days}d` : null,
      `${hours}h`,
      `${minutes}m`,
      `${seconds}s`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return `${minutes}m ${seconds}s`;
}

function toAgentStatus(status: CommandExecutionStatus): AgentItemStatus {
  if (status === "interrupted") return "failed";
  if (status === "background-running") return "running";
  if (status === "background-finished") return "completed";
  return status;
}

function isRunning(status: CommandExecutionStatus) {
  return status === "running" || status === "background-running";
}

function copyWithClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(text).catch(() => undefined);
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect height="8" rx="1" width="8" x="5" y="5" />
      <path d="M4 11H3.5A1.5 1.5 0 0 1 2 9.5v-6A1.5 1.5 0 0 1 3.5 2h6A1.5 1.5 0 0 1 11 3.5V4" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-command-execution__icon"
      viewBox="0 0 16 16"
    >
      <rect height="12" rx="2" width="14" x="1" y="2" />
      <path d="m4 6 2 2-2 2M8 10h3" />
    </svg>
  );
}

export interface CommandExecutionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  command: ReactNode;
  commandLabel?: string;
  completedAtMs?: number;
  copyCommandLabel?: string;
  copyCommandText?: string;
  cwd?: string;
  defaultOpen?: boolean;
  detail?: ReactNode;
  durationMs?: number;
  exitCode?: number;
  footer?: ReactNode;
  hideRawCommand?: boolean;
  noOutputLabel?: ReactNode;
  onCopyCommand?: (command: string) => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  startedAtMs?: number;
  status: CommandExecutionStatus;
  summary?: ReactNode;
}

export function CommandExecution({
  children,
  className,
  command,
  commandLabel,
  completedAtMs,
  copyCommandLabel = "Copy command",
  copyCommandText,
  cwd,
  defaultOpen = false,
  detail,
  durationMs,
  exitCode,
  footer,
  hideRawCommand = false,
  noOutputLabel = "No output",
  onCopyCommand,
  onOpenChange,
  open,
  startedAtMs,
  status,
  summary,
  ...props
}: CommandExecutionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [commandExpanded, setCommandExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const resolvedOpen = open ?? internalOpen;
  const running = isRunning(status);
  const shouldTick =
    status === "running" &&
    durationMs === undefined &&
    completedAtMs === undefined &&
    startedAtMs !== undefined;

  useEffect(() => {
    if (!shouldTick) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [shouldTick]);

  const elapsedMs = Math.max(
    durationMs ??
      (startedAtMs === undefined
        ? 0
        : (completedAtMs ?? now) - startedAtMs),
    0,
  );
  const elapsedLabel =
    status === "background-running" || status === "background-finished"
      ? null
      : formatCommandDuration(elapsedMs);
  const timer = elapsedLabel ? (
    <span className="codex-ui-command-execution__duration">
      {` for ${elapsedLabel}`}
    </span>
  ) : null;
  const summaryCommand = (
    <span className="codex-ui-command-execution__summary-command">
      {command}
    </span>
  );
  const defaultSummary = (() => {
    if (status === "pending") return "Pending command";
    if (status === "background-running") {
      return <>Started background terminal with {summaryCommand}</>;
    }
    if (status === "background-finished") {
      return <>Ran {summaryCommand}</>;
    }
    if (status === "running") return <>Running command{timer}</>;
    if (status === "interrupted") {
      return resolvedOpen ? (
        <>Stopped command{timer}</>
      ) : (
        <>Stopped {summaryCommand}{timer}</>
      );
    }
    if (status === "failed") {
      // The sampled Renderer intentionally keeps the collapsed verb as "Ran";
      // the expanded footer is the authoritative exit/failure signal.
      return resolvedOpen ? (
        <>Ran command{timer}</>
      ) : (
        <>Ran {summaryCommand}{timer}</>
      );
    }
    return resolvedOpen ? (
      <>Ran command{timer}</>
    ) : (
      <>Ran {summaryCommand}{timer}</>
    );
  })();
  const resolvedSummary = summary !== undefined && summary !== null ? (
    <>{summary}{timer}</>
  ) : (
    defaultSummary
  );
  const classes = ["codex-ui-command-execution", className]
    .filter(Boolean)
    .join(" ");
  const rawCommandText =
    copyCommandText ?? (typeof command === "string" ? command : undefined);
  const resolvedCommandLabel =
    commandLabel ??
    (typeof command === "string" ? `$ ${command}` : "Expand command");
  const cwdTitle = cwd === undefined ? undefined : `cwd\n${cwd}`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const handleCommandKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setCommandExpanded(true);
  };
  const handleCopyCommand = () => {
    if (rawCommandText === undefined) return;
    if (onCopyCommand) {
      void onCopyCommand(rawCommandText);
      return;
    }
    copyWithClipboard(rawCommandText);
  };

  const defaultFooter = (
    <div
      aria-hidden={running || undefined}
      className="codex-ui-command-execution__footer"
      data-status={status}
    >
      {running
        ? null
        : status === "pending"
          ? "Pending"
          : status === "interrupted"
            ? "Stopped"
            : exitCode === 0
              ? <span data-success>Success</span>
              : `Exit code ${exitCode ?? "unknown"}`}
    </div>
  );
  const body = hideRawCommand ? undefined : (
    <div
      className="codex-ui-command-execution__shell"
      data-command-expanded={commandExpanded || undefined}
      title={cwdTitle}
    >
      <div className="codex-ui-command-execution__command-row">
        <div
          aria-label={resolvedCommandLabel}
          aria-expanded={commandExpanded}
          className="codex-ui-command-execution__command-line"
          onClick={() => setCommandExpanded(true)}
          onKeyDown={handleCommandKeyDown}
          role="button"
          tabIndex={0}
        >
          <span aria-hidden="true">$</span>
          <code>{command}</code>
        </div>
        {rawCommandText !== undefined ? (
          <button
            aria-label={copyCommandLabel}
            className="codex-ui-command-execution__copy-command"
            onClick={handleCopyCommand}
            title={copyCommandLabel}
            type="button"
          >
            <CopyIcon />
          </button>
        ) : null}
      </div>
      {children ?? <CommandOutput emptyLabel={noOutputLabel} />}
      {footer ?? defaultFooter}
    </div>
  );

  return (
    <AgentActivity
      className={classes}
      data-execution-status={status}
      detail={detail}
      indicator={<TerminalIcon />}
      kind="command"
      onOpenChange={handleOpenChange}
      open={resolvedOpen}
      status={toAgentStatus(status)}
      summary={resolvedSummary}
      {...props}
    >
      {body}
    </AgentActivity>
  );
}

export type CommandOutputStream = "stdout" | "stderr";

export interface CommandOutputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  children?: ReactNode;
  copyLabel?: string;
  copyText?: string;
  emptyLabel?: ReactNode;
  onCopy?: (output: string) => void | Promise<void>;
  stream?: CommandOutputStream;
}

export function CommandOutput({
  children,
  className,
  copyLabel = "Copy output",
  copyText,
  emptyLabel = "No output",
  onCopy,
  stream = "stdout",
  "aria-label": ariaLabel = stream === "stderr"
    ? "Standard error"
    : "Standard output",
  ...props
}: CommandOutputProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [fade, setFade] = useState({ bottom: false, top: false });
  const hasOutput =
    typeof children === "string"
      ? /\S/.test(children)
      : children !== undefined && children !== null;
  const rawOutputText =
    copyText ?? (typeof children === "string" ? children : undefined);
  const classes = ["codex-ui-command-output", className]
    .filter(Boolean)
    .join(" ");

  const updateFade = () => {
    const element = preRef.current;
    if (!element) return;
    const maximum = element.scrollHeight - element.clientHeight;
    const next = {
      bottom: maximum > 1 && element.scrollTop < maximum - 1,
      top: maximum > 1 && element.scrollTop > 1,
    };
    setFade((current) =>
      current.bottom === next.bottom && current.top === next.top
        ? current
        : next,
    );
  };

  useLayoutEffect(() => {
    const element = preRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    updateFade();
  }, [children]);

  const handleCopy = () => {
    if (rawOutputText === undefined) return;
    if (onCopy) {
      void onCopy(rawOutputText);
      return;
    }
    copyWithClipboard(rawOutputText);
  };

  return (
    <div
      className={classes}
      data-empty={!hasOutput || undefined}
      data-fade-bottom={fade.bottom || undefined}
      data-fade-top={fade.top || undefined}
      data-stream={stream}
      {...props}
    >
      <pre aria-label={ariaLabel} onScroll={updateFade} ref={preRef}>
        <code>{hasOutput ? children : emptyLabel}</code>
      </pre>
      {hasOutput && rawOutputText !== undefined ? (
        <button
          aria-label={copyLabel}
          className="codex-ui-command-output__copy"
          onClick={handleCopy}
          title={copyLabel}
          type="button"
        >
          <CopyIcon />
        </button>
      ) : null}
    </div>
  );
}
