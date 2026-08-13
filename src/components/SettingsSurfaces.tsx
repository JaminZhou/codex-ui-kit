import {
  type HTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
} from "react";

export interface SettingsNavigationItem {
  description?: string;
  icon?: ReactNode;
  id: string;
  keywords?: readonly string[];
  label: string;
  resultLabel?: string;
}

export interface SettingsNavigationSection {
  id: string;
  items: readonly SettingsNavigationItem[];
  label: string;
}

export type SettingsShellStatus = "error" | "loading" | "ready";

export interface SettingsShellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  backIcon?: ReactNode;
  backLabel?: string;
  children?: ReactNode;
  emptyLabel?: ReactNode;
  error?: ReactNode;
  navigationLabel?: string;
  onBack: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (itemId: string) => void;
  query: string;
  searchIcon?: ReactNode;
  searchLabel?: string;
  searchPlaceholder?: string;
  sections: readonly SettingsNavigationSection[];
  selectedId: string;
  status?: SettingsShellStatus;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesSettingsItem(item: SettingsNavigationItem, query: string) {
  if (!query) return true;
  return [item.label, item.resultLabel, item.description, ...(item.keywords ?? [])]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

export function SettingsShell({
  backIcon,
  backLabel = "Back to app",
  children,
  className,
  emptyLabel = "No settings found",
  error = "Settings could not be loaded.",
  navigationLabel = "Settings",
  onBack,
  onQueryChange,
  onSelect,
  query,
  searchIcon,
  searchLabel = "Search settings",
  searchPlaceholder = "Search settings…",
  sections,
  selectedId,
  status = "ready",
  ...props
}: SettingsShellProps) {
  const normalizedQuery = normalizeSearchValue(query);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        matchesSettingsItem(item, normalizedQuery),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div
      {...props}
      className={["codex-ui-settings-shell", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <nav
        aria-label={navigationLabel}
        className="codex-ui-settings-shell__navigation"
      >
        <button
          className="codex-ui-settings-shell__back"
          onClick={onBack}
          type="button"
        >
          {backIcon ? (
            <span aria-hidden="true" className="codex-ui-settings-shell__icon">
              {backIcon}
            </span>
          ) : null}
          <span>{backLabel}</span>
        </button>
        <label className="codex-ui-settings-shell__search">
          <span className="codex-ui-settings-shell__visually-hidden">
            {searchLabel}
          </span>
          {searchIcon ? (
            <span aria-hidden="true" className="codex-ui-settings-shell__icon">
              {searchIcon}
            </span>
          ) : null}
          <input
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            role="searchbox"
            type="text"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear settings search"
              className="codex-ui-settings-shell__search-clear"
              onClick={() => onQueryChange("")}
              type="button"
            >
              ×
            </button>
          ) : null}
        </label>
        <div className="codex-ui-settings-shell__navigation-scroll">
          {status === "loading" ? (
            <div
              className="codex-ui-settings-shell__state"
              role="status"
            >
              Loading settings…
            </div>
          ) : status === "error" ? (
            <div className="codex-ui-settings-shell__state" role="alert">
              {error}
            </div>
          ) : visibleSections.length === 0 ? (
            <div className="codex-ui-settings-shell__state" role="status">
              {emptyLabel}
            </div>
          ) : (
            visibleSections.map((section) => (
              <section
                aria-labelledby={`codex-ui-settings-section-${section.id}`}
                className="codex-ui-settings-shell__section"
                key={section.id}
              >
                <h2 id={`codex-ui-settings-section-${section.id}`}>
                  {normalizedQuery ? null : section.label}
                </h2>
                {section.items.map((item) => (
                  <button
                    aria-current={item.id === selectedId ? "page" : undefined}
                    aria-label={item.label}
                    className="codex-ui-settings-shell__item"
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    type="button"
                  >
                    <span className="codex-ui-settings-shell__item-heading">
                      {item.icon ? (
                        <span
                          aria-hidden="true"
                          className="codex-ui-settings-shell__icon"
                        >
                          {item.icon}
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </span>
                    {normalizedQuery && item.resultLabel ? (
                      <span className="codex-ui-settings-shell__result-label">
                        {item.resultLabel}
                      </span>
                    ) : null}
                  </button>
                ))}
              </section>
            ))
          )}
        </div>
      </nav>
      <main className="codex-ui-settings-shell__main">
        {status === "ready" ? children : null}
      </main>
    </div>
  );
}

export type GitSettingsMergeMethod = "merge" | "squash";
export type GitSettingsReviewDelivery = "detached" | "inline";

export interface GitSettingsValue {
  alwaysForcePush: boolean;
  branchPrefix: string;
  commitInstructions: string;
  createDraftPullRequests: boolean;
  mergeMethod: GitSettingsMergeMethod;
  pullRequestInstructions: string;
  reviewDelivery: GitSettingsReviewDelivery;
}

export interface GitSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  commitInstructionsDirty?: boolean;
  onChange: (value: GitSettingsValue) => void;
  onSaveCommitInstructions?: () => void;
  onSavePullRequestInstructions?: () => void;
  pullRequestInstructionsDirty?: boolean;
  value: GitSettingsValue;
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}) {
  return (
    <div
      aria-label={label}
      className="codex-ui-git-settings__segmented"
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          aria-checked={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettingsSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-git-settings__switch"
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

function InstructionSection({
  description,
  dirty,
  label,
  onChange,
  onSave,
  placeholder,
  value,
}: {
  description: string;
  dirty: boolean;
  label: string;
  onChange: TextareaHTMLAttributes<HTMLTextAreaElement>["onChange"];
  onSave?: () => void;
  placeholder: string;
  value: string;
}) {
  const descriptionId = useId();
  return (
    <section className="codex-ui-git-settings__instructions">
      <header>
        <div>
          <h2>{label}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <button disabled={!dirty || !onSave} onClick={onSave} type="button">
          Save
        </button>
      </header>
      <textarea
        aria-describedby={descriptionId}
        aria-label={label}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </section>
  );
}

export function GitSettingsPage({
  className,
  commitInstructionsDirty = false,
  onChange,
  onSaveCommitInstructions,
  onSavePullRequestInstructions,
  pullRequestInstructionsDirty = false,
  value,
  ...props
}: GitSettingsPageProps) {
  const prefixId = useId();
  const update = <K extends keyof GitSettingsValue>(
    key: K,
    nextValue: GitSettingsValue[K],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <article
      {...props}
      className={["codex-ui-git-settings", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h1>Git</h1>
      <section
        aria-label="Git preferences"
        className="codex-ui-git-settings__card"
      >
        <div className="codex-ui-git-settings__row">
          <div>
            <label htmlFor={prefixId}>Branch prefix</label>
            <p>Prefix used when ChatGPT creates new branches</p>
          </div>
          <input
            aria-label="Branch prefix"
            id={prefixId}
            onChange={(event) => update("branchPrefix", event.currentTarget.value)}
            placeholder="codex/"
            spellCheck={false}
            type="text"
            value={value.branchPrefix}
          />
        </div>
        <div className="codex-ui-git-settings__row">
          <div>
            <span>Pull request merge method</span>
            <p>Choose how ChatGPT merges pull requests</p>
          </div>
          <SegmentedControl
            label="Pull request merge method"
            onChange={(mergeMethod) => update("mergeMethod", mergeMethod)}
            options={[
              { label: "Merge", value: "merge" },
              { label: "Squash", value: "squash" },
            ]}
            value={value.mergeMethod}
          />
        </div>
        <div className="codex-ui-git-settings__row">
          <div>
            <span>Always force push</span>
            <p>Use --force-with-lease when pushing from ChatGPT</p>
          </div>
          <SettingsSwitch
            checked={value.alwaysForcePush}
            label="Always force push"
            onChange={(alwaysForcePush) =>
              update("alwaysForcePush", alwaysForcePush)
            }
          />
        </div>
        <div className="codex-ui-git-settings__row">
          <div>
            <span>Create draft pull requests</span>
            <p>Use draft pull requests by default when creating PRs from ChatGPT</p>
          </div>
          <SettingsSwitch
            checked={value.createDraftPullRequests}
            label="Create draft pull requests"
            onChange={(createDraftPullRequests) =>
              update("createDraftPullRequests", createDraftPullRequests)
            }
          />
        </div>
        <div className="codex-ui-git-settings__row">
          <div>
            <span>Review delivery</span>
            <p>
              Start /review in the current chat when possible or launch a
              separate review chat
            </p>
          </div>
          <SegmentedControl
            label="Review delivery"
            onChange={(reviewDelivery) =>
              update("reviewDelivery", reviewDelivery)
            }
            options={[
              { label: "Inline", value: "inline" },
              { label: "Detached", value: "detached" },
            ]}
            value={value.reviewDelivery}
          />
        </div>
      </section>
      <InstructionSection
        description="Added to commit message generation prompts"
        dirty={commitInstructionsDirty}
        label="Commit instructions"
        onChange={(event) =>
          update("commitInstructions", event.currentTarget.value)
        }
        onSave={onSaveCommitInstructions}
        placeholder="Add commit message guidance…"
        value={value.commitInstructions}
      />
      <InstructionSection
        description="Added to PR title/description generation prompts"
        dirty={pullRequestInstructionsDirty}
        label="Pull request instructions"
        onChange={(event) =>
          update("pullRequestInstructions", event.currentTarget.value)
        }
        onSave={onSavePullRequestInstructions}
        placeholder="Add pull request guidance…"
        value={value.pullRequestInstructions}
      />
    </article>
  );
}
