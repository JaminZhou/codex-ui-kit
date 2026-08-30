import {
  useMemo,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export interface WorktreeSettingsValue {
  autoDelete: boolean;
  autoDeleteLimit: number;
  fetchUpstream: boolean;
  root: string;
}

export interface ManagedWorktreeConversation {
  id: string;
  label: ReactNode;
}

export interface ManagedWorktreeEntry {
  conversations?: readonly ManagedWorktreeConversation[];
  description?: ReactNode;
  id: string;
  projectPath: ReactNode;
  projectTextValue?: string;
  worktreePath: ReactNode;
}

export interface WorktreeSettingsPageProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "onChange"
  > {
  emptyState?: ReactNode;
  entries: readonly ManagedWorktreeEntry[];
  newChatIcon?: ReactNode;
  onChange: (value: WorktreeSettingsValue) => void;
  onDelete?: (entry: ManagedWorktreeEntry) => void;
  onNewChat?: (entry: ManagedWorktreeEntry) => void;
  onRefresh?: (projectTextValue: string) => void;
  refreshIcon?: ReactNode;
  refreshing?: boolean;
  rootPlaceholder?: string;
  value: WorktreeSettingsValue;
}

const defaultDescription =
  "Starts a fresh chat using the same files and branch";

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path
        d="M3.50205 16.6664V13.3333C3.50205 12.9661 3.79982 12.6683 4.16709 12.6683H7.5001L7.63389 12.682C7.93696 12.7439 8.16514 13.0119 8.16514 13.3333C8.16514 13.6547 7.93696 13.9227 7.63389 13.9847L7.5001 13.9984H5.47471C6.58687 15.2249 8.21848 16.0013 10.0001 16.0013C13.06 16.0013 15.586 13.711 15.9552 10.7513L15.9854 10.6195C16.0846 10.3266 16.3786 10.1335 16.6974 10.1732C17.0617 10.2186 17.3198 10.551 17.2745 10.9154L17.2247 11.2523C16.6301 14.7051 13.6225 17.3313 10.0001 17.3314C8.01108 17.3314 6.17193 16.5383 4.83213 15.2474V16.6664C4.83213 17.0335 4.53416 17.3312 4.16709 17.3314C3.79982 17.3314 3.50205 17.0336 3.50205 16.6664ZM4.04502 9.24936C3.99941 9.61354 3.66706 9.87179 3.30283 9.82651C2.93839 9.78106 2.67926 9.44877 2.72471 9.08432L4.04502 9.24936ZM10.0001 2.6683C11.994 2.66834 13.8372 3.46552 15.1778 4.76205V3.33334C15.1778 2.96617 15.4757 2.66846 15.8429 2.6683C16.2101 2.6683 16.5079 2.96607 16.5079 3.33334V6.66635C16.5079 7.03362 16.2101 7.33139 15.8429 7.33139H12.5099C12.1426 7.33139 11.8448 7.03362 11.8448 6.66635C11.845 6.29923 12.1427 6.00131 12.5099 6.00131H14.5255C13.4134 4.77489 11.7816 3.99842 10.0001 3.99838C6.94004 3.99838 4.41411 6.28948 4.04502 9.24936L3.38486 9.16635L2.72471 9.08432C3.1758 5.46703 6.26081 2.6683 10.0001 2.6683Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg
      aria-hidden="true"
      height="20"
      viewBox="0 0 20 20"
      width="20"
    >
      <path d="M3.165 10c0-3.51 3.024-6.418 6.835-6.418S16.835 6.49 16.835 10a6.138 6.138 0 0 1-1.388 3.877.667.667 0 0 0-.136.54c.095.508.23 1.003.384 1.487a12.883 12.883 0 0 1-1.823-.376l-.126-.022a.664.664 0 0 0-.369.076 7.145 7.145 0 0 1-3.377.837c-3.811 0-6.835-2.91-6.835-6.42Zm-1.33 0c0 4.314 3.692 7.749 8.165 7.749a8.487 8.487 0 0 0 3.766-.873c.92.242 1.865.393 2.86.455a.665.665 0 0 0 .661-.903l-.207-.565c-.162-.468-.3-.933-.402-1.402A7.45 7.45 0 0 0 18.165 10c0-4.315-3.692-7.748-8.165-7.748-4.473 0-8.165 3.433-8.165 7.748Z" />
      <path d="M10 6.335A.665.665 0 0 0 9.335 7v2.335L7 9.349l-.134.013a.665.665 0 0 0 0 1.303L7 10.68l2.335-.014V13a.665.665 0 0 0 1.33 0v-2.335L13 10.68a.665.665 0 0 0 0-1.33l-2.335-.014V7A.665.665 0 0 0 10 6.335Z" />
    </svg>
  );
}

interface WorktreeSwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

