# 26.930.61225 shell and Profile → Help follow-up

## Capture identity and scope

- Captured: 2026-10-07 (Asia/Shanghai).
- Codex Desktop: `26.930.61225`, build `13232`.
- Chromium: `154.0.8037.98`.
- `app.asar`: 546,868,805 bytes; SHA-256
  `88b8cce6f627771bf341f5a6bb464ad220749b0d442d44f618d7741c2de7318b`.
- The production updater returned `up_to_date` for this exact installed build.
- The probe used one separately launched Codex process, an exact temporary
  profile, a loopback-only CDP listener, and the documented main-Renderer
  selection by app URL, viewport area, and structural landmarks. It navigated
  only the fixed New chat and Pull requests controls and read-only menus; no
  task was submitted. The isolated profile did not isolate account content.
- The generated structural record was sanitized before inspection; it retains
  no screenshot, task copy, account identity, project name, or process/port
  identity. A separate, narrow shell-edge reference is documented below. The
  exact spawned process and its temporary profile were removed after capture.

## Observed shell fragments

The sampled New chat Renderer remained dark and had no horizontal overflow at
1180×820, 820×680, 721×680, and 720×680. The 52px primary rail and 269.88px
content sidebar form a 321.88px navigation region while expanded. At 720px,
explicit collapse leaves the 52px rail, and Show sidebar restores the
321.88px navigation region. The empty 44px Composer editor measured 712px,
437.13px, 338.13px, and 337.13px wide at those respective viewports. This
does not cover a populated thread, submitted turn, alternate theme, native
window resize, or product-pixel comparison.

The sidebar contained five project groups. A representative project row was
30px high and 253.88px wide; pointer, Enter, and Space expanded/collapsed it
with focus retained. The native project-actions trigger was present, but its
menu items were unavailable to the Renderer probe. These observations do not
identify project names or make content-dependent row counts and scroll heights
global invariants.

## Profile → Help lifecycle

The separate `Help menu` trigger was not present in the sampled shell. Help was
reachable through `Open profile menu` → hover `Help`. The open state contained
a 228×239.94px Profile menu (7 controls) and a 389.41×300.63px Help submenu
(9 controls). One Escape closed both menus and returned focus to Profile. No
account-specific menu text was retained.

The 2026-10-06 candidate record's `no-supported-help-trigger-present` result
only checked for a separate Help button: its version gate did not attempt the
nested Profile → Help path for 26.930.61225. It must not be read as evidence
that Help was absent. The capture now includes this build in its nested Help
probe, and the 2026-10-07 follow-up above records the observed path.

## Main-surface paint observation

A separate read-only inspection of the same fingerprinted dark main Renderer
measured the primary rail at `x=0..52`, the content sidebar at
`x=52..321.875`, and the main surface beginning at `x=321.875`. The main
surface resolved to `rgb(24, 24, 24)`, `box-shadow: none`, and a 1px left
border with `rgba(255, 255, 255, 0.082)`. The rail, sidebar, and aside had
transparent backgrounds and no box shadow; the app root used a translucent
dark surface over `rgb(20, 20, 20)`. The observation used only the selected
main Renderer and retained no account or task content.

The current playground's generic `.demo-root .codex-ui-app-shell__main` rule
adds a half-pixel shadow edge plus two diffuse shadows. That is a concrete
dark-shell mismatch candidate for a version-scoped replay correction; it does
not establish how light theme or other routes paint the same element. The
localized navigation-edge residual remains unexplained and is not evidence
that this main-surface shadow caused it.

## Dark main-edge Browser/CDP-to-Electron pixel slice

The replay now removes that generic shadow and applies the observed 1px left
border only to `primary-navigation-current-26-930-61225` in dark theme. The
product reference is the 16×640px crop at `(321,120)` in
[`current-shell-26.930.61225/assets.json`](current-shell-26.930.61225/assets.json)
and `main-edge-dark-1180x820.png`; it contains no route copy. The dedicated
Electron gate also checks the 1180×820 native bounds, DPR 1, 52px rail, 269.875px
sidebar, main bounds/background/border/shadow, no overflow, and an independent
sRGB alpha-composition control. DPR 1 is explicit because an unconstrained
Electron launch inherited the host Retina DPR 2 and resampled the fractional
edge, making its screenshot incomparable with the CDP reference.

The gate composites both sRGB renderer rasters over the observed opaque main
surface `rgb(24,24,24)` before perceptual comparison. This preserves visible
appearance while separating renderer-specific edge alpha from actual color
drift. The scoped run passed at 0.0000% perceptual changed pixels with maximum
visible RGB delta 11 (16-level cap). Raw strict RGBA still differs on 12.5000%
of the crop, with maximum raw channel delta 59; those differences are limited
to the two fractional seam columns, while the 14 interior columns are exact.
This is a cross-renderer, composited regional gate—not byte-identical or
whole-shell parity. It does not cover light theme, other routes, native window
resizing, populated content, or the remaining inventory surfaces.

## Evidence boundary and inventory mapping

The shell follow-up contains current-build CDP structure/styles plus one
version-scoped Browser/CDP-to-Electron composited pixel fragment. Renderer
viewport emulation is not native-window resizing, and this fragment does not
establish full-shell Browser interaction acceptance or whole-surface Electron
parity. Dynamic project content changed the observed sidebar scroll height
between captures, so that value remains diagnostic, not a pixel-gate constant.
The global promoted baseline remains `26.903.71938`.

The corresponding candidate fragments are mapped in `ui-inventory.json` to
the New chat destination, empty Composer, shared shell, primary rail, project
navigation/group lifecycle, native project-menu boundary, Profile → Help, and
titlebar/sidebar controls. All nine remain candidate-only. This narrow main
edge gate is evidence for one paint fragment only; full Browser interaction,
whole-shell Electron, and surface-level regional-pixel promotion gates remain
outstanding.
