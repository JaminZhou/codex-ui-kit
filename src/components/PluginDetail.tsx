import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface PluginDetailSuggestion {
  content: ReactNode;
  icon?: ReactNode;
  id: string;
  title?: ReactNode;
}

export type PluginDetailAppStatus = "connected" | "locked" | "none";

export interface PluginDetailAppItem {
  description?: ReactNode;
  icon?: ReactNode;
  id: string;
  status?: PluginDetailAppStatus;
  statusLabel?: ReactNode;
  title: ReactNode;
}

export interface PluginDetailInformationItem {
  href?: string;
  id: string;
  label: ReactNode;
  linkLabel?: string;
  value?: ReactNode;
}

export interface PluginDetailBreadcrumbProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  backLabel?: ReactNode;
  onBack?: () => void;
  title: ReactNode;
}

export interface PluginDetailPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  actionsMenuOpen?: boolean;
  apps?: readonly PluginDetailAppItem[];
  artwork?: ReactNode;
  connectionMenuOpen?: boolean;
  copyLinkLabel?: ReactNode;
  description?: ReactNode;
  disclosure?: ReactNode;
  heroBackdrop?: ReactNode;
  information?: readonly PluginDetailInformationItem[];
  installLabel?: ReactNode;
  installed?: boolean;
  onActionsMenuOpenChange?: (open: boolean) => void;
  onAppOpen?: (item: PluginDetailAppItem) => void;
  onConnectionMenuOpenChange?: (open: boolean) => void;
  onCopyLink?: () => void;
  onDisconnect?: () => void;
  onInstall?: () => void;
  onReconnect?: () => void;
  onSuggestionOpen?: (suggestion: PluginDetailSuggestion) => void;
  onTryNow?: () => void;
  onUninstall?: () => void;
  summary?: ReactNode;
  suggestions?: readonly PluginDetailSuggestion[];
  title: ReactNode;
  tryNowLabel?: ReactNode;
}

function PluginDetailMoreGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M15.6981 9.04712C16.5255 9.04712 17.1959 9.71781 17.1961 10.5452C17.1961 11.3727 16.5256 12.0442 15.6981 12.0442C14.8706 12.0442 14.2 11.3727 14.2 10.5452C14.2002 9.71781 14.8707 9.04712 15.6981 9.04712ZM4.69806 9.04712C5.52546 9.04712 6.19691 9.71781 6.19708 10.5452C6.19708 11.3727 5.52557 12.0442 4.69806 12.0442C3.8707 12.044 3.20001 11.3726 3.20001 10.5452C3.20019 9.71792 3.87081 9.04729 4.69806 9.04712ZM10.2003 9.04712C11.0276 9.0473 11.6982 9.71792 11.6984 10.5452C11.6984 11.3726 11.0277 12.044 10.2003 12.0442C9.37284 12.0442 8.70132 11.3727 8.70132 10.5452C8.7015 9.71781 9.37295 9.04712 10.2003 9.04712Z" />
    </svg>
  );
}

function PluginDetailLinkGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M6.25 9.75 9.75 6.25M5.25 11.75H4A2.75 2.75 0 0 1 4 6.25h2M10.75 4.25H12a2.75 2.75 0 1 1 0 5.5h-2" />
    </svg>
  );
}

function PluginDetailPlusGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5C16.8673 9.33496 17.165 9.63273 17.165 10C17.165 10.3673 16.8673 10.665 16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z" />
    </svg>
  );
}

function PluginDetailTrashGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z" />
    </svg>
  );
}

function PluginDetailExternalGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M4.30164 12.197V8.53003C4.30164 7.84109 4.30099 7.28391 4.33777 6.83374C4.3752 6.37598 4.45451 5.9701 4.64636 5.59351L4.76843 5.37573C5.07254 4.8798 5.50895 4.47626 6.03015 4.21069L6.17273 4.14331C6.50897 3.99911 6.86981 3.93484 7.27039 3.9021C7.72063 3.86531 8.27758 3.86499 8.96668 3.86499H9.13367L9.26746 3.87866C9.57036 3.94067 9.79855 4.20883 9.79871 4.53003C9.79871 4.85133 9.5704 5.11932 9.26746 5.1814L9.13367 5.19507H8.96668C8.25564 5.19507 7.7623 5.19596 7.37878 5.22729C7.09678 5.25034 6.90733 5.28812 6.76355 5.3396L6.63367 5.39526C6.33147 5.54924 6.07854 5.7835 5.90222 6.07104L5.83191 6.19702C5.75142 6.35498 5.69465 6.56664 5.66394 6.94214C5.63261 7.3256 5.63171 7.81917 5.63171 8.53003V12.197C5.63171 12.9081 5.63261 13.4014 5.66394 13.7849C5.69464 14.1606 5.7514 14.372 5.83191 14.53L5.90222 14.656C6.07854 14.9436 6.33141 15.1778 6.63367 15.3318L6.76355 15.3884C6.9073 15.4399 7.09693 15.4767 7.37878 15.4998C7.7623 15.5311 8.25564 15.532 8.96668 15.532H12.6337C13.3445 15.532 13.8381 15.5311 14.2216 15.4998C14.5971 15.469 14.8087 15.4123 14.9667 15.3318L15.0927 15.2615C15.3802 15.0852 15.6145 14.8322 15.7684 14.53L15.8241 14.4001C15.8756 14.2564 15.9134 14.0669 15.9364 13.7849C15.9677 13.4014 15.9686 12.9081 15.9686 12.197V12.03C15.9688 11.6629 16.2665 11.365 16.6337 11.365C17.0007 11.3652 17.2985 11.663 17.2987 12.03V12.197C17.2987 12.8861 17.2984 13.4431 17.2616 13.8933C17.2289 14.2939 17.1646 14.6547 17.0204 14.991L16.953 15.1335C16.6874 15.6547 16.2839 16.0912 15.788 16.3953L15.5702 16.5173C15.1936 16.7092 14.7877 16.7885 14.33 16.8259C13.8798 16.8627 13.3226 16.8621 12.6337 16.8621H8.96668C8.27758 16.8627 7.72063 16.8627 7.27039 16.8259C6.86974 16.7932 6.50902 16.728 6.17273 16.5837L6.03015 16.5173C5.50912 16.2519 5.07253 15.848 4.76843 15.3523L4.64636 15.1335C4.45456 14.7569 4.37518 14.3511 4.33777 13.8933C4.30098 13.4431 4.30164 12.8861 4.30164 12.197ZM12.1034 10.0007C11.8437 10.2603 11.4226 10.2604 11.163 10.0007C10.9033 9.74109 10.9034 9.32001 11.163 9.0603L12.1034 10.0007ZM18.1317 7.86401C18.1315 8.23113 17.8338 8.52905 17.4667 8.52905C17.0995 8.52905 16.8018 8.23113 16.8016 7.86401V5.30249L12.1034 10.0007L11.6337 9.53003L11.163 9.0603L15.8602 4.36206H13.2997C12.9326 4.36188 12.6346 4.06418 12.6346 3.69702C12.6346 3.32986 12.9326 3.03216 13.2997 3.03198H17.4667L17.6005 3.04565C17.9036 3.10759 18.1317 3.37559 18.1317 3.69702V7.86401Z" />
    </svg>
  );
}

function PluginDetailArrowGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function PluginDetailReconnectGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M15.25 7.25V4.5h-2.75M14.5 5.25A6 6 0 0 0 4.25 8M4.75 12.75v2.75H7.5M5.5 14.75A6 6 0 0 0 15.75 12" />
    </svg>
  );
}

function PluginDetailDisconnectGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m7 7 6 6M13 7l-6 6" />
    </svg>
  );
}

function PluginDetailChevronGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m6.5 8 3.5 3.5L13.5 8" />
    </svg>
  );
}

