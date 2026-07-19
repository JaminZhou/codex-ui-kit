import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface ComposerMentionOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  kind?: string;
  label: ReactNode;
}

export interface ComposerMentionGroup {
  id: string;
  label: ReactNode;
  options: readonly ComposerMentionOption[];
}

export interface ComposerMentionMenuProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  activeId?: string;
  emptyMessage?: ReactNode;
  groups: readonly ComposerMentionGroup[];
  loading?: boolean;
  loadingMessage?: ReactNode;
  onActiveIdChange?: (id: string) => void;
  onDismiss?: () => void;
  onSelect: (option: ComposerMentionOption) => void;
  query?: string;
}

export function ComposerMentionMenu({
  activeId,
  className,
  emptyMessage = "No mentions found",
  groups,
  loading = false,
  loadingMessage = "Searching…",
  onActiveIdChange,
  onDismiss,
  onKeyDown,
  onSelect,
  query,
  ...props
}: ComposerMentionMenuProps) {
  const instanceId = useId();
  const getOptionDomId = (id: string) =>
    `${instanceId}-option-${encodeURIComponent(id)}`;
  const availableOptions = useMemo(
    () => groups.flatMap((group) => group.options).filter((option) => !option.disabled),
    [groups],
  );
  const [internalActiveId, setInternalActiveId] = useState(
    () => availableOptions[0]?.id,
  );
  const resolvedActiveId = activeId ?? internalActiveId;
  const selectableOptions = loading ? [] : availableOptions;
  const visibleActiveId = selectableOptions.some(
    (option) => option.id === resolvedActiveId,
  )
    ? resolvedActiveId
    : selectableOptions[0]?.id;
  const setActiveId = (id: string) => {
    if (activeId === undefined) setInternalActiveId(id);
    onActiveIdChange?.(id);
  };

  useEffect(() => {
    if (
      activeId === undefined &&
      !availableOptions.some((option) => option.id === internalActiveId)
    ) {
      setInternalActiveId(availableOptions[0]?.id);
    }
  }, [activeId, availableOptions, internalActiveId]);

  const moveActive = (offset: number) => {
    if (selectableOptions.length === 0) return;
    const currentIndex = selectableOptions.findIndex(
      (option) => option.id === visibleActiveId,
    );
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + offset + selectableOptions.length) %
          selectableOptions.length;
    const nextOption = selectableOptions[nextIndex];
    if (nextOption) setActiveId(nextOption.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextOption =
        event.key === "Home"
          ? selectableOptions[0]
          : selectableOptions[selectableOptions.length - 1];
      if (nextOption) setActiveId(nextOption.id);
      return;
    }
    if (event.key === "Enter") {
      const activeOption = selectableOptions.find(
        (option) => option.id === visibleActiveId,
      );
      if (activeOption) {
        event.preventDefault();
        onSelect(activeOption);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss?.();
    }
  };

  const classes = ["codex-ui-composer-mention-menu", className]
    .filter(Boolean)
    .join(" ");
  const hasOptions = groups.some((group) => group.options.length > 0);

  return (
    <div
      aria-activedescendant={
        visibleActiveId ? getOptionDomId(visibleActiveId) : undefined
      }
      aria-label={query ? `Mention results for ${query}` : "Mention suggestions"}
      aria-orientation="vertical"
      className={classes}
      data-loading={loading || undefined}
      onKeyDown={handleKeyDown}
      role="listbox"
      tabIndex={0}
      {...props}
    >
      {loading ? (
        <div className="codex-ui-composer-mention-menu__status" role="status">
          <span aria-hidden="true" className="codex-ui-composer-mention-menu__spinner" />
          {loadingMessage}
        </div>
      ) : hasOptions ? (
        groups.map((group) =>
          group.options.length > 0 ? (
            <section
              aria-labelledby={`${instanceId}-group-${encodeURIComponent(group.id)}`}
              className="codex-ui-composer-mention-menu__group"
              key={group.id}
              role="group"
            >
              <div
                className="codex-ui-composer-mention-menu__heading"
                id={`${instanceId}-group-${encodeURIComponent(group.id)}`}
              >
                {group.label}
              </div>
              {group.options.map((option) => (
                <button
                  aria-disabled={option.disabled || undefined}
                  aria-selected={option.id === visibleActiveId}
                  className="codex-ui-composer-mention-menu__option"
                  data-active={option.id === visibleActiveId || undefined}
                  data-kind={option.kind}
                  disabled={option.disabled}
                  id={getOptionDomId(option.id)}
                  key={option.id}
                  onClick={() => onSelect(option)}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveId(option.id);
                  }}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  {option.icon ? (
                    <span className="codex-ui-composer-mention-menu__icon">
                      {option.icon}
                    </span>
                  ) : null}
                  <span className="codex-ui-composer-mention-menu__copy">
                    <span className="codex-ui-composer-mention-menu__label">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="codex-ui-composer-mention-menu__description">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </section>
          ) : null,
        )
      ) : (
        <div className="codex-ui-composer-mention-menu__status">{emptyMessage}</div>
      )}
    </div>
  );
}

export type ComposerModeKind = "goal" | "plan" | "review" | "custom";

export interface ComposerModeIndicatorProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick"> {
  clearLabel?: string;
  icon?: ReactNode;
  kind?: ComposerModeKind;
  label: ReactNode;
  onClear: () => void;
}

