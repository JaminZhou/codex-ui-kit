import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { GitPullRequestPreview } from "../electron/git-pr-preview";
import type { GitPullRequestDetail } from "../electron/git-pr-detail";

export function LivePullRequest({ projectToken }: { projectToken?: string }) {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState("origin");
  const [base, setBase] = useState("main");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<GitPullRequestPreview | null>(null);
  const [busy, setBusy] = useState<"read" | "create" | "detail" | "diff" | null>(null);
  const [patch, setPatch] = useState<string | null>(null);
  const [detail, setDetail] = useState<GitPullRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const epoch = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const invalidate = () => { epoch.current++; setPreview(null); setDetail(null); setPatch(null); setBusy(null); setError(null); setResult(null); };
  const readDiff = async () => {
    if (!projectToken || !detail || !window.codexDemo || busy) return;
    const request = ++epoch.current;
    setPatch(null); setError(null); setBusy("diff");
    try {
      const value = await window.codexDemo.readPullRequestDiff({ projectToken, remote: remote.trim(), number: detail.number, head: detail.headRefOid });
      if (request === epoch.current) setPatch(value.patch);
    } catch {
      if (request === epoch.current) setError("Couldn’t read the current diff. Refresh details and retry; large or unavailable diffs may need GitHub.");
    } finally { if (request === epoch.current) setBusy(null); }
  };
  const readDetail = async (number: number) => {
    if (!projectToken || !window.codexDemo || busy) return;
    const request = ++epoch.current;
    setDetail(null); setPatch(null); setError(null); setBusy("detail");
    try {
      const value = await window.codexDemo.readPullRequest({ projectToken, remote: remote.trim(), number });
      if (request === epoch.current) setDetail(value);
    } catch {
      if (request === epoch.current) setError("Couldn’t read current PR details. Refresh PRs and retry.");
    } finally { if (request === epoch.current) setBusy(null); }
  };
  useEffect(() => {
    invalidate(); setOpen(false); setRemote("origin"); setBase("main"); setTitle(""); setBody("");
    return () => { epoch.current++; };
  }, [projectToken]);
  const read = async () => {
    if (!projectToken || !window.codexDemo || busy) return;
    const request = ++epoch.current;
    setPreview(null); setDetail(null); setPatch(null); setError(null); setResult(null); setBusy("read");
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
      <div style={{ display: "grid", gap: 12, minWidth: 0, overflowWrap: "anywhere", maxHeight: "60vh", overflowY: "auto" }}>
        <label style={field}>Remote name<input aria-label="PR remote" value={remote} disabled={!!busy} onChange={event => { invalidate(); setRemote(event.target.value); }} /></label>
        <p>Creates a ready-for-review PR on GitHub after confirmation. No push or merge is performed. Base branch must exist.</p>
        {busy && <p role="status">{busy === "create" ? "Creating pull request…" : busy === "detail" ? "Reading PR details…" : busy === "diff" ? "Reading PR diff…" : "Reading pull requests…"}</p>}
        {error && <p role="alert">{error}</p>}{result && <p role="status">{result}</p>}
        {preview && <section aria-label="PR preview"><p>Repository: {preview.repository}</p><p>Head: {preview.branch} · {preview.head}</p>
          {preview.pullRequests.length ? <ul>{preview.pullRequests.map(pr => <li key={pr.number}>Existing PR #{pr.number}: {pr.title} → {pr.baseRefName}<br /><a href={pr.url} target="_blank" rel="noreferrer">Open PR #{pr.number} on GitHub</a> <Button disabled={!!busy} onClick={() => void readDetail(pr.number)}>Read details #{pr.number}</Button></li>)}</ul> : <p>No open PR for this branch.</p>}
        </section>}
        {detail && <section aria-label="PR details" style={{ maxHeight: "35vh", overflow: "auto" }}>
          <h3>{detail.title}</h3><p>{detail.state} · Base: {detail.baseRefName}</p>
          <p>Head: {detail.headRefOid}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{detail.body || "No description."}</p>
          <p>{detail.files.length} of {detail.changedFiles} changed files shown</p>
          <ul>{detail.files.map(file => <li key={file.path}>{file.path} (+{file.additions} / −{file.deletions})</li>)}</ul>
          <Button disabled={!!busy} onClick={() => void readDiff()}>Read PR diff</Button>
          {patch !== null && <pre aria-label="PR diff" tabIndex={0} style={{ maxHeight: "30vh", overflow: "auto", whiteSpace: "pre" }}>{patch || "No diff content returned."}</pre>}
        </section>}
        <label style={field}>Base branch<input aria-label="PR base branch" value={base} disabled={!!busy} onChange={event => setBase(event.target.value)} /></label>
        <label style={field}>Title<input aria-label="PR title" value={title} maxLength={256} disabled={!!busy} onChange={event => setTitle(event.target.value)} /></label>
        <label style={field}>Description<textarea aria-label="PR description" value={body} maxLength={65000} rows={4} disabled={!!busy} onChange={event => setBody(event.target.value)} /></label>
      </div>
    </Dialog>
  </>;
}
