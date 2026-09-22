import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EnvironmentSettingsPage } from "codex-ui-kit";
import type { LiveEnvironmentAddResult } from "../electron/live-environment-add";
import type { LiveEnvironmentInfoResult } from "../electron/live-environment-info";
import type { LiveEnvironmentStatusResult } from "../electron/live-environment-status";

type ReadState = "idle" | "loading" | "error" | "ready";
type AddState = "idle" | "loading" | "error" | "success";
type InfoState = "idle" | "loading" | "error" | "success";
type AddResult = LiveEnvironmentAddResult & { updated: boolean };
type SavedEnvironment = {
  environmentId: string;
  execServerUrl: string;
  updatedAt: number;
};

function statusCopy(result: LiveEnvironmentStatusResult) {
  if (result.status === "ready") return "Ready";
  if (result.status === "pending") return "Pending";
  if (result.status === "disconnected") return "Disconnected";
  return "Not configured";
}

/** Live-only, exact-id inspector. The renderer never receives a global environment list. */
export function LiveEnvironmentStatus({ projectToken }: { projectToken?: string }) {
  const [environmentId, setEnvironmentId] = useState("");
  const [state, setState] = useState<ReadState>("idle");
  const [result, setResult] = useState<LiveEnvironmentStatusResult | null>(null);
  const [execServerUrl, setExecServerUrl] = useState("");
  const [addState, setAddState] = useState<AddState>("idle");
  const [addResult, setAddResult] = useState<AddResult | null>(null);
  const [infoState, setInfoState] = useState<InfoState>("idle");
  const [infoResult, setInfoResult] = useState<LiveEnvironmentInfoResult | null>(null);
  const [savedEnvironments, setSavedEnvironments] = useState<readonly SavedEnvironment[]>([]);
  const [forgettingEnvironmentId, setForgettingEnvironmentId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const requestEpoch = useRef(0);

  const clear = () => {
    requestEpoch.current++;
    setState("idle");
    setResult(null);
    setAddState("idle");
    setAddResult(null);
    setInfoState("idle");
    setInfoResult(null);
    setForgettingEnvironmentId(null);
    setEditingEnvironmentId(null);
  };
  const refreshSaved = useCallback(async () => {
    if (!projectToken || !window.codexDemo?.listEnvironments) {
      setSavedEnvironments([]);
      return;
    }
    try {
      setSavedEnvironments(await window.codexDemo.listEnvironments({ projectToken }));
    } catch {
      setSavedEnvironments([]);
    }
  }, [projectToken]);
  useEffect(() => {
    clear();
    setEnvironmentId("");
    setExecServerUrl("");
    void refreshSaved();
    return () => { requestEpoch.current++; };
  }, [projectToken, refreshSaved]);

  useEffect(() => {
    if (!window.codexDemo?.onLiveEnvironmentChange) return;
    return window.codexDemo.onLiveEnvironmentChange(() => {
      if (!forgettingEnvironmentId) void refreshSaved();
    });
  }, [forgettingEnvironmentId, refreshSaved]);

  const read = useCallback(async () => {
    if (!projectToken || !window.codexDemo || state === "loading") return;
    const requestedId = environmentId.trim();
    const request = ++requestEpoch.current;
    setState("loading");
    setResult(null);
    try {
      const value = await window.codexDemo.readEnvironmentStatus({
        projectToken,
        environmentId: requestedId,
      });
      if (request === requestEpoch.current) {
        setResult(value);
        setState("ready");
      }
    } catch {
      if (request === requestEpoch.current) setState("error");
    }
  }, [environmentId, projectToken, state]);

  const add = useCallback(async () => {
    if (
      !projectToken ||
      !window.codexDemo ||
      addState === "loading" ||
      !environmentId.trim() ||
      !execServerUrl.trim()
    ) {
      return;
    }
    const updating = editingEnvironmentId === environmentId.trim();
    setAddState("loading");
    setAddResult(null);
    try {
      const value = await window.codexDemo.addEnvironment({
        projectToken,
        environmentId,
        execServerUrl,
      });
      setAddResult({ ...value, updated: updating });
      setAddState("success");
      await refreshSaved();
    } catch {
      setAddState("error");
    }
  }, [addState, editingEnvironmentId, environmentId, execServerUrl, projectToken, refreshSaved]);

  const forget = useCallback(async (saved: SavedEnvironment) => {
    if (!projectToken || !window.codexDemo?.forgetEnvironment) return;
    setForgettingEnvironmentId(saved.environmentId);
    try {
      await window.codexDemo.forgetEnvironment({
        projectToken,
        environmentId: saved.environmentId,
      });
      if (environmentId.trim() === saved.environmentId) {
        setEnvironmentId("");
        setExecServerUrl("");
        clear();
      }
      await refreshSaved();
    } finally {
      setForgettingEnvironmentId(null);
    }
  }, [clear, environmentId, projectToken, refreshSaved]);

  const inspect = useCallback(async () => {
    if (
      !projectToken ||
      !window.codexDemo ||
      infoState === "loading" ||
      !environmentId.trim()
    ) {
      return;
    }
    setInfoState("loading");
    setInfoResult(null);
    try {
      const value = await window.codexDemo.readEnvironmentInfo({
        projectToken,
        environmentId,
      });
      setInfoResult(value);
      setInfoState("success");
    } catch {
      setInfoState("error");
    }
  }, [environmentId, infoState, projectToken]);

  if (!projectToken || !window.codexDemo) {
    return <EnvironmentSettingsPage
      status="unavailable"
      statusHeading="Environment status unavailable"
      message="Select a host-owned local project before checking an exact environment ID."
    />;
  }

  return <EnvironmentSettingsPage className="demo-live-environment-settings">
    <p>Manage one exact public App Server environment ID. The host validates the project binding and endpoint before any public protocol call.</p>
    {savedEnvironments.length > 0 && (
      <section aria-label="Saved environments" className="demo-live-environment-settings__saved">
        <h2>Saved environments</h2>
        <ul>
          {savedEnvironments.map((saved) => (
            <li key={saved.environmentId}>
              <button
                aria-label={`Use ${saved.environmentId}`}
                onClick={() => {
                  clear();
                  setEnvironmentId(saved.environmentId);
                  setExecServerUrl(saved.execServerUrl);
                }}
                type="button"
              >
                <code>{saved.environmentId}</code>
              </button>
              <code>{saved.execServerUrl}</code>
              <button
                aria-label={"Edit " + saved.environmentId}
                onClick={() => {
                  clear();
                  setEnvironmentId(saved.environmentId);
                  setExecServerUrl(saved.execServerUrl);
                  setEditingEnvironmentId(saved.environmentId);
                }}
                type="button"
              >
                Edit
              </button>
              <button
                aria-label={`Forget ${saved.environmentId}`}
                disabled={forgettingEnvironmentId === saved.environmentId}
                onClick={() => void forget(saved)}
                type="button"
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
        <p>Forget removes only this playground’s local record; it never deletes a remote environment.</p>
      </section>
    )}
    <label className="demo-live-environment-settings__field">
      Environment ID
      <input
        aria-label="Environment ID"
        onChange={(event) => {
          clear();
          setEnvironmentId(event.currentTarget.value);
        }}
        placeholder="for example: local"
        spellCheck={false}
        value={environmentId}
      />
    </label>
    <label className="demo-live-environment-settings__field">
      Exec server URL
      <input
        aria-label="Exec server URL"
        onChange={(event) => {
          setAddState("idle");
          setAddResult(null);
          setExecServerUrl(event.currentTarget.value);
        }}
        placeholder="wss://exec.example.test"
        spellCheck={false}
        value={execServerUrl}
      />
    </label>
    <div className="demo-live-environment-settings__actions">
      <Button
        disabled={
          addState === "loading" ||
          !environmentId.trim() ||
          !execServerUrl.trim()
        }
        onClick={() => void add()}
      >
        {editingEnvironmentId === environmentId.trim()
          ? "Update environment"
          : "Add environment"}
      </Button>
    </div>
    {addState === "loading" && (
      <p role="status">
        {editingEnvironmentId === environmentId.trim()
          ? "Updating environment…"
          : "Adding environment…"}
      </p>
    )}
    {addState === "error" && (
      <section
        aria-label="Add environment result"
        className="demo-live-environment-settings__result"
        data-status="error"
        role="alert"
      >
        <h2>
          {editingEnvironmentId === environmentId.trim()
            ? "Environment could not be updated"
            : "Environment could not be added"}
        </h2>
        <p>The endpoint was not accepted. Check the ID and websocket URL, then retry.</p>
        <Button onClick={() => void add()}>
          Retry{" "}
          {editingEnvironmentId === environmentId.trim() ? "updating" : "adding"}{" "}
          environment
        </Button>
      </section>
    )}
    {addResult && (
      <section
        aria-label="Add environment result"
        className="demo-live-environment-settings__result"
        data-status="success"
        role="status"
      >
        <h2>Environment {addResult.updated ? "updated" : "added"}</h2>
        <p>
          <code>{addResult.environmentId}</code> is configured at{" "}
          <code>{addResult.execServerUrl}</code>.
        </p>
      </section>
    )}
    <div className="demo-live-environment-settings__actions">
      <Button disabled={infoState === "loading" || !environmentId.trim()} onClick={() => void inspect()}>
        Inspect environment
      </Button>
    </div>
    {infoState === "loading" && <p role="status">Reading environment details…</p>}
    {infoState === "error" && (
      <section
        aria-label="Environment info result"
        className="demo-live-environment-settings__result"
        data-status="error"
        role="alert"
      >
        <h2>Environment details unavailable</h2>
        <p>The public environment did not return a valid shell. Check the ID, then retry.</p>
        <Button onClick={() => void inspect()}>Retry environment details</Button>
      </section>
    )}
    {infoResult && (
      <section
        aria-label="Environment info result"
        className="demo-live-environment-settings__result"
        data-status="success"
        role="status"
      >
        <h2>Environment details</h2>
        <p>
          Shell <code>{infoResult.shell.name}</code> at <code>{infoResult.shell.path}</code>.
        </p>
        <p>
          Working directory <code>{infoResult.cwd ?? "Not reported"}</code>.
        </p>
      </section>
    )}
    <div className="demo-live-environment-settings__actions">
      <Button disabled={state === "loading" || !environmentId.trim()} onClick={() => void read()}>
        Check environment status
      </Button>
    </div>
    {state === "loading" && <p role="status">Checking environment status…</p>}
    {state === "error" && <section aria-label="Environment status result" className="demo-live-environment-settings__result" data-status="error" role="alert">
      <h2>Environment status unavailable</h2>
      <p>The status check did not complete. It may be safe to retry; no connection or recovery is requested by this view.</p>
      <Button onClick={() => void read()}>Retry environment status</Button>
    </section>}
    {result && <section aria-label="Environment status result" className="demo-live-environment-settings__result" data-status={result.status} role={result.status === "disconnected" ? "alert" : "status"}>
      <h2>{statusCopy(result)}</h2>
      <p><code>{result.environmentId}</code> is {result.status}.</p>
      {result.error && <p>{result.error}</p>}
      {result.status === "disconnected" && (
        <Button onClick={() => void read()}>Retry environment status</Button>
      )}
    </section>}
  </EnvironmentSettingsPage>;
}
