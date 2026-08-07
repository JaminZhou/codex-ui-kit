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

type VisualPrimitive = {
  attributes: object;
  children?: readonly VisualPrimitive[];
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
  const exactRootStyle =
    icon.rootComputedStyle as SVGProps<SVGSVGElement>["style"];

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
