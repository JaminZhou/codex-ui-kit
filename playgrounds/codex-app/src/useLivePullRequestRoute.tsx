import { useCallback, useEffect, useRef, useState } from "react";
import { Button, PullRequestList, PullRequestQueryState, WorkspacePanel } from "codex-ui-kit";
import type { GitPullRequestPreview } from "../electron/git-pr-preview";
import type { GitPullRequestDetail } from "../electron/git-pr-detail";
import type { GitPullRequestConversation } from "../electron/git-pr-detail";
import type { GitPullRequestConversationPageRequest } from "../electron/git-pr-detail";
import { LivePullRequest } from "./LivePullRequest";
import { LivePullRequestConversation } from "./LivePullRequestConversation";

/** Persistent live route state; replay fixtures never populate these surfaces. */
export function useLivePullRequestRoute({ projectToken, active, open, expanded, onExpandedChange, onOpen, onClose, onSidebar, onWorkspaceChanged }: {
  projectToken?: string; active: boolean; open: boolean; expanded: boolean; onExpandedChange: (value: boolean) => void;
  onOpen: () => void; onClose: () => void; onSidebar: () => void; onWorkspaceChanged: () => void;
}) {
  const [preview, setPreview] = useState<GitPullRequestPreview | null>(null);
  const [compact, setCompact] = useState(() => window.innerWidth < 680);
  useEffect(() => {
    const resize = () => setCompact(window.innerWidth < 680);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<GitPullRequestDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tab, setTab] = useState("summary");
  const [query, setQuery] = useState("");
  const [patch, setPatch] = useState<string | null>(null);
  const [diffStatus, setDiffStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [conversation, setConversation] = useState<GitPullRequestConversation | null>(null);
  const [conversationStatus, setConversationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [conversationPaging, setConversationPaging] = useState(false);
  const [conversationPageError, setConversationPageError] = useState<string | null>(null);
  const epoch = useRef(0);
  const detailEpoch = useRef(0);
  const conversationEpoch = useRef(0);
  const resetDetails = () => { detailEpoch.current++; conversationEpoch.current++; setSelected(null); setDetail(null); setDetailStatus("idle"); setPatch(null); setDiffStatus("idle"); setConversation(null); setConversationStatus("idle"); setConversationError(null); setConversationPaging(false); setConversationPageError(null); setTab("summary"); };
  useEffect(() => {
    epoch.current++; resetDetails(); setPreview(null); setStatus("idle"); setQuery("");
    return () => { epoch.current++; detailEpoch.current++; conversationEpoch.current++; };
  }, [projectToken]);
  const refresh = useCallback(async () => {
    if (!projectToken || !window.codexDemo) return;
    const request = ++epoch.current;
    resetDetails(); setPreview(null); setStatus("loading");
    try {
      const value = await window.codexDemo.previewPullRequest({ projectToken, remote: "origin" });
      if (request === epoch.current) { setPreview(value); setStatus("ready"); }
    } catch { if (request === epoch.current) setStatus("error"); }
  }, [projectToken]);
  useEffect(() => { if (active && status === "idle") void refresh(); }, [active, status, refresh]);
  const select = async (number: number) => {
    if (!projectToken || !window.codexDemo) return;
    const request = ++detailEpoch.current;
    conversationEpoch.current++;
    setConversation(null); setConversationStatus("idle"); setConversationError(null); setConversationPaging(false); setConversationPageError(null);
    setSelected(number); setDetail(null); setDetailStatus("loading"); setPatch(null); setDiffStatus("idle"); setTab("summary"); onOpen();
    try {
      const value = await window.codexDemo.readPullRequest({ projectToken, remote: "origin", number });
      if (request === detailEpoch.current) { setDetail(value); setDetailStatus("ready"); }
    } catch { if (request === detailEpoch.current) setDetailStatus("error"); }
  };
  const readDiff = async () => {
    if (!projectToken || !detail || !window.codexDemo || diffStatus === "loading") return;
    const request = ++detailEpoch.current;
    setPatch(null); setDiffStatus("loading");
    try {
      const value = await window.codexDemo.readPullRequestDiff({ projectToken, remote: "origin", number: detail.number, head: detail.headRefOid });
      if (request === detailEpoch.current) { setPatch(value.patch); setDiffStatus("ready"); }
    } catch { if (request === detailEpoch.current) setDiffStatus("error"); }
  };
  const readConversation = useCallback(async () => {
    if (!projectToken || !detail || !window.codexDemo || conversationStatus === "loading") return;
    const request = ++conversationEpoch.current;
    const expectedHead = detail.headRefOid;
    setConversation(null); setConversationError(null); setConversationPaging(false); setConversationPageError(null); setConversationStatus("loading");
    try {
      const value = await window.codexDemo.readPullRequestConversation({
        projectToken,
        remote: "origin",
        number: detail.number,
        head: expectedHead,
      });
      if (request === conversationEpoch.current && value.headRefOid === expectedHead) {
        setConversation(value); setConversationStatus("ready");
      } else if (request === conversationEpoch.current) {
        setConversationError("PR head changed. Refresh the detail before retrying."); setConversationStatus("error");
      }
    } catch {
      if (request === conversationEpoch.current) {
        setConversationError("GitHub could not return the current PR comments and review threads."); setConversationStatus("error");
      }
    }
  }, [projectToken, detail, conversationStatus]);
  const loadConversationPage = useCallback(async (page: GitPullRequestConversationPageRequest) => {
    if (!projectToken || !detail || !conversation || !window.codexDemo || conversationPaging) return;
    const entry = Object.entries(page).find(([, cursor]) => typeof cursor === "string");
    if (!entry) return;
    const [key] = entry;
    const request = conversationEpoch.current;
    const expectedHead = detail.headRefOid;
    setConversationPaging(true); setConversationPageError(null);
    try {
      const value = await window.codexDemo.readPullRequestConversation({
        projectToken,
        remote: "origin",
        number: detail.number,
        head: expectedHead,
        page,
      });
      if (request !== conversationEpoch.current) return;
      if (value.headRefOid !== expectedHead) throw new Error("PR head changed while reading conversation history.");
      setConversation(current => {
        if (!current || current.headRefOid !== expectedHead) return current;
        if (key === "commentsAfter") return {
          ...current,
          comments: [...current.comments, ...value.comments.filter(item => !current.comments.some(existing => existing.id === item.id))],
          totalComments: value.totalComments,
          hasMoreComments: value.hasMoreComments,
          nextCommentsCursor: value.nextCommentsCursor,
        };
        if (key === "reviewsAfter") return {
          ...current,
          reviews: [...current.reviews, ...value.reviews.filter(item => !current.reviews.some(existing => existing.id === item.id))],
          totalReviews: value.totalReviews,
          hasMoreReviews: value.hasMoreReviews,
          nextReviewsCursor: value.nextReviewsCursor,
        };
        if (key === "reviewThreadsAfter") return {
          ...current,
          reviewThreads: [...current.reviewThreads, ...value.reviewThreads.filter(item => !current.reviewThreads.some(existing => existing.id === item.id))],
          totalReviewThreads: value.totalReviewThreads,
          hasMoreReviewThreads: value.hasMoreReviewThreads,
          nextReviewThreadsCursor: value.nextReviewThreadsCursor,
        };
        return current;
      });
    } catch {
      if (request === conversationEpoch.current) setConversationPageError("More PR conversation history could not be loaded. Retry or open the PR on GitHub.");
    } finally {
      if (request === conversationEpoch.current) setConversationPaging(false);
    }
  }, [projectToken, detail, conversation, conversationPaging]);
  const loadThreadReplies = useCallback(async (threadId: string, after: string) => {
    if (!projectToken || !detail || !conversation || !window.codexDemo || conversationPaging) return;
    const request = conversationEpoch.current;
    const expectedHead = detail.headRefOid;
    setConversationPaging(true); setConversationPageError(null);
    try {
      const value = await window.codexDemo.readPullRequestReviewThreadReplies({
        projectToken,
        remote: "origin",
        number: detail.number,
        head: expectedHead,
        threadId,
        after,
      });
      if (request !== conversationEpoch.current) return;
      if (value.headRefOid !== expectedHead || value.threadId !== threadId) throw new Error("PR thread changed while reading replies.");
      setConversation(current => {
        if (!current || current.headRefOid !== expectedHead) return current;
        return {
          ...current,
          reviewThreads: current.reviewThreads.map(thread => thread.id !== threadId ? thread : {
            ...thread,
            comments: [...thread.comments, ...value.comments.filter(item => !thread.comments.some(existing => existing.id === item.id))],
            totalComments: value.totalComments,
            hasMoreComments: value.hasMoreComments,
            nextCommentsCursor: value.nextCommentsCursor,
          }),
        };
      });
    } catch {
      if (request === conversationEpoch.current) setConversationPageError("More replies for this review thread could not be loaded. Retry or open the PR on GitHub.");
    } finally {
      if (request === conversationEpoch.current) setConversationPaging(false);
    }
  }, [projectToken, detail, conversation, conversationPaging]);
  useEffect(() => {
    if (tab === "conversation" && detailStatus === "ready" && conversationStatus === "idle") {
      void readConversation();
    }
  }, [tab, detailStatus, conversationStatus, readConversation]);
  const filtered = preview?.pullRequests.filter(pr => `${pr.number} ${pr.title} ${pr.baseRefName}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  const index = <section aria-label="Live pull requests" className="demo-live-pr-index" style={compact && open ? { visibility: "hidden" } : undefined}>
    <header><h1>Pull requests</h1><Button onClick={onSidebar}>Toggle sidebar</Button></header>
    <p>Live GitHub · current project branch · origin</p>
    <div className="demo-live-pr-actions"><Button disabled={!projectToken || status === "loading"} onClick={() => void refresh()}>Refresh live PRs</Button><LivePullRequest projectToken={projectToken} onWorkspaceChanged={onWorkspaceChanged} /></div>
    <p>Only open PRs for the current pushed branch are shown. History and other branches are not included; checks are not fetched.</p>
    <input aria-label="Search live branch PRs" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search loaded pull requests" />
    {preview && <p>{preview.repository} · {preview.branch}</p>}
    {!projectToken ? <p>Select a project to read its pull requests.</p> : status === "loading" ? <PullRequestQueryState status="loading" heading="Loading live pull requests" /> : status === "error" ? <PullRequestQueryState status="error" heading="Live pull requests unavailable" description="Check origin, GitHub authentication and that this branch is pushed. No replay data is substituted." action={<Button onClick={() => void refresh()}>Retry live PRs</Button>} /> : status === "ready" ? <PullRequestList label="Live branch pull requests" selectedId={selected === null ? undefined : String(selected)} onSelect={id => void select(Number(id))} emptyLabel={query ? "No loaded PRs match this search." : "No open PR for the current branch."} items={filtered.map(pr => ({ id: String(pr.number), number: pr.number, title: pr.title, repository: preview?.repository, state: "open", meta: `Base: ${pr.baseRefName}`, openLabel: `Open live PR #${pr.number}` }))} /> : null}
  </section>;
  const summary = detail ? <section aria-label="Live PR summary" className="demo-live-pr-content">
    <h2>{detail.title}</h2><p>{detail.state} · Base: {detail.baseRefName}</p><p>Head: {detail.headRefOid}</p>
    <p style={{ whiteSpace: "pre-wrap" }}>{detail.body || "No description."}</p>
    <p>{detail.files.length} of {detail.changedFiles} changed files shown</p>
    <ul>{detail.files.map(file => <li key={file.path}>{file.path} (+{file.additions} / −{file.deletions})</li>)}</ul>
    <a href={detail.url} target="_blank" rel="noreferrer">Open PR #{detail.number} on GitHub</a>
  </section> : null;
  const unavailable = selected === null ? <p className="demo-live-pr-content">Select a live pull request to view.</p> : detailStatus === "error" ? <PullRequestQueryState status="error" heading="Live PR detail unavailable" description="The branch or PR may have changed. Refresh or retry." action={<Button onClick={() => void select(selected)}>Retry live detail</Button>} /> : <PullRequestQueryState status="loading" heading="Loading live PR detail" />;
  const code = <section aria-label="Live PR code" className="demo-live-pr-content">
    <Button disabled={!detail || diffStatus === "loading"} onClick={() => void readDiff()}>Read live PR diff</Button>
    <p>Bounded GitHub text patch. Binary content or unavailable large diffs may require GitHub.</p>
    {diffStatus === "loading" && <p role="status">Reading live diff…</p>}
    {diffStatus === "error" && <p role="alert">Live diff unavailable or changed. Refresh details before retrying.</p>}
    {patch !== null && <pre aria-label="Live PR diff" tabIndex={0}>{patch || "No diff content returned."}</pre>}
  </section>;
  const liveConversation = detailStatus === "ready" && detail ? <LivePullRequestConversation
    conversation={conversation}
    error={conversationError}
    loadingMore={conversationPaging}
    moreError={conversationPageError}
    onLoadMoreComments={() => { if (conversation?.nextCommentsCursor) void loadConversationPage({ commentsAfter: conversation.nextCommentsCursor }); }}
    onLoadMoreReviews={() => { if (conversation?.nextReviewsCursor) void loadConversationPage({ reviewsAfter: conversation.nextReviewsCursor }); }}
    onLoadMoreReviewThreads={() => { if (conversation?.nextReviewThreadsCursor) void loadConversationPage({ reviewThreadsAfter: conversation.nextReviewThreadsCursor }); }}
    onLoadMoreThreadReplies={(threadId, cursor) => void loadThreadReplies(threadId, cursor)}
    onRefresh={() => void readConversation()}
    prUrl={detail.url}
    status={conversationStatus}
  /> : unavailable;
  const panel = <WorkspacePanel label="Live pull request" className="demo-live-pr-panel" placement="side" expanded={expanded || compact} onExpandedChange={compact ? undefined : onExpandedChange}
    actions={<Button aria-label="Close live PR detail" onClick={onClose}>Close</Button>} activeTabId={tab} onActiveTabChange={setTab} tabsLabel="Live pull request view"
    tabs={[{ id: "summary", label: "Summary", content: detailStatus === "ready" ? summary : unavailable }, { id: "code", label: "Code", content: detailStatus === "ready" ? code : unavailable }, { id: "conversation", label: "Reviews", ariaLabel: "Comments and review threads", content: liveConversation }]} />;
  return { index, panel, compact };
}
