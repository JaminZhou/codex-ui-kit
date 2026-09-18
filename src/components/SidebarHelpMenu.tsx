import type { CSSProperties, ReactNode } from "react";
import {
  Menu,
  MenuItem,
  MenuSeparator,
} from "./InteractivePrimitives.js";

export type SidebarHelpMenuAction =
  | "full-changelog"
  | "setup-chrome"
  | "setup-remote"
  | "keyboard-shortcuts"
  | "help";

export interface SidebarHelpMenuRelease {
  date?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
}

export interface SidebarHelpMenuIcons {
  changelog?: ReactNode;
  changelogExternal?: ReactNode;
  chrome?: ReactNode;
  help?: ReactNode;
  keyboard?: ReactNode;
  release?: ReactNode;
  remote?: ReactNode;
  trigger?: ReactNode;
}

export interface SidebarHelpMenuProps {
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  fullChangelogLabel?: ReactNode;
  heading?: ReactNode;
  headingClassName?: string;
  helpLabel?: ReactNode;
  icons?: SidebarHelpMenuIcons;
  keyboardShortcutsLabel?: ReactNode;
  onAction?: (action: SidebarHelpMenuAction) => void;
  onOpenChange?: (open: boolean) => void;
  onReleaseSelect?: (release: SidebarHelpMenuRelease) => void;
  open?: boolean;
  releases: readonly SidebarHelpMenuRelease[];
  releasesClassName?: string;
  setUpChromeLabel?: ReactNode;
  setUpRemoteLabel?: ReactNode;
  sideOffset?: number;
  style?: CSSProperties;
  triggerClassName?: string;
  triggerLabel?: string;
}

/**
 * Controlled sidebar help/release menu. The host owns navigation, external
 * links, and support effects; this component only renders the observed menu
 * hierarchy and emits intent callbacks.
 */
export function SidebarHelpMenu({
  className,
  defaultOpen,
  disabled = false,
  fullChangelogLabel = "Full changelog",
  heading = "What's new",
  headingClassName,
  helpLabel = "Help",
  icons = {},
  keyboardShortcutsLabel = "Keyboard shortcuts",
  onAction,
  onOpenChange,
  onReleaseSelect,
  open,
  releases,
  releasesClassName,
  setUpChromeLabel = "Set up Chrome extension",
  setUpRemoteLabel = "Set up remote",
  sideOffset = 7,
  style,
  triggerClassName,
  triggerLabel = "Open help menu",
}: SidebarHelpMenuProps) {
  const action = (id: SidebarHelpMenuAction) => () => onAction?.(id);
  return (
    <Menu
      align="start"
      className={["codex-ui-sidebar-help-menu", className]
        .filter(Boolean)
        .join(" ")}
      defaultOpen={defaultOpen}
      disabled={disabled}
      label="Help menu"
      onOpenChange={onOpenChange}
      open={open}
      side="top"
      sideOffset={sideOffset}
      style={style}
      trigger={
        <button
          aria-label={triggerLabel}
          className={triggerClassName}
          disabled={disabled}
          type="button"
        >
          {icons.trigger ?? <span aria-hidden="true">?</span>}
        </button>
      }
      width="auto"
    >
      <div
        className={["codex-ui-sidebar-help-menu__heading", headingClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {heading}
      </div>
      <div
        className={["codex-ui-sidebar-help-menu__releases", releasesClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {releases.map((release) => (
          <MenuItem
            disabled={disabled || release.disabled}
            key={release.id}
            onSelect={() => onReleaseSelect?.(release)}
            shortcut={release.date}
            startIcon={release.icon ?? icons.release}
          >
            {release.label}
          </MenuItem>
        ))}
      </div>
      <MenuItem
        disabled={disabled}
        endIcon={icons.changelogExternal}
        onSelect={action("full-changelog")}
        startIcon={icons.changelog}
      >
        {fullChangelogLabel}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        disabled={disabled}
        onSelect={action("setup-chrome")}
        startIcon={icons.chrome}
      >
        {setUpChromeLabel}
      </MenuItem>
      <MenuItem
        disabled={disabled}
        onSelect={action("setup-remote")}
        startIcon={icons.remote}
      >
        {setUpRemoteLabel}
      </MenuItem>
      <MenuItem
        disabled={disabled}
        onSelect={action("keyboard-shortcuts")}
        startIcon={icons.keyboard}
      >
        {keyboardShortcutsLabel}
      </MenuItem>
      <MenuItem
        disabled={disabled}
        onSelect={action("help")}
        startIcon={icons.help}
      >
        {helpLabel}
      </MenuItem>
    </Menu>
  );
}
