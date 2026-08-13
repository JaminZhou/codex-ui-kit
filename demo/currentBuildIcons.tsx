import type { ComponentProps } from "react";
import visualAssets from "./current-thread-visual-assets.json";
import visualRasterAssets from "../research/visual-raster-assets.json";
import {
  VisualAssetIcon,
  type VisualAssetIconData,
} from "../playgrounds/codex-app/src/VisualAssetIcon";

export type CurrentThreadBuildIconName =
  | "composer-add-files"
  | "composer-dictate"
  | "composer-model-chevron"
  | "composer-permission"
  | "composer-send"
  | "sidebar-folder"
  | "sidebar-new-chat"
  | "thread-assistant-bad"
  | "thread-assistant-continue"
  | "thread-assistant-copy"
  | "thread-assistant-good"
  | "thread-header-actions"
  | "thread-header-bottom-panel"
  | "thread-header-new-chat"
  | "thread-header-open-in-chevron"
  | "thread-header-pinned-summary"
  | "thread-header-project"
  | "thread-header-side-panel"
  | "window-chrome-back"
  | "window-chrome-forward"
  | "window-chrome-sidebar";

export type CurrentThreadRasterAssetName = "thread-header-editor-vscode";

interface CurrentThreadBuildIconProps
  extends Omit<ComponentProps<typeof VisualAssetIcon>, "assetId" | "icon"> {
  name: CurrentThreadBuildIconName;
}

export function CurrentThreadBuildIcon({
  name,
  ...props
}: CurrentThreadBuildIconProps) {
  const icon = visualAssets.icons.find((candidate) => candidate.id === name);
  if (!icon) throw new Error(`Unknown current-thread build icon: ${name}`);

  return (
    <VisualAssetIcon
      assetId={name}
      icon={icon as VisualAssetIconData}
      {...props}
    />
  );
}

export function CurrentThreadRasterAsset({
  name,
}: {
  name: CurrentThreadRasterAssetName;
}) {
  const asset = visualRasterAssets.assets.find(
    (candidate) => candidate.id === name,
  );
  if (!asset) throw new Error(`Unknown current-thread raster asset: ${name}`);

  return (
    <img
      alt=""
      aria-hidden="true"
      data-current-build-raster-asset={name}
      height={asset.renderSize.height}
      src={`data:${asset.mimeType};base64,${asset.dataBase64}`}
      width={asset.renderSize.width}
    />
  );
}
