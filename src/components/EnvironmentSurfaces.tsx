import { useId, type HTMLAttributes, type ReactNode } from "react";

export type EnvironmentSettingsStatus =
  | "error"
  | "loading"
  | "ready"
  | "unavailable";

export interface EnvironmentSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  children?: ReactNode;
  message?: ReactNode;
  status?: EnvironmentSettingsStatus;
  statusHeading?: ReactNode;
  title?: ReactNode;
}

export type EnvironmentEditorStatus =
  | "conflict"
  | "error"
  | "ready"
  | "saved"
  | "saving";

export type EnvironmentEditorTab = "actions" | "cleanup" | "setup";

export interface EnvironmentEditorAction {
  command: string;
  id: string;
  name: string;
  platforms: string;
}

export interface EnvironmentEditorPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  actions?: EnvironmentEditorAction[];
  activeTab?: EnvironmentEditorTab;
  cleanupScript?: string;
  environmentName?: string;
  message?: ReactNode;
  onActionAdd?: () => void;
  onActionChange?: (
    actionId: string,
    field: keyof Omit<EnvironmentEditorAction, "id">,
    value: string,
  ) => void;
  onActionDelete?: (actionId: string) => void;
  onCleanupScriptChange?: (value: string) => void;
  onDiscard?: () => void;
  onEnvironmentNameChange?: (value: string) => void;
  onRetry?: () => void;
  onSave?: () => void;
  onSetupScriptChange?: (value: string) => void;
  onTabChange?: (tab: EnvironmentEditorTab) => void;
  setupScript?: string;
  status?: EnvironmentEditorStatus;
  statusMessage?: ReactNode;
  title?: ReactNode;
}

