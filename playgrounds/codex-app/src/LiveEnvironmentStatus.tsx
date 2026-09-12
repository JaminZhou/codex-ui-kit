import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EnvironmentSettingsPage } from "codex-ui-kit";
import type { LiveEnvironmentStatusResult } from "../electron/live-environment-status";

type ReadState = "idle" | "loading" | "error" | "ready";

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
  const requestEpoch = useRef(0);

  const clear = () => {
    requestEpoch.current++;
    setState("idle");
    setResult(null);
  };
  useEffect(() => {
    clear();
    setEnvironmentId("");
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

  if (!projectToken || !window.codexDemo) {
    return <EnvironmentSettingsPage
      status="unavailable"
      statusHeading="Environment status unavailable"
      message="Select a host-owned local project before checking an exact environment ID."
    />;
  }

  return <EnvironmentSettingsPage className="demo-live-environment-settings">
    <p>Read-only status for one exact public App Server environment ID. This view does not list, create, edit, connect, or recover environments.</p>
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
