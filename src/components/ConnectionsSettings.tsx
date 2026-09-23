import {
  type HTMLAttributes,
  type ReactNode,
  useState,
} from "react";

export type ConnectionsSettingsTabId =
  | "control-this-mac"
  | "control-other-devices"
  | "ssh";

export type ConnectionsSettingsToggleId =
  | "allow-connections"
  | "keep-this-mac-awake";

const tabs: readonly { id: ConnectionsSettingsTabId; label: string }[] = [
  { id: "control-this-mac", label: "Control this Mac" },
  { id: "control-other-devices", label: "Control other devices" },
  { id: "ssh", label: "SSH" },
];

export interface ConnectionsSettingsPageProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "onChange" | "onToggle" | "title"
  > {
  activeTab?: ConnectionsSettingsTabId;
  allowConnections?: boolean;
  disabled?: boolean;
  keepThisMacAwake?: boolean;
  onActiveTabChange?: (tab: ConnectionsSettingsTabId) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
  onSetUp?: () => void;
  onToggle?: (setting: ConnectionsSettingsToggleId, checked: boolean) => void;
  refreshIcon?: ReactNode;
}

function SettingsSwitch({
  checked,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-connections-settings__switch"
      disabled={disabled}
      onClick={onClick}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

export function ConnectionsSettingsPage({
  activeTab,
  allowConnections = false,
  className,
  disabled = false,
  keepThisMacAwake = false,
  onActiveTabChange,
  onAdd,
  onRefresh,
  onSetUp,
  onToggle,
  refreshIcon,
  ...props
}: ConnectionsSettingsPageProps) {
  const [internalActiveTab, setInternalActiveTab] =
    useState<ConnectionsSettingsTabId>("control-this-mac");
  const selectedTab = activeTab ?? internalActiveTab;
  const selectTab = (tab: ConnectionsSettingsTabId) => {
    if (activeTab === undefined) setInternalActiveTab(tab);
    onActiveTabChange?.(tab);
  };

  return (
    <article
      {...props}
      className={["codex-ui-connections-settings", className]
        .filter(Boolean)
        .join(" ")}
      data-active-tab={selectedTab}
      data-disabled={disabled || undefined}
    >
      <header className="codex-ui-connections-settings__header">
        <h1>Connections</h1>
      </header>
      <div
        className="codex-ui-connections-settings__tabs"
      >
        {tabs.map((tab) => (
          <button
            aria-pressed={tab.id === selectedTab}
            className="codex-ui-connections-settings__tab"
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section
          className="codex-ui-connections-settings__panel"
          hidden={tab.id !== selectedTab}
          key={tab.id}
        >
          {tab.id === "control-this-mac" ? (
            <>
              <div className="codex-ui-connections-settings__section-heading">
                <h2>Devices that can control this Mac</h2>
                <button
                  aria-label="Refresh devices"
                  className="codex-ui-connections-settings__icon-button"
                  disabled={disabled}
                  onClick={onRefresh}
                  type="button"
                >
                  <span aria-hidden="true">{refreshIcon ?? "↻"}</span>
                </button>
              </div>
              <div className="codex-ui-connections-settings__setting-row">
                <span>Allow connections</span>
                <SettingsSwitch
                  checked={allowConnections}
                  disabled={disabled}
                  label="Allow connections"
                  onClick={() =>
                    onToggle?.("allow-connections", !allowConnections)
                  }
                />
              </div>
              <section className="codex-ui-connections-settings__other-settings">
                <h2>Other settings</h2>
                <div className="codex-ui-connections-settings__setting-row">
                  <span>Keep this Mac awake</span>
                  <SettingsSwitch
                    checked={keepThisMacAwake}
                    disabled={disabled}
                    label="Keep this Mac awake"
                    onClick={() =>
                      onToggle?.("keep-this-mac-awake", !keepThisMacAwake)
                    }
                  />
                </div>
              </section>
            </>
          ) : tab.id === "control-other-devices" ? (
            <div className="codex-ui-connections-settings__empty-state">
              <h2>Devices you can control from this Mac</h2>
              <p>Access and control other devices from this computer</p>
              <button
                className="codex-ui-connections-settings__primary"
                disabled={disabled}
                onClick={onSetUp}
                type="button"
              >
                Set up
              </button>
            </div>
          ) : (
            <div className="codex-ui-connections-settings__empty-state">
              <h2>SSH connections from this Mac</h2>
              <p>Connect to a remote device through SSH connection</p>
              <button
                className="codex-ui-connections-settings__primary"
                disabled={disabled}
                onClick={onAdd}
                type="button"
              >
                Add
              </button>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
