import { type HTMLAttributes, type ReactNode, useId } from "react";

export type RemoteConnectionKind = "device" | "ssh";
export type RemoteConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";
export type RemoteConnectionsPageStatus = "error" | "loading" | "ready";
export type RemoteConnectionFormStatus = "error" | "idle" | "saving";

export interface RemoteConnection {
  detail: string;
  id: string;
  kind: RemoteConnectionKind;
  label: string;
  status: RemoteConnectionStatus;
}

export interface RemoteConnectionFormValue {
  detail: string;
  kind: RemoteConnectionKind;
  label: string;
}

export interface RemoteConnectionsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  connections?: readonly RemoteConnection[];
  disabled?: boolean;
  emptyMessage?: ReactNode;
  errorMessage?: ReactNode;
  formOpen?: boolean;
  formRetryLabel?: ReactNode;
  formSavingLabel?: ReactNode;
  formStatus?: RemoteConnectionFormStatus;
  formStatusMessage?: ReactNode;
  formValue?: RemoteConnectionFormValue;
  onAdd?: () => void;
  onCancelForm?: () => void;
  onChangeForm?: (value: RemoteConnectionFormValue) => void;
  onEdit?: (connection: RemoteConnection) => void;
  onForget?: (connection: RemoteConnection) => void;
  onFormRetry?: () => void;
  onRetry?: () => void;
  onSave?: () => void;
  onTest?: (connection: RemoteConnection) => void;
  status?: RemoteConnectionsPageStatus;
  statusMessage?: ReactNode;
  title?: ReactNode;
}

