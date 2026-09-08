import { useEffect, useRef, useState } from "react";
import { Button } from "codex-ui-kit";
import type { GitPullRequestDetail } from "../electron/git-pr-detail";
import type { PullRequestMergeStatus, PullRequestMergeTarget } from "../electron/git-pr-merge";

export function LivePullRequestMerge({ projectToken, remote, repository, detail, busy, onBusy, onMerged }: {
  projectToken?: string; remote: string; repository?: string; detail: GitPullRequestDetail | null; busy: boolean;
  onBusy: (value: "merge" | "merge-status" | null) => void; onMerged: () => void;
}) {
  const [target, setTarget] = useState<PullRequestMergeTarget | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [head, setHead] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<PullRequestMergeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  useEffect(() => () => { epoch.current++; }, []);
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
    setConfirmed(false); setHead(""); setAttempted(false); setStatus(null); setError(null);
  }}>Prepare admin squash merge</Button> : null;
  return <section aria-label="Confirm PR merge" style={{ display: "grid", gap: 12 }}>
    <p>PR #{target.number} · {target.repository} → {target.baseRefName}</p>
    <p>Exact head: {target.head}</p>
    <p>Administrator squash merge bypasses required checks/reviews without changing protection rules. Run full local validation for this exact head first. This action does not synchronize or delete local branches.</p>
    {status?.state === "MERGED" ? <p role="status">Merged PR #{status.number} at {status.mergeCommit}. Local checkout and branch cleanup are still required.</p> : <>
      <label style={{ display: "flex", gap: 8, alignItems: "start" }}><input type="checkbox" aria-label="Authorize admin merge after local validation" checked={confirmed} disabled={busy || attempted} onChange={event => setConfirmed(event.target.checked)} />I verified full local checks for this head and authorize administrator merge.</label>
      <label style={{ display: "grid", gap: 6 }}>Confirm exact head<input aria-label="Confirm merge head" value={head} disabled={busy || attempted} onChange={event => setHead(event.target.value)} /></label>
      <Button disabled={busy || attempted || !confirmed || head !== target.head} onClick={() => void run(false)}>Confirm admin squash merge</Button>
    </>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy} onClick={() => void run(true)}>Check merge result</Button>
    <Button disabled={busy} onClick={() => { epoch.current++; setTarget(null); setError(null); }}>Dismiss merge panel</Button>
  </section>;
}
