import type { HTMLAttributes, ReactNode } from "react";

export interface BrowserWorkspaceTab {
  active?: boolean;
  id: string;
  title: ReactNode;
}

export interface BrowserWorkspacePanelIcons {
  annotate?: ReactNode;
  back?: ReactNode;
  close?: ReactNode;
  expand?: ReactNode;
  external?: ReactNode;
  forward?: ReactNode;
  newTab?: ReactNode;
  options?: ReactNode;
  reload?: ReactNode;
  siteInfo?: ReactNode;
  siteTools?: ReactNode;
}

export interface BrowserWorkspacePanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  children?: ReactNode;
  icons?: BrowserWorkspacePanelIcons;
  onAction?: (action: BrowserWorkspaceAction) => void;
  onCloseTab?: (tab: BrowserWorkspaceTab) => void;
  onSelectTab?: (tab: BrowserWorkspaceTab) => void;
  tabs: readonly BrowserWorkspaceTab[];
}

export type BrowserWorkspaceAction =
  | "annotate"
  | "back"
  | "expand"
  | "external"
  | "forward"
  | "new-tab"
  | "options"
  | "reload"
  | "site-info"
  | "site-tools";

function BrowserGlyph({ name }: { name: BrowserWorkspaceAction | "close" }) {
  const common = {
    "aria-hidden": true,
    className: "codex-ui-browser-workspace__glyph",
    viewBox: "0 0 20 20",
  } as const;

  if (name === "back") {
    return <svg {...common}><path d="m11.75 5.5-4.5 4.5 4.5 4.5M7.5 10h7" /></svg>;
  }
  if (name === "forward") {
    return <svg {...common}><path d="m8.25 5.5 4.5 4.5-4.5 4.5M12.5 10h-7" /></svg>;
  }
  if (name === "reload") {
    return <svg {...common}><path d="M14.75 7.25V4.5h-2.5M14.1 5.2a6 6 0 1 0 1.2 6.15" /></svg>;
  }
  if (name === "site-info") {
    return <svg {...common}><path d="M4 10a6 6 0 1 0 12 0 6 6 0 0 0-12 0ZM10 9v4M10 6.75v.5" /></svg>;
  }
  if (name === "site-tools") {
    return <svg {...common}><path d="M4.5 7h11M7 4.5v5M4.5 13h11M13 10.5v5" /></svg>;
  }
  if (name === "new-tab") {
    return <svg {...common}><path d="M10 4.5v11M4.5 10h11" /></svg>;
  }
  if (name === "expand") {
    return <svg {...common}><path d="M7.75 4.5H4.5v3.25M12.25 4.5h3.25v3.25M7.75 15.5H4.5v-3.25M12.25 15.5h3.25v-3.25" /></svg>;
  }
  if (name === "external") {
    return <svg {...common}><path d="M11 4.5h4.5V9M15.25 4.75 9 11M13.5 10.5v4.25H5.25v-8.25H9.5" /></svg>;
  }
  if (name === "annotate") {
    return <svg {...common}><path d="M5 4.5h7l3 3v8H5ZM12 4.5v3h3M8 12.5l4-4M8 12.5l-.5 2 2-.5" /></svg>;
  }
  if (name === "options") {
    return <svg {...common}><circle cx="10" cy="5" r=".75" /><circle cx="10" cy="10" r=".75" /><circle cx="10" cy="15" r=".75" /></svg>;
  }
  if (name === "close") {
    return <svg {...common}><path d="m6.5 6.5 7 7M13.5 6.5l-7 7" /></svg>;
  }
  return <svg {...common}><circle cx="10" cy="10" r="5.5" /><path d="M4.5 10h11M10 4.5c2 2.1 2 8.9 0 11M10 4.5c-2 2.1-2 8.9 0 11" /></svg>;
}

function ActionButton({
  action,
  children,
  label,
  onAction,
}: {
  action: BrowserWorkspaceAction;
  children: ReactNode;
  label: string;
  onAction?: (action: BrowserWorkspaceAction) => void;
}) {
  return (
    <button
      aria-label={label}
      className="codex-ui-browser-workspace__action"
      onClick={() => onAction?.(action)}
      type="button"
    >
      {children}
    </button>
  );
}

export function BrowserWorkspacePanel({
  children,
  className,
  icons = {},
  onAction,
  onCloseTab,
  onSelectTab,
  tabs,
  ...props
}: BrowserWorkspacePanelProps) {
  const classes = ["codex-ui-browser-workspace", className]
    .filter(Boolean)
    .join(" ");
  const activeTab = tabs.find(({ active }) => active) ?? tabs[0];

  return (
    <aside aria-label="Browser" className={classes} {...props}>
      <div className="codex-ui-browser-workspace__tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            className="codex-ui-browser-workspace__tab-shell"
            data-active={tab.id === activeTab?.id || undefined}
            key={tab.id}
          >
            <button
              aria-selected={tab.id === activeTab?.id}
              className="codex-ui-browser-workspace__tab"
              onClick={() => onSelectTab?.(tab)}
              role="tab"
              type="button"
            >
              {tab.title}
            </button>
            <button
              aria-label={`Close ${typeof tab.title === "string" ? tab.title : "browser"} tab`}
              className="codex-ui-browser-workspace__tab-close"
              onClick={() => onCloseTab?.(tab)}
              type="button"
            >
              {icons.close ?? <BrowserGlyph name="close" />}
            </button>
          </div>
        ))}
        <ActionButton action="new-tab" label="New tab" onAction={onAction}>
          {icons.newTab ?? <BrowserGlyph name="new-tab" />}
        </ActionButton>
        <span className="codex-ui-browser-workspace__tab-spacer" />
        <ActionButton action="expand" label="Expand panel" onAction={onAction}>
          {icons.expand ?? <BrowserGlyph name="expand" />}
        </ActionButton>
      </div>

      <div aria-label="Browser navigation" className="codex-ui-browser-workspace__toolbar">
        <ActionButton action="back" label="Back" onAction={onAction}>{icons.back ?? <BrowserGlyph name="back" />}</ActionButton>
        <ActionButton action="forward" label="Next" onAction={onAction}>{icons.forward ?? <BrowserGlyph name="forward" />}</ActionButton>
        <ActionButton action="reload" label="Reload" onAction={onAction}>{icons.reload ?? <BrowserGlyph name="reload" />}</ActionButton>
        <ActionButton action="site-info" label="Site information" onAction={onAction}>{icons.siteInfo ?? <BrowserGlyph name="site-info" />}</ActionButton>
        <ActionButton action="site-tools" label="Site tools" onAction={onAction}>{icons.siteTools ?? <BrowserGlyph name="site-tools" />}</ActionButton>
        <span className="codex-ui-browser-workspace__toolbar-spacer" />
        <ActionButton action="external" label="Open in external browser" onAction={onAction}>{icons.external ?? <BrowserGlyph name="external" />}</ActionButton>
        <ActionButton action="annotate" label="Annotate" onAction={onAction}>{icons.annotate ?? <BrowserGlyph name="annotate" />}</ActionButton>
        <ActionButton action="options" label="Browser options" onAction={onAction}>{icons.options ?? <BrowserGlyph name="options" />}</ActionButton>
      </div>

      <div className="codex-ui-browser-workspace__content" role="tabpanel">
        {children}
      </div>
    </aside>
  );
}