export function EnvironmentEditorPage({
  actions = [],
  activeTab = "setup",
  className,
  cleanupScript = "",
  environmentName = "Local environment",
  message = "The environment could not be saved.",
  onActionAdd,
  onActionChange,
  onActionDelete,
  onCleanupScriptChange,
  onDiscard,
  onEnvironmentNameChange,
  onRetry,
  onSave,
  onSetupScriptChange,
  onTabChange,
  setupScript = "",
  status = "ready",
  statusMessage,
  title = "Environment",
  ...props
}: EnvironmentEditorPageProps) {
  const titleId = useId();
  const statusId = useId();
  const isBusy = status === "saving";
  const showStatus = status !== "ready";
  const resolvedStatusMessage =
    statusMessage ??
    (status === "saving"
      ? "Saving environment…"
      : status === "saved"
        ? "Environment saved"
        : status === "conflict"
          ? "This environment changed somewhere else. Review the latest values before saving."
          : message);

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={["codex-ui-environment-editor", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <header className="codex-ui-environment-editor__header">
        <div>
          <p className="codex-ui-environment-editor__eyebrow">Environments</p>
          <h1 id={titleId}>{title}</h1>
        </div>
        <span className="codex-ui-environment-editor__badge">Local</span>
      </header>
      {showStatus ? (
        <div
          aria-live="polite"
          className="codex-ui-environment-editor__status"
          data-status={status}
          id={statusId}
          role={status === "error" || status === "conflict" ? "alert" : "status"}
        >
          {resolvedStatusMessage}
          {(status === "error" || status === "conflict") && onRetry ? (
            <button onClick={onRetry} type="button">
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="codex-ui-environment-editor__body">
        <label className="codex-ui-environment-editor__field">
          <span>Environment name</span>
          <input
            aria-label="Environment name"
            onChange={(event) => onEnvironmentNameChange?.(event.target.value)}
            value={environmentName}
          />
        </label>
        <div aria-label="Environment editor sections" className="codex-ui-environment-editor__tabs" role="tablist">
          {(["setup", "cleanup", "actions"] as const).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "is-active" : undefined}
              onClick={() => onTabChange?.(tab)}
              role="tab"
              type="button"
              key={tab}
            >
              {tab === "setup" ? "Setup" : tab === "cleanup" ? "Cleanup" : "Actions"}
            </button>
          ))}
        </div>
        {activeTab === "setup" ? (
          <label className="codex-ui-environment-editor__field">
            <span>Simple setup</span>
            <textarea
              aria-label="Simple setup"
              onChange={(event) => onSetupScriptChange?.(event.target.value)}
              value={setupScript}
            />
            <small>Use one command per line to prepare the environment.</small>
          </label>
        ) : activeTab === "cleanup" ? (
          <label className="codex-ui-environment-editor__field">
            <span>Cleanup</span>
            <textarea
              aria-label="Cleanup"
              onChange={(event) => onCleanupScriptChange?.(event.target.value)}
              value={cleanupScript}
            />
            <small>Cleanup runs after the environment is discarded.</small>
          </label>
        ) : (
          <div className="codex-ui-environment-editor__actions">
            <div className="codex-ui-environment-editor__section-heading">
              <div>
                <strong>Actions</strong>
                <small>Reusable commands for this environment.</small>
              </div>
              {onActionAdd ? (
                <button onClick={onActionAdd} type="button">Add action</button>
              ) : null}
            </div>
            {actions.length === 0 ? (
              <p className="codex-ui-environment-editor__empty">No actions yet.</p>
            ) : (
              actions.map((action) => (
                <fieldset className="codex-ui-environment-editor__action" key={action.id}>
                  <legend>{action.name || "Action"}</legend>
                  <label className="codex-ui-environment-editor__field">
                    <span>Action</span>
                    <input
                      aria-label={`${action.id} action name`}
                      onChange={(event) => onActionChange?.(action.id, "name", event.target.value)}
                      value={action.name}
                    />
                  </label>
                  <label className="codex-ui-environment-editor__field">
                    <span>Platforms</span>
                    <input
                      aria-label={`${action.id} platforms`}
                      onChange={(event) => onActionChange?.(action.id, "platforms", event.target.value)}
                      value={action.platforms}
                    />
                  </label>
                  <label className="codex-ui-environment-editor__field">
                    <span>Command</span>
                    <input
                      aria-label={`${action.id} command`}
                      onChange={(event) => onActionChange?.(action.id, "command", event.target.value)}
                      value={action.command}
                    />
                  </label>
                  {onActionDelete ? (
                    <button onClick={() => onActionDelete(action.id)} type="button">Delete</button>
                  ) : null}
                </fieldset>
              ))
            )}
          </div>
        )}
      </div>
      <footer className="codex-ui-environment-editor__footer">
        <button disabled={isBusy} onClick={onDiscard} type="button">Discard changes</button>
        <button disabled={isBusy} onClick={onSave} type="button">
          {isBusy ? "Saving…" : "Save"}
        </button>
      </footer>
    </section>
  );
}

export function EnvironmentSettingsPage({
  children,
  className,
  message = "We could not load local environment settings for this project",
  status = "ready",
  statusHeading,
  title = "Environments",
  ...props
}: EnvironmentSettingsPageProps) {
  const titleId = useId();
  const statusHeadingId = useId();
  const statusMessageId = useId();
  const showStatus = status !== "ready";
  const role = status === "error" ? "alert" : "status";
  const resolvedStatusHeading =
    statusHeading ??
    (status === "loading"
      ? "Loading local environments"
      : status === "error"
        ? "Local environments error"
        : "Local environments unavailable");

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={["codex-ui-environment-settings-page", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <h1 id={titleId}>{title}</h1>
      {showStatus ? (
        <div className="codex-ui-environment-settings-page__status">
          <h2 id={statusHeadingId}>{resolvedStatusHeading}</h2>
          <div
            aria-labelledby={statusHeadingId}
            aria-describedby={statusMessageId}
            className="codex-ui-environment-settings-page__status-card"
            role={role}
          >
            <div id={statusMessageId}>
              {status === "loading" ? "Loading…" : message}
            </div>
          </div>
        </div>
      ) : (
        <div className="codex-ui-environment-settings-page__content">
          {children}
        </div>
      )}
    </section>
  );
}
