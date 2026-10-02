import { IconButton } from "codex-ui-kit";
import { useId, useState, type CSSProperties } from "react";
import manifest from "./currentNavigationAssets2692831416.json";
import { VisualAssetIcon, type VisualPrimitive } from "./VisualAssetIcon";

type CompactPrimitive = {
  tag: string;
  attributes: Record<string, string>;
  styleId: string;
  children?: CompactPrimitive[];
};
type Icon = {
  kind: "vector" | "alpha-mask";
  rootAttributes: Record<string, string>;
  styleId: string;
  renderSize: { width: number; height: number };
  viewBox?: string;
  primitives?: CompactPrimitive[];
  dataUri?: string;
};
type Item = { label: string; styleId: string; beforeStyleId: string; afterStyleId: string; icon: Icon };
type Sample = { theme: string; width: number; state: string; backdropColors: string[]; items: Item[]; separatorStyleId: string;
  tooltip: null | { label: string; styleId: string; rect: { left: number; top: number; width: number; height: number } } };
const samples = manifest.samples as unknown as Sample[];
const styles = manifest.styles as Record<string, Record<string, string>>;
const paintProperties = [
  "background-color", "border-color", "border-style", "border-width", "border-radius",
  "box-shadow", "color", "opacity", "outline-color", "outline-style", "outline-width", "outline-offset", "corner-shape",
];
function paint(styleId: string): CSSProperties {
  return Object.fromEntries(paintProperties.map(name => [name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), paintValue(styles[styleId], name)]));
}
function paintValue(source: Record<string, string>, name: string) {
  if (["border-color", "border-style", "border-width"].includes(name)) return ["top", "right", "bottom", "left"].map(side => source[`border-${side}-${name.slice(7)}`]).join(" ");
  if (name === "border-radius") return ["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => source[`border-${corner}-radius`]).join(" ");
  if (name === "corner-shape") return ["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => source[`corner-${corner}-shape`]).join(" ");
  return source[name];
}
function pseudoPaint(item: Item): CSSProperties {
  return Object.fromEntries(["before", "after"].flatMap(pseudo => {
    const source = styles[pseudo === "before" ? item.beforeStyleId : item.afterStyleId];
    return paintProperties.map(name => [`--current-nav-${pseudo}-${name}`, paintValue(source, name)]);
  }));
}
function sampleFor(theme: "dark" | "light", state = "rest") {
  const sample = samples.find(sample => sample.theme === theme && sample.width === 1180 && sample.state === state);
  if (!sample) throw new Error(`Missing current navigation source state: ${theme} ${state}`);
  return sample;
}
export function currentNavigationBackdrop(theme: "dark" | "light"): CSSProperties {
  return { background: [...sampleFor(theme).backdropColors].reverse().map(color => `linear-gradient(${color}, ${color})`).join(",") };
}
export function currentNavigationSeparator(theme: "dark" | "light"): CSSProperties {
  return paint(sampleFor(theme).separatorStyleId);
}
function CurrentIcon({ icon, label }: { icon: Icon; label: string }) {
  const id = `navigation-mask-${useId().replaceAll(":", "_")}`;
  if (icon.kind === "alpha-mask") {
    const resolved = styles[icon.styleId];
    return <svg aria-hidden="true" data-current-build-icon={`navigation-${label}`} data-current-icon-kind="alpha-mask"
      style={{ color: resolved.color, fill: resolved.fill, borderRadius: paintValue(resolved, "border-radius"), overflow: resolved.overflow, width: 20, height: 20 }}>
      <defs><mask id={id} mask-type="alpha" color-interpolation="sRGB">
        <image href={icon.dataUri} width="100%" height="100%" />
      </mask></defs>
      <rect width="100%" height="100%" fill="currentColor" mask={`url(#${id})`} />
    </svg>;
  }
  const expand = (node: CompactPrimitive): VisualPrimitive => ({
    tag: node.tag, attributes: node.attributes, computedStyle: styles[node.styleId],
    ...(node.children ? { children: node.children.map(expand) } : {}),
  });
  return <VisualAssetIcon assetId={`navigation-${label}`} icon={{
    rootAttributes: icon.rootAttributes, rootComputedStyle: styles[icon.styleId], renderSize: icon.renderSize,
    viewBox: icon.viewBox!, primitives: icon.primitives!.map(expand),
  }} />;
}

/** Exact public glyph/paint replay; destination routes still require fresh evidence. */
export function CurrentNavigationAssetButton({ label, theme }: { label: string; theme: "dark" | "light" }) {
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const state = hovered ? `hover:${label}` : keyboardFocused ? `focus:${label}` : "rest";
  const sample = sampleFor(theme, state);
  const item = sample.items.find(item => item.label === label)!;
  const tooltip = sample.tooltip?.label === label && state !== "rest" ? sample.tooltip : null;
  const tooltipStyle = tooltip ? styles[tooltip.styleId] : null;
  return <><IconButton
    aria-current={label === "Home" ? "page" : undefined}
    aria-disabled={label === "Home" ? undefined : true}
    data-route-status="entry-observed-destination-not-replayed"
    data-visual-asset-status="exact-public-26.928.31416"
    data-source-interaction={state}
    icon={<CurrentIcon icon={item.icon} label={label} />}
    label={label}
    onBlur={() => setKeyboardFocused(false)}
    onFocus={event => setKeyboardFocused(event.currentTarget.matches(":focus-visible"))}
    onPointerEnter={() => setHovered(true)}
    onPointerLeave={() => setHovered(false)}
    pressed={label === "Home"}
    style={{ ...paint(item.styleId), ...pseudoPaint(item), position: "relative" }}
  />{tooltip && tooltipStyle ? <div role="tooltip" data-current-navigation-tooltip={label} style={{
    ...paint(tooltip.styleId), position: "fixed", pointerEvents: "none", zIndex: 100, boxSizing: "border-box",
    ...tooltip.rect, fontFamily: tooltipStyle["font-family"], fontSize: tooltipStyle["font-size"], fontWeight: tooltipStyle["font-weight"],
    lineHeight: tooltipStyle["line-height"], letterSpacing: tooltipStyle["letter-spacing"], textAlign: "center",
    padding: `${tooltipStyle["padding-top"]} ${tooltipStyle["padding-right"]} ${tooltipStyle["padding-bottom"]} ${tooltipStyle["padding-left"]}`,
  }}>{label}</div> : null}</>;
}
