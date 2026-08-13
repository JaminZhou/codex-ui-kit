import { createElement, type SVGProps } from "react";

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

export type VisualPrimitive = {
  attributes: Record<string, string>;
  children?: readonly VisualPrimitive[];
  computedStyle: Record<string, string>;
  tag: string;
};

export type VisualAssetIconData = {
  primitives: readonly VisualPrimitive[];
  renderSize: { height: number; width: number };
  rootAttributes: Record<string, string>;
  rootComputedStyle: Record<string, string>;
  viewBox: string;
};

export interface VisualAssetIconProps extends SVGProps<SVGSVGElement> {
  assetId: string;
  icon: VisualAssetIconData;
}

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

export function VisualAssetIcon({
  assetId,
  className,
  icon,
  style,
  ...props
}: VisualAssetIconProps) {
  const exactRootStyle = toReactStyle(icon.rootComputedStyle);

  return (
    <svg
      {...toReactAttributes(icon.rootAttributes)}
      aria-hidden="true"
      className={["demo-current-build-icon", className]
        .filter(Boolean)
        .join(" ")}
      data-current-build-icon={assetId}
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
        renderPrimitive(primitive, `${assetId}-${index}`),
      )}
    </svg>
  );
}
