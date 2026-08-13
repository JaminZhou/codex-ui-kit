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
import { Menu, MenuItem } from "./InteractivePrimitives.js";

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
    const bounded = Math.min(max, Math.max(min, parsed));
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
                      {icon ?? dockIcon.slice(0, 1).toUpperCase()}
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