export function ComposerModeIndicator({
  className,
  clearLabel = "Clear mode",
  icon,
  kind = "custom",
  label,
  onClear,
  ...props
}: ComposerModeIndicatorProps) {
  const classes = ["codex-ui-composer-mode", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-label={clearLabel}
      className={classes}
      data-clearable
      data-kind={kind}
      onClick={onClear}
      title={clearLabel}
      type="button"
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-composer-mode__icon">
        {icon ?? <ComposerModeGlyph kind={kind} />}
      </span>
      <span aria-hidden="true" className="codex-ui-composer-mode__clear">
        ×
      </span>
      <span className="codex-ui-composer-mode__label">{label}</span>
    </button>
  );
}

function ComposerModeGlyph({ kind }: { kind: ComposerModeKind }) {
  if (kind === "goal") return <span>◎</span>;
  if (kind === "plan") return <span>◇</span>;
  if (kind === "review") return <span>⌕</span>;
  return <span>•</span>;
}

export type QueuedPromptStatus = "editing" | "paused" | "queued";

export interface QueuedPrompt {
  attachmentSummary?: ReactNode;
  id: string;
  status?: QueuedPromptStatus;
  text: ReactNode;
}

export interface QueuedPromptListProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  interrupted?: boolean;
  items: readonly QueuedPrompt[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onQueueingChange?: (enabled: boolean) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onResume?: () => void;
  onSendNow?: (id: string) => void;
  queueingEnabled?: boolean;
}

export function QueuedPromptList({
  className,
  interrupted = false,
  items,
  onDelete,
  onEdit,
  onQueueingChange,
  onReorder,
  onResume,
  onSendNow,
  queueingEnabled = true,
  ...props
}: QueuedPromptListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  if (items.length === 0) return null;

  const classes = ["codex-ui-composer-queue", className]
    .filter(Boolean)
    .join(" ");

  const handleDrop = (event: DragEvent<HTMLElement>, overId: string) => {
    event.preventDefault();
    if (draggingId && draggingId !== overId) onReorder?.(draggingId, overId);
    setDraggingId(null);
  };

  const moveWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemIndex: number,
  ) => {
    if (!event.altKey || !onReorder) return;
    const offset = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (offset === 0) return;
    const target = items[itemIndex + offset];
    if (!target) return;
    event.preventDefault();
    onReorder(items[itemIndex]!.id, target.id);
  };

  return (
    <div className={classes} data-interrupted={interrupted || undefined} {...props}>
      {interrupted ? (
        <div className="codex-ui-composer-queue__interrupted" role="status">
          <span>Queue paused because you interrupted</span>
          {onResume ? (
            <button onClick={onResume} type="button">
              Resume
            </button>
          ) : null}
        </div>
      ) : null}
      <div aria-label="Queued prompts" className="codex-ui-composer-queue__list" role="list">
        {items.map((item, itemIndex) => {
          const status = item.status ?? "queued";
          const paused = status === "paused";
          return (
            <article
              className="codex-ui-composer-queue__row"
              data-dragging={draggingId === item.id || undefined}
              data-status={status}
              draggable={Boolean(onReorder)}
              key={item.id}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingId(item.id)}
              onDrop={(event) => handleDrop(event, item.id)}
              role="listitem"
            >
              <button
                aria-label={`Reorder ${typeof item.text === "string" ? item.text : "queued prompt"}`}
                className="codex-ui-composer-queue__handle"
                disabled={!onReorder}
                onKeyDown={(event) => moveWithKeyboard(event, itemIndex)}
                title="Drag to reorder · Alt+Arrow to move"
                type="button"
              >
                <span aria-hidden="true">⠿</span>
              </button>
              {paused ? (
                <span
                  aria-label="This queued prompt could not be sent"
                  className="codex-ui-composer-queue__warning"
                  role="img"
                  title="Retry, edit, or delete it to continue the queue"
                >
                  !
                </span>
              ) : null}
              <span className="codex-ui-composer-queue__text">
                <span>{item.text}</span>
                {item.attachmentSummary ? (
                  <span className="codex-ui-composer-queue__attachment-summary">
                    {item.attachmentSummary}
                  </span>
                ) : null}
              </span>
              {onSendNow ? (
                <button
                  className="codex-ui-composer-queue__send-now"
                  onClick={() => onSendNow(item.id)}
                  title={paused ? "Try sending this queued prompt again" : "Submit without interrupting the agent"}
                  type="button"
                >
                  {paused ? "Retry" : "Steer"}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  aria-label="Delete queued prompt"
                  className="codex-ui-composer-queue__icon-button"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  ×
                </button>
              ) : null}
              {onEdit || onQueueingChange ? (
                <details className="codex-ui-composer-queue__more">
                  <summary aria-label="Queued prompt actions">•••</summary>
                  <div className="codex-ui-composer-queue__menu" role="menu">
                    {onEdit ? (
                      <button onClick={() => onEdit(item.id)} role="menuitem" type="button">
                        Edit prompt
                      </button>
                    ) : null}
                    {onQueueingChange ? (
                      <button
                        onClick={() => onQueueingChange(!queueingEnabled)}
                        role="menuitem"
                        type="button"
                      >
                        Turn {queueingEnabled ? "off" : "on"} queueing
                      </button>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
