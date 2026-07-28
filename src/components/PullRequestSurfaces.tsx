import {
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type PullRequestState =
  | "closed"
  | "draft"
  | "merged"
  | "open";

export type PullRequestCheckStatus =
  | "cancelled"
  | "failed"
  | "passed"
  | "queued"
  | "running"
  | "skipped";

export type PullRequestReviewStatus =
  | "approved"
  | "changes-requested"
  | "commented"
  | "dismissed"
  | "pending";

const pullRequestStateLabels: Record<PullRequestState, string> = {
  closed: "Closed",
  draft: "Draft",
  merged: "Merged",
  open: "Open",
};

const pullRequestCheckLabels: Record<PullRequestCheckStatus, string> = {
  cancelled: "Cancelled",
  failed: "Failed",
  passed: "Passed",
  queued: "Queued",
  running: "Running",
  skipped: "Skipped",
};

const pullRequestReviewLabels: Record<PullRequestReviewStatus, string> = {
  approved: "Approved",
  "changes-requested": "Changes requested",
  commented: "Commented",
  dismissed: "Dismissed",
  pending: "Pending",
};

export interface PullRequestStatusBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  label?: ReactNode;
  state: PullRequestState;
}

export function PullRequestStatusBadge({
  className,
  label,
  state,
  ...props
}: PullRequestStatusBadgeProps) {
  return (
    <span
      {...props}
      className={["codex-ui-pull-request-status", className]
        .filter(Boolean)
        .join(" ")}
      data-state={state}
    >
      {label ?? pullRequestStateLabels[state]}
    </span>
  );
}

export interface PullRequestListItem {
  author?: ReactNode;
  checkStatus?: PullRequestCheckStatus;
  commentCount?: number;
  id: string;
  indicator?: ReactNode;
  number: number | string;
  openLabel?: string;
  repository?: ReactNode;
  state?: PullRequestState;
  title: ReactNode;
  updatedAt?: ReactNode;
}

export interface PullRequestListProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect"> {
  emptyLabel?: ReactNode;
  items: readonly PullRequestListItem[];
  label?: string;
  onSelect?: (pullRequestId: string) => void;
  selectedId?: string;
  toolbar?: ReactNode;
}

