# Visual asset provenance

Pixel comparison is useful only after every visible element in the compared
surface has a known source. Approximate icons, fallback fonts, and inferred
geometry otherwise create permanent noise that can hide regressions.

[`visual-assets.json`](visual-assets.json) is the machine-checked source of
truth for exact visual primitives observed in the current Codex Desktop build.
Each entry records the application/build fingerprint, the de-identified CDP
owner evidence, viewBox, rendered size, root SVG attributes, primitive
geometry, and canonical SHA-256. The same manifest explicitly lists remaining
approximations, so a passing regression check cannot be described as global
pixel parity while the list is non-empty.

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

The capture script is read-only: it first proves that every listener is bound
only to the declared loopback endpoint and that exactly one listener process
has the exact kernel-reported executable and NUL-delimited argv for the port,
address, and canonical unique profile. Every additional inherited listener
must descend from that exact main process.
It then selects the largest main Renderer
and outputs a recursive allowlisted SVG tree, allowlisted static semantic IDs,
geometry, computed style, and de-identified font samples. It never emits raw
page, conversation, project, account, title, aria-label, or test-id text. An
inline SVG `style` attribute fails capture instead of producing a lossy hash.
Process/profile setup and exact-PID cleanup remain explicit operator steps.