function WorktreeSwitch({
  checked,
  label,
  onChange,
}: WorktreeSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-worktree-settings__switch"
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

interface PreferenceRowProps {
  children: ReactNode;
  description: ReactNode;
  label: ReactNode;
}

function PreferenceRow({
  children,
  description,
  label,
}: PreferenceRowProps) {
  return (
    <div className="codex-ui-worktree-settings__preference-row">
      <div className="codex-ui-worktree-settings__preference-copy">
        <span>{label}</span>
        <p>{description}</p>
      </div>
      <div className="codex-ui-worktree-settings__preference-control">
        {children}
      </div>
    </div>
  );
}

function groupEntries(entries: readonly ManagedWorktreeEntry[]) {
  const groups = new Map<
    string,
    { label: ReactNode; entries: ManagedWorktreeEntry[] }
  >();

  for (const entry of entries) {
    const key = entry.projectTextValue ?? String(entry.projectPath);
    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
    } else {
      groups.set(key, { label: entry.projectPath, entries: [entry] });
    }
  }

  return [...groups.entries()].map(([key, group]) => ({
    ...group,
    key,
  }));
}

export function WorktreeSettingsPage({
  className,
  emptyState = "No managed worktrees.",
  entries,
  newChatIcon,
  onChange,
  onDelete,
  onNewChat,
  onRefresh,
  refreshIcon,
  refreshing = false,
  rootPlaceholder = "Default location",
  value,
  ...props
}: WorktreeSettingsPageProps) {
  const groups = useMemo(() => groupEntries(entries), [entries]);
  const update = <Key extends keyof WorktreeSettingsValue,>(
    key: Key,
    nextValue: WorktreeSettingsValue[Key],
  ) => onChange({ ...value, [key]: nextValue });

  return (
    <article
      {...props}
      aria-busy={refreshing || undefined}
      className={["codex-ui-worktree-settings", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h1>Worktrees</h1>
      <div className="codex-ui-worktree-settings__content">
        <div
          aria-label="Worktree preferences"
          className="codex-ui-worktree-settings__preferences"
        >
          <PreferenceRow
            description="Directory where ChatGPT creates managed worktrees. Leave blank to use the default location"
            label="Worktree root"
          >
            <input
              aria-label="Worktree root"
              onChange={(event) => update("root", event.currentTarget.value)}
              placeholder={rootPlaceholder}
              type="text"
              value={value.root}
            />
          </PreferenceRow>
          <PreferenceRow
            description="Codex normally picks up branch updates during regular Git activity. This also fetches before each new worktree."
            label="Always fetch upstream before creating worktrees"
          >
            <WorktreeSwitch
              checked={value.fetchUpstream}
              label="Always fetch upstream before creating worktrees"
              onChange={(checked) => update("fetchUpstream", checked)}
            />
          </PreferenceRow>
          <PreferenceRow
            description="Recommended for most users. Turn this off only if you want to manage old worktrees and disk usage yourself."
            label="Automatically delete old worktrees"
          >
            <WorktreeSwitch
              checked={value.autoDelete}
              label="Automatically delete old worktrees"
              onChange={(checked) => update("autoDelete", checked)}
            />
          </PreferenceRow>
          <PreferenceRow
            description="Number of managed worktrees to keep before older ones are pruned automatically. ChatGPT snapshots worktrees before deleting, so pruned worktrees should always be restorable."
            label="Auto-delete limit"
          >
            <input
              aria-label="Auto-delete limit"
              min={1}
              onChange={(event) => {
                const nextValue = Number(event.currentTarget.value);
                if (Number.isFinite(nextValue)) {
                  update("autoDeleteLimit", nextValue);
                }
              }}
              step={1}
              type="number"
              value={value.autoDeleteLimit}
            />
          </PreferenceRow>
        </div>

        {groups.length > 0 ? (
          groups.map((group) => (
            <section
              aria-label={`Managed worktrees for ${group.key}`}
              className="codex-ui-worktree-settings__project"
              key={group.key}
            >
              <header>
                <span title={group.key}>{group.label}</span>
                <button
                  aria-label="Refresh"
                  className="codex-ui-worktree-settings__refresh"
                  disabled={!onRefresh || refreshing}
                  onClick={() => onRefresh?.(group.key)}
                  type="button"
                >
                  {refreshIcon ?? <RefreshIcon />}
                </button>
              </header>
              <div className="codex-ui-worktree-settings__entries">
                {group.entries.map((entry) => (
                  <article
                    className="codex-ui-worktree-settings__entry"
                    key={entry.id}
                  >
                    <div className="codex-ui-worktree-settings__entry-top">
                      <div className="codex-ui-worktree-settings__entry-copy">
                        <h2>Worktree</h2>
                        <p className="codex-ui-worktree-settings__path">
                          {entry.worktreePath}
                        </p>
                        <p>{entry.description ?? defaultDescription}</p>
                      </div>
                      <div className="codex-ui-worktree-settings__entry-actions">
                        <button
                          disabled={!onNewChat}
                          onClick={() => onNewChat?.(entry)}
                          type="button"
                        >
                          {newChatIcon ?? <NewChatIcon />}
                          <span>New chat in this worktree</span>
                        </button>
                        <button
                          className="codex-ui-worktree-settings__delete"
                          disabled={!onDelete}
                          onClick={() => onDelete?.(entry)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="codex-ui-worktree-settings__conversations">
                      <h3>Conversations</h3>
                      {entry.conversations?.length ? (
                        <ul>
                          {entry.conversations.map((conversation) => (
                            <li key={conversation.id}>{conversation.label}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No conversations linked to this worktree.</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div
            className="codex-ui-worktree-settings__empty"
            role="status"
          >
            {emptyState}
          </div>
        )}
      </div>
    </article>
  );
}
