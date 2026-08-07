import { createElement, type SVGProps } from "react";
import visualAssets from "../../../research/visual-assets.json";

type CurrentBuildIconName =
  | "sidebar-activity"
  | "sidebar-mode-chevron"
  | "sidebar-new-chat"
  | "sidebar-quick-chat"
  | "sidebar-search";

interface CurrentBuildIconProps extends SVGProps<SVGSVGElement> {
  name: CurrentBuildIconName;
}

const reactAttributeNames: Readonly<Record<string, string>> = {
  "clip-rule": "clipRule",
  "fill-rule": "fillRule",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-width": "strokeWidth",
};

function toReactAttributes(attributes: object) {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      reactAttributeNames[name] ?? name,
      value,
    ]),
  );
}

export function CurrentBuildIcon({
  className,
  name,
  ...props
}: CurrentBuildIconProps) {
  const icon = visualAssets.icons.find((candidate) => candidate.id === name);
  if (!icon) throw new Error(`Unknown current-build icon: ${name}`);

  return (
    <svg
      aria-hidden="true"
      className={["demo-current-build-icon", className]
        .filter(Boolean)
        .join(" ")}
      data-current-build-icon={name}
      height={icon.renderSize.height}
      viewBox={icon.viewBox}
      width={icon.renderSize.width}
      {...toReactAttributes(icon.rootAttributes)}
      {...props}
    >
      {icon.primitives.map((primitive, index) =>
        createElement(primitive.tag, {
          ...toReactAttributes(primitive.attributes),
          key: `${name}-${index}`,
        }),
      )}
    </svg>
  );
}
