import { IconButton } from "codex-ui-kit";
import { useEffect, useId, useState, type CSSProperties } from "react";
import manifest from "./currentNavigationAssets2692831416.json";
import historicalManifest from "./currentNavigationAssets2693031730.json";
import latestManifest from "./currentNavigationAssets2693061225.json";
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
type Rect = { left: number; top: number; width: number; height: number };
type Item = { label: string; styleId: string; beforeStyleId: string; afterStyleId: string; icon: Icon;
  rect?: Rect; decorations?: { tag: string; rect: Rect; styleId: string }[] };
type Sample = { theme: string; width: number; state: string; backdropColors: string[]; items: Item[]; separatorStyleId: string;
  sharedCard?: { rect: Rect; styleId: string };
  tooltip: null | { label: string; styleId: string; rect: { left: number; top: number; width: number; height: number } } };
const samples = manifest.samples as unknown as Sample[];
const styles = manifest.styles as Record<string, Record<string, string>>;
export type NavigationAssetBuild = "26.928.31416" | "26.930.31730" | "26.930.61225";
const dataFor = (build: NavigationAssetBuild) => build === "26.930.61225"
  ? { samples: latestManifest.samples as unknown as Sample[], styles: latestManifest.styles as Record<string, Record<string, string>> }
  : build === "26.930.31730"
    ? { samples: historicalManifest.samples as unknown as Sample[], styles: historicalManifest.styles as Record<string, Record<string, string>> }
    : { samples, styles };
