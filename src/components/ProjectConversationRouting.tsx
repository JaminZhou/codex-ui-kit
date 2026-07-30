import {
  Fragment,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Dialog } from "./Dialog.js";

export type ProjectConversationPageStatus =
  | "error"
  | "loading"
  | "ready";

export interface ProjectConversationPageProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
  > {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  label?: string;
  projects: ReactNode;
  projectsLabel?: string;
  setupLabel?: string;
  status?: ProjectConversationPageStatus;
  title?: ReactNode;
}

export function ProjectConversationPage({
  actions,
  children,
  className,
  description,
  footer,
  label = "Project conversation routing",
  projects,
  projectsLabel = "Projects",
  setupLabel = "Conversation setup",
  status = "ready",
  title = "Start a conversation",
  ...props
}: ProjectConversationPageProps) {
  return (
    <section
      {...props}
      aria-busy={status === "loading" || undefined}
      aria-label={label}
      className={[
        "codex-ui-project-conversation-page",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <header className="codex-ui-project-conversation-page__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? (
          <div className="codex-ui-project-conversation-page__actions">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="codex-ui-project-conversation-page__body">
        <aside
          aria-label={projectsLabel}
          className="codex-ui-project-conversation-page__projects"
        >
          {projects}
        </aside>
        <section
          aria-label={setupLabel}
          className="codex-ui-project-conversation-page__setup"
        >
          {children}
        </section>
      </div>
      {footer ? (
        <footer className="codex-ui-project-conversation-page__footer">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export type ProjectIndexItemStatus =
  | "available"
  | "error"
  | "loading"
  | "unavailable";

export interface ProjectIndexItem {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  meta?: ReactNode;
  path?: ReactNode;
  status?: ProjectIndexItemStatus;
  statusLabel?: ReactNode;
  textValue?: string;
}

export interface ProjectIndexProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "onSelect" | "title"
  > {
  actions?: ReactNode;
  description?: ReactNode;
  emptyState?: ReactNode;
  items: readonly ProjectIndexItem[];
  label?: string;
  onSelect: (projectId: string) => void;
  selectedId?: string;
  title?: ReactNode;
  toolbar?: ReactNode;
}

function projectIndexItemDisabled(item: ProjectIndexItem) {
  return (
    item.disabled ||
    item.status === "loading" ||
    item.status === "unavailable"
  );
}

function itemTextValue(
  item: Pick<ProjectIndexItem, "id" | "label" | "textValue">,
) {
  if (item.textValue) return item.textValue;
  return typeof item.label === "string" ? item.label : item.id;
}

export function ProjectIndex({
  actions,
  className,
  description,
  emptyState = "No projects",
  items,
  label = "Project index",
  onSelect,
  selectedId,
  title = "Projects",
  toolbar,
  ...props
}: ProjectIndexProps) {
  const projectIndexId = useId();

  return (
    <nav
      {...props}
      aria-label={label}
      className={["codex-ui-project-index", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="codex-ui-project-index__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? (
          <div className="codex-ui-project-index__actions">
            {actions}
          </div>
        ) : null}
      </header>
      {toolbar ? (
        <div className="codex-ui-project-index__toolbar">
          {toolbar}
        </div>
      ) : null}
      {items.length > 0 ? (
        <ul className="codex-ui-project-index__items">
          {items.map((item, index) => {
            const selected = item.id === selectedId;
            const disabled = projectIndexItemDisabled(item);
            const descriptionId = item.description
              ? `${projectIndexId}-description-${index}`
              : undefined;
            const pathId = item.path
              ? `${projectIndexId}-path-${index}`
              : undefined;
            const trailingId =
              item.meta || item.statusLabel
                ? `${projectIndexId}-trailing-${index}`
                : undefined;
            const describedBy = [
              descriptionId,
              pathId,
              trailingId,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li data-status={item.status} key={item.id}>
                <button
                  aria-current={selected ? "page" : undefined}
                  aria-describedby={describedBy || undefined}
                  aria-label={`Open project ${itemTextValue(item)}`}
                  className="codex-ui-project-index__item"
                  data-selected={selected || undefined}
                  disabled={disabled}
                  onClick={() => onSelect(item.id)}
                  type="button"
                >
                  {item.icon ? (
                    <span
                      aria-hidden="true"
                      className="codex-ui-project-index__icon"
                    >
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="codex-ui-project-index__copy">
                    <span className="codex-ui-project-index__label">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span
                        className="codex-ui-project-index__description"
                        id={descriptionId}
                      >
                        {item.description}
                      </span>
                    ) : null}
                    {item.path ? (
                      <code
                        className="codex-ui-project-index__path"
                        id={pathId}
                      >
                        {item.path}
                      </code>
                    ) : null}
                  </span>
                  {item.meta || item.statusLabel ? (
                    <span
                      className="codex-ui-project-index__trailing"
                      id={trailingId}
                    >
                      {item.meta ? <span>{item.meta}</span> : null}
                      {item.statusLabel ? (
                        <span
                          className="codex-ui-project-index__status"
                          data-status={item.status}
                        >
                          {item.statusLabel}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="codex-ui-project-index__empty">{emptyState}</p>
      )}
    </nav>
  );
}

export type ConversationRouteStatus =
  | "available"
  | "loading"
  | "unavailable";

export interface ConversationRouteOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  status?: ConversationRouteStatus;
  statusLabel?: ReactNode;
}

export interface ConversationRouteSelectorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  description?: ReactNode;
  disabled?: boolean;
  label?: string;
  onValueChange: (routeId: string) => void;
  options: readonly ConversationRouteOption[];
  value?: string;
}

function conversationRouteDisabled(
  option: ConversationRouteOption,
  groupDisabled: boolean,
) {
  return (
    groupDisabled ||
    option.disabled ||
    option.status === "loading" ||
    option.status === "unavailable"
  );
}

function moveRouteSelection(
  event: KeyboardEvent<HTMLButtonElement>,
) {
  if (
    ![
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "End",
      "Home",
    ].includes(event.key)
  ) {
    return;
  }
  const group = event.currentTarget.parentElement;
  const enabled = [
    ...(group?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]:not(:disabled)',
    ) ?? []),
  ];
  if (enabled.length === 0) return;
  const currentIndex = enabled.indexOf(event.currentTarget);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? enabled.length - 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (currentIndex - 1 + enabled.length) % enabled.length
          : (currentIndex + 1) % enabled.length;
  event.preventDefault();
  enabled[nextIndex]?.focus();
  enabled[nextIndex]?.click();
}

export function ConversationRouteSelector({
  className,
  description,
  disabled = false,
  label = "Conversation route",
  onValueChange,
  options,
  value,
  ...props
}: ConversationRouteSelectorProps) {
  const routeSelectorId = useId();
  const descriptionId = description
    ? `${routeSelectorId}-description`
    : undefined;
  const selectedIndex = options.findIndex(
    (option) =>
      option.id === value &&
      !conversationRouteDisabled(option, disabled),
  );
  const fallbackIndex = options.findIndex(
    (option) => !conversationRouteDisabled(option, disabled),
  );
  const tabbableIndex =
    selectedIndex >= 0 ? selectedIndex : fallbackIndex;

  return (
    <div
      {...props}
      className={[
        "codex-ui-conversation-route-selector",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="codex-ui-conversation-route-selector__header">
        <span>{label}</span>
        {description ? <p id={descriptionId}>{description}</p> : null}
      </div>
      <div
        aria-describedby={descriptionId}
        aria-label={label}
        className="codex-ui-conversation-route-selector__options"
        role="radiogroup"
      >
        {options.map((option, index) => {
          const selected = option.id === value;
          const optionDisabled = conversationRouteDisabled(
            option,
            disabled,
          );
          return (
            <button
              aria-checked={selected}
              className="codex-ui-conversation-route-selector__option"
              data-route-id={option.id}
              data-selected={selected || undefined}
              data-status={option.status}
              disabled={optionDisabled}
              key={option.id}
              onClick={() => onValueChange(option.id)}
              onKeyDown={moveRouteSelection}
              role="radio"
              tabIndex={index === tabbableIndex ? 0 : -1}
              type="button"
            >
              {option.icon ? (
                <span
                  aria-hidden="true"
                  className="codex-ui-conversation-route-selector__icon"
                >
                  {option.icon}
                </span>
              ) : null}
              <span className="codex-ui-conversation-route-selector__copy">
                <span className="codex-ui-conversation-route-selector__label">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="codex-ui-conversation-route-selector__description">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {option.statusLabel ? (
                <span className="codex-ui-conversation-route-selector__status">
                  {option.statusLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type WorktreeListItemStatus =
  | "available"
  | "creating"
  | "error"
  | "repairing"
  | "unavailable";

export interface WorktreeListItem {
  actions?: ReactNode;
  branch?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  meta?: ReactNode;
  path?: ReactNode;
  status?: WorktreeListItemStatus;
  statusLabel?: ReactNode;
  textValue?: string;
}

export interface WorktreeListProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "onSelect" | "title"
  > {
  actions?: ReactNode;
  description?: ReactNode;
  emptyState?: ReactNode;
  items: readonly WorktreeListItem[];
  label?: string;
  onSelect: (worktreeId: string) => void;
  selectedId?: string;
  title?: ReactNode;
}

function worktreeListItemDisabled(item: WorktreeListItem) {
  return (
    item.disabled ||
    item.status === "creating" ||
    item.status === "repairing" ||
    item.status === "unavailable"
  );
}

export function WorktreeList({
  actions,
  className,
  description,
  emptyState = "No worktrees",
  items,
  label = "Worktrees",
  onSelect,
  selectedId,
  title = "Worktrees",
  ...props
}: WorktreeListProps) {
  const worktreeListId = useId();

  return (
    <section
      {...props}
      aria-label={label}
      className={["codex-ui-worktree-list", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="codex-ui-worktree-list__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? (
          <div className="codex-ui-worktree-list__actions">
            {actions}
          </div>
        ) : null}
      </header>
      {items.length > 0 ? (
        <ul className="codex-ui-worktree-list__items">
          {items.map((item, index) => {
            const selected = item.id === selectedId;
            const disabled = worktreeListItemDisabled(item);
            const accessibleName =
              item.textValue ??
              (typeof item.label === "string"
                ? item.label
                : item.id);
            const branchId = item.branch
              ? `${worktreeListId}-branch-${index}`
              : undefined;
            const descriptionId = item.description
              ? `${worktreeListId}-description-${index}`
              : undefined;
            const pathId = item.path
              ? `${worktreeListId}-path-${index}`
              : undefined;
            const trailingId =
              item.meta || item.statusLabel
                ? `${worktreeListId}-trailing-${index}`
                : undefined;
            const describedBy = [
              branchId,
              descriptionId,
              pathId,
              trailingId,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li data-status={item.status} key={item.id}>
                <div className="codex-ui-worktree-list__row">
                  <button
                    aria-current={selected ? "location" : undefined}
                    aria-describedby={describedBy || undefined}
                    aria-label={`Open worktree ${accessibleName}`}
                    className="codex-ui-worktree-list__item"
                    data-selected={selected || undefined}
                    disabled={disabled}
                    onClick={() => onSelect(item.id)}
                    type="button"
                  >
                    {item.icon ? (
                      <span
                        aria-hidden="true"
                        className="codex-ui-worktree-list__icon"
                      >
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="codex-ui-worktree-list__copy">
                      <span className="codex-ui-worktree-list__identity">
                        <span>{item.label}</span>
                        {item.branch ? (
                          <code id={branchId}>{item.branch}</code>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span
                          className="codex-ui-worktree-list__description"
                          id={descriptionId}
                        >
                          {item.description}
                        </span>
                      ) : null}
                      {item.path ? (
                        <code
                          className="codex-ui-worktree-list__path"
                          id={pathId}
                        >
                          {item.path}
                        </code>
                      ) : null}
                    </span>
                    {item.meta || item.statusLabel ? (
                      <span
                        className="codex-ui-worktree-list__trailing"
                        id={trailingId}
                      >
                        {item.meta ? <span>{item.meta}</span> : null}
                        {item.statusLabel ? (
                          <span
                            className="codex-ui-worktree-list__status"
                            data-status={item.status}
                          >
                            {item.statusLabel}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                  {item.actions ? (
                    <div className="codex-ui-worktree-list__item-actions">
                      {item.actions}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="codex-ui-worktree-list__empty">{emptyState}</p>
      )}
    </section>
  );
}

export type NewConversationStartStatus =
  | "error"
  | "idle"
  | "loading"
  | "ready";

export interface NewConversationStartProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
  > {
  composer: ReactNode;
  context: ReactNode;
  description?: ReactNode;
  destination: ReactNode;
  eyebrow?: ReactNode;
  label?: string;
  prompt?: ReactNode;
  status?: NewConversationStartStatus;
}

export function NewConversationStart({
  className,
  composer,
  context,
  description,
  destination,
  eyebrow = "New conversation",
  label = "New conversation setup",
  prompt,
  status = "ready",
  ...props
}: NewConversationStartProps) {
  return (
    <section
      {...props}
      aria-busy={status === "loading" || undefined}
      aria-label={label}
      className={["codex-ui-new-conversation-start", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <div className="codex-ui-new-conversation-start__layout">
        <header className="codex-ui-new-conversation-start__header">
          {eyebrow ? (
            <span className="codex-ui-new-conversation-start__eyebrow">
              {eyebrow}
            </span>
          ) : null}
          <h3>{destination}</h3>
          {description ? <p>{description}</p> : null}
        </header>
        {prompt ? (
          <div className="codex-ui-new-conversation-start__prompt">
            {prompt}
          </div>
        ) : null}
        {context ? (
          <div className="codex-ui-new-conversation-start__context">
            {context}
          </div>
        ) : null}
        <div className="codex-ui-new-conversation-start__composer">
          {composer}
        </div>
      </div>
    </section>
  );
}

export type ConversationContextItemKind =
  | "environment"
  | "project"
  | "worktree";

export type ConversationContextItemStatus =
  | "available"
  | "loading"
  | "repairing"
  | "unavailable";

export interface ConversationContextItem {
  controlsId?: string;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  kind: ConversationContextItemKind;
  label: ReactNode;
  popupRole?: "dialog" | "listbox" | "menu";
  status?: ConversationContextItemStatus;
  statusLabel?: ReactNode;
  textValue?: string;
  triggerId?: string;
}

export interface ConversationContextBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  disabled?: boolean;
  expandedId?: string;
  items: readonly ConversationContextItem[];
  label?: string;
  onSelect: (itemId: string) => void;
  renderItem?: (
    item: ConversationContextItem,
    trigger: ReactElement<any>,
  ) => ReactNode;
}

function conversationContextItemDisabled(
  item: ConversationContextItem,
  groupDisabled: boolean,
) {
  return (
    groupDisabled ||
    item.disabled ||
    item.status === "loading" ||
    item.status === "repairing" ||
    item.status === "unavailable"
  );
}

export function ConversationContextBar({
  className,
  disabled = false,
  expandedId,
  items,
  label = "Conversation context",
  onSelect,
  renderItem,
  ...props
}: ConversationContextBarProps) {
  const contextBarId = useId();

  return (
    <div
      {...props}
      aria-label={label}
      className={["codex-ui-conversation-context-bar", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
    >
      {items.map((item, index) => {
        const itemDisabled = conversationContextItemDisabled(
          item,
          disabled,
        );
        const accessibleValue =
          item.textValue ??
          (typeof item.label === "string" ? item.label : item.id);
        const statusId = item.statusLabel
          ? `${contextBarId}-status-${index}`
          : undefined;
        const trigger = (
          <button
            aria-controls={
              expandedId === item.id ? item.controlsId : undefined
            }
            aria-describedby={statusId}
            aria-expanded={
              item.controlsId
                ? expandedId === item.id
                : undefined
            }
            aria-haspopup={
              item.controlsId
                ? (item.popupRole ?? "dialog")
                : undefined
            }
            aria-label={`Change ${item.kind}: ${accessibleValue}`}
            className="codex-ui-conversation-context-bar__item"
            data-expanded={expandedId === item.id || undefined}
            data-kind={item.kind}
            data-status={item.status}
            disabled={itemDisabled}
            id={item.triggerId}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.icon ? (
              <span
                aria-hidden="true"
                className="codex-ui-conversation-context-bar__icon"
              >
                {item.icon}
              </span>
            ) : null}
            <span className="codex-ui-conversation-context-bar__label">
              {item.label}
            </span>
            {item.statusLabel ? (
              <span
                className="codex-ui-conversation-context-bar__status"
                data-status={item.status}
                id={statusId}
              >
                {item.statusLabel}
              </span>
            ) : null}
          </button>
        );
        return (
          <Fragment key={item.id}>
            {renderItem ? renderItem(item, trigger) : trigger}
          </Fragment>
        );
      })}
    </div>
  );
}

export interface ConversationProjectListboxProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onSelect"
  > {
  initialFocus?: "first" | "none" | "selected";
  items: readonly ProjectIndexItem[];
  label?: string;
  onDismiss?: () => void;
  onSelect: (projectId: string) => void;
  selectedId?: string;
  triggerId?: string;
}

function projectListboxOptions(listbox: HTMLElement) {
  return [
    ...listbox.querySelectorAll<HTMLButtonElement>(
      '[role="option"]:not(:disabled)',
    ),
  ];
}

function moveProjectListboxFocus(
  event: KeyboardEvent<HTMLButtonElement>,
) {
  if (
    ![
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "End",
      "Home",
    ].includes(event.key)
  ) {
    return undefined;
  }
  const listbox = event.currentTarget.closest<HTMLElement>(
    '[role="listbox"]',
  );
  if (!listbox) return undefined;
  const enabled = projectListboxOptions(listbox);
  if (enabled.length === 0) return undefined;
  const currentIndex = enabled.indexOf(event.currentTarget);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? enabled.length - 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (currentIndex - 1 + enabled.length) % enabled.length
          : (currentIndex + 1) % enabled.length;
  event.preventDefault();
  const next = enabled[nextIndex];
  next?.focus();
  return next?.dataset.projectId;
}

export function ConversationProjectListbox({
  className,
  initialFocus = "selected",
  items,
  label = "Conversation projects",
  onBlur,
  onDismiss,
  onSelect,
  selectedId,
  triggerId,
  ...props
}: ConversationProjectListboxProps) {
  const listboxId = useId();
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const initialFocusCompleteRef = useRef(initialFocus === "none");
  const enabledItems = items.filter(
    (item) => !projectIndexItemDisabled(item),
  );
  const enabledItemKey = enabledItems
    .map((item) => item.id)
    .join("\u0000");
  const fallbackActiveId =
    enabledItems.find((item) => item.id === selectedId)?.id ??
    enabledItems[0]?.id;
  const [activeId, setActiveId] = useState(fallbackActiveId);
  const resolvedActiveId = enabledItems.some(
    (item) => item.id === activeId,
  )
    ? activeId
    : fallbackActiveId;

  useEffect(() => {
    if (
      initialFocus === "none" ||
      initialFocusCompleteRef.current
    ) {
      return;
    }
    const listbox = listboxRef.current;
    if (!listbox) return;
    const enabled = projectListboxOptions(listbox);
    const selected = enabled.find(
      (option) => option.getAttribute("aria-selected") === "true",
    );
    (initialFocus === "selected" ? selected : undefined)?.focus();
    if (
      !listbox.contains(
        typeof document === "undefined"
          ? null
          : document.activeElement,
      )
    ) {
      enabled[0]?.focus();
    }
    if (
      typeof document !== "undefined" &&
      listbox.contains(document.activeElement)
    ) {
      initialFocusCompleteRef.current = true;
    }
  }, [enabledItemKey, initialFocus, selectedId]);

  useEffect(() => {
    if (!onDismiss || typeof document === "undefined") return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const trigger = triggerId
        ? document.getElementById(triggerId)
        : null;
      if (
        !listboxRef.current?.contains(target) &&
        !trigger?.contains(target)
      ) {
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );
  }, [onDismiss, triggerId]);

  return (
    <div
      {...props}
      aria-label={label}
      className={[
        "codex-ui-conversation-project-options",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        onBlur?.(event);
        if (!onDismiss || event.defaultPrevented) return;
        const nextTarget = event.relatedTarget;
        const trigger = triggerId
          ? document.getElementById(triggerId)
          : null;
        if (
          nextTarget instanceof Node &&
          (listboxRef.current?.contains(nextTarget) ||
            trigger?.contains(nextTarget))
        ) {
          return;
        }
        onDismiss();
      }}
      ref={listboxRef}
      role="listbox"
    >
      {items.map((item, index) => {
        const disabled = projectIndexItemDisabled(item);
        const selected = item.id === selectedId;
        const descriptionId = item.description
          ? `${listboxId}-description-${index}`
          : undefined;
        const pathId = item.path
          ? `${listboxId}-path-${index}`
          : undefined;
        const trailingId =
          item.meta || item.statusLabel
            ? `${listboxId}-trailing-${index}`
            : undefined;
        const describedBy = [
          descriptionId,
          pathId,
          trailingId,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            aria-describedby={describedBy || undefined}
            aria-label={`Select project ${itemTextValue(item)}`}
            aria-selected={selected}
            className="codex-ui-conversation-project-options__item"
            data-project-id={item.id}
            data-status={item.status}
            disabled={disabled}
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              if (triggerId && typeof window !== "undefined") {
                window.setTimeout(() =>
                  document.getElementById(triggerId)?.focus(),
                );
              }
            }}
            onFocus={() => setActiveId(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && onDismiss) {
                event.preventDefault();
                onDismiss();
                if (triggerId && typeof window !== "undefined") {
                  window.setTimeout(() =>
                    document.getElementById(triggerId)?.focus(),
                  );
                }
                return;
              }
              const nextId = moveProjectListboxFocus(event);
              if (nextId) setActiveId(nextId);
            }}
            role="option"
            tabIndex={
              !disabled && item.id === resolvedActiveId ? 0 : -1
            }
            type="button"
          >
            {item.icon ? (
              <span
                aria-hidden="true"
                className="codex-ui-conversation-project-options__icon"
              >
                {item.icon}
              </span>
            ) : null}
            <span className="codex-ui-conversation-project-options__label">
              {item.label}
            </span>
            {item.description ? (
              <small id={descriptionId}>{item.description}</small>
            ) : null}
            {item.path ? <code id={pathId}>{item.path}</code> : null}
            {item.meta || item.statusLabel ? (
              <small id={trailingId}>
                {item.meta}
                {item.meta && item.statusLabel ? " · " : null}
                {item.statusLabel}
              </small>
            ) : null}
            <span
              aria-hidden="true"
              className="codex-ui-conversation-project-options__check"
            >
              {selected ? "✓" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type LocalEnvironmentItemStatus =
  | "available"
  | "creating"
  | "error"
  | "repairing"
  | "unavailable";

export interface LocalEnvironmentItem {
  actions?: ReactNode;
  branch?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  meta?: ReactNode;
  status?: LocalEnvironmentItemStatus;
  statusLabel?: ReactNode;
  textValue?: string;
}

export interface LocalEnvironmentGroup {
  description?: ReactNode;
  id: string;
  items: readonly LocalEnvironmentItem[];
  label: ReactNode;
}

export interface LocalEnvironmentDialogProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onSelect" | "title"
  > {
  createAction?: ReactNode;
  description?: ReactNode;
  emptyState?: ReactNode;
  groups: readonly LocalEnvironmentGroup[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (groupId: string, itemId: string) => void;
  open: boolean;
  query: string;
  searchLabel?: string;
  title?: ReactNode;
}

function localEnvironmentItemDisabled(item: LocalEnvironmentItem) {
  return (
    item.disabled ||
    item.status === "creating" ||
    item.status === "repairing" ||
    item.status === "unavailable"
  );
}

function localEnvironmentSearchValue(value: ReactNode) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function localEnvironmentItemMatches(
  item: LocalEnvironmentItem,
  query: string,
) {
  return [
    item.id,
    item.textValue,
    localEnvironmentSearchValue(item.label),
    localEnvironmentSearchValue(item.branch),
    localEnvironmentSearchValue(item.description),
    localEnvironmentSearchValue(item.meta),
    localEnvironmentSearchValue(item.statusLabel),
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

export function LocalEnvironmentDialog({
  className,
  createAction,
  description = "Choose a worktree or create a local environment.",
  emptyState = "No local environments",
  groups,
  onOpenChange,
  onQueryChange,
  onSelect,
  open,
  query,
  searchLabel = "Search local environments",
  title = "Create local environment",
  ...props
}: LocalEnvironmentDialogProps) {
  const environmentDialogId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGroups = normalizedQuery
    ? groups
        .map((group) => {
          const groupMatches = [
            group.id,
            localEnvironmentSearchValue(group.label),
            localEnvironmentSearchValue(group.description),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedQuery);
          return {
            ...group,
            items: groupMatches
              ? group.items
              : group.items.filter((item) =>
                  localEnvironmentItemMatches(
                    item,
                    normalizedQuery,
                  ),
                ),
          };
        })
        .filter((group) => group.items.length > 0)
    : groups;
  const hasItems = filteredGroups.some(
    (group) => group.items.length > 0,
  );

  return (
    <Dialog
      {...props}
      className={[
        "codex-ui-local-environment-dialog",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      description={description}
      footer={createAction}
      initialFocusSelector=".codex-ui-local-environment-dialog__search"
      onOpenChange={onOpenChange}
      open={open}
      size="standard"
      title={title}
    >
      <div className="codex-ui-local-environment-dialog__content">
        <input
          aria-label={searchLabel}
          className="codex-ui-local-environment-dialog__search"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          type="search"
          value={query}
        />
        {hasItems ? (
          <div className="codex-ui-local-environment-dialog__groups">
            {filteredGroups.map((group, groupIndex) => {
              const headingId = `${environmentDialogId}-group-${groupIndex}`;
              return (
                <section
                  aria-labelledby={headingId}
                  className="codex-ui-local-environment-dialog__group"
                  key={group.id}
                >
                  <header>
                    <h3 id={headingId}>{group.label}</h3>
                    {group.description ? (
                      <p>{group.description}</p>
                    ) : null}
                  </header>
                  {group.items.length > 0 ? (
                    <ul>
                      {group.items.map((item, itemIndex) => {
                        const itemDisabled =
                          localEnvironmentItemDisabled(item);
                        const accessibleValue =
                          item.textValue ??
                          (typeof item.label === "string"
                            ? item.label
                            : item.id);
                        const descriptionId = item.description
                          ? `${environmentDialogId}-description-${groupIndex}-${itemIndex}`
                          : undefined;
                        const branchId = item.branch
                          ? `${environmentDialogId}-branch-${groupIndex}-${itemIndex}`
                          : undefined;
                        const trailingId =
                          item.meta || item.statusLabel
                            ? `${environmentDialogId}-trailing-${groupIndex}-${itemIndex}`
                            : undefined;
                        const describedBy = [
                          descriptionId,
                          branchId,
                          trailingId,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        return (
                          <li key={item.id}>
                            <div className="codex-ui-local-environment-dialog__row">
                              <button
                                aria-describedby={
                                  describedBy || undefined
                                }
                                aria-label={`Use local environment ${accessibleValue}`}
                                className="codex-ui-local-environment-dialog__item"
                                data-status={item.status}
                                disabled={itemDisabled}
                                onClick={() =>
                                  onSelect(group.id, item.id)
                                }
                                type="button"
                              >
                                <span className="codex-ui-local-environment-dialog__item-copy">
                                  <span className="codex-ui-local-environment-dialog__item-label">
                                    {item.label}
                                  </span>
                                  {item.description ? (
                                    <span id={descriptionId}>
                                      {item.description}
                                    </span>
                                  ) : null}
                                  {item.branch ? (
                                    <code id={branchId}>
                                      {item.branch}
                                    </code>
                                  ) : null}
                                </span>
                                {item.meta || item.statusLabel ? (
                                  <span
                                    className="codex-ui-local-environment-dialog__trailing"
                                    id={trailingId}
                                  >
                                    {item.meta ? (
                                      <span>{item.meta}</span>
                                    ) : null}
                                    {item.statusLabel ? (
                                      <span
                                        className="codex-ui-local-environment-dialog__status"
                                        data-status={item.status}
                                      >
                                        {item.statusLabel}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : null}
                              </button>
                              {item.actions ? (
                                <div className="codex-ui-local-environment-dialog__item-actions">
                                  {item.actions}
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="codex-ui-local-environment-dialog__group-empty">
                      {emptyState}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="codex-ui-local-environment-dialog__empty">
            {emptyState}
          </p>
        )}
      </div>
    </Dialog>
  );
}
