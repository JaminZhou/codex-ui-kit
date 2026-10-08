# Current Home control assets: impact and evidence

## Candidate scope

Four public static controls in the fingerprinted `26.930.61225` / `13232`
empty Home: mark, Add, Dictate, Voice. The manifest records exact source
vectors, theme paint, rendered sizes, eight viewport/theme samples and
32 local product-crop hashes. References contain only those public controls;
raw crops, process/profile data and account-specific text are not committed.
OpenAI owns the reference visuals; they are not MIT-relicensed or shipped in
npm. `SOURCES.md` now routes the existing exploratory exception to the canonical
visual-asset policy rather than contradicting it.

Implementation changes are confined to `CurrentHome26930`, its caller's theme
prop, the new private `CurrentHomeObservedIcon`, and version-scoped Home CSS.
The historical `.31730` candidates and generic SVG renderer are unchanged.
The new renderer namespaces local mask IDs per instance and rejects ambiguous
or external mask references. Layout centering replaces transformed centering
only in the `.61225` Home welcome/Composer containers; no shared shell or
public protocol behavior changes.

## Acceptance scope

- Full `pnpm check`: research, types, root/playground/Electron tests, package
  consumer/build, demo, a11y and historical/current Home family checks.
- `node scripts/check-current-home-observed-assets.mjs`: manifest hashes,
  allowlisted inert visual primitives, local mask references, eight samples
  and npm exclusion. Three additional unit tests cover namespace collision,
  source immutability, invalid/missing/duplicate references and theme coverage.
- From `playgrounds/codex-app`, with an absolute hash-verified crop directory
  in `CODEX_UI_KIT_CURRENT_HOME_ASSET_REFERENCES`:
  `node scripts/check-current-home-assets-26-930-61225.mjs --browser`, and the
  same command without `--browser` for isolated Electron. Both verify control
  and SVG bounds plus independently calibrated sRGB pixels at dark/light ×
  1180/820/721/720; each reports 32 strict RGBA comparisons with zero residual.
  The new strict equality assertion is separate from the unchanged 0.8%
  perceptual cap; absent/hash-mismatched references fail rather than skip.

The first pixel run failed at 820/721 despite correct control bounds. Removing
the independently implemented fractional centering transform repaired the
paint discrepancy without changing the reference, dimensions, colors, alpha
or pixel thresholds. Independent Browser/CDP and Electron then both passed.
Execution head/tree, command exits and external log locations are retained in
the local validation receipt and PR description; research records do not
retain ephemeral runtime identifiers.

No online turn acceptance is required for this static private-scene change:
App Server, MCP, live lifecycle and general acceptance infrastructure are
unchanged. Full online acceptance remains required at stage closure, important
integration and release. This PR is not a stage closure or baseline promotion.

## Remaining requirements

Whole Home body/current copy, context/model glyphs, hover/focus, populated
Composer and real turn lifecycle, native resizing and other app routes remain
open. Exact equality in 32 control crops does not establish whole-app parity;
the global baseline remains `26.903.71938`.
