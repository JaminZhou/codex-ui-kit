import { useEffect, useRef, useState } from "react";
import { AppSidebarItem, Button, Dialog } from "codex-ui-kit";
import type { GitCommitPreview } from "../electron/git-commit-preview";

export function LiveCommitPreview({ projectToken }: { projectToken?: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<GitCommitPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [commitState, setCommitState] = useState<string | null>(null);
  const generation = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const submit = async () => {
    if (!projectToken || !preview || !window.codexDemo || saving) return;
    const epoch = ++generation.current;
    setSaving(true);
    setCommitState(null);
    try {
      const result = await window.codexDemo.commitPreview({ projectToken, fingerprint: preview.fingerprint, message });
      if (epoch === generation.current) {
        setCommitState(`Committed locally: ${result.head}. Nothing was pushed.`);
        setMessage("");
      }
    } catch {
      if (epoch === generation.current) setCommitState("Commit did not return success. Check Git status and hooks, then refresh before retrying; do not assume nothing changed.");
    } finally {
      if (epoch === generation.current) { setSaving(false); setPreview(null); }
    }
  };
  const refresh = async () => {
    const epoch = ++generation.current;
    setPreview(null);
    setFailed(false);
    setCommitState(null);
    if (!projectToken || !window.codexDemo) return;
    setLoading(true);
    try {
      const result = await window.codexDemo.previewCommit({ projectToken });
      if (epoch === generation.current) setPreview(result);
    } catch {
      if (epoch === generation.current) setFailed(true);
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    setOpen(false);
    setPreview(null);
    setLoading(false);
    setFailed(false);
    setMessage("");
    setSaving(false);
    setCommitState(null);
    return () => { generation.current += 1; };
  }, [projectToken]);
  return <>
    <AppSidebarItem disabled={!projectToken} onClick={event => { trigger.current = event.currentTarget; setOpen(true); void refresh(); }}>Review staged changes</AppSidebarItem>
    <Dialog open={open} title="Review staged changes" size="wide" returnFocusRef={trigger}
      onOpenChange={value => { if (saving) return; setOpen(value); if (!value) { generation.current += 1; setLoading(false); } }}
      footer={<><Button disabled={loading || saving} onClick={() => { setCommitState(null); void refresh(); }}>Refresh preview</Button><Button disabled={saving || loading || !preview?.branch || !preview.stagedFiles.length || !message.trim()} onClick={() => void submit()}>Confirm local commit</Button><Button disabled={saving} onClick={() => { setOpen(false); generation.current += 1; setLoading(false); }}>Close</Button></>}>
      {saving && <p role="status">Committing locally… Do not modify this repository in another app.</p>}
      {commitState && <p role="status">{commitState}</p>}
      {loading && <p role="status">Reading staged changes…</p>}
      {failed && <p role="alert">Couldn’t read staged changes. Check the repository and resolve any conflicts, then refresh.</p>}
      {preview && <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
        <p>Branch: {preview.branch ?? "Detached HEAD"}</p>
        <p>{preview.head ? `Parent: ${preview.head}` : "First commit — no parent"}</p>
        <p>This preview includes only staged changes. Nothing has been committed or pushed.</p>
        {(preview.hasUnstagedChanges || preview.hasUntrackedFiles) && <p role="status">Unstaged or untracked changes are excluded.</p>}
        {!preview.stagedFiles.length ? <p>No staged changes. Stage the files you want to review first.</p> : <>
          <ul aria-label="Staged files">{preview.stagedFiles.map(file => <li key={file}>{file}</li>)}</ul>
          <pre aria-label="Staged patch" tabIndex={0} style={{ maxHeight: "40vh", overflow: "auto", whiteSpace: "pre", maxWidth: "100%" }}>{preview.stagedPatch}</pre>
          <label>Commit message<textarea aria-label="Commit message" value={message} maxLength={10000} disabled={saving} onChange={event => setMessage(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box" }} /></label>
          <p>Confirm commits this repository’s staged changes only. Git hooks run normally. Avoid concurrent Git edits until it finishes.</p>
        </>}
      </div>}
    </Dialog>
  </>;
}