export function RemoteConnectionsPage({
  className,
  connections = [],
  disabled = false,
  emptyMessage = "No remote connections yet.",
  errorMessage = "Connections could not be loaded.",
  formOpen = false,
  formRetryLabel = "Retry",
  formSavingLabel = "Saving connection…",
  formStatus = "idle",
  formStatusMessage,
  formValue = { detail: "", kind: "ssh", label: "" },
  onAdd,
  onCancelForm,
  onChangeForm,
  onEdit,
  onForget,
  onFormRetry,
  onRetry,
  onSave,
  onTest,
  status = "ready",
  statusMessage,
  title = "Connections",
  ...props
}: RemoteConnectionsPageProps) {
  const titleId = useId();
  const statusId = useId();
  const showStatus = status !== "ready";
  const pageLocked = disabled || status === "loading";
  const resolvedStatusMessage =
    statusMessage ??
    (status === "loading" ? "Loading connections…" : errorMessage);
  const formBusy = formStatus === "saving";
  const formLocked = disabled || formBusy;
  const resolvedFormStatusMessage =
    formStatusMessage ??
    (formStatus === "saving"
      ? formSavingLabel
      : "The connection could not be saved.");
  const updateForm = (
    field: "detail" | "kind" | "label",
    value: string,
  ) => onChangeForm?.({ ...formValue, [field]: value });

  return (
    <section
      {...props}
      aria-busy={status === "loading" || undefined}
      aria-describedby={showStatus ? statusId : undefined}
      aria-labelledby={titleId}
      className={["codex-ui-remote-connections", className]
        .filter(Boolean)
        .join(" ")}
      data-disabled={disabled || undefined}
      data-status={status}
    >
      <header className="codex-ui-remote-connections__header">
        <div>
          <p className="codex-ui-remote-connections__eyebrow">Coding</p>
          <h1 id={titleId}>{title}</h1>
          <p>Allow ChatGPT apps signed into your account to use this device.</p>
        </div>
        {onAdd ? (
          <button className="codex-ui-remote-connections__primary" disabled={pageLocked} onClick={onAdd} type="button">
            Add connection
          </button>
        ) : null}
      </header>
      {showStatus ? (
        <div
          aria-live="polite"
          className="codex-ui-remote-connections__status"
          data-status={status}
          id={statusId}
          role={status === "error" ? "alert" : "status"}
        >
          <span>{resolvedStatusMessage}</span>
          {status === "error" && onRetry ? (
            <button disabled={disabled} onClick={onRetry} type="button">Retry</button>
          ) : null}
        </div>
      ) : null}
      {formOpen ? (
        <form
          aria-label="Connection editor"
          aria-busy={formBusy || undefined}
          className="codex-ui-remote-connections__form"
          data-status={formStatus}
          onSubmit={(event) => {
            event.preventDefault();
            if (!formLocked) onSave?.();
          }}
        >
          <div className="codex-ui-remote-connections__form-header">
            <div>
              <h2>New connection</h2>
              <p>Keep credentials in the host; only the connection label is rendered here.</p>
            </div>
            {onCancelForm ? (
              <button aria-label="Close connection editor" disabled={formLocked} onClick={onCancelForm} type="button">×</button>
            ) : null}
          </div>
          {formStatus !== "idle" ? (
            <div
              aria-live="polite"
              className="codex-ui-remote-connections__form-status"
              role={formStatus === "error" ? "alert" : "status"}
            >
              <span>{resolvedFormStatusMessage}</span>
              {formStatus === "error" && onFormRetry ? (
                <button disabled={disabled} onClick={onFormRetry} type="button">
                  {formRetryLabel}
                </button>
              ) : null}
            </div>
          ) : null}
          <label>
            <span>Connection name</span>
            <input aria-label="Connection name" disabled={formLocked} onChange={(event) => updateForm("label", event.target.value)} value={formValue.label} />
          </label>
          <label>
            <span>Type</span>
            <select aria-label="Connection type" disabled={formLocked} onChange={(event) => updateForm("kind", event.target.value)} value={formValue.kind}>
              <option value="ssh">SSH</option>
              <option value="device">Device</option>
            </select>
          </label>
          <label>
            <span>Host or device</span>
            <input aria-label="Host or device" disabled={formLocked} onChange={(event) => updateForm("detail", event.target.value)} placeholder="host.example.com" value={formValue.detail} />
          </label>
          <footer>
            {onCancelForm ? <button disabled={formLocked} onClick={onCancelForm} type="button">Cancel</button> : null}
            <button className="codex-ui-remote-connections__primary" disabled={formLocked} type="submit">
              {formBusy ? formSavingLabel : "Save connection"}
            </button>
          </footer>
        </form>
      ) : (
        <div className="codex-ui-remote-connections__list">
          <div className="codex-ui-remote-connections__section-heading">
            <div>
              <h2>Available connections</h2>
              <p>Use a connected device or SSH host for coding tasks.</p>
            </div>
          </div>
          {connections.length === 0 ? (
            <div className="codex-ui-remote-connections__empty" role="note">{emptyMessage}</div>
          ) : (
            connections.map((connection) => (
              <article className="codex-ui-remote-connections__row" data-status={connection.status} key={connection.id}>
                <div className="codex-ui-remote-connections__row-icon" aria-hidden="true">{connection.kind === "ssh" ? "⌁" : "◉"}</div>
                <div className="codex-ui-remote-connections__row-copy">
                  <strong>{connection.label}</strong>
                  <span>{connection.detail}</span>
                </div>
                <span className="codex-ui-remote-connections__row-status">{connection.status === "connected" ? "Connected" : connection.status === "connecting" ? "Connecting…" : connection.status === "error" ? "Needs attention" : "Disconnected"}</span>
                <div className="codex-ui-remote-connections__row-actions">
                  {onTest ? <button disabled={pageLocked} onClick={() => onTest(connection)} type="button">Test</button> : null}
                  {onEdit ? <button disabled={pageLocked} onClick={() => onEdit(connection)} type="button">Edit</button> : null}
                  {onForget ? <button disabled={pageLocked} onClick={() => onForget(connection)} type="button">Forget</button> : null}
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
