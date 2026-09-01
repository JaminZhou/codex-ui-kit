import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import latticeAvatarSvg from "../assets/subagents/lattice.svg?raw";
import orbitAvatarSvg from "../assets/subagents/orbit.svg?raw";
import pinwheelAvatarSvg from "../assets/subagents/pinwheel.svg?raw";
import sproutAvatarSvg from "../assets/subagents/sprout.svg?raw";
import sunbeamAvatarSvg from "../assets/subagents/sunbeam.svg?raw";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

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
  sortTimestampMs?: number;
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

const observedAvatarGroups: readonly (readonly [
  readonly string[],
  string,
])[] = [
    [["alpha", "sprout"], sproutAvatarSvg],
    [["beta", "lattice"], latticeAvatarSvg],
    [["parent", "orbit"], orbitAvatarSvg],
    [["child", "pinwheel"], pinwheelAvatarSvg],
    [["long-probe", "sunbeam", "verifier"], sunbeamAvatarSvg],
];

const observedAvatarSources = new Map<string, string>(
  observedAvatarGroups.flatMap(([seeds, source]) =>
    seeds.map(
      (seed) =>
        [seed, `data:image/svg+xml,${encodeURIComponent(source)}`] as const,
    ),
  ),
);

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
  const observedSource = observedAvatarSources.get(seed.toLowerCase());

  return (
    <span
      className={classes}
      data-active={active || undefined}
      data-size={size}
      data-variant={seedVariant(seed)}
      {...props}
    >
      {observedSource ? (
        <img alt="" aria-hidden="true" draggable={false} src={observedSource} />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <g className="codex-ui-subagent-avatar__petals">
            <circle cx="8" cy="3.1" r="2.15" />
            <circle cx="11.46" cy="4.54" r="2.15" />
            <circle cx="12.9" cy="8" r="2.15" />
            <circle cx="11.46" cy="11.46" r="2.15" />
            <circle cx="8" cy="12.9" r="2.15" />
            <circle cx="4.54" cy="11.46" r="2.15" />
            <circle cx="3.1" cy="8" r="2.15" />
            <circle cx="4.54" cy="4.54" r="2.15" />
          </g>
          <circle className="codex-ui-subagent-avatar__center" cx="8" cy="8" r="2.15" />
        </svg>
      )}
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
      data-testid="subagent-activity-inline-group"
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
      const leftTime =
        left.item.sortTimestampMs ??
        (left.item.dateTime ? Date.parse(left.item.dateTime) : Number.NaN);
      const rightTime =
        right.item.sortTimestampMs ??
        (right.item.dateTime ? Date.parse(right.item.dateTime) : Number.NaN);
      const chronologicalOrder =
        Number.isFinite(leftTime) && Number.isFinite(rightTime)
          ? rightTime - leftTime
          : 0;
      return (
        leftDone - rightDone || chronologicalOrder || left.index - right.index
      );
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
    <span
      aria-label={label}
      className="codex-ui-subagent-summary__diff"
      role="img"
    >
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
  showPreviews: boolean;
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
  showPreviews,
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
                    {item.timestamp != null ? (
                      <time dateTime={item.dateTime}>{item.timestamp}</time>
                    ) : null}
                  </span>
                  {!showPreviews ||
                  (preview == null && item.status === "done") ? null : (
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
  showPreviews?: boolean;
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
  showPreviews = true,
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
        showPreviews={showPreviews}
        title={activeTitle}
        visibleCount={activeVisibleCount}
      />
      <SubagentPanelSection
        items={done}
        limit={doneLimit}
        onSelect={onSelect}
        onVisibleCountChange={setDoneVisibleCount}
        previewLines={1}
        showPreviews={showPreviews}
        title={doneTitle ?? `Done · ${done.length}`}
        visibleCount={doneVisibleCount}
      />
    </div>
  );
}

export function SubagentPanelIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path d="M10 12.668C11.7333 12.668 13.331 13.1693 14.5117 14.0127C15.691 14.8551 16.4989 16.0791 16.499 17.5C16.4988 17.8669 16.2009 18.1647 15.834 18.165C15.4668 18.165 15.1691 17.8671 15.1689 17.5C15.1688 16.62 14.6699 15.7602 13.7383 15.0947C12.8078 14.4302 11.488 13.9981 10 13.998C8.51211 13.9981 7.19214 14.4303 6.26172 15.0947C5.33026 15.7602 4.83215 16.6201 4.83203 17.5C4.83186 17.867 4.53404 18.1649 4.16699 18.165C3.79983 18.165 3.50213 17.8671 3.50195 17.5C3.50207 16.0791 4.3099 14.8551 5.48926 14.0127C6.66991 13.1695 8.26685 12.668 10 12.668Z" fill="currentColor" />
      <path d="M7.91699 5C8.60724 5.00013 9.16699 5.55973 9.16699 6.25C9.16699 6.94027 8.60724 7.49987 7.91699 7.5C7.22664 7.5 6.66699 6.94036 6.66699 6.25C6.66699 5.55964 7.22664 5 7.91699 5Z" fill="currentColor" />
      <path d="M12.083 5C12.7734 5 13.333 5.55964 13.333 6.25C13.333 6.94036 12.7734 7.5 12.083 7.5C11.3928 7.49987 10.833 6.94027 10.833 6.25C10.833 5.55973 11.3928 5.00013 12.083 5Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M10 1.00195C10.3673 1.00195 10.665 1.29972 10.665 1.66699V2.25195H13.1113C13.554 2.25195 13.9248 2.25137 14.2275 2.27539C14.5377 2.30004 14.8331 2.35361 15.1143 2.49219C15.5745 2.71921 15.9478 3.09243 16.1748 3.55273C16.3133 3.83385 16.367 4.12942 16.3916 4.43945C16.4156 4.74209 16.415 5.11318 16.415 5.55566C16.415 6.45208 16.4157 7.16418 16.3701 7.7373C16.324 8.31755 16.2274 8.81322 16.0029 9.26855C15.6137 10.0577 14.9746 10.6967 14.1855 11.0859C13.73 11.3105 13.2339 11.407 12.6533 11.4531C12.0802 11.4987 11.369 11.499 10.4727 11.499H9.52734C8.631 11.499 7.91978 11.4987 7.34668 11.4531C6.76612 11.407 6.26997 11.3105 5.81445 11.0859C5.02538 10.6967 4.38629 10.0577 3.99707 9.26855C3.77258 8.81322 3.67603 8.31755 3.62988 7.7373C3.58434 7.16418 3.58496 6.45208 3.58496 5.55566C3.58496 5.11318 3.5844 4.74209 3.6084 4.43945C3.63303 4.12942 3.6867 3.83385 3.8252 3.55273C4.05219 3.09243 4.42545 2.71921 4.88574 2.49219C5.16693 2.35361 5.46234 2.30004 5.77246 2.27539C6.07515 2.25137 6.44604 2.25195 6.88867 2.25195H9.33496V1.66699C9.33496 1.29972 9.63273 1.00195 10 1.00195ZM6.88867 3.58203C6.42452 3.58203 6.11484 3.58266 5.87695 3.60156C5.64679 3.61988 5.54082 3.65242 5.47363 3.68555C5.27602 3.78307 5.11605 3.94299 5.01855 4.14062C4.98547 4.20782 4.95287 4.31406 4.93457 4.54395C4.91569 4.78179 4.91504 5.09172 4.91504 5.55566C4.91504 6.47338 4.91567 7.1236 4.95605 7.63184C4.99587 8.13234 5.07138 8.43926 5.19043 8.68066C5.45025 9.20725 5.87667 9.63384 6.40332 9.89355C6.64477 10.0126 6.9515 10.0881 7.45215 10.1279C7.96034 10.1683 8.60976 10.1689 9.52734 10.1689H10.4727C11.3902 10.1689 12.0397 10.1683 12.5479 10.1279C13.0485 10.0881 13.3552 10.0126 13.5967 9.89355C14.1233 9.63384 14.5498 9.20725 14.8096 8.68066C14.9286 8.43926 15.0041 8.13234 15.0439 7.63184C15.0843 7.1236 15.085 6.47338 15.085 5.55566C15.085 5.09172 15.0843 4.78179 15.0654 4.54395C15.0471 4.31406 15.0145 4.20782 14.9814 4.14062C14.884 3.94299 14.724 3.78307 14.5264 3.68555C14.4592 3.65242 14.3532 3.61988 14.123 3.60156C13.8852 3.58266 13.5755 3.58203 13.1113 3.58203H6.88867Z" fill="currentColor" />
    </svg>
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