export function PluginDetailBreadcrumb({
  backLabel = "Plugins",
  className,
  onBack,
  title,
  ...props
}: PluginDetailBreadcrumbProps) {
  return (
    <nav
      aria-label="Plugin detail breadcrumb"
      className={["codex-ui-plugin-detail-breadcrumb", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <button onClick={onBack} type="button">
        {backLabel}
      </button>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}

export function PluginDetailPage({
  actionsMenuOpen = false,
  apps = [],
  artwork,
  className,
  connectionMenuOpen = false,
  copyLinkLabel = "Copy link",
  description,
  disclosure,
  heroBackdrop,
  information = [],
  installLabel = "Install plugin",
  installed = false,
  onActionsMenuOpenChange,
  onAppOpen,
  onConnectionMenuOpenChange,
  onCopyLink,
  onDisconnect,
  onInstall,
  onKeyDown,
  onReconnect,
  onSuggestionOpen,
  onTryNow,
  onUninstall,
  summary,
  suggestions = [],
  title,
  tryNowLabel = "Try now",
  ...props
}: PluginDetailPageProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape") return;
    if (actionsMenuOpen) onActionsMenuOpenChange?.(false);
    if (connectionMenuOpen) onConnectionMenuOpenChange?.(false);
  };

  return (
    <main
      className={["codex-ui-plugin-detail", className]
        .filter(Boolean)
        .join(" ")}
      data-installed={installed || undefined}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <header className="codex-ui-plugin-detail__header">
        <span aria-hidden="true" className="codex-ui-plugin-detail__artwork">
          {artwork}
        </span>
        <div className="codex-ui-plugin-detail__identity">
          <div className="codex-ui-plugin-detail__title-row">
            <h1>{title}</h1>
            <div className="codex-ui-plugin-detail__actions">
              {installed ? (
                <span className="codex-ui-plugin-detail__menu-anchor">
                  <button
                    aria-expanded={actionsMenuOpen}
                    aria-haspopup="menu"
                    aria-label="More actions"
                    className="codex-ui-plugin-detail__icon-button"
                    onClick={() =>
                      onActionsMenuOpenChange?.(!actionsMenuOpen)
                    }
                    type="button"
                  >
                    <PluginDetailMoreGlyph />
                  </button>
                  {actionsMenuOpen ? (
                    <span
                      className="codex-ui-plugin-detail__menu codex-ui-plugin-detail__menu--actions"
                      role="menu"
                    >
                      <button
                        className="codex-ui-plugin-detail__danger"
                        onClick={onUninstall}
                        role="menuitem"
                        type="button"
                      >
                        <PluginDetailTrashGlyph />
                        <span>Uninstall</span>
                      </button>
                    </span>
                  ) : null}
                </span>
              ) : null}
              <button
                className="codex-ui-plugin-detail__action"
                onClick={onCopyLink}
                type="button"
              >
                <PluginDetailLinkGlyph />
                <span>{copyLinkLabel}</span>
              </button>
              <button
                className="codex-ui-plugin-detail__action codex-ui-plugin-detail__action--primary"
                onClick={installed ? onTryNow : onInstall}
                type="button"
              >
                {installed ? (
                  <span aria-hidden="true" className="codex-ui-plugin-detail__chat-glyph">
                    ◯
                  </span>
                ) : (
                  <PluginDetailPlusGlyph />
                )}
                <span>{installed ? tryNowLabel : installLabel}</span>
              </button>
            </div>
          </div>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      {suggestions.length > 0 ? (
        <section
          aria-label="Suggested prompts"
          className="codex-ui-plugin-detail__hero"
        >
          {heroBackdrop ? (
            <span
              aria-hidden="true"
              className="codex-ui-plugin-detail__hero-backdrop"
            >
              {heroBackdrop}
            </span>
          ) : null}
          <div className="codex-ui-plugin-detail__suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSuggestionOpen?.(suggestion)}
                type="button"
              >
                <span className="codex-ui-plugin-detail__suggestion-copy">
                  {suggestion.icon ? (
                    <span
                      aria-hidden="true"
                      className="codex-ui-plugin-detail__suggestion-icon"
                    >
                      {suggestion.icon}
                    </span>
                  ) : null}
                  <span className="codex-ui-plugin-detail__suggestion-text">
                    {suggestion.title ? (
                      <strong>{suggestion.title}</strong>
                    ) : null}{" "}
                    <span>{suggestion.content}</span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="codex-ui-plugin-detail__suggestion-arrow"
                >
                  <PluginDetailArrowGlyph />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {summary ? <div className="codex-ui-plugin-detail__summary">{summary}</div> : null}

      <section
        aria-labelledby="codex-ui-plugin-detail-apps-heading"
        className="codex-ui-plugin-detail__section codex-ui-plugin-detail__apps"
      >
        <div className="codex-ui-plugin-detail__section-heading">
          <h2 id="codex-ui-plugin-detail-apps-heading">
            <span>Apps</span>
            <span>{apps.length}</span>
          </h2>
        </div>
        <div className="codex-ui-plugin-detail__app-list">
          {apps.map((app) => {
            const status = app.status ?? "none";
            return (
              <article key={app.id} data-status={status}>
                <button
                  aria-label={`Open ${typeof app.title === "string" ? app.title : app.id}`}
                  className="codex-ui-plugin-detail__app-open"
                  onClick={() => onAppOpen?.(app)}
                  type="button"
                />
                <span
                  aria-hidden="true"
                  className="codex-ui-plugin-detail__app-icon"
                >
                  {app.icon}
                </span>
                <span className="codex-ui-plugin-detail__app-copy">
                  <strong>{app.title}</strong>
                  {app.description ? <span>{app.description}</span> : null}
                </span>
                {status === "connected" ? (
                  <span className="codex-ui-plugin-detail__menu-anchor">
                    <button
                      aria-expanded={connectionMenuOpen}
                      aria-haspopup="menu"
                      className="codex-ui-plugin-detail__connection"
                      onClick={() =>
                        onConnectionMenuOpenChange?.(!connectionMenuOpen)
                      }
                      type="button"
                    >
                      <i />
                      <span>{app.statusLabel ?? "Connected"}</span>
                      <PluginDetailChevronGlyph />
                    </button>
                    {connectionMenuOpen ? (
                      <span
                        className="codex-ui-plugin-detail__menu codex-ui-plugin-detail__menu--connection"
                        role="menu"
                      >
                        <button onClick={onReconnect} role="menuitem" type="button">
                          <PluginDetailReconnectGlyph />
                          <span>Reconnect</span>
                        </button>
                        <button
                          className="codex-ui-plugin-detail__danger"
                          onClick={onDisconnect}
                          role="menuitem"
                          type="button"
                        >
                          <PluginDetailDisconnectGlyph />
                          <span>Disconnect</span>
                        </button>
                      </span>
                    ) : null}
                  </span>
                ) : status === "locked" ? (
                  <span
                    aria-label={
                      typeof app.statusLabel === "string"
                        ? app.statusLabel
                        : "Unavailable"
                    }
                    className="codex-ui-plugin-detail__locked"
                    role="img"
                  >
                    ♧
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="codex-ui-plugin-detail-information-heading"
        className="codex-ui-plugin-detail__section codex-ui-plugin-detail__information"
      >
        <div className="codex-ui-plugin-detail__section-heading">
          <h2 id="codex-ui-plugin-detail-information-heading">Information</h2>
        </div>
        <dl>
          {information.map((item) => (
            <div key={item.id}>
              <dt>{item.label}</dt>
              <dd>
                {item.href ? (
                  <a
                    aria-label={item.linkLabel}
                    href={item.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <PluginDetailExternalGlyph />
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {disclosure ? (
        <div className="codex-ui-plugin-detail__disclosure">{disclosure}</div>
      ) : null}
    </main>
  );
}
