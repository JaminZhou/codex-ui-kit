import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Menu,
  MenuItem,
  type MenuProps,
} from "./InteractivePrimitives.js";

function hasRenderableNode(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (
      isValidElement<QueuedPromptListProps>(child) &&
      child.type === QueuedPromptList
    ) {
      return child.props.items.length > 0;
    }
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return hasRenderableNode(child.props.children);
    }
    return true;
  });
}

export interface ComposerDockProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  composer: ReactNode;
  context?: ReactNode;
  label?: string;
  queue?: ReactNode;
}

export function ComposerDock({
  className,
  composer,
  context,
  label = "Composer dock",
  queue,
  ...props
}: ComposerDockProps) {
  const hasContext = hasRenderableNode(context);
  const hasQueue = hasRenderableNode(queue);

  return (
    <div
      aria-label={label}
      className={["codex-ui-composer-dock", className]
        .filter(Boolean)
        .join(" ")}
      data-has-context={hasContext || undefined}
      data-has-queue={hasQueue || undefined}
      role="group"
      {...props}
    >
      {hasContext ? (
        <div className="codex-ui-composer-dock__context">{context}</div>
      ) : null}
      {hasQueue ? (
        <div className="codex-ui-composer-dock__queue">{queue}</div>
      ) : null}
      <div className="codex-ui-composer-dock__surface">{composer}</div>
    </div>
  );
}

export interface ComposerContextBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  label?: string;
}

export function ComposerContextBar({
  children,
  className,
  label = "Composer context",
  ...props
}: ComposerContextBarProps) {
  return (
    <div
      aria-label={label}
      className={["codex-ui-composer-context", className]
        .filter(Boolean)
        .join(" ")}
      role="toolbar"
      {...props}
    >
      {children}
    </div>
  );
}

export interface ComposerContextControlProps
  extends ComponentPropsWithoutRef<"button"> {
  compact?: boolean;
  icon?: ReactNode;
}

export function ComposerContextControl({
  children,
  className,
  compact = false,
  icon,
  type = "button",
  ...props
}: ComposerContextControlProps) {
  return (
    <button
      className={["codex-ui-composer-context__control", className]
        .filter(Boolean)
        .join(" ")}
      data-compact={compact || undefined}
      type={type}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="codex-ui-composer-context__icon">
          {icon}
        </span>
      ) : null}
      {children ? (
        <span className="codex-ui-composer-context__label">{children}</span>
      ) : null}
    </button>
  );
}

export interface ComposerPermissionOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface ComposerPermissionMenuProps
  extends Omit<MenuProps, "children" | "trigger"> {
  heading?: ReactNode;
  learnMore?: ReactNode;
  onSelect: (option: ComposerPermissionOption) => void;
  optionRole?: "menuitem" | "menuitemradio";
  options: readonly ComposerPermissionOption[];
  selectedIcon?: ReactNode;
  selectedId?: string;
  trigger: MenuProps["trigger"];
}

export function ComposerPermissionMenu({
  className,
  heading = "How should actions be approved?",
  learnMore,
  onSelect,
  optionRole = "menuitemradio",
  options,
  selectedIcon = <span>✓</span>,
  selectedId,
  trigger,
  width = "auto",
  ...props
}: ComposerPermissionMenuProps) {
  return (
    <Menu
      {...props}
      className={["codex-ui-composer-permission-menu", className]
        .filter(Boolean)
        .join(" ")}
      trigger={trigger}
      width={width}
    >
      <div className="codex-ui-composer-permission-menu__header">
        <span>{heading}</span>
        {learnMore ? (
          <span className="codex-ui-composer-permission-menu__learn-more">
            {learnMore}
          </span>
        ) : null}
      </div>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <MenuItem
            aria-checked={optionRole === "menuitemradio" ? selected : undefined}
            className="codex-ui-composer-permission-menu__option"
            data-selected={selected || undefined}
            disabled={option.disabled}
            endIcon={selected ? selectedIcon : undefined}
            key={option.id}
            onSelect={() => onSelect(option)}
            role={optionRole}
            startIcon={option.icon}
            subText={option.description}
          >
            {option.label}
          </MenuItem>
        );
      })}
    </Menu>
  );
}