export function PullRequestList({
  className,
  emptyLabel = "No pull requests",
  items,
  label = "Pull requests",
  onSelect,
  selectedId,
  toolbar,
  ...props
}: PullRequestListProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={["codex-ui-pull-request-list", className]
        .filter(Boolean)
        .join(" ")}
    >
      {toolbar ? (
        <div className="codex-ui-pull-request-list__toolbar">
          {toolbar}
        </div>
      ) : null}
      {items.length > 0 ? (
        <ol className="codex-ui-pull-request-list__items">
          {items.map((item) => {
            const selected = item.id === selectedId;
            const state = item.state ?? "open";
            const accessibleLabel =
              item.openLabel ??
              (typeof item.title === "string"
                ? `Open pull request ${item.number}: ${item.title}`
                : `Open pull request ${item.number}`);
            return (
              <li key={item.id}>
                <button
                  aria-current={selected ? "page" : undefined}
                  aria-label={accessibleLabel}
                  className="codex-ui-pull-request-list__item"
                  data-has-indicator={item.indicator ? true : undefined}
                  data-selected={selected || undefined}
                  onClick={() => onSelect?.(item.id)}
                  type="button"
                >
                  {item.indicator ? (
                    <span
                      aria-hidden="true"
                      className="codex-ui-pull-request-list__indicator"
                    >
                      {item.indicator}
                    </span>
                  ) : null}
                  <span className="codex-ui-pull-request-list__item-topline">
                    <span className="codex-ui-pull-request-list__repository">
                      {item.repository}
                    </span>
                    <PullRequestStatusBadge state={state} />
                  </span>
                  <span className="codex-ui-pull-request-list__title">
                    {item.title}
                  </span>
                  <span className="codex-ui-pull-request-list__meta">
                    <span>#{item.number}</span>
                    {item.author ? <span>{item.author}</span> : null}
                    {item.updatedAt ? <span>{item.updatedAt}</span> : null}
                    {item.checkStatus ? (
                      <span data-check-status={item.checkStatus}>
                        {pullRequestCheckLabels[item.checkStatus]}
                      </span>
                    ) : null}
                    {item.commentCount !== undefined ? (
                      <span>{item.commentCount} comments</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="codex-ui-pull-request-list__empty">
          {emptyLabel}
        </p>
      )}
    </nav>
  );
}

export interface PullRequestPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children?: ReactNode;
  detailLabel?: string;
  emptyDetail?: ReactNode;
  label?: string;
  list: ReactNode;
  toolbar?: ReactNode;
}

export function PullRequestPage({
  children,
  className,
  detailLabel = "Pull request details",
  emptyDetail = "Select a pull request",
  label = "Pull request workspace",
  list,
  toolbar,
  ...props
}: PullRequestPageProps) {
  return (
    <section
      {...props}
      aria-label={label}
      className={["codex-ui-pull-request-page", className]
        .filter(Boolean)
        .join(" ")}
    >
      {toolbar ? (
        <header className="codex-ui-pull-request-page__toolbar">
          {toolbar}
        </header>
      ) : null}
      <div className="codex-ui-pull-request-page__body">
        <aside className="codex-ui-pull-request-page__list">
          {list}
        </aside>
        <div
          aria-label={detailLabel}
          className="codex-ui-pull-request-page__detail"
          role="region"
        >
          {children ?? (
            <p className="codex-ui-pull-request-page__empty">
              {emptyDetail}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export interface PullRequestDetailsProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
  > {
  actions?: ReactNode;
  additions?: number;
  author?: ReactNode;
  children?: ReactNode;
  deletions?: number;
  filesChanged?: number;
  headingLevel?: "h1" | "h2" | "h3";
  navigation?: ReactNode;
  number: number | string;
  repository?: ReactNode;
  sourceBranch?: ReactNode;
  state?: PullRequestState;
  targetBranch?: ReactNode;
  title: ReactNode;
  updatedAt?: ReactNode;
}

export function PullRequestDetails({
  actions,
  additions,
  author,
  children,
  className,
  deletions,
  filesChanged,
  headingLevel = "h2",
  navigation,
  number,
  repository,
  sourceBranch,
  state = "open",
  targetBranch,
  title,
  updatedAt,
  ...props
}: PullRequestDetailsProps) {
  const Heading = headingLevel;
  const hasChangeSummary =
    additions !== undefined ||
    deletions !== undefined ||
    filesChanged !== undefined;

  return (
    <article
      {...props}
      className={["codex-ui-pull-request-details", className]
        .filter(Boolean)
        .join(" ")}
      data-state={state}
    >
      <header className="codex-ui-pull-request-details__header">
        <div className="codex-ui-pull-request-details__identity">
          <div className="codex-ui-pull-request-details__eyebrow">
            {repository ? <span>{repository}</span> : null}
            <span>#{number}</span>
            <PullRequestStatusBadge state={state} />
          </div>
          <Heading className="codex-ui-pull-request-details__title">
            {title}
          </Heading>
          <div className="codex-ui-pull-request-details__meta">
            {author ? <span>{author}</span> : null}
            {sourceBranch || targetBranch ? (
              <span>
                {sourceBranch ?? "head"} → {targetBranch ?? "base"}
              </span>
            ) : null}
            {updatedAt ? <span>{updatedAt}</span> : null}
          </div>
        </div>
        {actions ? (
          <div className="codex-ui-pull-request-details__actions">
            {actions}
          </div>
        ) : null}
      </header>
      {hasChangeSummary ? (
        <div
          aria-label="Change summary"
          className="codex-ui-pull-request-details__changes"
          role="group"
        >
          {filesChanged !== undefined ? (
            <span>{filesChanged} files</span>
          ) : null}
          {additions !== undefined ? (
            <span data-tone="addition">+{additions}</span>
          ) : null}
          {deletions !== undefined ? (
            <span data-tone="deletion">−{deletions}</span>
          ) : null}
        </div>
      ) : null}
      {navigation ? (
        <nav
          aria-label="Pull request sections"
          className="codex-ui-pull-request-details__navigation"
        >
          {navigation}
        </nav>
      ) : null}
      {children ? (
        <div className="codex-ui-pull-request-details__content">
          {children}
        </div>
      ) : null}
    </article>
  );
}

export interface PullRequestPanelFact {
  id: string;
  indicator?: ReactNode;
  label: ReactNode;
  tone?: "danger" | "muted" | "success" | "warning";
  value: ReactNode;
}

export interface PullRequestPanelSummaryProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  checks?: ReactNode;
  checksHeading?: ReactNode;
  commentComposer?: ReactNode;
  description?: ReactNode;
  descriptionAction?: ReactNode;
  descriptionHeading?: ReactNode;
  facts?: readonly PullRequestPanelFact[];
  meta?: ReactNode;
  title: ReactNode;
  titleAction?: ReactNode;
}

export function PullRequestPanelSummary({
  checks,
  checksHeading = "Checks",
  className,
  commentComposer,
  description,
  descriptionAction,
  descriptionHeading = "Description",
  facts = [],
  meta,
  title,
  titleAction,
  ...props
}: PullRequestPanelSummaryProps) {
  const descriptionHeadingId = useId();
  const checksHeadingId = useId();
  return (
    <article
      {...props}
      className={["codex-ui-pull-request-panel-summary", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="codex-ui-pull-request-panel-summary__identity">
        <div>
          <h1>{title}</h1>
          {meta ? (
            <div className="codex-ui-pull-request-panel-summary__meta">
              {meta}
            </div>
          ) : null}
        </div>
        {titleAction ? (
          <div className="codex-ui-pull-request-panel-summary__action">
            {titleAction}
          </div>
        ) : null}
      </header>
      {facts.length > 0 ? (
        <dl className="codex-ui-pull-request-panel-summary__facts">
          {facts.map((fact) => (
            <div data-tone={fact.tone} key={fact.id}>
              <dt>
                {fact.indicator ? (
                  <span
                    aria-hidden="true"
                    className="codex-ui-pull-request-panel-summary__indicator"
                  >
                    {fact.indicator}
                  </span>
                ) : null}
                {fact.label}
              </dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {description ? (
        <section
          aria-labelledby={descriptionHeadingId}
          className="codex-ui-pull-request-panel-summary__description"
        >
          <header>
            <h2 id={descriptionHeadingId}>{descriptionHeading}</h2>
            {descriptionAction}
          </header>
          <div>{description}</div>
        </section>
      ) : null}
      {checks ? (
        <section
          aria-labelledby={checksHeadingId}
          className="codex-ui-pull-request-panel-summary__checks"
        >
          <h2 id={checksHeadingId}>{checksHeading}</h2>
          {checks}
        </section>
      ) : null}
      {commentComposer ? (
        <div className="codex-ui-pull-request-panel-summary__comment">
          {commentComposer}
        </div>
      ) : null}
    </article>
  );
}

export interface PullRequestReviewer {
  avatar?: ReactNode;
  id: string;
  name: ReactNode;
  status: PullRequestReviewStatus;
  summary?: ReactNode;
}

export interface PullRequestReviewSummaryProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  emptyLabel?: ReactNode;
  heading?: ReactNode;
  reviewers: readonly PullRequestReviewer[];
}

export function PullRequestReviewSummary({
  className,
  emptyLabel = "No reviews yet",
  heading = "Reviews",
  reviewers,
  ...props
}: PullRequestReviewSummaryProps) {
  const headingId = useId();
  return (
    <section
      {...props}
      aria-labelledby={headingId}
      className={["codex-ui-pull-request-reviews", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 id={headingId}>{heading}</h3>
      {reviewers.length > 0 ? (
        <ul>
          {reviewers.map((reviewer) => (
            <li data-status={reviewer.status} key={reviewer.id}>
              <span
                aria-hidden="true"
                className="codex-ui-pull-request-reviews__avatar"
              >
                {reviewer.avatar ?? "●"}
              </span>
              <span className="codex-ui-pull-request-reviews__copy">
                <span>{reviewer.name}</span>
                {reviewer.summary ? (
                  <span>{reviewer.summary}</span>
                ) : null}
              </span>
              <span className="codex-ui-pull-request-reviews__status">
                {pullRequestReviewLabels[reviewer.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

export interface PullRequestCheck {
  description?: ReactNode;
  duration?: ReactNode;
  id: string;
  name: ReactNode;
  status: PullRequestCheckStatus;
}

export interface PullRequestCheckListProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  checks: readonly PullRequestCheck[];
  emptyLabel?: ReactNode;
  heading?: ReactNode;
}

export function PullRequestCheckList({
  checks,
  className,
  emptyLabel = "No checks",
  heading = "Checks",
  ...props
}: PullRequestCheckListProps) {
  const headingId = useId();
  return (
    <section
      {...props}
      aria-labelledby={headingId}
      className={["codex-ui-pull-request-checks", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 id={headingId}>{heading}</h3>
      {checks.length > 0 ? (
        <ul>
          {checks.map((check) => (
            <li data-status={check.status} key={check.id}>
              <span
                aria-hidden="true"
                className="codex-ui-pull-request-checks__indicator"
              />
              <span className="codex-ui-pull-request-checks__copy">
                <span>{check.name}</span>
                {check.description ? (
                  <span>{check.description}</span>
                ) : null}
              </span>
              <span className="codex-ui-pull-request-checks__status">
                {pullRequestCheckLabels[check.status]}
                {check.duration ? <> · {check.duration}</> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

export interface PullRequestReviewThreadProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children"
  > {
  actions?: ReactNode;
  author?: ReactNode;
  children: ReactNode;
  line?: number | string;
  outdated?: boolean;
  path: ReactNode;
  resolved?: boolean;
}

export function PullRequestReviewThread({
  actions,
  author,
  children,
  className,
  line,
  outdated = false,
  path,
  resolved = false,
  ...props
}: PullRequestReviewThreadProps) {
  return (
    <article
      {...props}
      className={["codex-ui-pull-request-review-thread", className]
        .filter(Boolean)
        .join(" ")}
      data-outdated={outdated || undefined}
      data-resolved={resolved || undefined}
    >
      <header>
        <code>
          {path}
          {line !== undefined ? <>:{line}</> : null}
        </code>
        <span>
          {outdated ? "Outdated" : resolved ? "Resolved" : "Open"}
        </span>
      </header>
      {author ? (
        <div className="codex-ui-pull-request-review-thread__author">
          {author}
        </div>
      ) : null}
      <div className="codex-ui-pull-request-review-thread__body">
        {children}
      </div>
      {actions ? (
        <footer>{actions}</footer>
      ) : null}
    </article>
  );
}
