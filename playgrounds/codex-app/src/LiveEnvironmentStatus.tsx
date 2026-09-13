import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EnvironmentSettingsPage } from "codex-ui-kit";
import type { LiveEnvironmentAddResult } from "../electron/live-environment-add";
import type { LiveEnvironmentStatusResult } from "../electron/live-environment-status";

type ReadState = "idle" | "loading" | "error" | "ready";
type AddState = "idle" | "loading" | "error" | "success";

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
  const [addResult, setAddResult] = useState<LiveEnvironmentAddResult | null>(
    null,
  );
  const requestEpoch = useRef(0);

  const clear = () => {
    requestEpoch.current++;
    setState("idle");
    setResult(null);
    setAddState("idle");
    setAddResult(null);
  };
  useEffect(() => {
    clear();
    setEnvironmentId("");
    setExecServerUrl("");
    return () => { requestEpoch.current++; };
  }, [projectToken]);

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
    setAddState("loading");
    setAddResult(null);
    try {
      const value = await window.codexDemo.addEnvironment({
        projectToken,
        environmentId,
        execServerUrl,
      });
      setAddResult(value);
      setAddState("success");
    } catch {
      setAddState("error");
    }
  }, [addState, environmentId, execServerUrl, projectToken]);

  if (!projectToken || !window.codexDemo) {
    return <EnvironmentSettingsPage
      status="unavailable"
      statusHeading="Environment status unavailable"
      message="Select a host-owned local project before checking an exact environment ID."
    />;
  }

  return <EnvironmentSettingsPage className="demo-live-environment-settings">
    <p>Manage one exact public App Server environment ID. The host validates the project binding and endpoint before any public protocol call.</p>
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
        Add environment
      </Button>
    </div>
    {addState === "loading" && <p role="status">Adding environment…</p>}
    {addState === "error" && (
      <section
        aria-label="Add environment result"
        className="demo-live-environment-settings__result"
        data-status="error"
        role="alert"
      >
        <h2>Environment could not be added</h2>
        <p>The endpoint was not accepted. Check the ID and websocket URL, then retry.</p>
        <Button onClick={() => void add()}>Retry adding environment</Button>
      </section>
    )}
    {addResult && (
      <section
        aria-label="Add environment result"
        className="demo-live-environment-settings__result"
        data-status="success"
        role="status"
      >
        <h2>Environment added</h2>
        <p>
          <code>{addResult.environmentId}</code> is configured at{" "}
          <code>{addResult.execServerUrl}</code>.
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
    </section>}
  </EnvironmentSettingsPage>;
}