export interface ComposerResourceOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface ComposerResourceGroup {
  id: string;
  label?: ReactNode;
  options: readonly ComposerResourceOption[];
}

export interface ComposerResourcePickerProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onSelect"> {
  activeId?: string;
  descriptionSeparator?: ReactNode;
  groups: readonly ComposerResourceGroup[];
  heading?: ReactNode;
  onActiveIdChange?: (id: string) => void;
  onDismiss?: () => void;
  onSelect: (option: ComposerResourceOption) => void;
}

export function ComposerResourcePicker({
  activeId,
  className,
  descriptionSeparator = " — ",
  groups,
  heading = "Add",
  onActiveIdChange,
  onDismiss,
  onKeyDown,
  onSelect,
  ...props
}: ComposerResourcePickerProps) {
  const instanceId = useId();
  const getOptionDomId = (id: string) =>
    `${instanceId}-resource-${encodeURIComponent(id)}`;
  const availableOptions = useMemo(
    () =>
      groups
        .flatMap((group) => group.options)
        .filter((option) => !option.disabled),
    [groups],
  );
  const [internalActiveId, setInternalActiveId] = useState(
    () => availableOptions[0]?.id,
  );
  const resolvedActiveId = activeId ?? internalActiveId;
  const visibleActiveId = availableOptions.some(
    (option) => option.id === resolvedActiveId,
  )
    ? resolvedActiveId
    : availableOptions[0]?.id;
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
    if (availableOptions.length === 0) return;
    const currentIndex = availableOptions.findIndex(
      (option) => option.id === visibleActiveId,
    );
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + offset + availableOptions.length) %
          availableOptions.length;
    const nextOption = availableOptions[nextIndex];
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
          ? availableOptions[0]
          : availableOptions[availableOptions.length - 1];
      if (nextOption) setActiveId(nextOption.id);
      return;
    }
    if (event.key === "Enter") {
      const selectedOption = availableOptions.find(
        (option) => option.id === visibleActiveId,
      );
      if (selectedOption) {
        event.preventDefault();
        onSelect(selectedOption);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss?.();
    }
  };

  return (
    <div
      aria-activedescendant={
        visibleActiveId ? getOptionDomId(visibleActiveId) : undefined
      }
      aria-label="Composer resources"
      aria-orientation="vertical"
      className={["codex-ui-composer-resource-picker", className]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={handleKeyDown}
      role="listbox"
      tabIndex={0}
      {...props}
    >
      <div className="codex-ui-composer-resource-picker__scroller">
        <div className="codex-ui-composer-resource-picker__heading">
          {heading}
        </div>
        {groups.map((group) =>
          group.options.length > 0 ? (
            <section
              aria-labelledby={
                group.label
                  ? `${instanceId}-resource-group-${encodeURIComponent(group.id)}`
                  : undefined
              }
              className="codex-ui-composer-resource-picker__group"
              key={group.id}
              role="group"
            >
              {group.label ? (
                <div
                  className="codex-ui-composer-resource-picker__group-label"
                  id={`${instanceId}-resource-group-${encodeURIComponent(group.id)}`}
                >
                  {group.label}
                </div>
              ) : null}
              {group.options.map((option) => {
                const selected = option.id === visibleActiveId;
                return (
                  <button
                    aria-disabled={option.disabled || undefined}
                    aria-selected={selected}
                    className="codex-ui-composer-resource-picker__option"
                    data-active={selected || undefined}
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
                      <span
                        aria-hidden="true"
                        className="codex-ui-composer-resource-picker__icon"
                      >
                        {option.icon}
                      </span>
                    ) : null}
                    <span className="codex-ui-composer-resource-picker__copy">
                      <span className="codex-ui-composer-resource-picker__label">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="codex-ui-composer-resource-picker__description">
                          {descriptionSeparator}
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}

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
  if (kind === "goal") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M9.96861 1.91681C10.3002 1.91681 10.569 2.18564 10.569 2.51722C10.5688 2.84865 10.3001 3.11764 9.96861 3.11764C6.14529 3.11779 3.04595 6.21713 3.04579 10.0404C3.04597 13.8637 6.14531 16.964 9.96861 16.9641C13.792 16.9641 16.8921 13.8638 16.8923 10.0404C16.8925 9.709 17.1612 9.44003 17.4927 9.44003C17.8241 9.44019 18.093 9.7091 18.0931 10.0404C18.0929 14.527 14.4552 18.165 9.96861 18.165C5.48215 18.1648 1.84515 14.5269 1.84497 10.0404C1.84513 5.55398 5.48214 1.91697 9.96861 1.91681Z" />
        <path d="M8.73428 5.4417C9.05275 5.34987 9.38553 5.53321 9.47752 5.85167C9.56932 6.17 9.38575 6.50275 9.06755 6.59491C7.60672 7.01688 6.53899 8.36477 6.53894 9.96021C6.53907 11.8943 8.10685 13.4629 10.0409 13.4631C11.6106 13.463 12.9407 12.429 13.385 11.0041C13.4838 10.6877 13.8206 10.5114 14.1371 10.61C14.4536 10.7087 14.6308 11.0455 14.5321 11.3621C13.9357 13.2742 12.1509 14.663 10.0409 14.663C7.44369 14.6628 5.33824 12.5574 5.33812 9.96021C5.33816 7.81571 6.77345 6.00809 8.73428 5.4417Z" />
        <path d="M13.8656 1.99087C14.3948 1.60393 15.1805 1.97721 15.1739 2.67063L15.1528 4.83776L17.319 4.8166L17.4539 4.82541C18.1023 4.92002 18.4014 5.73603 17.9115 6.22638L15.5046 8.63331C15.3075 8.83039 15.04 8.94171 14.7613 8.94189H12.2063L10.3936 10.7555C10.1591 10.9899 9.77811 10.9899 9.54364 10.7555C9.30989 10.521 9.30952 10.1407 9.54364 9.90643L11.0486 8.40144V5.22922C11.0486 4.95027 11.1591 4.68234 11.3563 4.48509L13.7633 2.07816L13.8656 1.99087ZM12.2495 5.29005V7.74107H14.6978L16.4136 6.02536L13.9414 6.05004L13.9643 3.57434L12.2495 5.29005Z" />
      </svg>
    );
  }
  if (kind === "plan") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M8 3.52051C9.07134 3.52056 10.0951 3.86574 10.8574 4.54785C11.6273 5.23672 12.0976 6.24043 12.0977 7.48047C12.0977 8.72922 11.6209 9.58857 11.1914 10.2686C10.9702 10.6188 10.7891 10.8819 10.6494 11.1572C10.5171 11.4183 10.4482 11.6441 10.4482 11.877V12.4268C10.4482 13.1158 10.1861 13.7075 9.72559 14.1221C9.27069 14.5315 8.65733 14.7373 8 14.7373C7.34282 14.7373 6.73026 14.5313 6.27539 14.1221C5.81475 13.7075 5.55182 13.1159 5.55176 12.4268V11.877C5.55175 11.6441 5.48294 11.4183 5.35059 11.1572C5.21093 10.8818 5.02985 10.6189 4.80859 10.2686C4.37912 9.58855 3.90332 8.72928 3.90332 7.48047C3.90335 6.24047 4.37279 5.23672 5.14258 4.54785C5.90494 3.86581 6.9287 3.52055 8 3.52051ZM6.60156 12.4268C6.60162 12.8365 6.75133 13.1382 6.97754 13.3418C7.2095 13.5504 7.55861 13.6875 8 13.6875C8.44132 13.6874 8.79051 13.5504 9.02246 13.3418C9.24859 13.1382 9.39838 12.8364 9.39844 12.4268V12.2656H6.60156V12.4268ZM8 4.57129C7.14816 4.57133 6.38548 4.84457 5.84277 5.33008C5.30758 5.80896 4.95315 6.52253 4.95312 7.48047C4.95312 8.42985 5.30144 9.08283 5.69629 9.70801C5.88705 10.01 6.11776 10.3486 6.28711 10.6826C6.37163 10.8493 6.44704 11.0262 6.50293 11.2148H9.49707C9.55297 11.0262 9.62839 10.8493 9.71289 10.6826C9.88222 10.3487 10.113 10.01 10.3037 9.70801C10.6985 9.08286 11.0469 8.4298 11.0469 7.48047C11.0468 6.52258 10.6924 5.80896 10.1572 5.33008C9.61453 4.84459 8.8518 4.57134 8 4.57129Z" />
        <path d="M2 6.85449C2.28995 6.85449 2.52539 7.08993 2.52539 7.37988C2.52539 7.66983 2.28995 7.90527 2 7.90527H0.833008C0.543208 7.9051 0.308594 7.66972 0.308594 7.37988C0.308594 7.09004 0.543208 6.85467 0.833008 6.85449H2Z" />
        <path d="M15.167 6.85449C15.4568 6.85462 15.6924 7.09001 15.6924 7.37988C15.6924 7.66975 15.4568 7.90514 15.167 7.90527H14C13.7102 7.9051 13.4756 7.66972 13.4756 7.37988C13.4756 7.09004 13.7102 6.85467 14 6.85449H15.167Z" />
        <path d="M2.56348 1.94141C2.7685 1.73639 3.10161 1.7364 3.30664 1.94141L4.08203 2.71777C4.28706 2.9228 4.28706 3.25494 4.08203 3.45996C3.877 3.66497 3.54486 3.66498 3.33984 3.45996L2.56348 2.68457C2.35847 2.47955 2.35847 2.14643 2.56348 1.94141Z" />
        <path d="M12.6934 1.94141C12.8984 1.7364 13.2315 1.73643 13.4365 1.94141C13.6415 2.14643 13.6415 2.47955 13.4365 2.68457L12.6602 3.46094C12.4552 3.66539 12.1229 3.66538 11.918 3.46094C11.7129 3.25592 11.713 2.9228 11.918 2.71777L12.6934 1.94141Z" />
        <path d="M8 0.1875C8.28995 0.1875 8.52539 0.422941 8.52539 0.712891V1.87988C8.52521 2.16968 8.28984 2.4043 8 2.4043C7.71016 2.4043 7.47479 2.16968 7.47461 1.87988V0.712891C7.47461 0.422941 7.71005 0.1875 8 0.1875Z" />
      </svg>
    );
  }
  if (kind === "review") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="8.75" cy="8.75" r="5.25" />
        <path d="m12.75 12.75 3.75 3.75M6.5 8.75h4.5M8.75 6.5V11" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  );
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

function QueuePausedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M6.75 5.25C7.16421 5.25 7.5 5.58579 7.5 6V14C7.5 14.4142 7.16421 14.75 6.75 14.75C6.33579 14.75 6 14.4142 6 14V6C6 5.58579 6.33579 5.25 6.75 5.25ZM13.25 5.25C13.6642 5.25 14 5.58579 14 6V14C14 14.4142 13.6642 14.75 13.25 14.75C12.8358 14.75 12.5 14.4142 12.5 14V6C12.5 5.58579 12.8358 5.25 13.25 5.25Z" />
    </svg>
  );
}

function QueueResumeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M6 14.7227V5.27693C6 4.29057 7.08894 3.6928 7.9211 4.22235L15.3428 8.94526C16.1147 9.43645 16.1147 10.5632 15.3428 11.0544L7.92109 15.7773C7.08894 16.3069 6 15.7091 6 14.7227Z" />
    </svg>
  );
}

function QueuePromptIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M5.5 5.25V9.5C5.5 11.1569 6.84315 12.5 8.5 12.5H14.25M11.75 9.75L14.5 12.5L11.75 15.25" />
    </svg>
  );
}

function QueueSteerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M13.1293 7.34753C13.3565 7.12027 13.7081 7.09207 13.9662 7.26257L14.0707 7.34753L18.0707 11.3475C18.3304 11.6072 18.3304 12.0292 18.0707 12.2889L14.0707 16.2889C13.811 16.5486 13.389 16.5486 13.1293 16.2889C12.8696 16.0292 12.8696 15.6072 13.1293 15.3475L15.9935 12.4833H6.59998C4.57585 12.4833 2.93494 10.8424 2.93494 8.81824V5.31824C2.93494 4.95097 3.23271 4.6532 3.59998 4.6532C3.96724 4.6532 4.26501 4.95097 4.26501 5.31824V8.81824C4.26501 10.1078 5.31039 11.1532 6.59998 11.1532H15.9935L13.1293 8.28894L13.0443 8.18445C12.8738 7.92632 12.902 7.5748 13.1293 7.34753Z" />
    </svg>
  );
}

function QueueDeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z" />
    </svg>
  );
}

function QueueMoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M15.6981 9.04712C16.5255 9.04712 17.1959 9.71781 17.1961 10.5452C17.1961 11.3727 16.5256 12.0442 15.6981 12.0442C14.8706 12.0442 14.2 11.3727 14.2 10.5452C14.2002 9.71781 14.8707 9.04712 15.6981 9.04712ZM4.69806 9.04712C5.52546 9.04712 6.19691 9.71781 6.19708 10.5452C6.19708 11.3727 5.52557 12.0442 4.69806 12.0442C3.8707 12.044 3.20001 11.3726 3.20001 10.5452C3.20019 9.71792 3.87081 9.04729 4.69806 9.04712ZM10.2003 9.04712C11.0276 9.0473 11.6982 9.71792 11.6984 10.5452C11.6984 11.3726 11.0277 12.044 10.2003 12.0442C9.37284 12.0442 8.70132 11.3727 8.70132 10.5452C8.7015 9.71781 9.37295 9.04712 10.2003 9.04712Z" />
    </svg>
  );
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
          <span className="codex-ui-composer-queue__interrupted-copy">
            <QueuePausedIcon />
            <span>Queue paused because you interrupted</span>
          </span>
          {onResume ? (
            <button onClick={onResume} type="button">
              <QueueResumeIcon />
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
                <QueuePromptIcon />
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
                  aria-label={paused ? "Retry" : "Steer"}
                  className="codex-ui-composer-queue__send-now"
                  onClick={() => onSendNow(item.id)}
                  title={paused ? "Try sending this queued prompt again" : "Submit without interrupting the agent"}
                  type="button"
              >
                  <QueueSteerIcon />
                  {paused ? "Retry" : "Steer"}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  aria-label="Delete queued message"
                  className="codex-ui-composer-queue__icon-button"
                  onClick={() => onDelete(item.id)}
                  type="button"
              >
                  <QueueDeleteIcon />
                </button>
              ) : null}
              {onEdit || onQueueingChange ? (
                <Menu
                  align="end"
                  className="codex-ui-composer-queue__menu"
                  side="top"
                  trigger={
                    <button
                      aria-label="Queued message actions"
                      className="codex-ui-composer-queue__more"
                      type="button"
                    >
                      <QueueMoreIcon />
                    </button>
                  }
                >
                  {onEdit ? (
                    <MenuItem onSelect={() => onEdit(item.id)}>
                      Edit prompt
                    </MenuItem>
                  ) : null}
                  {onQueueingChange ? (
                    <MenuItem
                      onSelect={() =>
                        onQueueingChange(!queueingEnabled)
                      }
                    >
                      Turn {queueingEnabled ? "off" : "on"} queueing
                    </MenuItem>
                  ) : null}
                </Menu>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
