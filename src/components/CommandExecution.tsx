import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

const statusDetails: Record<AgentItemStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  pending: "Pending",
  running: "Running",
};

export interface CommandExecutionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  command: ReactNode;
  cwd?: ReactNode;
  defaultOpen?: boolean;
  detail?: ReactNode;
  exitCode?: number;
  status: AgentItemStatus;
}

export function CommandExecution({
  children,
  className,
  command,
  cwd,
  defaultOpen = false,
  detail,
  exitCode,
  status,
  ...props
}: CommandExecutionProps) {
  const classes = ["codex-ui-command-execution", className]
    .filter(Boolean)
    .join(" ");
  const resolvedDetail =
    detail ?? (exitCode === undefined ? statusDetails[status] : `Exit ${exitCode}`);
  const body =
    cwd || children ? (
      <>
        {cwd ? (
          <div className="codex-ui-command-execution__context">
            <span>Working directory</span>
            <code>{cwd}</code>
          </div>
        ) : null}
        {children}
      </>
    ) : undefined;

  return (
    <AgentActivity
      className={classes}
      defaultOpen={defaultOpen}
      detail={resolvedDetail}
      kind="command"
      status={status}
      summary={<code className="codex-ui-command-execution__command">{command}</code>}
      {...props}
    >
      {body}
    </AgentActivity>
  );
}

export type CommandOutputStream = "stdout" | "stderr";

export interface CommandOutputProps
  extends Omit<HTMLAttributes<HTMLPreElement>, "children"> {
  children: ReactNode;
  stream?: CommandOutputStream;
}

export function CommandOutput({
  children,
  className,
  stream = "stdout",
  "aria-label": ariaLabel = stream === "stderr"
    ? "Standard error"
    : "Standard output",
  ...props
}: CommandOutputProps) {
  const classes = ["codex-ui-command-output", className]
    .filter(Boolean)
    .join(" ");

  return (
    <pre
      aria-label={ariaLabel}
      className={classes}
      data-stream={stream}
      {...props}
    >
      <code>{children}</code>
    </pre>
  );
}
