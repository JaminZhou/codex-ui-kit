import {
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useMemo,
} from "react";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

export type ScheduledTaskFilter = "all" | "active" | "paused" | "completed";
export type ScheduledTaskPageStatus =
  | "ready"
  | "loading"
  | "error"
  | "unavailable";
export type ScheduledTaskStatus = Exclude<ScheduledTaskFilter, "all">;

export interface ScheduledTaskItem {
  actionIcon?: ReactNode;
  id: string;
  leading?: ReactNode;
  nextRun?: ReactNode;
  schedule?: ReactNode;
  status: ScheduledTaskStatus;
  title: ReactNode;
}

export interface ScheduledTaskSuggestion {
  addIcon?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  id: string;
  schedule?: ReactNode;
  title: ReactNode;
}

export interface ScheduledTaskFilterTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  active: ScheduledTaskFilter;
  labels?: Partial<Record<ScheduledTaskFilter, ReactNode>>;
  onChange?: (filter: ScheduledTaskFilter) => void;
}

const scheduledTaskFilters: readonly ScheduledTaskFilter[] = [
  "all",
  "active",
  "paused",
  "completed",
];

export function ScheduledTaskFilterTabs({
  active,
  className,
  labels,
  onChange,
  ...props
}: ScheduledTaskFilterTabsProps) {
  return (
    <div
      aria-label="Scheduled task status"
      className={["codex-ui-scheduled-task-filters", className]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      {...props}
    >
      {scheduledTaskFilters.map((filter) => (
        <button
          aria-selected={active === filter}
          data-active={active === filter || undefined}
          key={filter}
          onClick={() => onChange?.(filter)}
          role="tab"
          type="button"
        >
          {labels?.[filter] ??
            `${filter.slice(0, 1).toLocaleUpperCase()}${filter.slice(1)}`}
        </button>
      ))}
    </div>
  );
}

function ScheduledSearchGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M7.33057 1.98535C10.2484 1.98535 12.6136 4.3508 12.6138 7.26855C12.6138 8.58031 12.1346 9.77942 11.3433 10.7031L13.9897 13.3496C14.1655 13.5253 14.1655 13.8106 13.9897 13.9863C13.814 14.1621 13.5288 14.1621 13.353 13.9863L10.7017 11.335C9.78678 12.0942 8.61243 12.5518 7.33057 12.5518C4.41281 12.5516 2.04736 10.1864 2.04736 7.26855C2.04754 4.35091 4.41292 1.98553 7.33057 1.98535ZM7.33057 2.88574C4.90998 2.88592 2.94793 4.84796 2.94775 7.26855C2.94775 9.68929 4.90987 11.6522 7.33057 11.6523C9.75141 11.6523 11.7144 9.6894 11.7144 7.26855C11.7142 4.84786 9.75131 2.88574 7.33057 2.88574Z" />
    </svg>
  );
}

function ScheduledChevronGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 21">
      <path d="M15.2793 7.71101C15.539 7.45131 15.961 7.45131 16.2207 7.71101C16.4804 7.97071 16.4804 8.39272 16.2207 8.65242L10.4707 14.4024C10.211 14.6621 9.78902 14.6621 9.52932 14.4024L3.77932 8.65242L3.69436 8.54792C3.52385 8.28979 3.55205 7.93828 3.77932 7.71101C4.00659 7.48374 4.3581 7.45554 4.61623 7.62605L4.72073 7.71101L10 12.9903L15.2793 7.71101Z" />
    </svg>
  );
}

function ScheduledPlusGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5L16.6338 9.34863C16.9369 9.41057 17.165 9.67857 17.165 10C17.165 10.3214 16.9369 10.5894 16.6338 10.6514L16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z" />
    </svg>
  );
}

