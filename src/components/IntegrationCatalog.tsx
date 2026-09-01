import {
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useMemo,
} from "react";

export type IntegrationCatalogKind = "plugins" | "skills";

export type IntegrationCatalogStatus =
  | "ready"
  | "loading"
  | "error"
  | "unavailable";

export interface IntegrationCatalogItem {
  actionAriaLabel?: string;
  actionLabel?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  installed?: boolean;
  title: ReactNode;
}

export interface IntegrationCatalogSection {
  id: string;
  items: readonly IntegrationCatalogItem[];
  moreLabel?: ReactNode;
  title?: ReactNode;
}

export interface IntegrationCatalogScope {
  id: string;
  label: ReactNode;
}

export interface IntegrationCatalogTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  active: IntegrationCatalogKind;
  onChange?: (kind: IntegrationCatalogKind) => void;
  pluginsLabel?: ReactNode;
  skillsLabel?: ReactNode;
}

export interface IntegrationCatalogPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  activeScope?: string;
  description?: ReactNode;
  emptyLabel?: ReactNode;
  installedItems?: readonly IntegrationCatalogItem[];
  installedLabel?: ReactNode;
  installedMoreLabel?: ReactNode;
  kind: IntegrationCatalogKind;
  loadingLabel?: ReactNode;
  onItemAction?: (item: IntegrationCatalogItem) => void;
  onItemOpen?: (item: IntegrationCatalogItem) => void;
  onInstalledMore?: () => void;
  onManage?: () => void;
  onMore?: (section: IntegrationCatalogSection) => void;
  onQueryChange?: (query: string) => void;
  onRetry?: () => void;
  onScopeChange?: (scope: IntegrationCatalogScope) => void;
  query?: string;
  retryLabel?: ReactNode;
  scopes?: readonly IntegrationCatalogScope[];
  sections?: readonly IntegrationCatalogSection[];
  status?: IntegrationCatalogStatus;
  statusDescription?: ReactNode;
  statusHeading?: ReactNode;
  title?: ReactNode;
}

function CatalogSearchGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.75" cy="8.75" r="5.25" />
      <path d="m12.75 12.75 3.75 3.75" />
    </svg>
  );
}

function CatalogManageGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="2.25" />
      <path d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.87 4.87l1.06 1.06M14.07 14.07l1.06 1.06M15.13 4.87l-1.06 1.06M5.93 14.07l-1.06 1.06" />
    </svg>
  );
}

function CatalogFallbackIcon({ title }: { title: ReactNode }) {
  const label = typeof title === "string" ? title.trim().slice(0, 1) : "";
  return <span>{label || "◇"}</span>;
}

