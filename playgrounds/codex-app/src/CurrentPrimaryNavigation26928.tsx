import { AppPrimaryNavigationRail, IconButton, Popover } from "codex-ui-kit";
import { useEffect, useRef, useState } from "react";
import { CurrentNavigationAssetButton, currentNavigationBackdrop, currentNavigationSeparator, currentNavigationSharedCard, type NavigationAssetBuild } from "./CurrentNavigationAssetButton";

const helpLabels = [
  "macOS security update",
  "Quick chats with Pets and Appshots on Windows",
  "Browser extensions, site tools, and cloud sign-in",
  "Full changelog",
  "Set up Chrome extension",
  "Set up remote",
  "Keyboard shortcuts",
  "User guide",
  "Privacy center",
];

function PendingIcon() {
  return <span aria-hidden="true" data-current-build-icon-status="pending-26.928-capture" />;
}

/** Version-scoped structural replay; public glyph slices exclude account and route bodies. */
export function CurrentPrimaryNavigation26928({ assets = false, assetBuild = "26.928.31416", theme = "dark" }: { assets?: boolean; assetBuild?: NavigationAssetBuild; theme?: "dark" | "light" | "system" }) {
  const [systemLight, setSystemLight] = useState(() => window.matchMedia("(prefers-color-scheme: light)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setSystemLight(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const assetTheme = theme === "system" ? systemLight ? "light" : "dark" : theme;
  const [sourceState, setSourceState] = useState("rest");
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const sourceWidth = [1180, 820, 721, 720].includes(viewportWidth) ? viewportWidth : 1180;
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const profileButton = useRef<HTMLButtonElement | null>(null);
  return (
    <AppPrimaryNavigationRail
      className="demo-current-primary-navigation-rail"
      data-current-build={assets ? assetBuild : "26.928.21956"}
      data-visual-assets={assets ? "six-exact-public-navigation-glyphs" : "not-captured-for-current-build"}
      style={assets ? currentNavigationBackdrop(assetTheme, assetBuild, sourceState, sourceWidth) : undefined}
      footer={
        <Popover
          align="end"
          className="demo-current-profile-26-928"
          label="Profile menu (account content not retained)"
          onOpenChange={(open) => {
            setProfileOpen(open);
            if (!open) setHelpOpen(false);
          }}
          open={profileOpen}
          role="menu"
          side="right"
          sideOffset={4}
          trigger={<IconButton icon={<PendingIcon />} label="Open profile menu" onFocus={(event) => { profileButton.current = event.currentTarget; }} />}
          width="auto"
        >
          <div aria-hidden="true" className="demo-current-profile-26-928__unobserved" />
          <Popover
            align="end"
            className="demo-current-help-26-928"
            label="Help menu"
            onOpenChange={setHelpOpen}
            open={helpOpen}
            role="menu"
            side="right"
            sideOffset={4}
            trigger={
              <button
                className="demo-current-profile-26-928__help"
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || !helpOpen) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setHelpOpen(false);
                  setProfileOpen(false);
                  profileButton.current?.focus();
                }}
                onPointerEnter={(event) => {
                  event.currentTarget.focus();
                  setHelpOpen(true);
                }}
                role="menuitem"
                type="button"
              >Help</button>
            }
            width="auto"
          >
            <div className="demo-current-help-26-928__heading">What's new</div>
            {helpLabels.map((label, index) => (
              <div key={label}>
                {index === 4 ? <div className="demo-current-help-26-928__separator" role="separator" /> : null}
                <button aria-disabled="true" role="menuitem" tabIndex={-1} type="button">{label}</button>
              </div>
            ))}
          </Popover>
        </Popover>
      }
      navigationLabel="Primary navigation"
    >
      {assets && ["26.930.31730", "26.930.61225"].includes(assetBuild) ? <div aria-hidden="true" data-current-navigation-shared-card="true"
        style={currentNavigationSharedCard(assetTheme, assetBuild, sourceState, sourceWidth)} /> : null}
      {["Home", "Space", "Scheduled", "Plugins", "Explore", "Code Review"].map((label) => (
        <div className="demo-current-primary-navigation-26-928__entry" key={label}>
          {label === "Code Review" ? <div className="demo-current-primary-navigation-26-928__separator" role="separator" style={assets ? currentNavigationSeparator(assetTheme, assetBuild) : undefined} /> : null}
          {assets ? <CurrentNavigationAssetButton label={label} theme={assetTheme} build={assetBuild} sourceState={sourceState} onInteractionChange={setSourceState} /> : <IconButton
            aria-current={label === "Home" ? "page" : undefined}
            aria-disabled={label === "Home" ? undefined : true}
            data-route-status="entry-observed-destination-not-replayed"
            data-visual-asset-status="pending-26.928-capture"
            icon={<PendingIcon />}
            label={label}
            pressed={label === "Home"}
          />}
        </div>
      ))}
    </AppPrimaryNavigationRail>
  );
}