function searchableText(...values: ReactNode[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function ScheduledTaskRows({
  onOpen,
  onToggle,
  tasks,
}: {
  onOpen?: (task: ScheduledTaskItem) => void;
  onToggle?: (task: ScheduledTaskItem) => void;
  tasks: readonly ScheduledTaskItem[];
}) {
  return (
    <div className="codex-ui-scheduled-tasks__task-list">
      {tasks.map((task) => {
        const title = typeof task.title === "string" ? task.title : task.id;
        const actionLabel = task.status === "paused" ? "Resume" : "Pause";
        return (
          <article
            className="codex-ui-scheduled-tasks__task"
            data-status={task.status}
            key={task.id}
          >
            {onOpen ? (
              <button
                aria-label={title}
                className="codex-ui-scheduled-tasks__row-open"
                onClick={() => onOpen(task)}
                type="button"
              />
            ) : null}
            <button
              aria-label={actionLabel}
              className="codex-ui-scheduled-tasks__task-action"
              onClick={() => onToggle?.(task)}
              type="button"
            >
              {task.actionIcon ?? task.leading ?? <span />}
            </button>
            <span className="codex-ui-scheduled-tasks__task-copy">
              <span className="codex-ui-scheduled-tasks__task-title">
                {task.title}
              </span>
              {task.schedule || task.nextRun ? (
                <span className="codex-ui-scheduled-tasks__task-meta">
                  {task.schedule}
                  {task.schedule && task.nextRun ? (
                    <span aria-hidden="true">·</span>
                  ) : null}
                  {task.nextRun}
                </span>
              ) : null}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function ScheduledSuggestionRows({
  onAdd,
  onOpen,
  suggestions,
}: {
  onAdd?: (suggestion: ScheduledTaskSuggestion) => void;
  onOpen?: (suggestion: ScheduledTaskSuggestion) => void;
  suggestions: readonly ScheduledTaskSuggestion[];
}) {
  return (
    <div className="codex-ui-scheduled-tasks__suggestion-list">
      {suggestions.map((suggestion) => {
        const title =
          typeof suggestion.title === "string" ? suggestion.title : suggestion.id;
        return (
          <article
            className="codex-ui-scheduled-tasks__suggestion"
            key={suggestion.id}
          >
            {onOpen ? (
              <button
                aria-label={title}
                className="codex-ui-scheduled-tasks__row-open"
                onClick={() => onOpen(suggestion)}
                type="button"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="codex-ui-scheduled-tasks__suggestion-icon"
            >
              {suggestion.icon}
            </span>
            <span className="codex-ui-scheduled-tasks__suggestion-copy">
              <span className="codex-ui-scheduled-tasks__suggestion-title">
                {suggestion.title}
                {suggestion.schedule ? (
                  <span className="codex-ui-scheduled-tasks__suggestion-schedule">
                    {suggestion.schedule}
                  </span>
                ) : null}
              </span>
              {suggestion.description ? (
                <span className="codex-ui-scheduled-tasks__suggestion-description">
                  {suggestion.description}
                </span>
              ) : null}
            </span>
            <button
              aria-label={`Add ${title} scheduled task`}
              className="codex-ui-scheduled-tasks__suggestion-add"
              onClick={() => onAdd?.(suggestion)}
              type="button"
            >
              {suggestion.addIcon ?? <ScheduledPlusGlyph />}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function ScheduledTaskSearch({
  onQueryChange,
  query,
}: {
  onQueryChange?: (query: string) => void;
  query: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onQueryChange?.(event.currentTarget.value);
  return (
    <label className="codex-ui-scheduled-tasks__search">
      <ScheduledSearchGlyph />
      <span className="codex-ui-scheduled-tasks__sr-only">
        Search scheduled tasks
      </span>
      <input
        onChange={handleChange}
        placeholder="Search scheduled tasks"
        type="search"
        value={query}
      />
    </label>
  );
}

interface ScheduledTaskCollectionProps {
  activeFilter: ScheduledTaskFilter;
  emptyLabel: ReactNode;
  onSuggestionAdd?: (suggestion: ScheduledTaskSuggestion) => void;
  onSuggestionOpen?: (suggestion: ScheduledTaskSuggestion) => void;
  onTaskOpen?: (task: ScheduledTaskItem) => void;
  onTaskToggle?: (task: ScheduledTaskItem) => void;
  query: string;
  showSuggestions: boolean;
  suggestions: readonly ScheduledTaskSuggestion[];
  tasks: readonly ScheduledTaskItem[];
}

function ScheduledTaskCollection({
  activeFilter,
  emptyLabel,
  onSuggestionAdd,
  onSuggestionOpen,
  onTaskOpen,
  onTaskToggle,
  query,
  showSuggestions,
  suggestions,
  tasks,
}: ScheduledTaskCollectionProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (activeFilter === "all" || task.status === activeFilter) &&
          (!normalizedQuery ||
            searchableText(
              task.title,
              task.schedule,
              task.nextRun,
            ).includes(normalizedQuery)),
      ),
    [activeFilter, normalizedQuery, tasks],
  );
  const filteredSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          !normalizedQuery ||
          searchableText(
            suggestion.title,
            suggestion.schedule,
            suggestion.description,
          ).includes(normalizedQuery),
      ),
    [normalizedQuery, suggestions],
  );
  const suggestionsVisible =
    showSuggestions &&
    activeFilter === "all" &&
    filteredSuggestions.length > 0;
  if (filteredTasks.length === 0 && !suggestionsVisible) {
    return <p className="codex-ui-scheduled-tasks__empty">{emptyLabel}</p>;
  }
  return (
    <>
      <ScheduledTaskRows
        onOpen={onTaskOpen}
        onToggle={onTaskToggle}
        tasks={filteredTasks}
      />
      {suggestionsVisible ? (
        <section className="codex-ui-scheduled-tasks__suggestions">
          <h2>Suggestions</h2>
          <ScheduledSuggestionRows
            onAdd={onSuggestionAdd}
            onOpen={onSuggestionOpen}
            suggestions={filteredSuggestions}
          />
        </section>
      ) : null}
    </>
  );
}

export interface ScheduledTasksPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  activeFilter?: ScheduledTaskFilter;
  description?: ReactNode;
  emptyLabel?: ReactNode;
  loadingLabel?: ReactNode;
  onFilterChange?: (filter: ScheduledTaskFilter) => void;
  onQueryChange?: (query: string) => void;
  onRetry?: () => void;
  onSuggestionAdd?: (suggestion: ScheduledTaskSuggestion) => void;
  onSuggestionOpen?: (suggestion: ScheduledTaskSuggestion) => void;
  onTaskOpen?: (task: ScheduledTaskItem) => void;
  onTaskToggle?: (task: ScheduledTaskItem) => void;
  query?: string;
  retryLabel?: ReactNode;
  showSuggestions?: boolean;
  status?: ScheduledTaskPageStatus;
  statusDescription?: ReactNode;
  statusHeading?: ReactNode;
  suggestions?: readonly ScheduledTaskSuggestion[];
  tasks?: readonly ScheduledTaskItem[];
  title?: ReactNode;
}

export function ScheduledTasksPage({
  activeFilter = "all",
  className,
  description = "Ask ChatGPT to schedule tasks, set reminders, or monitor for updates",
  emptyLabel = "No scheduled tasks found",
  loadingLabel = "Loading scheduled tasks…",
  onFilterChange,
  onQueryChange,
  onRetry,
  onSuggestionAdd,
  onSuggestionOpen,
  onTaskOpen,
  onTaskToggle,
  query = "",
  retryLabel = "Retry",
  showSuggestions = true,
  status = "ready",
  statusDescription,
  statusHeading,
  suggestions = [],
  tasks = [],
  title = "Scheduled tasks",
  ...props
}: ScheduledTasksPageProps) {
  const fallbackHeading =
    status === "error" ? "Couldn’t load scheduled tasks" : "Scheduled tasks unavailable";
  return (
    <main
      className={["codex-ui-scheduled-tasks", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
      {...props}
    >
      <div className="codex-ui-scheduled-tasks__frame">
        <header className="codex-ui-scheduled-tasks__intro">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
        <ScheduledTaskSearch onQueryChange={onQueryChange} query={query} />
        <ScheduledTaskFilterTabs
          active={activeFilter}
          onChange={onFilterChange}
        />
        {status === "loading" ? (
          <div
            aria-live="polite"
            className="codex-ui-scheduled-tasks__status"
            role="status"
          >
            {loadingLabel}
          </div>
        ) : status !== "ready" ? (
          <section className="codex-ui-scheduled-tasks__status">
            <h2>{statusHeading ?? fallbackHeading}</h2>
            {statusDescription ? <p>{statusDescription}</p> : null}
            {onRetry ? (
              <button onClick={onRetry} type="button">
                {retryLabel}
              </button>
            ) : null}
          </section>
        ) : (
          <div className="codex-ui-scheduled-tasks__collection">
            <ScheduledTaskCollection
              activeFilter={activeFilter}
              emptyLabel={emptyLabel}
              onSuggestionAdd={onSuggestionAdd}
              onSuggestionOpen={onSuggestionOpen}
              onTaskOpen={onTaskOpen}
              onTaskToggle={onTaskToggle}
              query={query}
              showSuggestions={showSuggestions}
              suggestions={suggestions}
              tasks={tasks}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export interface ScheduledTaskNavigatorProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    Pick<
      ScheduledTasksPageProps,
      | "activeFilter"
      | "emptyLabel"
      | "onQueryChange"
      | "onTaskOpen"
      | "onTaskToggle"
      | "query"
      | "tasks"
    > {}

export function ScheduledTaskNavigator({
  activeFilter = "all",
  className,
  emptyLabel = "No scheduled tasks found",
  onQueryChange,
  onTaskOpen,
  onTaskToggle,
  query = "",
  tasks = [],
  ...props
}: ScheduledTaskNavigatorProps) {
  return (
    <aside
      aria-label="Scheduled task list"
      className={["codex-ui-scheduled-task-navigator", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <ScheduledTaskSearch onQueryChange={onQueryChange} query={query} />
      <div className="codex-ui-scheduled-task-navigator__collection">
        <ScheduledTaskCollection
          activeFilter={activeFilter}
          emptyLabel={emptyLabel}
          onTaskOpen={onTaskOpen}
          onTaskToggle={onTaskToggle}
          query={query}
          showSuggestions={false}
          suggestions={[]}
          tasks={tasks}
        />
      </div>
    </aside>
  );
}

export interface ScheduledTaskCreateMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  createLabel?: ReactNode;
  createWithCodexLabel?: ReactNode;
  manualLabel?: ReactNode;
  onCreateWithCodex?: () => void;
  onManualSetup?: () => void;
}

export function ScheduledTaskCreateMenu({
  className,
  createLabel = "Create",
  createWithCodexLabel = "Create with Codex",
  manualLabel = "Set up manually",
  onCreateWithCodex,
  onManualSetup,
  ...props
}: ScheduledTaskCreateMenuProps) {
  return (
    <div
      className={["codex-ui-scheduled-task-create-menu", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <button
        aria-label="Create"
        className="codex-ui-scheduled-task-create-menu__primary"
        onClick={onCreateWithCodex}
        type="button"
      >
        {createLabel}
      </button>
      <Menu
        align="end"
        className="codex-ui-scheduled-task-create-menu__popover"
        label="Create scheduled task"
        sideOffset={1}
        trigger={
          <button
            aria-label="Create scheduled task options"
            className="codex-ui-scheduled-task-create-menu__trigger"
            type="button"
          >
            <ScheduledChevronGlyph />
          </button>
        }
        width="auto"
      >
        <MenuItem onSelect={onCreateWithCodex}>
          {createWithCodexLabel}
        </MenuItem>
        <MenuItem onSelect={onManualSetup}>{manualLabel}</MenuItem>
      </Menu>
    </div>
  );
}

export interface ScheduledTaskEditorOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface ScheduledTaskEditorField {
  id: string;
  label: ReactNode;
  options?: readonly ScheduledTaskEditorOption[];
  value: ReactNode;
  valueText?: string;
}

export interface ScheduledTaskEditorProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  detailsFields?: readonly ScheduledTaskEditorField[];
  frequencyFields?: readonly ScheduledTaskEditorField[];
  name?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  onCancel?: () => void;
  onFieldChange?: (field: ScheduledTaskEditorField, value: string) => void;
  onNameChange?: (name: string) => void;
  onPromptChange?: (prompt: string) => void;
  onSubmit?: () => void;
  prompt?: string;
  promptLabel?: string;
  promptPlaceholder?: string;
  submitDisabled?: boolean;
  submitLabel?: ReactNode;
  title?: ReactNode;
}

function ScheduledTaskEditorSection({
  fields,
  label,
  onFieldChange,
}: {
  fields: readonly ScheduledTaskEditorField[];
  label: ReactNode;
  onFieldChange?: (field: ScheduledTaskEditorField, value: string) => void;
}) {
  const labelId = useId();
  if (fields.length === 0) return null;
  return (
    <section
      aria-labelledby={labelId}
      className="codex-ui-scheduled-task-editor__section"
    >
      <h2 id={labelId}>{label}</h2>
      <div className="codex-ui-scheduled-task-editor__field-card">
        {fields.map((field) => {
          const valueText =
            field.valueText ??
            (typeof field.value === "string" ? field.value : field.id);
          return (
            <div className="codex-ui-scheduled-task-editor__field" key={field.id}>
              <span>{field.label}</span>
              {field.options && field.options.length > 0 ? (
                <Menu
                  align="end"
                  className="codex-ui-scheduled-task-editor__field-menu"
                  initialFocus="first"
                  label={typeof field.label === "string" ? field.label : field.id}
                  sideOffset={2}
                  trigger={
                    <button
                      aria-label={
                        typeof field.label === "string"
                          ? `${field.label}: ${valueText}`
                          : field.id
                      }
                      type="button"
                    >
                      <span>{field.value}</span>
                      <ScheduledChevronGlyph />
                    </button>
                  }
                  width="auto"
                >
                  {field.options.map((option) => (
                    <MenuItem
                      aria-checked={option.value === valueText}
                      disabled={option.disabled}
                      key={option.value}
                      onSelect={() => onFieldChange?.(field, option.value)}
                      role="menuitemradio"
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Menu>
              ) : (
                <span className="codex-ui-scheduled-task-editor__field-value">
                  {field.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ScheduledTaskEditor({
  className,
  detailsFields = [],
  frequencyFields = [],
  name = "",
  nameLabel = "Name",
  namePlaceholder = "Scheduled task title",
  onCancel,
  onFieldChange,
  onNameChange,
  onPromptChange,
  onSubmit,
  prompt = "",
  promptLabel = "Instructions",
  promptPlaceholder = "Describe what ChatGPT should do",
  submitDisabled,
  submitLabel = "Create",
  title = "New",
  ...props
}: ScheduledTaskEditorProps) {
  const disabled =
    submitDisabled ?? (name.trim().length === 0 || prompt.trim().length === 0);
  return (
    <section
      aria-label="Scheduled task editor"
      className={["codex-ui-scheduled-task-editor", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className="codex-ui-scheduled-task-editor__title">{title}</span>
      {onCancel ? (
        <button
          aria-label="Cancel"
          className="codex-ui-scheduled-task-editor__cancel"
          onClick={onCancel}
          type="button"
        >
          ×
        </button>
      ) : null}
      <div className="codex-ui-scheduled-task-editor__body">
        <label className="codex-ui-scheduled-task-editor__name">
          <span className="codex-ui-scheduled-tasks__sr-only">{nameLabel}</span>
          <input
            aria-label={nameLabel}
            onChange={(event) => onNameChange?.(event.currentTarget.value)}
            placeholder={namePlaceholder}
            value={name}
          />
        </label>
        <label className="codex-ui-scheduled-task-editor__prompt">
          <span className="codex-ui-scheduled-tasks__sr-only">{promptLabel}</span>
          <textarea
            aria-label={promptLabel}
            onChange={(event) => onPromptChange?.(event.currentTarget.value)}
            placeholder={promptPlaceholder}
            value={prompt}
          />
        </label>
        <ScheduledTaskEditorSection
          fields={detailsFields}
          label="Details"
          onFieldChange={onFieldChange}
        />
        <ScheduledTaskEditorSection
          fields={frequencyFields}
          label="Frequency"
          onFieldChange={onFieldChange}
        />
      </div>
      <footer className="codex-ui-scheduled-task-editor__footer">
        <button disabled={disabled} onClick={onSubmit} type="button">
          {submitLabel}
        </button>
      </footer>
    </section>
  );
}
