import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  Menu,
  MenuItem,
  MenuSeparator,
  MenuSubmenu,
} from "./InteractivePrimitives.js";

export interface ThreadOverflowMenuIcons {
  archive?: ReactNode;
  copy?: ReactNode;
  fork?: ReactNode;
  newSideChat?: ReactNode;
  openIn?: ReactNode;
  openInNewWindow?: ReactNode;
  pin?: ReactNode;
  rename?: ReactNode;
  scheduledTask?: ReactNode;
  share?: ReactNode;
  trigger?: ReactNode;
}

export interface ThreadOverflowMenuProps {
  copySubmenu: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  forkSubmenu: ReactNode;
  icons?: ThreadOverflowMenuIcons;
  onAddScheduledTask?: () => void;
  onArchive?: () => void;
  onOpenChange?: (open: boolean) => void;
  onOpenInNewWindow?: () => void;
  onNewSideChat?: () => void;
  onPinChange?: (pinned: boolean) => void;
  onRename?: () => void;
  onShare?: () => void;
  open?: boolean;
  openInSubmenu: ReactNode;
  pinned?: boolean;
  triggerLabel?: string;
}

export function ThreadOverflowMenu({
  copySubmenu,
  defaultOpen,
  disabled = false,
  forkSubmenu,
  icons = {},
  onAddScheduledTask,
  onArchive,
  onOpenChange,
  onOpenInNewWindow,
  onNewSideChat,
  onPinChange,
  onRename,
  onShare,
  open,
  openInSubmenu,
  pinned = false,
  triggerLabel = "Chat actions",
}: ThreadOverflowMenuProps) {
  return (
    <Menu
      align="end"
      className="codex-ui-thread-overflow-menu"
      defaultOpen={defaultOpen}
      disabled={disabled}
      initialFocus="none"
      label={triggerLabel}
      onOpenChange={onOpenChange}
      open={open}
      side="bottom"
      sideOffset={4}
      trigger={
        <button
          aria-label={triggerLabel}
          className="codex-ui-thread-overflow-menu__trigger"
          type="button"
        >
          {icons.trigger ?? <span aria-hidden="true">•••</span>}
        </button>
      }
      width="menu"
    >
      <MenuItem
        onSelect={() => onPinChange?.(!pinned)}
        shortcut="⌥⌘P"
        startIcon={icons.pin}
      >
        {pinned ? "Unpin" : "Pin"}
      </MenuItem>
      <MenuItem onSelect={onRename} shortcut="⌥⌘R" startIcon={icons.rename}>
        Rename
      </MenuItem>
      <MenuItem
        onSelect={onArchive}
        shortcut="⇧⌘A"
        startIcon={icons.archive}
      >
        Archive
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onShare} startIcon={icons.share}>
        Share
      </MenuItem>
      <MenuSubmenu
        label="Copy"
        startIcon={icons.copy}
        submenuClassName="codex-ui-thread-overflow-menu__submenu"
        submenuLabel="Copy options"
      >
        {copySubmenu}
      </MenuSubmenu>
      <MenuSeparator />
      <MenuItem
        onSelect={onNewSideChat}
        shortcut="⌥⌘S"
        startIcon={icons.newSideChat}
      >
        New side chat
      </MenuItem>
      <MenuSubmenu
        label="Fork"
        startIcon={icons.fork}
        submenuClassName="codex-ui-thread-overflow-menu__submenu"
        submenuLabel="Fork options"
      >
        {forkSubmenu}
      </MenuSubmenu>
      <MenuItem
        onSelect={onAddScheduledTask}
        startIcon={icons.scheduledTask}
      >
        Add scheduled task…
      </MenuItem>
      <MenuSeparator />
      <MenuSubmenu
        label="Open in"
        startIcon={icons.openIn}
        submenuClassName="codex-ui-thread-overflow-menu__submenu"
        submenuLabel="Open in options"
      >
        {openInSubmenu}
      </MenuSubmenu>
      <MenuItem
        onSelect={onOpenInNewWindow}
        startIcon={icons.openInNewWindow}
      >
        Open in new window
      </MenuItem>
    </Menu>
  );
}

export interface ThreadOverflowMenuOptionProps
  extends Omit<
    ComponentPropsWithoutRef<typeof MenuItem>,
    "children" | "onSelect"
  > {
  children: ReactNode;
  onSelect?: () => void;
}

export function ThreadOverflowMenuOption({
  children,
  onSelect,
  ...props
}: ThreadOverflowMenuOptionProps) {
  return (
    <MenuItem {...props} onSelect={onSelect}>
      {children}
    </MenuItem>
  );
}
