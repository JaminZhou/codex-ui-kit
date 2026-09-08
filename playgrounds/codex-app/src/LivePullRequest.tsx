import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { GitPullRequestPreview } from "../electron/git-pr-preview";

export function LivePullRequest({ projectToken }: { projectToken?: string }) {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState("origin");
  const [base, setBase] = useState("main");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<GitPullRequestPreview | null>(null);
  const [busy, setBusy] = useState<"read" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const epoch = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const invalidate = () => { epoch.current++; setPreview(null); setBusy(null); setError(null); setResult(null); };
  useEffect(() => {
    invalidate(); setOpen(false); setRemote("origin"); setBase("main"); setTitle(""); setBody("");
    return () => { epoch.current++; };
  }, [projectToken]);
  const read = async () => {
    if (!projectToken || !window.codexDemo || busy) return;
    const request = ++epoch.current;
    setPreview(null); setError(null); setResult(null); setBusy("read");
    try {
      const value = await window.codexDemo.previewPullRequest({ projectToken, remote: remote.trim() });
      if (request === epoch.current) setPreview(value);
    } catch {
      if (request === epoch.current) setError("Couldn’t read PRs. Check GitHub authentication and push the current branch, then retry. Your draft is preserved.");
    } finally { if (request === epoch.current) setBusy(null); }
  };
  const create = async () => {
    if (!projectToken || !preview || !window.codexDemo || busy) return;
    const request = ++epoch.current;
    setBusy("create"); setError(null); setResult(null);
    try {
      const value = await window.codexDemo.createPullRequest({ projectToken, remote: remote.trim(), fingerprint: preview.fingerprint, base: base.trim(), title, body });
      if (request === epoch.current) setResult(`Created PR #${value.number}: ${value.url}`);
    } catch {
      if (request === epoch.current) setError("Creation did not return success. Refresh PRs before retrying: the request may already have created one. Your draft is preserved.");
    } finally { if (request === epoch.current) { setBusy(null); setPreview(null); } }
  };
  const close = () => { if (busy === "create") return; invalidate(); setOpen(false); };
  const field = { display: "grid", gap: 6 };
  return <>
    <AppSidebarItem disabled={!projectToken} onClick={event => { trigger.current = event.currentTarget; invalidate(); setOpen(true); }}>Prepare pull request</AppSidebarItem>
    <Dialog title="Prepare pull request" open={open} size="wide" returnFocusRef={trigger} onOpenChange={value => { if (!value) close(); }}
      footer={<><Button disabled={!!busy || !remote.trim()} onClick={() => void read()}>Refresh PRs</Button><Button disabled={!!busy || !preview || !!preview.pullRequests.length || !title.trim() || !base.trim() || base.trim() === preview.branch} onClick={() => void create()}>Confirm create PR</Button><Button disabled={busy === "create"} onClick={close}>Close</Button></>}>
      <div style={{ display: "grid", gap: 12, minWidth: 0, overflowWrap: "anywhere" }}>
        <label style={field}>Remote name<input aria-label="PR remote" value={remote} disabled={!!busy} onChange={event => { invalidate(); setRemote(event.target.value); }} /></label>
        <p>Creates a ready-for-review PR on GitHub after confirmation. No push or merge is performed. Base branch must exist.</p>
        {busy && <p role="status">{busy === "create" ? "Creating pull request…" : "Reading pull requests…"}</p>}
        {error && <p role="alert">{error}</p>}{result && <p role="status">{result}</p>}
        {preview && <section aria-label="PR preview"><p>Repository: {preview.repository}</p><p>Head: {preview.branch} · {preview.head}</p>
          {preview.pullRequests.length ? <ul>{preview.pullRequests.map(pr => <li key={pr.number}>Existing PR #{pr.number}: {pr.title} → {pr.baseRefName}<br />{pr.url}</li>)}</ul> : <p>No open PR for this branch.</p>}
        </section>}
        <label style={field}>Base branch<input aria-label="PR base branch" value={base} disabled={!!busy} onChange={event => setBase(event.target.value)} /></label>
        <label style={field}>Title<input aria-label="PR title" value={title} maxLength={256} disabled={!!busy} onChange={event => setTitle(event.target.value)} /></label>
        <label style={field}>Description<textarea aria-label="PR description" value={body} maxLength={65000} rows={4} disabled={!!busy} onChange={event => setBody(event.target.value)} /></label>
      </div>
    </Dialog>
  </>;
}
