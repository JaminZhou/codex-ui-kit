import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { WorkspacePanel } from "./AppShell.js";

export type TerminalEntryKind =
  | "command"
  | "stderr"
  | "stdout"
  | "system";

export interface TerminalEntry {
  id: string;
  kind?: TerminalEntryKind;
  text: string;
}

export interface TerminalTranscriptProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  entries: readonly TerminalEntry[];
  follow?: boolean;
  label?: string;
}

export function TerminalTranscript({
  className,
  entries,
  follow = true,
  label = "Terminal output",
  ...props
}: TerminalTranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!follow) return;
    const transcript = transcriptRef.current;
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [entries, follow]);

  return (
    <div
      aria-label={label}
      aria-live="polite"
      aria-relevant="additions text"
      className={["codex-ui-terminal-transcript", className]
        .filter(Boolean)
        .join(" ")}
      ref={transcriptRef}
      role="log"
      tabIndex={0}
      {...props}
    >
      {entries.map((entry) => (
        <div
          className="codex-ui-terminal-transcript__entry"
          data-kind={entry.kind ?? "stdout"}
          key={entry.id}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}

export interface TerminalPromptProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  disabled?: boolean;
  inputLabel?: string;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "disabled" | "onChange" | "value"
  >;
  onCommandSubmit?: (command: string) => void;
  onValueChange?: (value: string) => void;
  prompt?: ReactNode;
  value: string;
}

export function TerminalPrompt({
  className,
  disabled = false,
  inputLabel = "Terminal input",
  inputProps,
  onCommandSubmit,
  onValueChange,
  prompt = "%",
  value,
  ...props
}: TerminalPromptProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || value.length === 0) return;
    onCommandSubmit?.(value);
  };

  return (
    <form
      className={["codex-ui-terminal-prompt", className]
        .filter(Boolean)
        .join(" ")}
      onSubmit={submit}
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-terminal-prompt__prefix">
        {prompt}
      </span>
      <input
        {...inputProps}
        aria-label={inputLabel}
        autoCapitalize="none"
        autoComplete="off"
        className={[
          "codex-ui-terminal-prompt__input",
          inputProps?.className,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
        spellCheck={false}
        type="text"
        value={value}
      />
    </form>
  );
}

export type TerminalSessionStatus =
  | "exited"
  | "failed"
  | "idle"
  | "restoring"
  | "running";

const terminalSessionStatusIcon: Record<
  TerminalSessionStatus,
  string
> = {
  exited: "□",
  failed: "!",
  idle: "▣",
  restoring: "↻",
  running: "●",
};

const terminalSessionStatusLabel: Record<
  TerminalSessionStatus,
  string
> = {
  exited: "Exited",
  failed: "Failed",
  idle: "Idle",
  restoring: "Restoring",
  running: "Running",
};

export interface TerminalSessionProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  entries: readonly TerminalEntry[];
  followOutput?: boolean;
  inputDisabled?: boolean;
  inputLabel?: string;
  label?: string;
  notice?: ReactNode;
  onCommandSubmit?: (command: string) => void;
  onValueChange?: (value: string) => void;
  outputLabel?: string;
  prompt?: ReactNode;
  status?: TerminalSessionStatus;
  value: string;
}

export function TerminalSession({
  className,
  entries,
  followOutput = true,
  inputDisabled = false,
  inputLabel = "Terminal input",
  label = "Terminal session",
  notice,
  onCommandSubmit,
  onValueChange,
  outputLabel = "Terminal output",
  prompt,
  status = "idle",
  value,
  ...props
}: TerminalSessionProps) {
  return (
    <section
      aria-label={label}
      className={["codex-ui-terminal-session", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
      {...props}
    >
      {notice}
      <TerminalTranscript
        entries={entries}
        follow={followOutput}
        label={outputLabel}
      />
      <TerminalPrompt
        disabled={inputDisabled}
        inputLabel={inputLabel}
        onCommandSubmit={onCommandSubmit}
        onValueChange={onValueChange}
        prompt={prompt}
        value={value}
      />
    </section>
  );
}

export interface TerminalPanelSession {
  closeLabel?: string;
  entries: readonly TerminalEntry[];
  id: string;
  inputDisabled?: boolean;
  inputLabel?: string;
  label: string;
  notice?: ReactNode;
  outputLabel?: string;
  prompt?: ReactNode;
  status?: TerminalSessionStatus;
  showStatus?: boolean;
  value: string;
}

export interface TerminalPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  activeSessionId: string;
  actions?: ReactNode;
  emptyState?: ReactNode;
  label?: string;
  onActiveSessionChange: (id: string) => void;
  onClose?: () => void;
  onCloseSession?: (id: string) => void;
  onCommandSubmit?: (id: string, command: string) => void;
  onCreateSession?: () => void;
  onRestoreSession?: () => void;
  onSessionValueChange?: (id: string, value: string) => void;
  openSessionAction?: ReactNode;
  openSessionLabel?: string;
  restoreSessionLabel?: string;
  sessions: readonly TerminalPanelSession[];
  tabsLabel?: string;
}

export function TerminalPanel({
  actions,
  activeSessionId,
  className,
  emptyState,
  label = "Terminal",
  onActiveSessionChange,
  onClose,
  onCloseSession,
  onCommandSubmit,
  onCreateSession,
  onRestoreSession,
  onSessionValueChange,
  openSessionAction,
  openSessionLabel = "Open bottom panel tab",
  restoreSessionLabel = "Restore last terminal",
  sessions,
  tabsLabel = "Terminal tabs",
  ...props
}: TerminalPanelProps) {
  const resolvedEmptyState =
    emptyState ??
    (onRestoreSession ? (
      <div className="codex-ui-terminal-panel__empty">
        <span>No terminal sessions</span>
        <button onClick={onRestoreSession} type="button">
          {restoreSessionLabel}
        </button>
      </div>
    ) : (
      "No terminal sessions"
    ));

  return (
    <WorkspacePanel
      {...props}
      activeTabId={activeSessionId}
      actions={
        actions || openSessionAction ? (
          <>
            {actions}
            {openSessionAction}
          </>
        ) : undefined
      }
      className={["codex-ui-terminal-panel", className]
        .filter(Boolean)
        .join(" ")}
      emptyState={resolvedEmptyState}
      label={label}
      onActiveTabChange={onActiveSessionChange}
      onClose={onClose}
      onCloseTab={onCloseSession}
      onOpenTab={openSessionAction ? undefined : onCreateSession}
      openTabLabel={openSessionLabel}
      placement="bottom"
      tabCloseButtons
      tabs={sessions.map((session) => {
        const status = session.status ?? "idle";
        const showStatus = session.showStatus ?? true;
        return {
          ariaLabel: showStatus
            ? `${session.label}, ${terminalSessionStatusLabel[status]}`
            : session.label,
          closeLabel:
            session.closeLabel ?? `Close ${session.label} tab`,
          content: (
            <TerminalSession
              entries={session.entries}
              inputDisabled={session.inputDisabled}
              inputLabel={session.inputLabel}
              label={session.label}
              notice={session.notice}
              onCommandSubmit={(command) =>
                onCommandSubmit?.(session.id, command)
              }
              onValueChange={(value) =>
                onSessionValueChange?.(session.id, value)
              }
              outputLabel={session.outputLabel}
              prompt={session.prompt}
              status={status}
              value={session.value}
            />
          ),
          id: session.id,
          label: (
            <span
              className="codex-ui-terminal-panel__tab-label"
              data-status={status}
            >
              {showStatus ? (
                <span aria-hidden="true">
                  {terminalSessionStatusIcon[status]}
                </span>
              ) : (
                <span aria-hidden="true">
                  {terminalSessionStatusIcon.idle}
                </span>
              )}
              <span>{session.label}</span>
            </span>
          ),
        };
      })}
      tabsLabel={tabsLabel}
    />
  );
}

export interface TerminalWorkspaceMismatchNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  dismissLabel?: string;
  message?: ReactNode;
  onDismiss?: () => void;
  onOpenNewTerminal?: () => void;
  openNewTerminalLabel?: string;
}

export function TerminalWorkspaceMismatchNotice({
  className,
  dismissLabel = "Dismiss",
  message = "This terminal's workspace does not match this chat's current worktree",
  onDismiss,
  onOpenNewTerminal,
  openNewTerminalLabel = "Open new terminal",
  ...props
}: TerminalWorkspaceMismatchNoticeProps) {
  return (
    <div
      className={[
        "codex-ui-terminal-workspace-mismatch",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      {...props}
    >
      <span
        aria-hidden="true"
        className="codex-ui-terminal-workspace-mismatch__icon"
      >
        !
      </span>
      <span className="codex-ui-terminal-workspace-mismatch__message">
        {message}
      </span>
      <span className="codex-ui-terminal-workspace-mismatch__actions">
        <button onClick={onDismiss} type="button">
          {dismissLabel}
        </button>
        <button
          data-primary="true"
          onClick={onOpenNewTerminal}
          type="button"
        >
          {openNewTerminalLabel}
        </button>
      </span>
    </div>
  );
}

export interface TerminalProcessSummary {
  detail?: ReactNode;
  id: string;
  label: ReactNode;
  status: TerminalSessionStatus;
}

export interface TerminalProcessListProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  emptyState?: ReactNode;
  label?: string;
  onOpenProcess?: (id: string) => void;
  processes: readonly TerminalProcessSummary[];
}

export function TerminalProcessList({
  className,
  emptyState = "No background processes",
  label = "Background processes",
  onOpenProcess,
  processes,
  ...props
}: TerminalProcessListProps) {
  return (
    <section
      aria-label={label}
      className={["codex-ui-terminal-process-list", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <h3 className="codex-ui-terminal-process-list__title">{label}</h3>
      {processes.length > 0 ? (
        <ul className="codex-ui-terminal-process-list__items">
          {processes.map((process) => {
            const content = (
              <>
                <span className="codex-ui-terminal-process-list__identity">
                  <span className="codex-ui-terminal-process-list__label">
                    {process.label}
                  </span>
                  {process.detail ? (
                    <span className="codex-ui-terminal-process-list__detail">
                      {process.detail}
                    </span>
                  ) : null}
                </span>
                <span
                  className="codex-ui-terminal-process-list__status"
                  data-status={process.status}
                >
                  {terminalSessionStatusLabel[process.status]}
                </span>
              </>
            );
            return (
              <li
                className="codex-ui-terminal-process-list__item"
                data-status={process.status}
                key={process.id}
              >
                {onOpenProcess ? (
                  <button
                    onClick={() => onOpenProcess(process.id)}
                    type="button"
                  >
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="codex-ui-terminal-process-list__empty">
          {emptyState}
        </div>
      )}
    </section>
  );
}
