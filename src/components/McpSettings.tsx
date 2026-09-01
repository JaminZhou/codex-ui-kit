import {
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

export type PluginManagerCategory =
  | "plugins"
  | "apps"
  | "mcps"
  | "skills"
  | "marketplace";
export type McpServerPageStatus =
  | "ready"
  | "loading"
  | "error"
  | "unavailable";
export type McpServerType = "stdio" | "http";

export interface PluginManagerTabItem {
  count: number;
  id: PluginManagerCategory;
  label: ReactNode;
}

export interface McpServerItem {
  enabled?: boolean;
  id: string;
  name: ReactNode;
  settingsAvailable?: boolean;
  source?: "plugin" | "server";
}

export interface McpEditorPair {
  id: string;
  key: string;
  value: string;
}

export interface McpServerEditorValue {
  arguments: readonly string[];
  bearerTokenEnvironmentVariable: string;
  command: string;
  environmentPassthrough: readonly string[];
  environmentVariables: readonly McpEditorPair[];
  headerEnvironmentVariables: readonly McpEditorPair[];
  headers: readonly McpEditorPair[];
  name: string;
  type: McpServerType;
  url: string;
  workingDirectory: string;
}

const defaultManagerTabs: readonly PluginManagerTabItem[] = [
  { count: 0, id: "plugins", label: "Plugins" },
  { count: 0, id: "apps", label: "Apps" },
  { count: 0, id: "mcps", label: "MCPs" },
  { count: 0, id: "skills", label: "Skills" },
  { count: 0, id: "marketplace", label: "Marketplace" },
];

function McpSearchGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M7.33057 1.98535C10.2484 1.98535 12.6136 4.3508 12.6138 7.26855C12.6138 8.58031 12.1346 9.77942 11.3433 10.7031L13.9897 13.3496C14.1655 13.5253 14.1655 13.8106 13.9897 13.9863C13.814 14.1621 13.5288 14.1621 13.353 13.9863L10.7017 11.335C9.78678 12.0942 8.61243 12.5518 7.33057 12.5518C4.41281 12.5516 2.04736 10.1864 2.04736 7.26855C2.04754 4.35091 4.41292 1.98553 7.33057 1.98535ZM7.33057 2.88574C4.90998 2.88592 2.94793 4.84796 2.94775 7.26855C2.94775 9.68929 4.90987 11.6522 7.33057 11.6523C9.75141 11.6523 11.7144 9.6894 11.7144 7.26855C11.7142 4.84786 9.75131 2.88574 7.33057 2.88574Z" />
    </svg>
  );
}

function McpChevronGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 21">
      <path d="M15.2793 7.71101C15.539 7.45131 15.961 7.45131 16.2207 7.71101C16.4804 7.97071 16.4804 8.39272 16.2207 8.65242L10.4707 14.4024C10.211 14.6621 9.78902 14.6621 9.52932 14.4024L3.77932 8.65242L3.69436 8.54792C3.52385 8.28979 3.55205 7.93828 3.77932 7.71101C4.00659 7.48374 4.3581 7.45554 4.61623 7.62605L4.72073 7.71101L10 12.9903L15.2793 7.71101Z" />
    </svg>
  );
}

function McpBackGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M8.8011 3.611C9.05912 3.44087 9.40989 3.46898 9.63703 3.69596C9.89673 3.95566 9.89673 4.37767 9.63703 4.63737L4.93977 9.33463H16.6663L16.8011 9.34831C17.1038 9.41043 17.3312 9.67859 17.3314 9.99967C17.3314 10.3209 17.1039 10.5888 16.8011 10.651L16.6663 10.6647H4.93879L9.63703 15.363L9.722 15.4674C9.89241 15.7255 9.86413 16.0761 9.63703 16.3034C9.40981 16.5306 9.05921 16.5587 8.8011 16.3883L8.69661 16.3034L2.86262 10.4704C2.60319 10.2108 2.6033 9.78962 2.86262 9.52995L8.69661 3.69596L8.8011 3.611Z" />
    </svg>
  );
}

function McpExternalGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M4.30164 12.197V8.53003C4.30164 7.84109 4.30099 7.28391 4.33777 6.83374C4.3752 6.37598 4.45451 5.9701 4.64636 5.59351L4.76843 5.37573C5.07254 4.8798 5.50895 4.47626 6.03015 4.21069L6.17273 4.14331C6.50897 3.99911 6.86981 3.93484 7.27039 3.9021C7.72063 3.86531 8.27758 3.86499 8.96668 3.86499H9.13367L9.26746 3.87866C9.57036 3.94067 9.79855 4.20883 9.79871 4.53003C9.79871 4.85133 9.5704 5.11932 9.26746 5.1814L9.13367 5.19507H8.96668C8.25564 5.19507 7.7623 5.19596 7.37878 5.22729C7.09678 5.25034 6.90733 5.28812 6.76355 5.3396L6.63367 5.39526C6.33147 5.54924 6.07854 5.7835 5.90222 6.07104L5.83191 6.19702C5.75142 6.35498 5.69465 6.56664 5.66394 6.94214C5.63261 7.3256 5.63171 7.81917 5.63171 8.53003V12.197C5.63171 12.9081 5.63261 13.4014 5.66394 13.7849C5.69464 14.1606 5.7514 14.372 5.83191 14.53L5.90222 14.656C6.07854 14.9436 6.33141 15.1778 6.63367 15.3318L6.76355 15.3884C6.9073 15.4399 7.09693 15.4767 7.37878 15.4998C7.7623 15.5311 8.25564 15.532 8.96668 15.532H12.6337C13.3445 15.532 13.8381 15.5311 14.2216 15.4998C14.5971 15.469 14.8087 15.4123 14.9667 15.3318L15.0927 15.2615C15.3802 15.0852 15.6145 14.8322 15.7684 14.53L15.8241 14.4001C15.8756 14.2564 15.9134 14.0669 15.9364 13.7849C15.9677 13.4014 15.9686 12.9081 15.9686 12.197V12.03C15.9688 11.6629 16.2665 11.365 16.6337 11.365C17.0007 11.3652 17.2985 11.663 17.2987 12.03V12.197C17.2987 12.8861 17.2984 13.4431 17.2616 13.8933C17.2289 14.2939 17.1646 14.6547 17.0204 14.991L16.953 15.1335C16.6874 15.6547 16.2839 16.0912 15.788 16.3953L15.5702 16.5173C15.1936 16.7092 14.7877 16.7885 14.33 16.8259C13.8798 16.8627 13.3226 16.8621 12.6337 16.8621H8.96668C8.27758 16.8621 7.72063 16.8627 7.27039 16.8259C6.86974 16.7932 6.50902 16.728 6.17273 16.5837L6.03015 16.5173C5.50912 16.2519 5.07253 15.848 4.76843 15.3523L4.64636 15.1335C4.45456 14.7569 4.37518 14.3511 4.33777 13.8933C4.30098 13.4431 4.30164 12.8861 4.30164 12.197ZM12.1034 10.0007C11.8437 10.2603 11.4226 10.2604 11.163 10.0007C10.9033 9.74109 10.9034 9.32001 11.163 9.0603L12.1034 10.0007ZM18.1317 7.86401C18.1315 8.23113 17.8338 8.52905 17.4667 8.52905C17.0995 8.52905 16.8018 8.23113 16.8016 7.86401V5.30249L12.1034 10.0007L11.6337 9.53003L11.163 9.0603L15.8602 4.36206H13.2997C12.9326 4.36188 12.6346 4.06418 12.6346 3.69702C12.6346 3.32986 12.9326 3.03216 13.2997 3.03198H17.4667L17.6005 3.04565C17.9036 3.10759 18.1317 3.37559 18.1317 3.69702V7.86401Z" />
    </svg>
  );
}

function McpSettingsGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M9.99944 7.24939C11.5169 7.2495 12.7473 8.47995 12.7475 9.99744C12.7475 11.5151 11.517 12.7454 9.99944 12.7455C8.48176 12.7455 7.2514 11.5151 7.2514 9.99744C7.25155 8.47988 8.48186 7.24939 9.99944 7.24939ZM9.99944 8.57947C9.2164 8.57947 8.58163 9.21442 8.58148 9.99744C8.58148 10.7806 9.2163 11.4154 9.99944 11.4154C10.7825 11.4153 11.4174 10.7805 11.4174 9.99744C11.4173 9.21449 10.7824 8.57958 9.99944 8.57947Z" />
      <path d="M10.6391 1.67517C11.2939 1.67532 11.8991 2.02577 12.226 2.59314L13.2485 4.36755H15.2963C15.9505 4.36758 16.555 4.71709 16.8823 5.28357L17.5219 6.39001C17.8489 6.95668 17.8481 7.65542 17.5209 8.22205L16.4975 9.99451L17.5239 11.7689C17.8519 12.3357 17.8521 13.0347 17.5248 13.6019L16.8862 14.7084C16.559 15.2747 15.9543 15.6243 15.3002 15.6244H13.2514L12.2299 17.3988C11.9029 17.9663 11.297 18.3168 10.642 18.3168L9.3637 18.3158C8.71064 18.3155 8.10718 17.9678 7.77972 17.4027L6.74847 15.6234L4.69964 15.6244C4.04558 15.6242 3.44087 15.2747 3.1137 14.7084L2.47503 13.6019C2.14791 13.0349 2.14836 12.3366 2.47601 11.7699L3.50237 9.99548L2.47894 8.22205C2.15175 7.65533 2.15174 6.95673 2.47894 6.39001L3.11761 5.28259C3.44458 4.71663 4.04894 4.36813 4.70257 4.36755L6.75042 4.36658L7.77581 2.59119C8.10301 2.02476 8.7076 1.67527 9.36175 1.67517H10.6391ZM9.36273 3.00623C9.1835 3.00623 9.01679 3.10199 8.92718 3.2572L7.82659 5.16345C7.63652 5.49253 7.28473 5.69529 6.90472 5.69568L4.70355 5.69763C4.52451 5.69782 4.3585 5.79355 4.26898 5.94861L3.6303 7.05505C3.54091 7.2102 3.54077 7.40192 3.6303 7.55701L4.73089 9.46326C4.92108 9.7929 4.92135 10.1992 4.73089 10.5287L3.62737 12.4359C3.5378 12.591 3.53792 12.7817 3.62737 12.9369L4.26605 14.0433C4.35567 14.1982 4.52067 14.2932 4.69964 14.2933L6.90276 14.2943C7.28242 14.2946 7.63335 14.497 7.82366 14.8256L8.93011 16.7357C9.01984 16.8905 9.18578 16.9857 9.36468 16.9857H10.642C10.8213 16.9857 10.987 16.89 11.0766 16.7347L12.1752 14.8275C12.3653 14.4975 12.7182 14.2943 13.0991 14.2943H15.3002C15.4794 14.2942 15.6452 14.1985 15.7348 14.0433L16.3725 12.9379C16.4621 12.7826 16.4621 12.5911 16.3725 12.4359L15.27 10.5287C15.1032 10.2404 15.0808 9.89331 15.2055 9.59021L15.269 9.46326L16.3696 7.55701C16.4591 7.40189 16.459 7.21022 16.3696 7.05505L15.7309 5.94861C15.6412 5.79363 15.4754 5.69863 15.2963 5.69861L13.0951 5.69763L12.9535 5.68884C12.6751 5.65158 12.4217 5.50519 12.2504 5.28259L12.1723 5.16443L11.0737 3.2572C10.9841 3.10175 10.8175 3.00525 10.6381 3.00525L9.36273 3.00623Z" />
    </svg>
  );
}

function McpTrashGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z" />
    </svg>
  );
}

function McpPlusGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5L16.6338 9.34863C16.9369 9.41057 17.165 9.67857 17.165 10C17.165 10.3214 16.9369 10.5894 16.6338 10.6514L16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z" />
    </svg>
  );
}

