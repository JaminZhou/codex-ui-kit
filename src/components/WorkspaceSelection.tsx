import type {
  HTMLAttributes,
  ReactNode,
} from "react";
import {
  Menu,
  MenuItem,
  MenuSectionLabel,
  Select,
  type SelectOption,
} from "./InteractivePrimitives.js";

export type WorkspaceOptionStatus =
  | "available"
  | "loading"
  | "repairing"
  | "unavailable";

export interface ProjectOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  path?: ReactNode;
  status?: WorkspaceOptionStatus;
  statusLabel?: ReactNode;
  textValue?: string;
}

export interface ProjectPickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  disabled?: boolean;
  emptyMessage?: ReactNode;
  label?: string;
  onProjectChange: (projectId: string) => void;
  placeholder?: ReactNode;
  projects: readonly ProjectOption[];
  value?: string;
}

function optionIsDisabled(
  option: Pick<ProjectOption, "disabled" | "status">,
) {
  return (
    option.disabled ||
    option.status === "loading" ||
    option.status === "repairing" ||
    option.status === "unavailable"
  );
}

function projectOptionDescription(option: ProjectOption) {
  if (
    !option.description &&
    !option.path &&
    !option.statusLabel
  ) {
    return undefined;
  }
  return (
    <span className="codex-ui-project-picker__option-description">
      {option.description ? <span>{option.description}</span> : null}
      {option.path ? (
        <code className="codex-ui-project-picker__path">
          {option.path}
        </code>
      ) : null}
      {option.statusLabel ? (
        <span
          className="codex-ui-project-picker__status"
          data-status={option.status}
        >
          {option.statusLabel}
        </span>
      ) : null}
    </span>
  );
}

export function ProjectPicker({
  className,
  disabled = false,
  emptyMessage = "No projects",
  label = "Project",
  onProjectChange,
  placeholder = "Select a project",
  projects,
  value,
  ...props
}: ProjectPickerProps) {
  const options: SelectOption[] = projects.map((project) => ({
    description: projectOptionDescription(project),
    disabled: optionIsDisabled(project),
    icon: project.icon,
    label: project.label,
    textValue: project.textValue,
    value: project.id,
  }));

  return (
    <div
      {...props}
      className={["codex-ui-project-picker", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Select
        className="codex-ui-project-picker__trigger"
        disabled={disabled}
        emptyMessage={emptyMessage}
        label={label}
        onValueChange={onProjectChange}
        options={options}
        placeholder={placeholder}
        value={value}
        width="menu-wide"
      />
    </div>
  );
}

export interface RunLocationOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  status?: WorkspaceOptionStatus;
  statusLabel?: ReactNode;
}

export interface RunLocationMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  disabled?: boolean;
  emptyMessage?: ReactNode;
  label?: string;
  menuLabel?: ReactNode;
  onValueChange: (value: string) => void;
  options: readonly RunLocationOption[];
  placeholder?: ReactNode;
  value?: string;
}