const paintProperties = [
  "background-color", "border-color", "border-style", "border-width", "border-radius",
  "box-shadow", "color", "opacity", "outline-color", "outline-style", "outline-width", "outline-offset", "corner-shape",
];
function paint(styleId: string, sourceStyles = styles): CSSProperties {
  return Object.fromEntries(paintProperties.map(name => [name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), paintValue(sourceStyles[styleId], name)]));
}
function paintValue(source: Record<string, string>, name: string) {
  if (["border-color", "border-style", "border-width"].includes(name)) return ["top", "right", "bottom", "left"].map(side => source[`border-${side}-${name.slice(7)}`]).join(" ");
  if (name === "border-radius") return ["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => source[`border-${corner}-radius`]).join(" ");
  if (name === "corner-shape") return ["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => source[`corner-${corner}-shape`]).join(" ");
  return source[name];
}
function pseudoPaint(item: Item, sourceStyles = styles): CSSProperties {
  return Object.fromEntries(["before", "after"].flatMap(pseudo => {
    const source = sourceStyles[pseudo === "before" ? item.beforeStyleId : item.afterStyleId];
    return paintProperties.map(name => [`--current-nav-${pseudo}-${name}`, paintValue(source, name)]);
  }));
}
function sampleFor(theme: "dark" | "light", state = "rest", build: NavigationAssetBuild = "26.928.31416", width = 1180) {
  const sample = dataFor(build).samples.find(sample => sample.theme === theme && sample.width === width && sample.state === state);
  if (!sample) throw new Error(`Missing current navigation source state: ${theme} ${state}`);
  return sample;
}
export function currentNavigationBackdrop(theme: "dark" | "light", build: NavigationAssetBuild = "26.928.31416", state = "rest", width = 1180): CSSProperties {
  return { background: [...sampleFor(theme, state, build, width).backdropColors].reverse().map(color => `linear-gradient(${color}, ${color})`).join(",") };
}
export function currentNavigationSeparator(theme: "dark" | "light", build: NavigationAssetBuild = "26.928.31416"): CSSProperties {
  return paint(sampleFor(theme, "rest", build).separatorStyleId, dataFor(build).styles);
}
export function currentNavigationSharedCard(theme: "dark" | "light", build: NavigationAssetBuild, state: string, width: number): CSSProperties | undefined {
  const card = sampleFor(theme, state, build, width).sharedCard;
  return card ? { ...paint(card.styleId, dataFor(build).styles), ...card.rect, position: "fixed", pointerEvents: "none" } : undefined;
}
function CurrentIcon({ icon, label, sourceStyles }: { icon: Icon; label: string; sourceStyles: typeof styles }) {
  const id = `navigation-mask-${useId().replaceAll(":", "_")}`;
  if (icon.kind === "alpha-mask") {
    const resolved = sourceStyles[icon.styleId];
    return <svg aria-hidden="true" data-current-build-icon={`navigation-${label}`} data-current-icon-kind="alpha-mask"
      style={{ color: resolved.color, fill: resolved.fill, borderRadius: paintValue(resolved, "border-radius"), overflow: resolved.overflow, width: 20, height: 20 }}>
      <defs><mask id={id} mask-type="alpha" color-interpolation="sRGB">
        <image href={icon.dataUri} width="100%" height="100%" />
      </mask></defs>
      <rect width="100%" height="100%" fill="currentColor" mask={`url(#${id})`} />
    </svg>;
  }
  const expand = (node: CompactPrimitive): VisualPrimitive => ({
    tag: node.tag, attributes: node.attributes, computedStyle: sourceStyles[node.styleId],
    ...(node.children ? { children: node.children.map(expand) } : {}),
  });
  return <VisualAssetIcon assetId={`navigation-${label}`} icon={{
    rootAttributes: icon.rootAttributes, rootComputedStyle: sourceStyles[icon.styleId], renderSize: icon.renderSize,
    viewBox: icon.viewBox!, primitives: icon.primitives!.map(expand),
  }} />;
}

/** Exact public glyph/paint replay; destination routes still require fresh evidence. */
export function CurrentNavigationAssetButton({ label, theme, build = "26.928.31416", sourceState, onInteractionChange }: {
  label: string; theme: "dark" | "light"; build?: NavigationAssetBuild;
  sourceState?: string; onInteractionChange?: (state: string) => void;
}) {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const sourceWidth = [1180, 820, 721, 720].includes(viewportWidth) ? viewportWidth : 1180;
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const state = sourceState ?? (hovered ? `hover:${label}` : keyboardFocused ? `focus:${label}` : "rest");
  const sample = sampleFor(theme, state, build, sourceWidth);
  const sourceStyles = dataFor(build).styles;
  const item = sample.items.find(item => item.label === label)!;
  const tooltip = sample.tooltip?.label === label && state !== "rest" ? sample.tooltip : null;
  const tooltipStyle = tooltip ? sourceStyles[tooltip.styleId] : null;
  return <><IconButton
    aria-current={label === "Home" ? "page" : undefined}
    aria-disabled={label === "Home" ? undefined : true}
    data-route-status="entry-observed-destination-not-replayed"
    data-visual-asset-status={`exact-public-${build}`}
    data-current-navigation-asset="true"
    data-source-width={sourceWidth}
    data-source-interaction={state}
    icon={<><CurrentIcon icon={item.icon} label={label} sourceStyles={sourceStyles} />
      {item.decorations?.map((node, index) => <span aria-hidden="true" data-current-navigation-decoration="status-dot" key={index} style={{
        ...paint(node.styleId, sourceStyles), position: "absolute", pointerEvents: "none",
        left: node.rect.left - item.rect!.left - (item.rect!.width - item.icon.renderSize.width) / 2,
        top: node.rect.top - item.rect!.top - (item.rect!.height - item.icon.renderSize.height) / 2,
        width: node.rect.width, height: node.rect.height,
      }} />)}</>}
    label={label}
    onBlur={() => { setKeyboardFocused(false); onInteractionChange?.(hovered ? `hover:${label}` : "rest"); }}
    onFocus={event => {
      const focused = event.currentTarget.matches(":focus-visible"); setKeyboardFocused(focused);
      onInteractionChange?.(hovered ? `hover:${label}` : focused ? `focus:${label}` : "rest");
    }}
    onPointerEnter={() => { setHovered(true); onInteractionChange?.(`hover:${label}`); }}
    onPointerLeave={() => { setHovered(false); onInteractionChange?.(keyboardFocused ? `focus:${label}` : "rest"); }}
    pressed={label === "Home"}
    style={{ ...paint(item.styleId, sourceStyles), ...pseudoPaint(item, sourceStyles), position: "relative" }}
  />{tooltip && tooltipStyle ? <div role="tooltip" data-current-navigation-tooltip={label} style={{
    ...paint(tooltip.styleId, sourceStyles), position: "fixed", pointerEvents: "none", zIndex: 100, boxSizing: "border-box",
    ...tooltip.rect, fontFamily: tooltipStyle["font-family"], fontSize: tooltipStyle["font-size"], fontWeight: tooltipStyle["font-weight"],
    lineHeight: tooltipStyle["line-height"], letterSpacing: tooltipStyle["letter-spacing"], textAlign: "center",
    padding: `${tooltipStyle["padding-top"]} ${tooltipStyle["padding-right"]} ${tooltipStyle["padding-bottom"]} ${tooltipStyle["padding-left"]}`,
  }}>{label}</div> : null}</>;
}
