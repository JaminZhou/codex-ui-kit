import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

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
          {items.map((item) => {
            const selected = item.id === selectedId;
            const disabled = projectIndexItemDisabled(item);
            return (
              <li data-status={item.status} key={item.id}>
                <button
                  aria-current={selected ? "page" : undefined}
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
                      <span className="codex-ui-project-index__description">
                        {item.description}
                      </span>
                    ) : null}
                    {item.path ? (
                      <code className="codex-ui-project-index__path">
                        {item.path}
                      </code>
                    ) : null}
                  </span>
                  {item.meta || item.statusLabel ? (
                    <span className="codex-ui-project-index__trailing">
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
        {description ? <p>{description}</p> : null}
      </div>
      <div
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
          {items.map((item) => {
            const selected = item.id === selectedId;
            const disabled = worktreeListItemDisabled(item);
            const accessibleName =
              item.textValue ??
              (typeof item.label === "string"
                ? item.label
                : item.id);
            return (
              <li data-status={item.status} key={item.id}>
                <div className="codex-ui-worktree-list__row">
                  <button
                    aria-current={selected ? "location" : undefined}
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
                        {item.branch ? <code>{item.branch}</code> : null}
                      </span>
                      {item.description ? (
                        <span className="codex-ui-worktree-list__description">
                          {item.description}
                        </span>
                      ) : null}
                      {item.path ? (
                        <code className="codex-ui-worktree-list__path">
                          {item.path}
                        </code>
                      ) : null}
                    </span>
                    {item.meta || item.statusLabel ? (
                      <span className="codex-ui-worktree-list__trailing">
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
