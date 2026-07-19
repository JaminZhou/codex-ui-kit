import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Menu, MenuItem } from "./InteractivePrimitives";

export type SubagentStatus = "active" | "waiting" | "done";
export type SubagentActivityStatus =
  | "active"
  | "updated"
  | "interrupted"
  | "done";

export interface SubagentItem {
  additions?: number;
  dateTime?: string;
  deletions?: number;
  id: string;
  lastMessage?: ReactNode;
  model?: string;
  name?: string;
  presentation?: "grouped" | "row";
  role?: string;
  status: SubagentStatus;
  statusSummary?: ReactNode;
  timestamp?: ReactNode;
}

export interface SubagentActivityItem {
  activityStatus: SubagentActivityStatus;
  id: string;
  name?: string;
  status?: SubagentStatus;
  statusSummary?: ReactNode;
}

export interface SubagentAvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  active?: boolean;
  seed: string;
  size?: "tiny" | "small" | "medium";
}

function seedVariant(seed: string) {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return Math.abs(hash) % 10;
}

export function SubagentAvatar({
  active = false,
  className,
  seed,
  size = "small",
  ...props
}: SubagentAvatarProps) {
  const classes = ["codex-ui-subagent-avatar", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      data-active={active || undefined}
      data-size={size}
      data-variant={seedVariant(seed)}
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M8 2.25 9.5 6.5 13.75 8 9.5 9.5 8 13.75 6.5 9.5 2.25 8 6.5 6.5 8 2.25Z" />
        <circle cx="8" cy="8" r="1.35" />
      </svg>
    </span>
  );
}

function displayName(name?: string) {
  return name?.trim() || "Agent";
}

function activityLabel(item: SubagentActivityItem) {
  const name = displayName(item.name);
  switch (item.activityStatus) {
    case "active":
      return `${name} started working`;
    case "updated":
      return `${name} updated`;
    case "interrupted":
      return `${name} interrupted`;
    case "done":
      return `${name} finished`;
  }
}

function groupStatus(items: SubagentActivityItem[]) {
  const statuses = items.map((item) => item.activityStatus);
  if (statuses.includes("interrupted")) return "interrupted";
  if (statuses.includes("updated")) return "updated";
  if (statuses.length > 0 && statuses.every((status) => status === "done")) {
    return "finished";
  }
  return "started working";
}

export interface SubagentActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  item: SubagentActivityItem;
  onOpen?: (item: SubagentActivityItem) => void;
}

export function SubagentActivity({
  className,
  item,
  onOpen,
  ...props
}: SubagentActivityProps) {
  const summary = item.statusSummary ?? activityLabel(item);
  const content = (
    <>
      <SubagentAvatar seed={item.id} />
      <span className="codex-ui-subagent-activity__summary">{summary}</span>
    </>
  );

  return (
    <div
      className={["codex-ui-subagent-activity", className]
        .filter(Boolean)
        .join(" ")}
      data-status={item.activityStatus}
      {...props}
    >
      {onOpen ? (
        <button
          aria-label={`Open ${displayName(item.name)} subagent`}
          className="codex-ui-subagent-activity__row"
          onClick={() => onOpen(item)}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div className="codex-ui-subagent-activity__row">{content}</div>
      )}
    </div>
  );
}

export interface SubagentActivityGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  animateEntrance?: boolean;
  items: SubagentActivityItem[];
  maxVisible?: number;
  onOpen?: (item: SubagentActivityItem) => void;
  statusLabel?: ReactNode;
}

export function SubagentActivityGroup({
  animateEntrance = true,
  className,
  items,
  maxVisible = 3,
  onOpen,
  statusLabel,
  ...props
}: SubagentActivityGroupProps) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, maxVisible);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div
      className={["codex-ui-subagent-activity-group", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {visibleItems.map((item) => {
        const content = (
          <>
            <SubagentAvatar seed={item.id} />
            <span>{displayName(item.name)}</span>
          </>
        );
        const classes = "codex-ui-subagent-activity-group__chip";

        return onOpen ? (
          <button
            aria-label={`Open ${displayName(item.name)} subagent`}
            className={classes}
            data-animate-entrance={animateEntrance || undefined}
            key={item.id}
            onClick={() => onOpen(item)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <span
            className={classes}
            data-animate-entrance={animateEntrance || undefined}
            key={item.id}
          >
            {content}
          </span>
        );
      })}
      <span className="codex-ui-subagent-activity-group__status">
        {hiddenCount > 0
          ? `and ${hiddenCount} other ${hiddenCount === 1 ? "subagent" : "subagents"} `
          : null}
        {statusLabel ?? groupStatus(items)}
      </span>
    </div>
  );
}

function sortForSummary(items: SubagentItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftDone = left.item.status === "done" ? 1 : 0;
      const rightDone = right.item.status === "done" ? 1 : 0;
      return leftDone - rightDone || left.index - right.index;
    })
    .map(({ item }) => item);
}

