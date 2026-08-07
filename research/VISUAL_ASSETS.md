# Visual asset provenance

Pixel comparison is useful only after every visible element in the compared
surface has a known source. Approximate icons, fallback fonts, and inferred
geometry otherwise create permanent noise that can hide regressions.

[`visual-assets.json`](visual-assets.json) is the machine-checked source of
truth for exact visual primitives observed in the current Codex Desktop build.
Each entry records the application/build fingerprint, the de-identified CDP
owner evidence, viewBox, rendered size, source root class, resolved root SVG
style, per-primitive resolved style, root attributes, primitive geometry, and
canonical SHA-256. Root and descendant class effects are replayed through the
complete standard computed-style snapshots instead of depending on private
upstream stylesheets. The same manifest explicitly lists remaining
approximations, so a passing regression check cannot be described as global
pixel parity while the list is non-empty.

Resolved root styles are exact only for the manifest's named dark, resting
state at 1180×820. Other themes, interaction states, and viewport-specific
variants require their own runtime evidence before they can be called exact.

The first manifest intentionally marks its remaining-approximation inventory
as incomplete. The named blockers are the audited shell/sidebar/Composer
starting set, not a claim that every route and state has already been
enumerated. Global parity remains ineligible both while this inventory is
incomplete and while any completed-inventory entry is still approximate.

## Source and distribution boundary

- Current product geometry is observed from the rendered DOM and computed
  styles. Bundled business logic is not copied or deminified.
- Public or officially supplied assets may be committed with their source URL,
  original hash, and usage note.
- App-only reference visuals may be committed when required for this
  exploratory parity playground, but their ownership and source build must be
  explicit.
- Exact reference visuals remain inside the private Codex app playground and
  research records. The npm package continues to publish only `dist` and does
  not include this reference manifest or the current-build renderer.
- OpenAI names and visual assets remain OpenAI property. Their inclusion is for
  product-related exploration and does not imply endorsement or relicense
  them under this repository's MIT license. See the official
  [OpenAI Design Guidelines](https://openai.com/brand/).

## Typography rule

Asset presence does not prove runtime use. The current `app.asar` contains
OpenAI Sans font files, but CDP computed styles for the main shell, navigation,
and Composer resolve to `-apple-system, system-ui, Segoe UI, sans-serif` with
observed weights 445 and 500. The parity playground therefore keeps the system
stack for these surfaces rather than bundling or forcing OpenAI Sans.

Run `pnpm check:research` to validate provenance hashes, package boundaries,
runtime status, and the explicit remaining-approximation denominator.

For a fresh isolated build probe, launch a second Codex process with a unique
profile and loopback-only CDP port, prepare a disposable public state, and run:

```sh
CODEX_VISUAL_ASSET_CDP_PORT=<port> \
CODEX_VISUAL_ASSET_PROFILE=<absolute-unique-profile> \
node scripts/capture-current-visual-assets.mjs
```

After reviewing that de-identified output, `pnpm update:visual-assets` performs
the deterministic geometry match and rewrites the five promoted entries. It
requires a complete ordered one-to-one primitive match; the Activity icon is
the only explicit derivation and must contain the observed, fingerprinted
attention-dot primitive after the promoted neutral bell primitive. No added,
removed, duplicated, or unmatched primitive is silently accepted. The
updater requires the same isolated port/profile environment and includes the
app fingerprint, capture date, theme, interaction state, and viewport in every
v4 hash. A changed app fingerprint refreshes the capture date; an unchanged
fingerprint preserves it so a dry run remains byte-for-byte deterministic.

The capture script is read-only: it first proves that every listener is bound
only to the declared loopback endpoint and that exactly one listener process
has the exact kernel-reported executable and NUL-delimited argv for the port,
address, and canonical unique profile. Every additional inherited listener
must descend from that exact main process.
It then selects the largest main Renderer
and outputs a recursive allowlisted SVG tree, allowlisted static semantic IDs,
geometry, computed style, and de-identified font samples. It never emits raw
page, conversation, project, account, title, aria-label, or test-id text. An
inline SVG `style` attribute or any other unknown attribute fails capture
instead of producing a lossy hash. Selected `aria-*`, focus/role metadata, SVG
namespace declarations, and the SVG `version` marker are explicitly ignored
as non-visual metadata. Root `class` and `viewBox` are accepted only because
their source/resolved state is captured separately and included in the hash;
the same attributes on a child still fail closed.
Before capture output or updater write, a shared sanitizer requires the exact
475-property computed-style protocol and rejects external, data, application,
blob, extension, scheme-relative, and other non-local URL values. SVG
references may target only a safe local `#fragment`. The research checker
locks the property-name-set hash and exercises raw, CSS-escaped, and
scheme-relative negative URL/protocol fixtures. Local URL parsing follows CSS
ASCII-whitespace rules and requires the untrimmed payload to be exactly the
safe fragment, so quoted leading spaces and Unicode whitespace cannot turn
into document-relative requests. The same shared sanitizer
covers the de-identified font-style samples and all promoted icon styles,
attributes, class names, view boxes, and render sizes before capture output.
Process/profile setup and exact-PID cleanup remain explicit operator steps.
