import {
  Button,
  PullRequestReviewSummary,
  PullRequestReviewThread,
  PullRequestQueryState,
} from "codex-ui-kit";
import type { GitPullRequestConversation } from "../electron/git-pr-detail";

type ConversationStatus = "idle" | "loading" | "ready" | "error";

const reviewStatus = (state: string) => {
  switch (state) {
    case "APPROVED": return "approved" as const;
    case "CHANGES_REQUESTED": return "changes-requested" as const;
    case "DISMISSED": return "dismissed" as const;
    case "PENDING": return "pending" as const;
    default: return "commented" as const;
  }
};

export function LivePullRequestConversation({
  conversation,
  error,
  onRefresh,
  prUrl,
  status,
}: {
  conversation: GitPullRequestConversation | null;
  error: string | null;
  onRefresh: () => void;
  prUrl: string;
  status: ConversationStatus;
}) {
  if (status === "loading") {
    return <PullRequestQueryState status="loading" variant="detail" heading="Loading PR conversation" />;
  }
  if (status === "error") {
    return <PullRequestQueryState
      status="error"
      variant="detail"
      heading="PR conversation unavailable"
      description={error ?? "Refresh the PR details and retry."}
      action={<Button onClick={onRefresh}>Retry PR conversation</Button>}
    />;
  }
  if (!conversation) {
    return <PullRequestQueryState status="empty" variant="detail" heading="No PR conversation loaded" />;
  }

  const hasTruncatedData = conversation.hasMoreComments
    || conversation.hasMoreReviews
    || conversation.hasMoreReviewThreads
    || conversation.reviewThreads.some((thread) => thread.hasMoreComments);

  return <section aria-label="Live PR conversation" className="demo-live-pr-content demo-live-pr-conversation">
    <header className="demo-live-pr-conversation__header">
      <h2>Conversation</h2>
      <Button onClick={onRefresh}>Refresh conversation</Button>
    </header>
    <p>Read-only snapshot for head {conversation.headRefOid.slice(0, 12)}. Comments are shown as plain text.</p>
    <PullRequestReviewSummary
      heading={`Reviews (${conversation.totalReviews})`}
      emptyLabel="No submitted reviews."
      reviewers={conversation.reviews.map((review) => ({
        id: review.id,
        name: review.author,
        status: reviewStatus(review.state),
        summary: review.body || (review.submittedAt ? `Submitted ${review.submittedAt.slice(0, 10)}` : "Pending review"),
      }))}
    />
    <section aria-label="PR conversation comments" className="demo-live-pr-conversation__section">
      <h3>Comments ({conversation.totalComments})</h3>
      {conversation.comments.length === 0 ? <p>No conversation comments.</p> : conversation.comments.map((comment) =>
        <article className="demo-live-pr-conversation__entry" key={comment.id}>
          <header><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time></header>
          <p>{comment.body || "(empty comment)"}</p>
          <a href={comment.url} target="_blank" rel="noreferrer">Open comment on GitHub</a>
        </article>
      )}
    </section>
    <section aria-label="Inline review threads" className="demo-live-pr-conversation__section">
      <h3>Review threads ({conversation.totalReviewThreads})</h3>
      {conversation.reviewThreads.length === 0 ? <p>No inline review threads.</p> : conversation.reviewThreads.map((thread) => {
        const first = thread.comments[0];
        return <PullRequestReviewThread
          className="demo-live-pr-conversation__thread"
          key={thread.id}
          path={thread.path}
          line={thread.line ?? undefined}
          resolved={thread.resolved}
          outdated={thread.outdated}
          author={first?.author ?? "Deleted user"}
          actions={first ? <a href={first.url} target="_blank" rel="noreferrer">Open thread on GitHub</a> : undefined}
        >
          {thread.comments.length === 0 ? <p>No visible comments in this thread.</p> : <>
            {first?.diffHunk ? <pre className="demo-live-pr-conversation__diff-hunk">{first.diffHunk}</pre> : null}
            {thread.comments.map((comment) => <article className="demo-live-pr-conversation__entry" key={comment.id}>
              <header><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time></header>
              <p>{comment.body || "(empty comment)"}</p>
            </article>)}
            {thread.hasMoreComments ? <p>More replies are available on GitHub.</p> : null}
          </>}
        </PullRequestReviewThread>;
      })}
    </section>
    {hasTruncatedData ? <p role="note" className="demo-live-pr-conversation__truncated">
      This view is bounded to the first 50 comments, 50 reviews, 25 threads, and 5 replies per thread. Open GitHub for the complete history: <a href={prUrl} target="_blank" rel="noreferrer">PR #{conversation.number}</a>.
    </p> : null}
  </section>;
}