function DiffStats({
  additions,
  deletions,
}: Pick<SubagentItem, "additions" | "deletions">) {
  const label = [
    additions !== undefined ? `${additions} additions` : null,
    deletions !== undefined ? `${deletions} deletions` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span className="codex-ui-subagent-summary__diff" aria-label={label}>
      {additions !== undefined ? (
        <span data-kind="addition">+{additions}</span>
      ) : null}
      {deletions !== undefined ? (
        <span data-kind="deletion">−{deletions}</span>
      ) : null}
    </span>
  );
}

function SummaryAvatarGroup({
  items,
  onOpenItem,
}: {
  items: SubagentItem[];
  onOpenItem?: (item: SubagentItem) => void;
}) {
  const overflowTrigger = useRef<HTMLButtonElement>(null);
  const visibleItems = items.slice(0, 4);
  const overflowItems = items.slice(4);

  return (
    <span
      aria-hidden={onOpenItem ? undefined : "true"}
      className="codex-ui-subagent-summary__avatars"
    >
      {visibleItems.map((item) => {
        const avatar = (
          <SubagentAvatar
            active={item.status !== "done"}
            aria-hidden="true"
            seed={item.id}
            size="tiny"
          />
        );

        return onOpenItem ? (
          <button
            aria-label={displayName(item.name)}
            className="codex-ui-subagent-summary__avatar-button"
            key={item.id}
            onClick={() => onOpenItem(item)}
            type="button"
          >
            {avatar}
          </button>
        ) : (
          <span className="codex-ui-subagent-summary__avatar" key={item.id}>
            {avatar}
          </span>
        );
      })}
      {onOpenItem && overflowItems.length > 0 ? (
        <span className="codex-ui-subagent-summary__overflow">
          <Menu
            align="start"
            side="bottom"
            trigger={
              <button
                aria-label={`Open ${overflowItems.length} more ${
                  overflowItems.length === 1 ? "subagent" : "subagents"
                }`}
                className="codex-ui-subagent-summary__overflow-toggle"
                ref={overflowTrigger}
                type="button"
              >
                +{overflowItems.length}
              </button>
            }
          >
            {overflowItems.map((item) => (
              <MenuItem
                className="codex-ui-subagent-summary__overflow-item"
                key={item.id}
                onSelect={() => {
                  onOpenItem(item);
                  if (typeof window !== "undefined") {
                    window.setTimeout(() => overflowTrigger.current?.focus());
                  }
                }}
                startIcon={
                  <SubagentAvatar
                    active={item.status !== "done"}
                    aria-hidden="true"
                    seed={item.id}
                    size="tiny"
                  />
                }
              >
                {displayName(item.name)}
              </MenuItem>
            ))}
          </Menu>
        </span>
      ) : null}
    </span>
  );
}

export interface SubagentSummaryProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  defaultOpen?: boolean;
  items: SubagentItem[];
  onOpenChange?: (open: boolean) => void;
  onOpenSubagent?: (item: SubagentItem) => void;
  onOpenSummary?: () => void;
  open?: boolean;
  title?: ReactNode;
}

