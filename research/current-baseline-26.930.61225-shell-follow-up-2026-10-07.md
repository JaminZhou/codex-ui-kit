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
- The generated record was sanitized before inspection; no screenshot, task
  copy, account identity, project name, or process/port identity is retained.
  The exact spawned process and its temporary profile were removed after the
  structural observations were recorded.

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

## Evidence boundary and inventory mapping

This is current-build CDP structural/computed-style evidence only. Renderer
viewport emulation is not native-window resizing; it does not establish
Browser interaction acceptance, Electron behavior, or installed-product
regional-pixel parity. Dynamic project content changed the observed sidebar
scroll height between captures, so that value remains diagnostic, not a
pixel-gate constant. The global promoted baseline remains `26.903.71938`.

The corresponding candidate fragments are mapped in `ui-inventory.json` to
the New chat destination, empty Composer, shared shell, primary rail, project
navigation/group lifecycle, native project-menu boundary, Profile → Help, and
titlebar/sidebar controls. All nine remain candidate-only; Browser, Electron,
and regional-pixel promotion gates are still outstanding.
