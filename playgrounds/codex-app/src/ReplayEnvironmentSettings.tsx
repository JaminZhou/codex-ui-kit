import { useState } from "react";
import { Button, EnvironmentSettingsPage } from "codex-ui-kit";

type ReplayEnvironment = {
  environmentId: string;
  execServerUrl: string;
  status: "ready" | "disconnected";
};

const initialEnvironments: readonly ReplayEnvironment[] = [
  {
    environmentId: "local",
    execServerUrl: "wss://exec.local.test",
    status: "ready",
  },
  {
    environmentId: "remote:staging",
    execServerUrl: "wss://exec.staging.test",
    status: "disconnected",
  },
];

/**
 * A deterministic replay of the populated environment registry. Live status
 * and endpoint validation remain host-owned; this surface only makes the
 * already-observed saved/repair states inspectable in Browser and Electron.
 */
export function ReplayEnvironmentSettings({ repair = false }: { repair?: boolean }) {
  const [savedEnvironments, setSavedEnvironments] = useState<ReplayEnvironment[]>([
    ...initialEnvironments,
  ]);
  const [environmentId, setEnvironmentId] = useState(
    repair ? "remote:staging" : "local",
  );
  const [execServerUrl, setExecServerUrl] = useState(
    repair ? "wss://exec.staging.test" : "wss://exec.local.test",
  );
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(
    repair ? "remote:staging" : null,
  );
  const [status, setStatus] = useState<"ready" | "error">(repair ? "error" : "ready");
  const [message, setMessage] = useState("");

  const selectEnvironment = (environment: ReplayEnvironment) => {
    setEnvironmentId(environment.environmentId);
    setExecServerUrl(environment.execServerUrl);
    setEditingEnvironmentId(null);
    setStatus(environment.status === "ready" ? "ready" : "error");
    setMessage("");
  };

  const saveEnvironment = () => {
    const next: ReplayEnvironment = {
      environmentId: environmentId.trim(),
      execServerUrl: execServerUrl.trim(),
      status: "ready",
    };
    if (!next.environmentId || !next.execServerUrl) return;
    setSavedEnvironments((current) => {
      const existing = current.some(
        (environment) => environment.environmentId === next.environmentId,
      );
      return existing
        ? current.map((environment) =>
            environment.environmentId === next.environmentId ? next : environment,
          )
        : [...current, next];
    });
    setEditingEnvironmentId(null);
    setStatus("ready");
    setMessage(
      editingEnvironmentId === next.environmentId
        ? "Environment updated"
        : "Environment added",
    );
  };

  const retry = () => {
    setStatus("ready");
    setMessage("Environment status recovered");
  };

  return (
    <EnvironmentSettingsPage className="demo-live-environment-settings demo-replay-environment-settings">
      <p>
        Manage saved App Server environments. Endpoint validation and status
        checks stay host-owned; this replay covers the populated and repair
        states of the settings route.
      </p>
      <section
        aria-label="Saved environments"
        className="demo-live-environment-settings__saved"
      >
        <h2>Saved environments</h2>
        <ul>
          {savedEnvironments.map((environment) => (
            <li key={environment.environmentId}>
              <button
                aria-label={`Use ${environment.environmentId}`}
                onClick={() => selectEnvironment(environment)}
                type="button"
              >
                <code>{environment.environmentId}</code>
              </button>
              <code>{environment.execServerUrl}</code>
              <span aria-label={`${environment.environmentId} status`}>
                {environment.status === "ready" ? "Ready" : "Needs repair"}
              </span>
              <button
                aria-label={`Edit ${environment.environmentId}`}
                onClick={() => {
                  selectEnvironment(environment);
                  setEditingEnvironmentId(environment.environmentId);
                }}
                type="button"
              >
                Edit
              </button>
              <button
                aria-label={`Forget ${environment.environmentId}`}
                onClick={() => {
                  setSavedEnvironments((current) =>
                    current.filter((item) => item.environmentId !== environment.environmentId),
                  );
                  if (environmentId === environment.environmentId) {
                    setEnvironmentId("");
                    setExecServerUrl("");
                    setEditingEnvironmentId(null);
                  }
                }}
                type="button"
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
        <p>Forget removes only this playground’s local record; it never deletes a remote environment.</p>
      </section>
      <label className="demo-live-environment-settings__field">
        Environment ID
        <input
          aria-label="Environment ID"
          onChange={(event) => {
            setEnvironmentId(event.currentTarget.value);
            setStatus("ready");
            setMessage("");
          }}
          spellCheck={false}
          value={environmentId}
        />
      </label>
      <label className="demo-live-environment-settings__field">
        Exec server URL
        <input
          aria-label="Exec server URL"
          onChange={(event) => setExecServerUrl(event.currentTarget.value)}
          spellCheck={false}
          value={execServerUrl}
        />
      </label>
      <div className="demo-live-environment-settings__actions">
        <Button onClick={saveEnvironment}>
          {editingEnvironmentId === environmentId.trim()
            ? "Update environment"
            : "Add environment"}
        </Button>
        <Button onClick={() => setStatus("ready")}>Check environment status</Button>
      </div>
      {status === "error" ? (
        <section
          aria-label="Environment status result"
          className="demo-live-environment-settings__result"
          data-status="error"
          role="alert"
        >
          <h2>Environment status unavailable</h2>
          <p>The saved endpoint needs repair before it can be checked.</p>
          <Button onClick={retry}>Retry environment status</Button>
        </section>
      ) : (
        <section
          aria-label="Environment status result"
          className="demo-live-environment-settings__result"
          data-status="ready"
          role="status"
        >
          <h2>Ready</h2>
          <p>
            <code>{environmentId || "No environment selected"}</code> is ready.
          </p>
          {message ? <p>{message}</p> : null}
        </section>
      )}
    </EnvironmentSettingsPage>
  );
}