export function SubagentSummary({
  className,
  defaultOpen,
  items,
  onOpenChange,
  onOpenSubagent,
  onOpenSummary,
  open,
  title = "Subagents",
  ...props
}: SubagentSummaryProps) {
  const grouped = sortForSummary(
    items.filter((item) => item.presentation === "grouped"),
  );
  const rows = items.filter((item) => item.presentation !== "grouped");
  const initialOpen =
    defaultOpen ??
    (grouped.length > 0 || items.some((item) => item.status !== "done"));
  const [internalOpen, setInternalOpen] = useState(initialOpen);
  const resolvedOpen = open ?? internalOpen;
  const contentId = useId();
  const previousInitialOpen = useRef(initialOpen);
  const working = grouped.filter((item) => item.status !== "done");
  const done = grouped.filter((item) => item.status === "done");
  const groupedStatusLabel = [
    working.length > 0 ? `${working.length} working` : null,
    done.length > 0 ? `${done.length} done` : null,
  ]
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    const becameAutoOpen = !previousInitialOpen.current && initialOpen;
    previousInitialOpen.current = initialOpen;
    if (open === undefined && becameAutoOpen) {
      setInternalOpen(true);
    }
  }, [initialOpen, open]);

  if (items.length === 0) return null;

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <section
      className={["codex-ui-subagent-summary", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={resolvedOpen || undefined}
      {...props}
    >
      <button
        aria-controls={contentId}
        aria-expanded={resolvedOpen}
        className="codex-ui-subagent-summary__heading"
        onClick={() => setOpen(!resolvedOpen)}
        type="button"
      >
        <span>{title}</span>
        {grouped.length === 0 ? (
          <span className="codex-ui-subagent-summary__count">{rows.length}</span>
        ) : null}
        <span aria-hidden="true" className="codex-ui-subagent-summary__chevron" />
      </button>

      {resolvedOpen ? (
        <div className="codex-ui-subagent-summary__content" id={contentId}>
          {grouped.length > 0 ? (() => {
            const content = (
              <>
                <SummaryAvatarGroup
                  items={grouped}
                  onOpenItem={onOpenSummary ? undefined : onOpenSubagent}
                />
                <span>
                  {working.length > 0
                    ? `${working.length} working`
                    : `${done.length} done`}
                </span>
                {working.length > 0 && done.length > 0 ? (
                  <span className="codex-ui-subagent-summary__meta">
                    {done.length} done
                  </span>
                ) : null}
              </>
            );
            const sharedProps = {
              className: "codex-ui-subagent-summary__group",
              "data-muted": working.length === 0 || undefined,
            };

            return onOpenSummary ? (
              <button
                {...sharedProps}
                aria-label={`Open subagents, ${groupedStatusLabel}`}
                onClick={onOpenSummary}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div {...sharedProps}>{content}</div>
            );
          })() : null}

          {rows.map((item) => {
            const tooltip = [item.role, item.model ? `Uses ${item.model}` : null]
              .filter(Boolean)
              .join("\n");
            const content = (
              <>
                <SubagentAvatar
                  active={item.status !== "done"}
                  seed={item.id}
                  size="tiny"
                />
                <span className="codex-ui-subagent-summary__label">
                  {displayName(item.name)}
                </span>
                {item.status === "active" ? (
                  <span className="codex-ui-subagent-summary__working">is working</span>
                ) : null}
                {item.additions !== undefined || item.deletions !== undefined ? (
                  <DiffStats
                    additions={item.additions}
                    deletions={item.deletions}
                  />
                ) : null}
              </>
            );
            const sharedProps = {
              className: "codex-ui-subagent-summary__row",
              title: tooltip || undefined,
            };
            return onOpenSubagent ? (
              <button
                {...sharedProps}
                key={item.id}
                onClick={() => onOpenSubagent(item)}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div {...sharedProps} key={item.id}>
                {content}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

interface SubagentPanelSectionProps {
  emptyState?: ReactNode;
  items: SubagentItem[];
  limit: number;
  onSelect?: (item: SubagentItem) => void;
  onVisibleCountChange: (count: number) => void;
  previewLines: 1 | 2;
  title: ReactNode;
  visibleCount: number;
}

function SubagentPanelSection({
  emptyState,
  items,
  limit,
  onSelect,
  onVisibleCountChange,
  previewLines,
  title,
  visibleCount,
}: SubagentPanelSectionProps) {
  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  if (items.length === 0 && emptyState === undefined) return null;

  return (
    <section className="codex-ui-subagent-panel__section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <div className="codex-ui-subagent-panel__empty">{emptyState}</div>
      ) : (
        <div className="codex-ui-subagent-panel__list">
          {visibleItems.map((item) => {
            const preview = item.lastMessage ?? item.statusSummary;
            const content = (
              <>
                <SubagentAvatar seed={item.id} size="medium" />
                <span className="codex-ui-subagent-panel__item-content">
                  <span className="codex-ui-subagent-panel__item-heading">
                    <span>{displayName(item.name)}</span>
                    {item.lastMessage != null && item.timestamp != null ? (
                      <time dateTime={item.dateTime}>{item.timestamp}</time>
                    ) : null}
                  </span>
                  {preview == null && item.status === "done" ? null : (
                    <span
                      className="codex-ui-subagent-panel__preview"
                      data-lines={previewLines}
                      data-placeholder={preview == null || undefined}
                    >
                      {preview ?? (item.status === "active" ? "Working" : "Thinking")}
                    </span>
                  )}
                </span>
              </>
            );
            return onSelect ? (
              <button
                className="codex-ui-subagent-panel__item"
                key={item.id}
                onClick={() => onSelect(item)}
                type="button"
              >
                {content}
              </button>
            ) : (
              <div className="codex-ui-subagent-panel__item" key={item.id}>
                {content}
              </div>
            );
          })}
        </div>
      )}
      {visibleCount < items.length ? (
        <button
          className="codex-ui-subagent-panel__pagination"
          onClick={() => onVisibleCountChange(visibleCount + limit)}
          type="button"
        >
          Show {Math.min(limit, items.length - visibleCount)} more
        </button>
      ) : null}
    </section>
  );
}

export interface SubagentPanelProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onSelect" | "title"
  > {
  activeLimit?: number;
  activeTitle?: ReactNode;
  doneLimit?: number;
  doneTitle?: ReactNode;
  emptyActiveState?: ReactNode;
  items: SubagentItem[];
  onSelect?: (item: SubagentItem) => void;
  onVisibleItemsChange?: (items: SubagentItem[]) => void;
}

export function SubagentPanel({
  activeLimit = 4,
  activeTitle = "Active",
  className,
  doneLimit = 10,
  doneTitle,
  emptyActiveState = "No active subagents",
  items,
  onSelect,
  onVisibleItemsChange,
  ...props
}: SubagentPanelProps) {
  const [activeVisibleCount, setActiveVisibleCount] = useState(activeLimit);
  const [doneVisibleCount, setDoneVisibleCount] = useState(doneLimit);
  const lastVisibleNotification = useRef<{
    callback: NonNullable<SubagentPanelProps["onVisibleItemsChange"]>;
    items: SubagentItem[];
  } | null>(null);
  const { active, done } = useMemo(() => {
    const sorted = sortForSummary(items);
    return {
      active: sorted.filter((item) => item.status !== "done"),
      done: sorted.filter((item) => item.status === "done"),
    };
  }, [items]);
  const activeKey = active.map((item) => item.id).join("\u0000");
  const doneKey = done.map((item) => item.id).join("\u0000");
  const visibleItems = useMemo(
    () => [
      ...active.slice(0, activeVisibleCount),
      ...done.slice(0, doneVisibleCount),
    ],
    [active, activeVisibleCount, done, doneVisibleCount],
  );
  useEffect(() => {
    setActiveVisibleCount((count) =>
      Math.max(activeLimit, Math.min(count, active.length)),
    );
  }, [active.length, activeKey, activeLimit]);

  useEffect(() => {
    setDoneVisibleCount((count) =>
      Math.max(doneLimit, Math.min(count, done.length)),
    );
  }, [done.length, doneKey, doneLimit]);

  useEffect(() => {
    if (!onVisibleItemsChange) {
      lastVisibleNotification.current = null;
      return;
    }
    const previous = lastVisibleNotification.current;
    if (
      previous?.callback === onVisibleItemsChange &&
      previous.items.length === visibleItems.length &&
      previous.items.every((item, index) => item === visibleItems[index])
    ) {
      return;
    }
    lastVisibleNotification.current = {
      callback: onVisibleItemsChange,
      items: visibleItems,
    };
    onVisibleItemsChange(visibleItems);
  }, [onVisibleItemsChange, visibleItems]);

  return (
    <div
      className={["codex-ui-subagent-panel", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <SubagentPanelSection
        emptyState={emptyActiveState}
        items={active}
        limit={activeLimit}
        onSelect={onSelect}
        onVisibleCountChange={setActiveVisibleCount}
        previewLines={2}
        title={activeTitle}
        visibleCount={activeVisibleCount}
      />
      <SubagentPanelSection
        items={done}
        limit={doneLimit}
        onSelect={onSelect}
        onVisibleCountChange={setDoneVisibleCount}
        previewLines={1}
        title={doneTitle ?? `Done · ${done.length}`}
        visibleCount={doneVisibleCount}
      />
    </div>
  );
}

export interface SubagentTranscriptHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  item: Pick<SubagentItem, "id" | "name">;
  onBack: () => void;
}

export function SubagentTranscriptHeader({
  className,
  item,
  onBack,
  ...props
}: SubagentTranscriptHeaderProps) {
  return (
    <div
      className={["codex-ui-subagent-transcript-header", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <button
        aria-label="Back to subagents"
        className="codex-ui-subagent-transcript-header__back"
        onClick={onBack}
        type="button"
      >
        <span aria-hidden="true" />
      </button>
      <SubagentAvatar seed={item.id} size="medium" />
      <span className="codex-ui-subagent-transcript-header__title">
        {displayName(item.name)}
      </span>
    </div>
  );
}