function searchableText(item: IntegrationCatalogItem) {
  return [item.title, item.description]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function CatalogItemRow({
  item,
  kind,
  onAction,
  onOpen,
}: {
  item: IntegrationCatalogItem;
  kind: IntegrationCatalogKind;
  onAction?: (item: IntegrationCatalogItem) => void;
  onOpen?: (item: IntegrationCatalogItem) => void;
}) {
  const titleLabel = typeof item.title === "string" ? item.title : "integration";
  return (
    <article
      className="codex-ui-integration-catalog__item"
      data-disabled={item.disabled || undefined}
      data-installed={item.installed || undefined}
      data-kind={kind}
    >
      {onOpen ? (
        <button
          aria-label={`Open ${titleLabel}`}
          className="codex-ui-integration-catalog__item-open"
          disabled={item.disabled}
          onClick={() => onOpen(item)}
          type="button"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="codex-ui-integration-catalog__item-icon"
      >
        {item.icon ?? <CatalogFallbackIcon title={item.title} />}
      </span>
      <span className="codex-ui-integration-catalog__item-copy">
        <span className="codex-ui-integration-catalog__item-title">
          {item.title}
        </span>
        {item.description ? (
          <span className="codex-ui-integration-catalog__item-description">
            {item.description}
          </span>
        ) : null}
      </span>
      {item.installed && !item.actionLabel ? (
        <span
          aria-label={`${titleLabel} installed`}
          className="codex-ui-integration-catalog__installed-check"
          role="img"
        >
          ✓
        </span>
      ) : null}
      {item.actionLabel ? (
        <button
          aria-label={item.actionAriaLabel}
          className="codex-ui-integration-catalog__item-action"
          disabled={item.disabled}
          onClick={() => onAction?.(item)}
          type="button"
        >
          {item.actionLabel}
        </button>
      ) : null}
    </article>
  );
}

export function IntegrationCatalogTabs({
  active,
  className,
  onChange,
  pluginsLabel = "Plugins",
  skillsLabel = "Skills",
  ...props
}: IntegrationCatalogTabsProps) {
  return (
    <div
      aria-label="Integration catalog"
      className={["codex-ui-integration-catalog-tabs", className]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      {...props}
    >
      {([
        ["plugins", pluginsLabel],
        ["skills", skillsLabel],
      ] as const).map(([kind, label]) => (
        <button
          aria-selected={active === kind}
          className="codex-ui-integration-catalog-tabs__tab"
          data-active={active === kind || undefined}
          key={kind}
          onClick={() => onChange?.(kind)}
          role="tab"
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function IntegrationCatalogPage({
  activeScope,
  className,
  description,
  emptyLabel = "No results",
  installedItems = [],
  installedLabel = "Installed",
  installedMoreLabel,
  kind,
  loadingLabel = "Loading…",
  onItemAction,
  onItemOpen,
  onInstalledMore,
  onManage,
  onMore,
  onQueryChange,
  onRetry,
  onScopeChange,
  query = "",
  retryLabel = "Retry",
  scopes = [],
  sections = [],
  status = "ready",
  statusDescription,
  statusHeading,
  title = kind === "plugins" ? "Plugins" : "Skills",
  ...props
}: IntegrationCatalogPageProps) {
  const installedHeadingId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (item: IntegrationCatalogItem) =>
    !normalizedQuery || searchableText(item).includes(normalizedQuery);
  const filteredInstalled = useMemo(
    () => installedItems.filter(matches),
    [installedItems, normalizedQuery],
  );
  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter(matches),
        }))
        .filter((section) => section.items.length > 0),
    [sections, normalizedQuery],
  );
  const resultCount =
    filteredInstalled.length +
    filteredSections.reduce((total, section) => total + section.items.length, 0);
  const classes = ["codex-ui-integration-catalog", className]
    .filter(Boolean)
    .join(" ");
  const placeholder = kind === "plugins" ? "Search plugins" : "Search skills";
  const fallbackHeading =
    status === "error"
      ? "Couldn’t load integrations"
      : "Integrations unavailable";

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) =>
    onQueryChange?.(event.currentTarget.value);

  return (
    <main className={classes} data-kind={kind} data-status={status} {...props}>
      <div className="codex-ui-integration-catalog__intro">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <label className="codex-ui-integration-catalog__search">
        <CatalogSearchGlyph />
        <span className="codex-ui-integration-catalog__sr-only">
          {placeholder}
        </span>
        <input
          onChange={handleQueryChange}
          placeholder={placeholder}
          type="search"
          value={query}
        />
      </label>

      {status === "loading" ? (
        <div
          aria-live="polite"
          className="codex-ui-integration-catalog__status"
          role="status"
        >
          {loadingLabel}
        </div>
      ) : status !== "ready" ? (
        <section className="codex-ui-integration-catalog__status">
          <h2>{statusHeading ?? fallbackHeading}</h2>
          {statusDescription ? <p>{statusDescription}</p> : null}
          {onRetry ? (
            <button onClick={onRetry} type="button">
              {retryLabel}
            </button>
          ) : null}
        </section>
      ) : (
        <div className="codex-ui-integration-catalog__body">
          {installedItems.length > 0 && filteredInstalled.length > 0 ? (
            <section
              aria-labelledby={installedHeadingId}
              className="codex-ui-integration-catalog__installed"
            >
              <div className="codex-ui-integration-catalog__section-heading">
                <h2 id={installedHeadingId}>{installedLabel}</h2>
                {onManage ? (
                  <button
                    aria-label="Manage installed integrations"
                    className="codex-ui-integration-catalog__manage"
                    onClick={onManage}
                    type="button"
                  >
                    <CatalogManageGlyph />
                  </button>
                ) : null}
              </div>
              {kind === "plugins" ? (
                <div className="codex-ui-integration-catalog__installed-icons">
                  {filteredInstalled.map((item) => (
                    <button
                      aria-label={
                        typeof item.title === "string" ? item.title : item.id
                      }
                      className="codex-ui-integration-catalog__installed-icon"
                      disabled={item.disabled}
                      key={item.id}
                      onClick={() => onItemOpen?.(item)}
                      type="button"
                    >
                      {item.icon ?? <CatalogFallbackIcon title={item.title} />}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="codex-ui-integration-catalog__grid">
                    {filteredInstalled.map((item) => (
                      <CatalogItemRow
                        item={{ ...item, installed: true }}
                        key={item.id}
                        kind={kind}
                        onAction={onItemAction}
                        onOpen={onItemOpen}
                      />
                    ))}
                  </div>
                  {installedMoreLabel && !normalizedQuery ? (
                    <button
                      className="codex-ui-integration-catalog__installed-more"
                      onClick={onInstalledMore}
                      type="button"
                    >
                      {installedMoreLabel}
                    </button>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {scopes.length > 0 ? (
            <div
              aria-label={`${kind === "plugins" ? "Plugin" : "Skill"} scope`}
              className="codex-ui-integration-catalog__scopes"
              role="tablist"
            >
              {scopes.map((scope) => (
                <button
                  aria-selected={scope.id === activeScope}
                  data-active={scope.id === activeScope || undefined}
                  key={scope.id}
                  onClick={() => onScopeChange?.(scope)}
                  role="tab"
                  type="button"
                >
                  {scope.label}
                </button>
              ))}
            </div>
          ) : null}

          {filteredSections.map((section) => {
            const headingId = `${installedHeadingId}-${section.id}`;
            return (
              <section
                aria-labelledby={section.title ? headingId : undefined}
                className="codex-ui-integration-catalog__section"
                key={section.id}
              >
                {section.title ? (
                  <div className="codex-ui-integration-catalog__section-heading">
                    <h2 id={headingId}>{section.title}</h2>
                  </div>
                ) : null}
                <div className="codex-ui-integration-catalog__grid">
                  {section.items.map((item) => (
                    <CatalogItemRow
                      item={item}
                      key={item.id}
                      kind={kind}
                      onAction={onItemAction}
                      onOpen={onItemOpen}
                    />
                  ))}
                </div>
                {section.moreLabel ? (
                  <button
                    className="codex-ui-integration-catalog__more"
                    onClick={() => onMore?.(section)}
                    type="button"
                  >
                    {section.moreLabel}
                  </button>
                ) : null}
              </section>
            );
          })}

          {resultCount === 0 ? (
            <p className="codex-ui-integration-catalog__empty">{emptyLabel}</p>
          ) : null}
        </div>
      )}
    </main>
  );
}
