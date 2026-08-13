import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Menu, MenuItem, Popover } from "./InteractivePrimitives.js";

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
  backButtonRef?: Ref<HTMLButtonElement>;
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
  backButtonRef,
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
  const sectionHeadingIdPrefix = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
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
          ref={backButtonRef}
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
            ref={searchInputRef}
            role="searchbox"
            type="text"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear settings search"
              className="codex-ui-settings-shell__search-clear"
              onClick={() => {
                searchInputRef.current?.focus();
                onQueryChange("");
              }}
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
                aria-labelledby={`${sectionHeadingIdPrefix}-${section.id}`}
                className="codex-ui-settings-shell__section"
                key={section.id}
              >
                <h2 id={`${sectionHeadingIdPrefix}-${section.id}`}>
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
  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const lastIndex = options.length - 1;
    const nextIndex =
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? currentIndex === 0
          ? lastIndex
          : currentIndex - 1
        : event.key === "ArrowRight" || event.key === "ArrowDown"
          ? currentIndex === lastIndex
            ? 0
            : currentIndex + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (nextIndex === null || !options[nextIndex]) return;

    event.preventDefault();
    onChange(options[nextIndex].value);
    const radios =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        '[role="radio"]',
      );
    radios?.[nextIndex]?.focus();
  };

  return (
    <div
      aria-label={label}
      className="codex-ui-git-settings__segmented"
      role="radiogroup"
    >
      {options.map((option, index) => (
        <button
          aria-checked={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => moveSelection(event, index)}
          role="radio"
          tabIndex={value === option.value ? 0 : -1}
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

export type AppearanceThemeMode = "system" | "light" | "dark";
export type AppearanceDockIcon = "chatgpt" | "codex";
export type AppearanceReduceMotion = "system" | "on" | "off";
export type AppearanceDiffMarkers = "color" | "symbols";
export type AppearanceThemeKind = "Light" | "Dark";

export interface AppearanceThemeConfig {
  accent: string;
  background: string;
  codeFont: string;
  codeTheme: string;
  contrast: number;
  foreground: string;
  translucentSidebar: boolean;
  uiFont: string;
}

export interface AppearanceSettingsValue {
  codeFontSize: number;
  dark: AppearanceThemeConfig;
  diffMarkers: AppearanceDiffMarkers;
  dockIcon: AppearanceDockIcon;
  fontSmoothing: boolean;
  light: AppearanceThemeConfig;
  reduceMotion: AppearanceReduceMotion;
  theme: AppearanceThemeMode;
  uiFontSize: number;
  usePointerCursors: boolean;
}

export interface AppearanceSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  chatGptDockIcon?: ReactNode;
  codeThemeOptions?: readonly string[];
  codexDockIcon?: ReactNode;
  onChange: (value: AppearanceSettingsValue) => void;
  onCopyTheme?: (theme: AppearanceThemeKind) => void;
  onImportTheme?: (theme: AppearanceThemeKind) => void;
  value: AppearanceSettingsValue;
}

const defaultCodeThemeOptions = [
  "Absolutely",
  "Catppuccin",
  "Codex",
  "Everforest",
  "GitHub",
  "Gruvbox",
  "Linear",
  "Notion",
  "One",
  "Proof",
  "Raycast",
  "Rose Pine",
  "Solarized",
  "Vercel",
  "VS Code Plus",
  "Xcode",
] as const;

function AppearanceThemePreview({
  checked,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: (value: AppearanceThemeMode) => void;
  value: AppearanceThemeMode;
}) {
  return (
    <label className="codex-ui-appearance-settings__theme-choice">
      <input
        aria-label={label}
        checked={checked}
        name={name}
        onChange={() => onChange(value)}
        type="radio"
        value={value}
      />
      <span
        aria-hidden="true"
        className="codex-ui-appearance-settings__theme-preview"
        data-theme-preview={value}
      >
        <span className="codex-ui-appearance-settings__theme-preview-rail" />
        <span className="codex-ui-appearance-settings__theme-preview-main">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}

function AppearanceDiffPreview() {
  return (
    <div
      aria-label="Code diff preview"
      className="codex-ui-appearance-settings__diff-preview"
      role="img"
    >
      <pre aria-hidden="true">
        <code>
          <span>1</span> const themePreview = {"{"}
          {"\n"}<span>2</span>   accent: &quot;blue&quot;,
          {"\n"}<span>3</span>   contrast: 45,
          {"\n"}<span>4</span> {"}"};
        </code>
      </pre>
      <pre aria-hidden="true">
        <code>
          <span>1</span> const themePreview = {"{"}
          {"\n"}<span>2</span>   accent: &quot;cyan&quot;,
          {"\n"}<span>3</span>   contrast: 60,
          {"\n"}<span>4</span> {"}"};
        </code>
      </pre>
    </div>
  );
}

function AppearanceSwitch({
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
      className="codex-ui-appearance-settings__switch"
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

function AppearanceThemeEditor({
  codeThemeOptions,
  config,
  kind,
  onChange,
  onCopy,
  onImport,
}: {
  codeThemeOptions: readonly string[];
  config: AppearanceThemeConfig;
  kind: AppearanceThemeKind;
  onChange: (config: AppearanceThemeConfig) => void;
  onCopy?: () => void;
  onImport?: () => void;
}) {
  const accentInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const foregroundInputRef = useRef<HTMLInputElement>(null);
  const update = <K extends keyof AppearanceThemeConfig>(
    key: K,
    nextValue: AppearanceThemeConfig[K],
  ) => onChange({ ...config, [key]: nextValue });
  const colorRows = [
    ["accent", "Accent", accentInputRef],
    ["background", "Background", backgroundInputRef],
    ["foreground", "Foreground", foregroundInputRef],
  ] as const;

  return (
    <section
      aria-label={`${kind} theme editor`}
      className="codex-ui-appearance-settings__editor"
    >
      <header>
        <h2>{kind} theme</h2>
        <div className="codex-ui-appearance-settings__editor-actions">
          <button
            aria-label={`Import ${kind} theme`}
            disabled={!onImport}
            onClick={onImport}
            type="button"
          >
            Import
          </button>
          <button
            aria-label={`Copy ${kind} theme`}
            disabled={!onCopy}
            onClick={onCopy}
            type="button"
          >
            Copy theme
          </button>
          <Menu
            align="end"
            className="codex-ui-appearance-settings__code-theme-menu"
            label={`${kind} code themes`}
            sideOffset={4}
            trigger={
              <button
                aria-label={`${kind} code theme`}
                className="codex-ui-appearance-settings__code-theme-trigger"
                type="button"
              >
                <span aria-hidden="true">Aa</span>
                <span>{config.codeTheme}</span>
              </button>
            }
          >
            {codeThemeOptions.map((option) => (
              <MenuItem
                aria-current={option === config.codeTheme ? "true" : undefined}
                key={option}
                onSelect={() => update("codeTheme", option)}
                startIcon={<span className="codex-ui-appearance-settings__aa">Aa</span>}
              >
                {option}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </header>
      {colorRows.map(([key, label, inputRef]) => (
        <div className="codex-ui-appearance-settings__editor-row" key={key}>
          <span>{label}</span>
          <div className="codex-ui-appearance-settings__color-control">
            <button
              aria-label={`Choose ${kind} ${key} color`}
              onClick={() => inputRef.current?.click()}
              style={{ backgroundColor: config[key] }}
              type="button"
            />
            <input
              aria-hidden="true"
              className="codex-ui-appearance-settings__native-color"
              onChange={(event) => update(key, event.currentTarget.value)}
              ref={inputRef}
              tabIndex={-1}
              type="color"
              value={
                /^#[0-9a-f]{6}$/i.test(config[key]) ? config[key] : "#000000"
              }
            />
            <input
              aria-label={`${kind} ${key === "foreground" ? "ink" : key} color`}
              onChange={(event) => update(key, event.currentTarget.value)}
              spellCheck={false}
              type="text"
              value={config[key]}
            />
          </div>
        </div>
      ))}
      <label className="codex-ui-appearance-settings__editor-row">
        <span>UI font</span>
        <input
          aria-label={`${kind} UI font`}
          onChange={(event) => update("uiFont", event.currentTarget.value)}
          spellCheck={false}
          type="text"
          value={config.uiFont}
        />
      </label>
      <label className="codex-ui-appearance-settings__editor-row">
        <span>Code font</span>
        <input
          aria-label={`${kind} code font`}
          onChange={(event) => update("codeFont", event.currentTarget.value)}
          spellCheck={false}
          type="text"
          value={config.codeFont}
        />
      </label>
      <div className="codex-ui-appearance-settings__editor-row">
        <span>Translucent sidebar</span>
        <AppearanceSwitch
          checked={config.translucentSidebar}
          label={`${kind} translucent sidebar`}
          onChange={(translucentSidebar) =>
            update("translucentSidebar", translucentSidebar)
          }
        />
      </div>
      <label className="codex-ui-appearance-settings__editor-row codex-ui-appearance-settings__contrast-row">
        <span>Contrast</span>
        <span className="codex-ui-appearance-settings__range-control">
          <input
            aria-label={`${kind} contrast`}
            max="100"
            min="0"
            onChange={(event) =>
              update("contrast", Number(event.currentTarget.value))
            }
            step="1"
            type="range"
            value={config.contrast}
          />
          <output>{config.contrast}</output>
        </span>
      </label>
    </section>
  );
}

function AppearanceToggleGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { ariaLabel?: string; label: string; value: T }[];
  value: T;
}) {
  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const lastIndex = options.length - 1;
    const nextIndex =
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? currentIndex === 0
          ? lastIndex
          : currentIndex - 1
        : event.key === "ArrowRight" || event.key === "ArrowDown"
          ? currentIndex === lastIndex
            ? 0
            : currentIndex + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (nextIndex === null || !options[nextIndex]) return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")
      [nextIndex]?.focus();
  };

  return (
    <div
      aria-label={label}
      className="codex-ui-appearance-settings__segmented"
      role="group"
    >
      {options.map((option, index) => (
        <button
          aria-label={option.ariaLabel ?? option.label}
          aria-pressed={option.value === value}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => moveSelection(event, index)}
          tabIndex={option.value === value ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AppearancePreferenceRow({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: string;
  label: string;
}) {
  return (
    <div className="codex-ui-appearance-settings__preference-row">
      <div>
        <span>{label}</span>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

function AppearanceNumberInput({
  label,
  max,
  min,
  onCommit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    editing.current = false;
    const parsed = draft.trim() === "" ? Number.NaN : Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const bounded = Math.min(max, Math.max(min, Math.round(parsed)));
    setDraft(String(bounded));
    onCommit(bounded);
  };

  return (
    <input
      aria-label={label}
      max={max}
      min={min}
      onBlur={commit}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onFocus={() => {
        editing.current = true;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      step="1"
      type="number"
      value={draft}
    />
  );
}

export function AppearanceSettingsPage({
  chatGptDockIcon,
  className,
  codeThemeOptions = defaultCodeThemeOptions,
  codexDockIcon,
  onChange,
  onCopyTheme,
  onImportTheme,
  value,
  ...props
}: AppearanceSettingsPageProps) {
  const dockGroupName = useId();
  const themeGroupName = useId();
  const themeHeadingId = useId();
  const update = <K extends keyof AppearanceSettingsValue>(
    key: K,
    nextValue: AppearanceSettingsValue[K],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <article
      {...props}
      className={["codex-ui-appearance-settings", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h1>Appearance</h1>
      <div className="codex-ui-appearance-settings__content">
        <section
          aria-labelledby={themeHeadingId}
          className="codex-ui-appearance-settings__theme-section"
        >
          <h2 id={themeHeadingId}>Theme</h2>
          <div
            aria-label="Theme"
            className="codex-ui-appearance-settings__theme-options"
            role="radiogroup"
          >
            {(["system", "light", "dark"] as const).map((theme) => (
              <AppearanceThemePreview
                checked={value.theme === theme}
                key={theme}
                label={`${theme[0]?.toUpperCase()}${theme.slice(1)}`}
                name={themeGroupName}
                onChange={(nextTheme) => update("theme", nextTheme)}
                value={theme}
              />
            ))}
          </div>
          <AppearanceDiffPreview />
        </section>
        <AppearanceThemeEditor
          codeThemeOptions={codeThemeOptions}
          config={value.light}
          kind="Light"
          onChange={(light) => update("light", light)}
          onCopy={
            onCopyTheme ? () => onCopyTheme("Light") : undefined
          }
          onImport={
            onImportTheme ? () => onImportTheme("Light") : undefined
          }
        />
        <AppearanceThemeEditor
          codeThemeOptions={codeThemeOptions}
          config={value.dark}
          kind="Dark"
          onChange={(dark) => update("dark", dark)}
          onCopy={onCopyTheme ? () => onCopyTheme("Dark") : undefined}
          onImport={
            onImportTheme ? () => onImportTheme("Dark") : undefined
          }
        />
        <section className="codex-ui-appearance-settings__preferences">
          <h2>Preferences</h2>
          <div
            aria-label="Appearance preferences"
            className="codex-ui-appearance-settings__preferences-card"
          >
            <AppearancePreferenceRow
              description="Change the cursor to a pointer when hovering over interactive elements"
              label="Use pointer cursors"
            >
              <AppearanceSwitch
                checked={value.usePointerCursors}
                label="Use pointer cursors"
                onChange={(usePointerCursors) =>
                  update("usePointerCursors", usePointerCursors)
                }
              />
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Choose the icon the app will use in the dock"
              label="Dock icon"
            >
              <div
                aria-label="Dock icon"
                className="codex-ui-appearance-settings__dock-icons"
                role="radiogroup"
              >
                {([
                  ["chatgpt", "Use ChatGPT Dock icon", chatGptDockIcon],
                  ["codex", "Use Codex Dock icon", codexDockIcon],
                ] as const).map(([dockIcon, label, icon]) => (
                  <label key={dockIcon}>
                    <input
                      aria-label={label}
                      checked={value.dockIcon === dockIcon}
                      name={dockGroupName}
                      onChange={() => update("dockIcon", dockIcon)}
                      type="radio"
                    />
                    <span aria-hidden="true">
                      {icon ?? (dockIcon === "chatgpt" ? "GPT" : "CX")}
                    </span>
                  </label>
                ))}
              </div>
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Reduce animations or match your system"
              label="Reduce motion"
            >
              <AppearanceToggleGroup
                label="Reduce motion"
                onChange={(reduceMotion) => update("reduceMotion", reduceMotion)}
                options={[
                  { label: "System", value: "system" },
                  { label: "On", value: "on" },
                  { label: "Off", value: "off" },
                ]}
                value={value.reduceMotion}
              />
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Adjust the base size used for the ChatGPT UI"
              label="UI font size"
            >
              <label className="codex-ui-appearance-settings__number-control">
                <AppearanceNumberInput
                  label="Sans font size"
                  max={16}
                  min={11}
                  onCommit={(uiFontSize) => update("uiFontSize", uiFontSize)}
                  value={value.uiFontSize}
                />
                <span>px</span>
              </label>
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Adjust the base size used for code across chats and diffs"
              label="Code font size"
            >
              <label className="codex-ui-appearance-settings__number-control">
                <AppearanceNumberInput
                  label="Code font size"
                  max={24}
                  min={8}
                  onCommit={(codeFontSize) =>
                    update("codeFontSize", codeFontSize)
                  }
                  value={value.codeFontSize}
                />
                <span>px</span>
              </label>
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Show changes using colors or +/− markers"
              label="Diff markers"
            >
              <AppearanceToggleGroup
                label="Diff markers"
                onChange={(diffMarkers) => update("diffMarkers", diffMarkers)}
                options={[
                  {
                    ariaLabel: "Color diff markers",
                    label: "Color",
                    value: "color",
                  },
                  {
                    ariaLabel: "Plus / minus diff markers",
                    label: "+/-",
                    value: "symbols",
                  },
                ]}
                value={value.diffMarkers}
              />
            </AppearancePreferenceRow>
            <AppearancePreferenceRow
              description="Use native macOS font anti-aliasing"
              label="Font smoothing"
            >
              <AppearanceSwitch
                checked={value.fontSmoothing}
                label="Font smoothing"
                onChange={(fontSmoothing) =>
                  update("fontSmoothing", fontSmoothing)
                }
              />
            </AppearancePreferenceRow>
          </div>
        </section>
      </div>
    </article>
  );
}

export type GeneralTerminalLocation = "bottom" | "right";
export type GeneralSpeed = "standard" | "fast";
export type GeneralSendShortcut =
  | "enter"
  | "command-enter-multiline"
  | "command-enter";
export type GeneralFollowUpBehavior = "queue" | "steer";
export type GeneralCompletionNotifications = "never" | "unfocused" | "always";

export interface GeneralSettingsValue {
  ambientSuggestions: boolean;
  autoReview: boolean;
  bottomPanel: boolean;
  defaultFileOpenDestination: string;
  followUpBehavior: GeneralFollowUpBehavior;
  fullAccess: boolean;
  language: string;
  permissionNotifications: boolean;
  pluginsEnabled: boolean;
  popoutHotkey: string | null;
  popoutStandaloneChat: boolean;
  preventSleepWhileRunning: boolean;
  questionNotifications: boolean;
  sendShortcut: GeneralSendShortcut;
  showContextWindowUsage: boolean;
  showInMenuBar: boolean;
  speed: GeneralSpeed;
  terminalLocation: GeneralTerminalLocation;
  turnCompletionNotifications: GeneralCompletionNotifications;
}

export interface GeneralSettingsOption {
  description?: ReactNode;
  icon?: ReactNode;
  label: string;
  value: string;
}

export interface GeneralSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  elevatedRiskHref?: string;
  fileDestinationOptions?: readonly GeneralSettingsOption[];
  hotkeyCaptureActive?: boolean;
  languageOptions?: readonly GeneralSettingsOption[];
  onCancelHotkeyCapture?: () => void;
  onChange: (value: GeneralSettingsValue) => void;
  onOpenSourceLicenses?: () => void;
  onStartHotkeyCapture?: () => void;
  value: GeneralSettingsValue;
}

const defaultGeneralFileDestinationOptions: readonly GeneralSettingsOption[] = [
  { label: "VS Code", value: "vscode" },
  { label: "Cursor", value: "cursor" },
  { label: "Sublime Text", value: "sublime-text" },
  { label: "Default app", value: "default-app" },
  { label: "Finder", value: "finder" },
  { label: "Terminal", value: "terminal" },
  { label: "Xcode", value: "xcode" },
];

const defaultGeneralLanguageOptions: readonly GeneralSettingsOption[] = [
  "Auto detect",
  "Albanian",
  "Armenian",
  "Bahasa Melayu",
  "bosanski",
  "Burmese",
  "català",
  "čeština",
  "dansk",
  "Deutsch",
  "eesti",
  "English",
  "español (España)",
  "español (Latinoamérica)",
  "Filipino",
  "français (Canada)",
  "français (France)",
  "Georgian",
  "hrvatski",
  "Icelandic",
  "Indonesia",
  "italiano",
  "Kiswahili",
  "latviešu",
  "lietuvių",
  "Macedonian",
  "magyar",
  "Mongolian",
  "Nederlands",
  "norsk bokmål",
  "polski",
  "português (Brasil)",
  "português (Portugal)",
  "română",
  "slovenčina",
  "slovenščina",
  "Somali",
  "suomi",
  "svenska",
  "Tiếng Việt",
  "Türkçe",
  "Ελληνικά",
  "български",
  "қазақ тілі",
  "русский",
  "српски",
  "українська",
  "اردو",
  "العربية",
  "فارسی",
  "አማርኛ",
  "मराठी",
  "हिन्दी",
  "বাংলা",
  "ਪੰਜਾਬੀ",
  "ગુજરાતી",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "ไทย",
  "한국어",
  "日本語",
  "简体中文",
  "繁體中文（台灣）",
  "繁體中文（香港）",
].map((label) => ({ label, value: label === "Auto detect" ? "auto" : label }));

function GeneralSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-general-settings__switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

function GeneralSettingsSection({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="codex-ui-general-settings__section"
    >
      <h2 id={headingId}>{label}</h2>
      <div className="codex-ui-general-settings__card">{children}</div>
    </section>
  );
}

function GeneralSettingsRow({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="codex-ui-general-settings__row">
      <div className="codex-ui-general-settings__row-copy">
        <span>{label}</span>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="codex-ui-general-settings__row-control">{children}</div>
    </div>
  );
}

function GeneralSegmented<T extends string>({
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
  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const lastIndex = options.length - 1;
    const nextIndex =
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? currentIndex === 0
          ? lastIndex
          : currentIndex - 1
        : event.key === "ArrowRight" || event.key === "ArrowDown"
          ? currentIndex === lastIndex
            ? 0
            : currentIndex + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (nextIndex === null || !options[nextIndex]) return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("button")
      [nextIndex]?.focus();
  };
  return (
    <div
      aria-label={label}
      className="codex-ui-general-settings__segmented"
      role="group"
    >
      {options.map((option, index) => (
        <button
          aria-label={option.label}
          aria-pressed={option.value === value}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => moveSelection(event, index)}
          tabIndex={option.value === value ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GeneralMenuControl({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly GeneralSettingsOption[];
  value: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  return (
    <Menu
      align="end"
      className="codex-ui-general-settings__menu"
      label={label}
      sideOffset={4}
      trigger={
        <button
          aria-label={label}
          className="codex-ui-general-settings__menu-trigger"
          ref={triggerRef}
          type="button"
        >
          {selected?.icon ? (
            <span aria-hidden="true" className="codex-ui-general-settings__menu-icon">
              {selected.icon}
            </span>
          ) : null}
          <span>{selected?.label ?? value}</span>
          <span aria-hidden="true" className="codex-ui-general-settings__chevron">
            ⌄
          </span>
        </button>
      }
      width="menu-wide"
    >
      {options.map((option) => (
        <MenuItem
          endIcon={option.value === value ? <span>✓</span> : undefined}
          key={option.value}
          onSelect={() => {
            onChange(option.value);
            triggerRef.current?.focus();
          }}
          startIcon={option.icon}
          subText={option.description}
        >
          {option.label}
        </MenuItem>
      ))}
    </Menu>
  );
}

function GeneralLanguageControl({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: readonly GeneralSettingsOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Popover
      align="end"
      className="codex-ui-general-settings__language-popover"
      initialFocus="first"
      label="Language"
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
      open={open}
      role="listbox"
      sideOffset={4}
      trigger={
        <button
          aria-label="Language"
          className="codex-ui-general-settings__menu-trigger"
          ref={triggerRef}
          type="button"
        >
          <span>{selected?.label ?? value}</span>
          <span aria-hidden="true" className="codex-ui-general-settings__chevron">
            ⌄
          </span>
        </button>
      }
      width="menu-wide"
    >
      <label className="codex-ui-general-settings__language-search">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="Search languages"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search languages"
          type="search"
          value={query}
        />
      </label>
      <div className="codex-ui-general-settings__language-options">
        {filtered.map((option) => (
          <button
            aria-selected={option.value === value}
            className="codex-ui-general-settings__language-option"
            key={option.value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
              setQuery("");
              triggerRef.current?.focus();
            }}
            role="option"
            tabIndex={-1}
            type="button"
          >
            <span>{option.label}</span>
            <span aria-hidden="true">{option.value === value ? "✓" : ""}</span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="codex-ui-general-settings__language-empty">No languages found</p>
        ) : null}
      </div>
    </Popover>
  );
}

export function GeneralSettingsPage({
  className,
  elevatedRiskHref,
  fileDestinationOptions = defaultGeneralFileDestinationOptions,
  hotkeyCaptureActive = false,
  languageOptions = defaultGeneralLanguageOptions,
  onCancelHotkeyCapture,
  onChange,
  onOpenSourceLicenses,
  onStartHotkeyCapture,
  value,
  ...props
}: GeneralSettingsPageProps) {
  const hotkeyEditRef = useRef<HTMLButtonElement>(null);
  const hotkeyRecordRef = useRef<HTMLButtonElement>(null);
  const hotkeyCaptureWasActiveRef = useRef(false);
  useEffect(() => {
    const wasActive = hotkeyCaptureWasActiveRef.current;
    hotkeyCaptureWasActiveRef.current = hotkeyCaptureActive;
    if (hotkeyCaptureActive && !wasActive) {
      hotkeyRecordRef.current?.focus();
    } else if (!hotkeyCaptureActive && wasActive) {
      hotkeyEditRef.current?.focus();
    }
  }, [hotkeyCaptureActive]);
  const update = <K extends keyof GeneralSettingsValue>(
    key: K,
    nextValue: GeneralSettingsValue[K],
  ) => onChange({ ...value, [key]: nextValue });
  const riskDescription = (copy: string) => (
    <>
      {copy}
      {elevatedRiskHref ? (
        <>
          {" "}
          <a href={elevatedRiskHref}>Learn more</a> about elevated risks.
        </>
      ) : null}
    </>
  );
  return (
    <article
      {...props}
      className={["codex-ui-general-settings", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h1>General</h1>
      <GeneralSettingsSection label="Permissions">
        <GeneralSettingsRow
          description="By default, ChatGPT can read and edit files in its workspace. It can ask for additional access when needed"
          label="Default permissions"
        >
          <GeneralSwitch
            checked
            disabled
            label="Default permissions are always shown"
            onChange={() => undefined}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description={riskDescription(
            "ChatGPT can read and edit files in its workspace. ChatGPT automatically reviews requests for additional access. Auto-review can make mistakes.",
          )}
          label="Auto-review"
        >
          <GeneralSwitch
            checked={value.autoReview}
            label="Show Auto-review in the composer"
            onChange={(autoReview) => update("autoReview", autoReview)}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description={riskDescription(
            "When ChatGPT runs with full access, it can edit any file on your computer and run commands with network, without your approval. This significantly increases the risk of data loss, leaks, or unexpected behavior.",
          )}
          label="Full access"
        >
          <GeneralSwitch
            checked={value.fullAccess}
            label="Show Full access in the composer"
            onChange={(fullAccess) => update("fullAccess", fullAccess)}
          />
        </GeneralSettingsRow>
      </GeneralSettingsSection>

      <GeneralSettingsSection label="General">
        <GeneralSettingsRow
          description="Where files and folders open by default"
          label="Default file open destination"
        >
          <GeneralMenuControl
            label="Default file open destination"
            onChange={(defaultFileOpenDestination) =>
              update("defaultFileOpenDestination", defaultFileOpenDestination)
            }
            options={fileDestinationOptions}
            value={value.defaultFileOpenDestination}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow description="Language for the app UI" label="Language">
          <GeneralLanguageControl
            onChange={(language) => update("language", language)}
            options={languageOptions}
            value={value.language}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Keep ChatGPT in the macOS menu bar when the main window is closed"
          label="Show in menu bar"
        >
          <GeneralSwitch
            checked={value.showInMenuBar}
            label="Show ChatGPT in the menu bar"
            onChange={(showInMenuBar) => update("showInMenuBar", showInMenuBar)}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Show the bottom panel control in the app header"
          label="Bottom panel"
        >
          <GeneralSwitch
            checked={value.bottomPanel}
            label="Bottom panel"
            onChange={(bottomPanel) => update("bottomPanel", bottomPanel)}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Choose where the terminal shortcut and environment actions open terminal tabs"
          label="Default terminal location"
        >
          <GeneralSegmented
            label="Default terminal location"
            onChange={(terminalLocation) => update("terminalLocation", terminalLocation)}
            options={[
              { label: "Bottom", value: "bottom" },
              { label: "Right", value: "right" },
            ]}
            value={value.terminalLocation}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Keep your computer awake while ChatGPT is running a task"
          label="Prevent sleep while running"
        >
          <GeneralSwitch
            checked={value.preventSleepWhileRunning}
            label="Prevent sleep while running"
            onChange={(preventSleepWhileRunning) =>
              update("preventSleepWhileRunning", preventSleepWhileRunning)
            }
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Choose how quickly ChatGPT runs across chats, subagents, and compaction"
          label="Speed"
        >
          <GeneralMenuControl
            label="Speed"
            onChange={(speed) => update("speed", speed as GeneralSpeed)}
            options={[
              { description: "Default speed", label: "Standard", value: "standard" },
              { description: "1.5x speed, increased usage", label: "Fast", value: "fast" },
            ]}
            value={value.speed}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Suggest what to do next by searching project files and connected apps"
          label="Suggested prompts"
        >
          <GeneralSwitch
            checked={value.ambientSuggestions}
            label="Enable ambient suggestions"
            onChange={(ambientSuggestions) =>
              update("ambientSuggestions", ambientSuggestions)
            }
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Third-party notices for bundled dependencies"
          label="Open source licenses"
        >
          <button
            className="codex-ui-general-settings__secondary-action"
            disabled={!onOpenSourceLicenses}
            onClick={onOpenSourceLicenses}
            type="button"
          >
            View
          </button>
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Allow ChatGPT to use installed plugins"
          label="Plugins"
        >
          <GeneralSwitch
            checked={value.pluginsEnabled}
            label="Toggle plugins"
            onChange={(pluginsEnabled) => update("pluginsEnabled", pluginsEnabled)}
          />
        </GeneralSettingsRow>
      </GeneralSettingsSection>

      <GeneralSettingsSection label="Composer">
        <GeneralSettingsRow label="Show context window usage">
          <GeneralSwitch
            checked={value.showContextWindowUsage}
            label="Show context window usage in the composer"
            onChange={(showContextWindowUsage) =>
              update("showContextWindowUsage", showContextWindowUsage)
            }
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Choose when Enter sends a prompt or inserts a new line"
          label="Send shortcut"
        >
          <GeneralMenuControl
            label="Send shortcut"
            onChange={(sendShortcut) =>
              update("sendShortcut", sendShortcut as GeneralSendShortcut)
            }
            options={[
              { label: "Enter", value: "enter" },
              {
                label: "⌘ + Enter for multiline prompts",
                value: "command-enter-multiline",
              },
              { label: "⌘ + Enter always", value: "command-enter" },
            ]}
            value={value.sendShortcut}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Queue follow-ups while ChatGPT runs or steer the current run. Press ⌘⏎ to do the opposite for one message"
          label="Follow-up behavior"
        >
          <GeneralSegmented
            label="Follow-up behavior"
            onChange={(followUpBehavior) =>
              update("followUpBehavior", followUpBehavior)
            }
            options={[
              { label: "Queue", value: "queue" },
              { label: "Steer", value: "steer" },
            ]}
            value={value.followUpBehavior}
          />
        </GeneralSettingsRow>
      </GeneralSettingsSection>

      <GeneralSettingsSection label="Popout Window">
        <GeneralSettingsRow
          description="Set a global shortcut for Popout Window. Leave unset to keep it off."
          label="Popout Window hotkey"
        >
          {hotkeyCaptureActive ? (
            <div className="codex-ui-general-settings__hotkey-capture">
              <button
                className="codex-ui-general-settings__hotkey-record"
                ref={hotkeyRecordRef}
                type="button"
              >
                Press shortcut
              </button>
              <button
                className="codex-ui-general-settings__secondary-action"
                disabled={!onCancelHotkeyCapture}
                onClick={onCancelHotkeyCapture}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              aria-label="Set shortcut for Popout Window hotkey"
              className="codex-ui-general-settings__hotkey-edit"
              disabled={!onStartHotkeyCapture}
              onClick={onStartHotkeyCapture}
              ref={hotkeyEditRef}
              type="button"
            >
              <span>{value.popoutHotkey ?? "Off"}</span>
              <span aria-hidden="true">⌁</span>
            </button>
          )}
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Start new chats outside of any project"
          label="Default to standalone chat"
        >
          <GeneralSwitch
            checked={value.popoutStandaloneChat}
            label="Default Popout Window to standalone chat"
            onChange={(popoutStandaloneChat) =>
              update("popoutStandaloneChat", popoutStandaloneChat)
            }
          />
        </GeneralSettingsRow>
      </GeneralSettingsSection>

      <GeneralSettingsSection label="Notifications">
        <GeneralSettingsRow
          description="Set when ChatGPT alerts you that it's finished"
          label="Turn completion notifications"
        >
          <GeneralMenuControl
            label="Turn completion notifications"
            onChange={(turnCompletionNotifications) =>
              update(
                "turnCompletionNotifications",
                turnCompletionNotifications as GeneralCompletionNotifications,
              )
            }
            options={[
              { label: "Never", value: "never" },
              { label: "Only when unfocused", value: "unfocused" },
              { label: "Always", value: "always" },
            ]}
            value={value.turnCompletionNotifications}
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Show alerts when notification permissions are required"
          label="Enable permission notifications"
        >
          <GeneralSwitch
            checked={value.permissionNotifications}
            label="Enable permission notifications"
            onChange={(permissionNotifications) =>
              update("permissionNotifications", permissionNotifications)
            }
          />
        </GeneralSettingsRow>
        <GeneralSettingsRow
          description="Show alerts when input is needed to continue"
          label="Enable question notifications"
        >
          <GeneralSwitch
            checked={value.questionNotifications}
            label="Enable question notifications"
            onChange={(questionNotifications) =>
              update("questionNotifications", questionNotifications)
            }
          />
        </GeneralSettingsRow>
      </GeneralSettingsSection>
    </article>
  );
}
