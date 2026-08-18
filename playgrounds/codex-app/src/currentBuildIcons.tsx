import type { ComponentProps } from "react";
import visualAssets from "../../../research/visual-assets.json";
import {
  VisualAssetIcon,
  type VisualAssetIconData,
} from "./VisualAssetIcon";

export type CurrentBuildIconName =
  | "composer-add-files"
  | "composer-branch"
  | "composer-dictate"
  | "composer-model-chevron"
  | "composer-permission"
  | "composer-project"
  | "composer-send"
  | "composer-voice"
  | "composer-worktree"
  | "window-chrome-back"
  | "window-chrome-forward"
  | "window-chrome-sidebar"
  | "sidebar-activity"
  | "sidebar-activity-attention"
  | "sidebar-account-menu-invite"
  | "sidebar-account-menu-logout"
  | "sidebar-account-menu-pet"
  | "sidebar-account-menu-settings"
  | "sidebar-account-menu-usage"
  | "sidebar-archive"
  | "sidebar-folder"
  | "sidebar-help"
  | "sidebar-help-menu-changelog"
  | "sidebar-help-menu-changelog-external"
  | "sidebar-help-menu-chrome"
  | "sidebar-help-menu-keyboard"
  | "sidebar-help-menu-release-note"
  | "sidebar-help-menu-remote"
  | "sidebar-help-menu-support"
  | "sidebar-mode-chevron"
  | "sidebar-more"
  | "sidebar-new-chat"
  | "sidebar-pin"
  | "sidebar-plugins"
  | "sidebar-pull-request"
  | "sidebar-quick-chat"
  | "sidebar-project-menu-archive"
  | "sidebar-project-menu-edit"
  | "sidebar-project-menu-mark-read"
  | "sidebar-project-menu-remove"
  | "sidebar-project-menu-reveal"
  | "sidebar-project-menu-unpin"
  | "sidebar-project-menu-worktree"
  | "sidebar-scheduled"
  | "sidebar-search"
  | "sidebar-sites"
  | "sidebar-voice"
  | "thread-assistant-bad"
  | "thread-assistant-copy"
  | "thread-assistant-fork"
  | "thread-assistant-good"
  | "thread-command-terminal"
  | "thread-mcp-tool"
  | "thread-activity-chevron"
  | "thread-reconnecting"
  | "thread-header-actions"
  | "thread-header-bottom-panel"
  | "thread-header-open-in-chevron"
  | "thread-header-project"
  | "thread-header-side-panel"
  | "thread-header-summary"
  | "workspace-environment-settings"
  | "workspace-run-location-codex-web"
  | "workspace-run-location-external"
  | "workspace-run-location-local"
  | "workspace-run-location-send-cloud"
  | "workspace-run-location-usage"
  | "workspace-run-location-usage-chevron"
  | "workspace-run-location-worktree"
  | "workspace-selection-check"
  | "settings-back"
  | "settings-search"
  | "settings-general"
  | "settings-import"
  | "settings-profile"
  | "settings-appearance"
  | "settings-voice"
  | "settings-configuration"
  | "settings-personalization"
  | "settings-pets"
  | "settings-keyboard-shortcuts"
  | "settings-usage-billing"
  | "settings-account"
  | "settings-account-external"
  | "settings-appshots"
  | "settings-plugins"
  | "settings-browser"
  | "settings-computer-use"
  | "settings-hooks"
  | "settings-hooks-reload"
  | "settings-connections"
  | "settings-git"
  | "settings-environments"
  | "settings-worktrees"
  | "settings-archived-chats";

interface CurrentBuildIconProps
  extends Omit<ComponentProps<typeof VisualAssetIcon>, "assetId" | "icon"> {
  name: CurrentBuildIconName;
}

export function CurrentBuildIcon({ name, ...props }: CurrentBuildIconProps) {
  const icon = visualAssets.icons.find((candidate) => candidate.id === name);
  if (!icon) throw new Error(`Unknown current-build icon: ${name}`);

  return (
    <VisualAssetIcon
      assetId={name}
      icon={icon as VisualAssetIconData}
      {...props}
    />
  );
}
