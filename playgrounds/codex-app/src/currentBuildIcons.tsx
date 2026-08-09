import { createElement, type SVGProps } from "react";
import visualAssets from "../../../research/visual-assets.json";

type CurrentBuildIconName =
  | "composer-add-files"
  | "composer-branch"
  | "composer-dictate"
  | "composer-model-chevron"
  | "composer-permission"
  | "composer-project"
  | "composer-voice"
  | "composer-worktree"
  | "window-chrome-back"
  | "window-chrome-forward"
  | "window-chrome-sidebar"
  | "sidebar-activity"
  | "sidebar-archive"
  | "sidebar-folder"
  | "sidebar-help"
  | "sidebar-mode-chevron"
  | "sidebar-more"
  | "sidebar-new-chat"
  | "sidebar-pin"
  | "sidebar-plugins"
  | "sidebar-pull-request"
  | "sidebar-quick-chat"
  | "sidebar-scheduled"
  | "sidebar-search"
  | "sidebar-sites";

interface CurrentBuildIconProps extends SVGProps<SVGSVGElement> {
  name: CurrentBuildIconName;
}

const reactAttributeNames: Readonly<Record<string, string>> = {
  "clip-rule": "clipRule",
  "fill-rule": "fillRule",
  gradienttransform: "gradientTransform",
  gradientunits: "gradientUnits",
  preserveaspectratio: "preserveAspectRatio",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-width": "strokeWidth",
  "xlink:href": "xlinkHref",
};

const reactTagNames: Readonly<Record<string, string>> = {
  clippath: "clipPath",
  lineargradient: "linearGradient",
  radialgradient: "radialGradient",
};

function toReactAttributes(attributes: object) {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      reactAttributeNames[name.toLowerCase()] ?? name,
      value,
    ]),
  );
}

function toReactStyle(style: object): SVGProps<SVGElement>["style"] {
  return Object.fromEntries(
    Object.entries(style).map(([name, value]) => {
      const normalized = name
        .replace(/^-webkit-/, "Webkit-")
        .replace(/^-moz-/, "Moz-")
        .replace(/^-ms-/, "ms-")
        .replace(/-([a-z])/g, (_match, letter: string) =>
          letter.toUpperCase(),
        );
      return [normalized, value];
    }),
  ) as SVGProps<SVGElement>["style"];
}

type VisualPrimitive = {
  attributes: object;
  children?: readonly VisualPrimitive[];
  computedStyle: object;
  tag: string;
};

function renderPrimitive(
  primitive: VisualPrimitive,
  key: string,
): ReturnType<typeof createElement> {
  return createElement(
    reactTagNames[primitive.tag] ?? primitive.tag,
    {
      ...toReactAttributes(primitive.attributes),
      key,
      style: toReactStyle(primitive.computedStyle),
    },
    primitive.children?.map((child, index) =>
      renderPrimitive(child, `${key}-${index}`),
    ),
  );
}

export function CurrentBuildIcon({
  className,
  name,
  style,
  ...props
}: CurrentBuildIconProps) {
  const icon = visualAssets.icons.find((candidate) => candidate.id === name);
  if (!icon) throw new Error(`Unknown current-build icon: ${name}`);
  const exactRootStyle = toReactStyle(icon.rootComputedStyle);

  return (
    <svg
      {...toReactAttributes(icon.rootAttributes)}
      aria-hidden="true"
      className={["demo-current-build-icon", className]
        .filter(Boolean)
        .join(" ")}
      data-current-build-icon={name}
      style={{
        ...exactRootStyle,
        height: icon.renderSize.height,
        width: icon.renderSize.width,
        ...style,
      }}
      viewBox={icon.viewBox}
      {...props}
    >
      {icon.primitives.map((primitive, index) =>
        renderPrimitive(primitive, `${name}-${index}`),
      )}
    </svg>
  );
}