export function RunLocationMenu({
  className,
  disabled = false,
  emptyMessage = "No run locations",
  label = "Run location",
  menuLabel = "Run in",
  onValueChange,
  options,
  placeholder = "Choose where to run",
  value,
  ...props
}: RunLocationMenuProps) {
  const selected = options.find((option) => option.id === value);

  return (
    <div
      {...props}
      className={["codex-ui-run-location-menu", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Menu
        disabled={disabled}
        label={label}
        trigger={
          <button
            aria-label={label}
            className="codex-ui-run-location-menu__trigger"
            disabled={disabled}
            type="button"
          >
            {selected?.icon ? (
              <span
                aria-hidden="true"
                className="codex-ui-run-location-menu__trigger-icon"
              >
                {selected.icon}
              </span>
            ) : null}
            <span className="codex-ui-run-location-menu__trigger-label">
              {selected?.label ?? placeholder}
            </span>
            <span aria-hidden="true">⌄</span>
          </button>
        }
        width="menu-wide"
      >
        <MenuSectionLabel>{menuLabel}</MenuSectionLabel>
        {options.length > 0 ? (
          options.map((option) => {
            const selectedOption = option.id === value;
            const unavailable = optionIsDisabled(option);
            return (
              <MenuItem
                aria-checked={selectedOption}
                disabled={unavailable}
                endIcon={
                  <span
                    className="codex-ui-run-location-menu__end"
                    data-status={option.status}
                  >
                    {option.statusLabel ? (
                      <span>{option.statusLabel}</span>
                    ) : null}
                    <span>{selectedOption ? "✓" : ""}</span>
                  </span>
                }
                key={option.id}
                onSelect={() => onValueChange(option.id)}
                role="menuitemradio"
                startIcon={option.icon}
                subText={option.description}
              >
                {option.label}
              </MenuItem>
            );
          })
        ) : (
          <div className="codex-ui-run-location-menu__empty">
            {emptyMessage}
          </div>
        )}
      </Menu>
    </div>
  );
}

export interface WorktreeOption {
  branch?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  status?: WorkspaceOptionStatus;
  statusLabel?: ReactNode;
  textValue?: string;
}

export interface WorktreePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  disabled?: boolean;
  emptyMessage?: ReactNode;
  label?: string;
  onWorktreeChange: (worktreeId: string) => void;
  placeholder?: ReactNode;
  value?: string;
  worktrees: readonly WorktreeOption[];
}

function worktreeOptionDescription(option: WorktreeOption) {
  if (
    !option.branch &&
    !option.description &&
    !option.statusLabel
  ) {
    return undefined;
  }
  return (
    <span className="codex-ui-worktree-picker__option-description">
      {option.branch ? (
        <code className="codex-ui-worktree-picker__branch">
          {option.branch}
        </code>
      ) : null}
      {option.description ? <span>{option.description}</span> : null}
      {option.statusLabel ? (
        <span
          className="codex-ui-worktree-picker__status"
          data-status={option.status}
        >
          {option.statusLabel}
        </span>
      ) : null}
    </span>
  );
}

export function WorktreePicker({
  className,
  disabled = false,
  emptyMessage = "No worktrees",
  label = "Worktree",
  onWorktreeChange,
  placeholder = "Select a worktree",
  value,
  worktrees,
  ...props
}: WorktreePickerProps) {
  const options: SelectOption[] = worktrees.map((worktree) => ({
    description: worktreeOptionDescription(worktree),
    disabled:
      worktree.disabled ||
      worktree.status === "loading" ||
      worktree.status === "repairing" ||
      worktree.status === "unavailable",
    icon: worktree.icon,
    label: worktree.label,
    textValue: worktree.textValue,
    value: worktree.id,
  }));

  return (
    <div
      {...props}
      className={["codex-ui-worktree-picker", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Select
        className="codex-ui-worktree-picker__trigger"
        disabled={disabled}
        emptyMessage={emptyMessage}
        label={label}
        onValueChange={onWorktreeChange}
        options={options}
        placeholder={placeholder}
        value={value}
        width="menu-wide"
      />
    </div>
  );
}

export type WorkspaceSelectionStatus =
  | "error"
  | "loading"
  | "ready";

export interface WorkspaceSelectionProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
  > {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  label?: string;
  status?: WorkspaceSelectionStatus;
  title?: ReactNode;
}

export function WorkspaceSelection({
  actions,
  children,
  className,
  description,
  footer,
  label = "Workspace selection",
  status = "ready",
  title = "Choose a workspace",
  ...props
}: WorkspaceSelectionProps) {
  return (
    <section
      {...props}
      aria-busy={status === "loading" || undefined}
      aria-label={label}
      className={["codex-ui-workspace-selection", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <header className="codex-ui-workspace-selection__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? (
          <div className="codex-ui-workspace-selection__actions">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="codex-ui-workspace-selection__fields">
        {children}
      </div>
      {footer ? (
        <footer className="codex-ui-workspace-selection__footer">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
