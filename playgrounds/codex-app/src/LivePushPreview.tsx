import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { GitPushPreview } from "../electron/git-push-preview";

export function LivePushPreview({ projectToken }: { projectToken?: string }) {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState("origin");
  const [target, setTarget] = useState("");
  const [preview, setPreview] = useState<GitPushPreview | null>(null);
  const [busy, setBusy] = useState<"read" | "push" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const invalidate = () => { generation.current++; setPreview(null); setStatus(null); setError(null); setBusy(null); };
  useEffect(() => {
    invalidate(); setOpen(false); setRemote("origin"); setTarget("");
    return () => { generation.current++; };
  }, [projectToken]);
  const read = async () => {
    if (!projectToken || !window.codexDemo || busy) return;
    const epoch = ++generation.current;
    setPreview(null); setStatus(null); setError(null); setBusy("read");
    try {
      const result = await window.codexDemo.previewPush({ projectToken, remote: remote.trim(), target: target.trim() || undefined });
      if (generation.current === epoch) setPreview(result);
    } catch {
      if (generation.current === epoch) setError("Couldn’t prepare push. Check the remote, authentication and branch history. Fetch or reconcile explicitly if needed, then retry.");
    } finally { if (generation.current === epoch) setBusy(null); }
  };
  const push = async () => {
    if (!projectToken || !preview || !window.codexDemo || busy) return;
    const epoch = ++generation.current;
    setError(null); setStatus(null); setBusy("push");
    try {
      const result = await window.codexDemo.pushPreview({ projectToken, remote: preview.remote, target: preview.target, fingerprint: preview.fingerprint });
      if (generation.current === epoch) setStatus(`Pushed ${result.head} to ${result.target}.`);
    } catch {
      if (generation.current === epoch) setError("Push did not return success. The remote may have changed. Refresh and inspect before retrying; nothing will be force-pushed.");
    } finally { if (generation.current === epoch) { setBusy(null); setPreview(null); } }
  };
  const close = () => { if (busy === "push") return; invalidate(); setOpen(false); };
  return <>
    <AppSidebarItem disabled={!projectToken} onClick={event => { trigger.current = event.currentTarget; invalidate(); setOpen(true); }}>Review push</AppSidebarItem>
    <Dialog open={open} title="Review push" size="wide" returnFocusRef={trigger} onOpenChange={value => { if (!value) close(); }}
      footer={<><Button disabled={!!busy || !remote.trim()} onClick={() => void read()}>Read remote preview</Button><Button disabled={!!busy || !preview?.commitCount} onClick={() => void push()}>Confirm push</Button><Button disabled={busy === "push"} onClick={close}>Close</Button></>}>
      <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>Remote name<input aria-label="Remote name" value={remote} disabled={!!busy} onChange={event => { invalidate(); setRemote(event.target.value); }} /></label>
          <label style={{ display: "grid", gap: 6 }}>Target branch<input aria-label="Target branch" placeholder="Current branch" value={target} disabled={!!busy} onChange={event => { invalidate(); setTarget(event.target.value); }} /></label>
        </div>
        <p>Reading contacts the selected remote without pushing. Confirmation sends committed history only, to the single branch below. No force push or implicit tags.</p>
        {busy && <p role="status">{busy === "push" ? "Pushing… Avoid concurrent Git changes." : "Reading remote…"}</p>}
        {error && <p role="alert">{error}</p>}
        {status && <p role="status">{status}</p>}
        {preview && <section aria-label="Push preview">
          <p>Destination: {preview.destination}</p><p>{preview.branch} → {preview.target}</p>
          <p>Local commit: {preview.head}</p><p>Remote commit: {preview.remoteHead ?? "New branch"}</p>
          <p>{preview.commitCount} commits to push{preview.commitCount > 100 ? " (showing first 100)" : ""}</p>
          <ul style={{ maxHeight: "25vh", overflow: "auto" }}>{preview.commits.map(commit => <li key={commit}>{commit}</li>)}</ul>
        </section>}
      </div>
    </Dialog>
  </>;
}
