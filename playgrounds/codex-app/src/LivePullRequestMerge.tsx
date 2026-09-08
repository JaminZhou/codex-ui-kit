import { useEffect, useRef, useState } from "react";
import { Button } from "codex-ui-kit";
import type { GitPullRequestDetail } from "../electron/git-pr-detail";
import type { PullRequestMergeStatus, PullRequestMergeTarget } from "../electron/git-pr-merge";
import type { PullRequestCleanupResult } from "../electron/git-pr-cleanup";

export function LivePullRequestMerge({ projectToken, remote, repository, detail, busy, onBusy, onMerged, onWorkspaceChanged }: {
  projectToken?: string; remote: string; repository?: string; detail: GitPullRequestDetail | null; busy: boolean;
  onBusy: (value: "merge" | "merge-status" | "cleanup" | null) => void; onMerged: () => void;
  onWorkspaceChanged?: () => void;
}) {
  const [target, setTarget] = useState<PullRequestMergeTarget | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [head, setHead] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<PullRequestMergeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupConfirmed, setCleanupConfirmed] = useState(false);
  const [cleanup, setCleanup] = useState<PullRequestCleanupResult | null>(null);
  const epoch = useRef(0);
  useEffect(() => () => { epoch.current++; }, []);
  const clean = async () => {
    if (!projectToken || !target || !window.codexDemo || busy || status?.state !== "MERGED" || !cleanupConfirmed) return;
    const request = ++epoch.current;
    setError(null); setCleanup(null); setCleanupConfirmed(false); onBusy("cleanup");
    try {
      const value = await window.codexDemo.cleanupMergedPullRequest({ ...target, projectToken, cleanupConfirmed: true });
      if (request === epoch.current) setCleanup(value);
    } catch {
      if (request === epoch.current) setError("Cleanup is incomplete. It may already have synchronized main or removed a ref. Preserve local changes and inspect branch/remote state before confirming again; no automatic retry is performed.");
    } finally { if (request === epoch.current) { onBusy(null); onWorkspaceChanged?.(); } }
  };
  const run = async (readOnly: boolean) => {
    if (!projectToken || !target || !window.codexDemo || busy || (!readOnly && (!confirmed || head !== target.head || attempted))) return;
    const request = ++epoch.current;
    setError(null); onBusy(readOnly ? "merge-status" : "merge");
    if (!readOnly) setAttempted(true);
    try {
      const input = { ...target, projectToken };
      const value = readOnly ? await window.codexDemo.readPullRequestMergeStatus(input) : await window.codexDemo.mergePullRequest({ ...input, adminConfirmed: true });
      if (request === epoch.current) {
        setStatus(value);
        if (value.state === "MERGED") onMerged();
        else setError(`PR is ${value.state}. No automatic retry. Refresh details before preparing another merge.`);
      }
    } catch {
      if (request === epoch.current) setError("Merge is not verified. Check merge result before another attempt; GitHub may already have merged it. Conflicts and changed targets must be resolved first.");
    } finally { if (request === epoch.current) onBusy(null); }
  };
  if (!target) return detail && repository && detail.state === "OPEN" ? <Button disabled={busy} onClick={() => {
    setTarget({ remote, repository, number: detail.number, head: detail.headRefOid, baseRefName: detail.baseRefName, baseRefOid: detail.baseRefOid });
    setConfirmed(false); setHead(""); setAttempted(false); setStatus(null); setError(null); setCleanup(null); setCleanupConfirmed(false);
  }}>Prepare admin squash merge</Button> : null;
  return <section aria-label="Confirm PR merge" style={{ display: "grid", gap: 12 }}>
    <p>PR #{target.number} · {target.repository} → {target.baseRefName}</p>
    <p>Exact head: {target.head}</p>
    <p>Administrator squash merge bypasses required checks/reviews without changing protection rules. Run full local validation for this exact head first. This action does not synchronize or delete local branches.</p>
    {status?.state === "MERGED" ? <>
      <p role="status">Merged PR #{status.number} at {status.mergeCommit}.</p>
      {cleanup ? <p role="status">Cleanup complete: {cleanup.branch} matches {cleanup.remote}/main at {cleanup.head}; removed {cleanup.removedBranch} locally and remotely.</p> : <>
        <p>Cleanup switches this project to main, fast-forwards it from {target.remote}, and removes only {status.branch}. Dirty files, new branch commits or divergent main stop cleanup. This is not atomic; partial progress is reported on failure.</p>
        <label style={{ display: "flex", gap: 8, alignItems: "start" }}><input type="checkbox" aria-label="Authorize merged branch cleanup" checked={cleanupConfirmed} disabled={busy} onChange={event => setCleanupConfirmed(event.target.checked)} />I authorize main synchronization and deletion of this exact merged branch.</label>
        <Button disabled={busy || !cleanupConfirmed || status.baseRefName !== "main"} onClick={() => void clean()}>Confirm main sync and cleanup</Button>
      </>}
    </> : <>
      <label style={{ display: "flex", gap: 8, alignItems: "start" }}><input type="checkbox" aria-label="Authorize admin merge after local validation" checked={confirmed} disabled={busy || attempted} onChange={event => setConfirmed(event.target.checked)} />I verified full local checks for this head and authorize administrator merge.</label>
      <label style={{ display: "grid", gap: 6 }}>Confirm exact head<input aria-label="Confirm merge head" value={head} disabled={busy || attempted} onChange={event => setHead(event.target.value)} /></label>
      <Button disabled={busy || attempted || !confirmed || head !== target.head} onClick={() => void run(false)}>Confirm admin squash merge</Button>
    </>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy} onClick={() => void run(true)}>Check merge result</Button>
    <Button disabled={busy} onClick={() => { epoch.current++; setTarget(null); setError(null); }}>Dismiss merge panel</Button>
  </section>;
}