function stringValue(value: ReactNode) {
  return typeof value === "string" ? value : "";
}

export interface PluginManagerTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  active: PluginManagerCategory;
  onChange?: (category: PluginManagerCategory) => void;
  tabs?: readonly PluginManagerTabItem[];
}

export function PluginManagerTabs({
  active,
  className,
  onChange,
  tabs = defaultManagerTabs,
  ...props
}: PluginManagerTabsProps) {
  return (
    <div
      aria-label="Plugin manager categories"
      className={["codex-ui-plugin-manager-tabs", className]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      {...props}
    >
      {tabs.map((tab) => (
        <button
          aria-selected={tab.id === active}
          data-active={tab.id === active || undefined}
          key={tab.id}
          onClick={() => onChange?.(tab.id)}
          role="tab"
          type="button"
        >
          <span>{tab.label}</span>
          <span>{tab.count}</span>
        </button>
      ))}
    </div>
  );
}

export interface IntegrationAddMenuProps {
  onAddMarketplace?: () => void;
  onAddMcpServer?: () => void;
  onCreatePlugin?: () => void;
  onRecordSkill?: () => void;
}

export function IntegrationAddMenu({
  onAddMarketplace,
  onAddMcpServer,
  onCreatePlugin,
  onRecordSkill,
}: IntegrationAddMenuProps) {
  return (
    <Menu
      align="end"
      className="codex-ui-plugin-manager__add-menu"
      label="Add integration"
      trigger={
        <button className="codex-ui-plugin-manager__add" type="button">
          <span>Add</span>
          <McpChevronGlyph />
        </button>
      }
      width="auto"
    >
      <MenuItem onSelect={onCreatePlugin}>Create plugin</MenuItem>
      <MenuItem onSelect={onAddMarketplace}>Add a marketplace</MenuItem>
      <MenuItem onSelect={onAddMcpServer}>Add MCP server</MenuItem>
      <MenuItem onSelect={onRecordSkill}>Record a skill</MenuItem>
    </Menu>
  );
}

function McpServerRows({
  items,
  onEnabledChange,
  onSettings,
}: {
  items: readonly McpServerItem[];
  onEnabledChange?: (item: McpServerItem, enabled: boolean) => void;
  onSettings?: (item: McpServerItem) => void;
}) {
  return (
    <div className="codex-ui-mcp-settings__rows">
      {items.map((item) => {
        const name = stringValue(item.name) || item.id;
        const source = item.source ?? "server";
        return (
          <div
            className="codex-ui-mcp-settings__row"
            data-source={source}
            key={item.id}
          >
            <span className="codex-ui-mcp-settings__server-name">
              {item.name}
            </span>
            {source === "server" ? (
              <span className="codex-ui-mcp-settings__row-actions">
                {item.settingsAvailable !== false ? (
                  <button
                    aria-label={`Settings for ${name}`}
                    className="codex-ui-mcp-settings__settings"
                    onClick={() => onSettings?.(item)}
                    type="button"
                  >
                    <McpSettingsGlyph />
                  </button>
                ) : null}
                <button
                  aria-checked={Boolean(item.enabled)}
                  aria-label={`Enable ${name}`}
                  className="codex-ui-mcp-settings__switch"
                  onClick={() => onEnabledChange?.(item, !item.enabled)}
                  role="switch"
                  type="button"
                >
                  <span />
                </button>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export interface McpServersPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "title">,
    IntegrationAddMenuProps {
  activeCategory?: PluginManagerCategory;
  description?: ReactNode;
  emptyLabel?: ReactNode;
  loadingLabel?: ReactNode;
  onBrowseDirectory?: () => void;
  onCategoryChange?: (category: PluginManagerCategory) => void;
  onQueryChange?: (query: string) => void;
  onRetry?: () => void;
  onServerEnabledChange?: (item: McpServerItem, enabled: boolean) => void;
  onServerSettings?: (item: McpServerItem) => void;
  pluginServers?: readonly McpServerItem[];
  query?: string;
  retryLabel?: ReactNode;
  servers?: readonly McpServerItem[];
  status?: McpServerPageStatus;
  statusDescription?: ReactNode;
  statusHeading?: ReactNode;
  tabs?: readonly PluginManagerTabItem[];
  title?: ReactNode;
}

export function McpServersPage({
  activeCategory = "mcps",
  children,
  className,
  description = "Manage plugins, skills, and MCPs",
  emptyLabel = "No MCP servers found",
  loadingLabel = "Loading MCP servers…",
  onAddMarketplace,
  onAddMcpServer,
  onBrowseDirectory,
  onCategoryChange,
  onCreatePlugin,
  onQueryChange,
  onRecordSkill,
  onRetry,
  onServerEnabledChange,
  onServerSettings,
  pluginServers = [],
  query = "",
  retryLabel = "Retry",
  servers = [],
  status = "ready",
  statusDescription,
  statusHeading,
  tabs = defaultManagerTabs,
  title = "Plugins",
  ...props
}: McpServersPageProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (item: McpServerItem) =>
    !normalizedQuery ||
    stringValue(item.name).toLocaleLowerCase().includes(normalizedQuery);
  const filteredServers = servers.filter(matches);
  const filteredPluginServers = pluginServers.filter(matches);
  const fallbackHeading =
    status === "error" ? "Couldn’t load MCP servers" : "MCP servers unavailable";
  return (
    <section
      className={["codex-ui-mcp-settings", className].filter(Boolean).join(" ")}
      data-status={status}
      {...props}
    >
      <header className="codex-ui-plugin-manager__header">
        <span className="codex-ui-plugin-manager__intro">
          <h1>{title}</h1>
          <p>{description}</p>
        </span>
        <span className="codex-ui-plugin-manager__actions">
          <button onClick={onBrowseDirectory} type="button">
            Browse directory
          </button>
          <IntegrationAddMenu
            onAddMarketplace={onAddMarketplace}
            onAddMcpServer={onAddMcpServer}
            onCreatePlugin={onCreatePlugin}
            onRecordSkill={onRecordSkill}
          />
        </span>
      </header>
      <div className="codex-ui-plugin-manager__toolbar">
        <PluginManagerTabs
          active={activeCategory}
          onChange={onCategoryChange}
          tabs={tabs}
        />
        <label className="codex-ui-mcp-settings__search">
          <McpSearchGlyph />
          <span className="codex-ui-mcp-settings__sr-only">
            Search MCP servers
          </span>
          <input
            onChange={(event) => onQueryChange?.(event.currentTarget.value)}
            placeholder="Search MCP servers"
            type="search"
            value={query}
          />
        </label>
      </div>
      {children ? (
        children
      ) : status === "loading" ? (
        <div className="codex-ui-mcp-settings__state" role="status">
          {loadingLabel}
        </div>
      ) : status !== "ready" ? (
        <section className="codex-ui-mcp-settings__state">
          <h2>{statusHeading ?? fallbackHeading}</h2>
          {statusDescription ? <p>{statusDescription}</p> : null}
          {onRetry ? (
            <button onClick={onRetry} type="button">
              {retryLabel}
            </button>
          ) : null}
        </section>
      ) : (
        <div className="codex-ui-mcp-settings__sections">
          <section className="codex-ui-mcp-settings__section">
            <h2>Servers</h2>
            {filteredServers.length > 0 ? (
              <McpServerRows
                items={filteredServers}
                onEnabledChange={onServerEnabledChange}
                onSettings={onServerSettings}
              />
            ) : (
              <p className="codex-ui-mcp-settings__empty">{emptyLabel}</p>
            )}
          </section>
          {filteredPluginServers.length > 0 ? (
            <section className="codex-ui-mcp-settings__section">
              <h2>From plugins</h2>
              <McpServerRows items={filteredPluginServers} />
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

function updatePair(
  entries: readonly McpEditorPair[],
  id: string,
  field: "key" | "value",
  value: string,
) {
  return entries.map((entry) =>
    entry.id === id ? { ...entry, [field]: value } : entry,
  );
}

function PairEditor({
  addLabel,
  entries,
  label,
  onChange,
}: {
  addLabel: string;
  entries: readonly McpEditorPair[];
  label: string;
  onChange: (entries: readonly McpEditorPair[]) => void;
}) {
  const visibleEntries =
    entries.length > 0 ? entries : [{ id: "empty", key: "", value: "" }];
  return (
    <div className="codex-ui-mcp-editor__field-group">
      <p>{label}</p>
      {visibleEntries.map((entry) => (
        <div className="codex-ui-mcp-editor__pair" key={entry.id}>
          <input
            aria-label={`${label} key`}
            onChange={(event) =>
              onChange(
                updatePair(
                  visibleEntries,
                  entry.id,
                  "key",
                  event.currentTarget.value,
                ),
              )
            }
            placeholder="Key"
            value={entry.key}
          />
          <input
            aria-label={`${label} value`}
            onChange={(event) =>
              onChange(
                updatePair(
                  visibleEntries,
                  entry.id,
                  "value",
                  event.currentTarget.value,
                ),
              )
            }
            placeholder="Value"
            value={entry.value}
          />
          <button
            aria-label={`Remove ${label} entry`}
            onClick={() =>
              onChange(visibleEntries.filter((item) => item.id !== entry.id))
            }
            type="button"
          >
            <McpTrashGlyph />
          </button>
        </div>
      ))}
      <button
        className="codex-ui-mcp-editor__add-row"
        onClick={() =>
          onChange([
            ...visibleEntries,
            { id: `${label}-${visibleEntries.length}`, key: "", value: "" },
          ])
        }
        type="button"
      >
        <McpPlusGlyph />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

function StringListEditor({
  addLabel,
  label,
  onChange,
  placeholder,
  values,
}: {
  addLabel: string;
  label: string;
  onChange: (values: readonly string[]) => void;
  placeholder?: string;
  values: readonly string[];
}) {
  const visibleValues = values.length > 0 ? values : [""];
  return (
    <div className="codex-ui-mcp-editor__field-group">
      <p>{label}</p>
      {visibleValues.map((value, index) => (
        <div className="codex-ui-mcp-editor__single" key={`${label}-${index}`}>
          <input
            aria-label={`${label} ${index + 1}`}
            onChange={(event) =>
              onChange(
                visibleValues.map((item, itemIndex) =>
                  itemIndex === index ? event.currentTarget.value : item,
                ),
              )
            }
            placeholder={placeholder}
            value={value}
          />
          <button
            aria-label={`Remove ${label} entry`}
            onClick={() =>
              onChange(visibleValues.filter((_, itemIndex) => itemIndex !== index))
            }
            type="button"
          >
            <McpTrashGlyph />
          </button>
        </div>
      ))}
      <button
        className="codex-ui-mcp-editor__add-row"
        onClick={() => onChange([...visibleValues, ""])}
        type="button"
      >
        <McpPlusGlyph />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

export interface McpServerEditorProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  docsHref?: string;
  mode?: "create" | "update";
  onBack?: () => void;
  onChange: (value: McpServerEditorValue) => void;
  onSave?: () => void;
  onUninstall?: () => void;
  saveDisabled?: boolean;
  value: McpServerEditorValue;
}

export function McpServerEditor({
  className,
  docsHref = "https://developers.openai.com/codex/mcp/",
  mode = "create",
  onBack,
  onChange,
  onSave,
  onUninstall,
  saveDisabled = true,
  value,
  ...props
}: McpServerEditorProps) {
  const set = <Key extends keyof McpServerEditorValue>(
    key: Key,
    next: McpServerEditorValue[Key],
  ) => onChange({ ...value, [key]: next });
  const title =
    mode === "update" ? `Update ${value.name} MCP` : "Connect to a custom MCP";
  return (
    <section
      className={["codex-ui-mcp-editor", className].filter(Boolean).join(" ")}
      data-mode={mode}
      data-type={value.type}
      {...props}
    >
      <button
        className="codex-ui-mcp-editor__back"
        onClick={onBack}
        type="button"
      >
        <McpBackGlyph />
        <span>Back</span>
      </button>
      <header className="codex-ui-mcp-editor__header">
        <h1>{title}</h1>
        {mode === "update" && onUninstall ? (
          <button
            className="codex-ui-mcp-editor__uninstall"
            onClick={onUninstall}
            type="button"
          >
            Uninstall
          </button>
        ) : null}
      </header>
      {mode === "update" ? (
        <p className="codex-ui-mcp-editor__description">
          If you would like to switch MCP server type, please uninstall first.
        </p>
      ) : (
        <a
          aria-label="Open MCP documentation"
          className="codex-ui-mcp-editor__docs"
          href={docsHref}
          rel="noreferrer"
          target="_blank"
        >
          <span>Docs</span>
          <McpExternalGlyph />
        </a>
      )}
      {mode === "create" ? (
        <div className="codex-ui-mcp-editor__card">
          <label className="codex-ui-mcp-editor__field">
            <span>Name</span>
            <input
              onChange={(event) => set("name", event.currentTarget.value)}
              placeholder="MCP server name"
              value={value.name}
            />
          </label>
          <div className="codex-ui-mcp-editor__type">
            <span>Type</span>
            <span role="group" aria-label="MCP server type">
              <button
                aria-pressed={value.type === "stdio"}
                onClick={() => set("type", "stdio")}
                type="button"
              >
                STDIO
              </button>
              <button
                aria-pressed={value.type === "http"}
                onClick={() => set("type", "http")}
                type="button"
              >
                Streamable HTTP
              </button>
            </span>
          </div>
        </div>
      ) : null}
      <div className="codex-ui-mcp-editor__card">
        {value.type === "stdio" ? (
          <>
            <label className="codex-ui-mcp-editor__field">
              <span>Command to launch</span>
              <input
                onChange={(event) => set("command", event.currentTarget.value)}
                placeholder="openai-dev-mcp serve-sqlite"
                value={value.command}
              />
            </label>
            <StringListEditor
              addLabel="Add argument"
              label="Arguments"
              onChange={(next) => set("arguments", next)}
              values={value.arguments}
            />
            <PairEditor
              addLabel="Add environment variable"
              entries={value.environmentVariables}
              label="Environment variables"
              onChange={(next) => set("environmentVariables", next)}
            />
            <StringListEditor
              addLabel="Add variable"
              label="Environment variable passthrough"
              onChange={(next) => set("environmentPassthrough", next)}
              values={value.environmentPassthrough}
            />
            <label className="codex-ui-mcp-editor__field">
              <span>Working directory</span>
              <input
                onChange={(event) =>
                  set("workingDirectory", event.currentTarget.value)
                }
                placeholder="~/code"
                value={value.workingDirectory}
              />
            </label>
          </>
        ) : (
          <>
            <label className="codex-ui-mcp-editor__field">
              <span>URL</span>
              <input
                onChange={(event) => set("url", event.currentTarget.value)}
                placeholder="https://mcp.example.com/mcp"
                value={value.url}
              />
            </label>
            <label className="codex-ui-mcp-editor__field">
              <span>Bearer token env var</span>
              <input
                onChange={(event) =>
                  set(
                    "bearerTokenEnvironmentVariable",
                    event.currentTarget.value,
                  )
                }
                placeholder="MCP_BEARER_TOKEN"
                value={value.bearerTokenEnvironmentVariable}
              />
            </label>
            <PairEditor
              addLabel="Add header"
              entries={value.headers}
              label="Headers"
              onChange={(next) => set("headers", next)}
            />
            <PairEditor
              addLabel="Add variable"
              entries={value.headerEnvironmentVariables}
              label="Headers from environment variables"
              onChange={(next) => set("headerEnvironmentVariables", next)}
            />
          </>
        )}
      </div>
      <button
        className="codex-ui-mcp-editor__save"
        disabled={saveDisabled}
        onClick={onSave}
        type="button"
      >
        Save
      </button>
    </section>
  );
}
