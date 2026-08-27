# Runtime capture protocol

Package structure supplies candidate surfaces. This protocol supplies the
missing evidence needed to decide whether a candidate is reachable, how it is
composed, and which states the independent implementation must cover.

The current environment blocks automated Computer Use access to
`com.openai.codex`. A user-authorized second process exposes a loopback-only
CDP endpoint for scoped Renderer observation. Its temporary Chromium profile
does not isolate Codex account, project, or navigation data, so captures must
stay inside a disposable user-opened test chat or global non-mutating routes.
Native-window behavior, system dialogs, and states that cannot be reached
safely still require manual or user-assisted capture.

## Capture record

Create one record for each distinct surface or state transition:

| Field | Required evidence |
| --- | --- |
| Build | App version, build number, and capture date. |
| Entry | The user action and prior state that opened the surface. |
| Ownership | `turn`, `thread`, `workspace`, `app`, or `cross-layer`. |
| Container | Timeline, sticky composer, side panel, window, popover, dialog, or native menu. |
| Lifecycle | Creation, update, completion, cancellation, dismissal, restoration, and persistence rules. |
| States | Idle, hover, focus, disabled, loading, streaming, success, warning, failure, and empty variants that apply. |
| Input | Mouse, keyboard, drag, resize, scroll, IME, and accessibility behavior that apply. |
| Layout | Window size, theme, panel visibility, overflow, responsive changes, and representative measurements. |
| Evidence | Screenshot or short recording path outside the repository plus an abstract written observation. |
| Inventory | The matching `ui-inventory.json` ID or a proposed new ID. |

Do not store private thread names, prompts, repository contents, credentials,
or personal account data in captures. Use a disposable sample thread and
de-identified workspace whenever possible.

For CDP captures:

- bind the endpoint to `127.0.0.1` and use a temporary Chromium profile;
- never infer that the application data is isolated from the Chromium profile;
- avoid existing chats and redact account, project, site, task, and repository
  names from written evidence;
- use read-only navigation and DOM/accessibility inspection by default;
- distinguish emulated Renderer viewport metrics from a real native-window
  resize and verify the latter separately.

## Reproducible CDP double-open probe

Use this only for an explicitly authorized, non-mutating Renderer observation.
`open -na` asks macOS to start a new application instance, but an
application's own single-instance policy can still reject or redirect it.
The unique Chromium profile makes a successful second process more likely; it
does not create a second Codex account or isolated task store.

Submitting a prompt is outside the default read-only probe. Do it only when
the user explicitly authorizes a disposable test task. Use synthetic,
non-sensitive copy, never reuse existing task text, and limit the write to the
minimum lifecycle transition being measured.

Choose an unused loopback port first:

```bash
codex_cdp_port=9339
lsof -nP -iTCP:${codex_cdp_port} -sTCP:LISTEN
codex_probe_dir=$(mktemp -d /private/tmp/codex-ui-kit-cdp.XXXXXX)
open -na /Applications/ChatGPT.app --args \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=${codex_cdp_port} \
  --user-data-dir=${codex_probe_dir}
```

Confirm that the spawned process actually uses the unique profile and that the
debugging socket is loopback-only:

```bash
ps -axo pid=,command= | grep -F -- "--user-data-dir=${codex_probe_dir}"
lsof -nP -iTCP:${codex_cdp_port} -sTCP:LISTEN
curl -fsS --max-time 5 \
  "http://127.0.0.1:${codex_cdp_port}/json/version"
curl -fsS --max-time 5 \
  "http://127.0.0.1:${codex_cdp_port}/json/list"
```

Do not attach to the first returned `page`. The `26.721.41059` sample exposed
two visible `app://-/index.html` targets, and neither had focus. Select with all
of these signals:

1. the target is a `page` whose URL starts with `app://-/index.html`;
2. its viewport area matches the expected main window rather than a small
   auxiliary window;
3. its structural shell has the expected landmarks and interactive density;
4. the heuristic is checked again after every application update.

The target-selection probe should inspect only structural facts such as URL,
viewport, landmark counts, and interactive-element counts. Do not use private
thread text, project names, PR titles, account content, or repository content
as selectors.

For cleanup, resolve the exact main PID from the unique
`--user-data-dir` argument, terminate only that spawned process, verify its
children and listening port are gone, and then delete only the exact temporary
profile directory. Never use a broad `pkill` or delete a shared profile.

CDP evidence covers Renderer behavior only. Record native window, menu,
system-dialog, and real resize behavior separately.

### Previous `26.803.41515` approval-variant boundary

The previously installed `/Applications/ChatGPT.app` reported version `26.803.41515`, build
`6321`; its `app.asar` SHA-256 is
`5f6e773aafd542d3cf09e10b5dca6cabd301d0a155f4b8ce870e3915fc3da25e`.
Read-only package inspection and the pinned public App Server schema establish
two candidates: file-change approval can return the distinct
`acceptForSession` decision, and automatic approval review publishes
`item/autoApprovalReview/started|completed` with terminal timeout semantics.

Neither transition was forced in the real product for this slice. The
repository therefore records only independently authored protocol fixtures,
component behavior, Browser/CDP computed state, Electron interaction, and
internal raster regression baselines. Those gates validate the implementation;
they are not labeled current runtime observation or external product-pixel
parity. A future disposable real task can promote each path only after its
trigger, exact target, cleanup, and non-sensitive capture boundary are safe.

### Current `26.820.60940` global-shell baseline

The current installed build is `26.820.60940` (`7119`) with Chromium
`151.0.7922.170`, a 282402769-byte `app.asar`, and SHA-256
`c964aebbf9a6a0f70799d01215c611d8ef6ee63f816b3d57beccddd47a811fd9`.
One isolated second process on loopback port `9881` re-runs the structural main
Renderer selection, New chat at 1180/820/721/720 widths, sidebar lifecycle,
Help menu, Pull requests round trip, and Projects Index route. The capture
records no private labels or screenshots.

The project action menu remains outside the Renderer `[role="menu"]`. Its 24×24
trigger resolves through the live React owner to a frozen
`electronBridge.showContextMenu` provider. The baseline records exact action
IDs, message IDs, fixed labels, separators, icons, and selectable callbacks
without invoking an action. A separate native observation confirms the
ChatGPT-owned Quartz layer-101 window remains 221×187. The six decoded fixed
SVG sources match the narrow public manifest. The 720px explicitly collapsed
shell now omits Back and Forward, while the collapsed 600px Projects content
is 559px with 415/128 columns. Raw pixels remain local-only. See
[`26.820.60940.md`](26.820.60940.md).

### Previous `26.818.41509` global-shell baseline

The prior build note retains the current-home, account-menu, conversation,
command, MCP, Markdown, sidebar-state, worktree, and product-pixel evidence
that has not yet been re-observed on 26.820. See
[`26.818.41509.md`](26.818.41509.md).

### Previous `26.810.52044` global-shell baseline

The reproducible shell capture is implemented by
`scripts/capture-current-baseline.mjs`. It accepts only an isolated loopback
CDP port, an absolute unique profile under `/private/tmp` or Trash, an explicit
navigation opt-in, and an optional output inside that exact profile. Before
connecting it verifies the installed build fingerprint, exact listener
ownership, executable argv, canonical profile, and listener-child parentage.
It also records the isolated owner start time and hashes the ASAR both before
and after Renderer sampling. The ASAR device, inode, size, hash, and latest
metadata-change time must remain identical, and that change must predate the
owner process by at least the start-time clock boundary. This fails closed if
the installed bundle is replaced after the running Renderer starts, rather
than attributing an old Renderer to newly installed bytes. The promoted
contract pins build `6662`, Chromium `151.0.7922.137`, `279946146` ASAR bytes,
and SHA-256
`6e7e8791b8bf69a586ff994721fff518af391d9efdc66cd2e620dd2a4aedc90f`.
Main-target selection uses URL, area, route-independent `main`/navigation/
sidebar-trigger landmarks, and visible-control density; it never selects by
target order or private text. A Composer is not required until the fixed New
chat route has been selected, so a process restored on Pull requests can still
be normalized safely.

Run it only against the separately opened process:

```bash
CODEX_CURRENT_BASELINE_CDP_PORT=${codex_cdp_port} \
CODEX_CURRENT_BASELINE_PROFILE=${codex_probe_dir} \
CODEX_CURRENT_BASELINE_ALLOW_NAVIGATION=1 \
CODEX_CURRENT_BASELINE_OUTPUT=${codex_probe_dir}/current-baseline.json \
pnpm capture:current-baseline
```

The allowlisted sequence is New chat → project pointer/Enter/Space expansion →
project and Help menu inspection → fixed viewport matrix → prove the sidebar
remains visible at 720px → explicit Hide → explicit Show → Pull requests → New
chat → explicit Hide cleanup. The first 720px sample occurs before any sidebar
normalization, so a stale automatic-collapse assumption fails closed. The JSON contains only build, target structure,
fixed route/control state, menu counts/focus/geometry, computed editor style,
project-group state, geometry, scroll ownership, viewport, theme, and overflow.
It never captures screenshots or arbitrary page/body text. Ancestor-aware
`checkVisibility()` distinguishes the visible navigation from retained hidden
layout nodes, and consecutive geometry samples exclude transition frames. Do
not hard reload the product Renderer: native initialization is not guaranteed
to replay and a reload can leave an empty app document.

The same route boundary applies on failure. A best-effort `finally` cleanup
returns the selected Renderer to New chat when necessary and independently
attempts to hide the sidebar before disconnecting CDP; one failed cleanup step
does not skip the remaining step or replace the original capture error.

New chat is ready only when its fixed `home-icon` route marker is visible; a
pre-existing Composer is insufficient. The contract requires that marker in
all New chat samples, rejects it on Pull requests, and rejects any missing or
non-finite horizontal-overflow measurement. At 720px, inspect and reject a
missing sidebar before any explicit sidebar normalization. Validate the
documented main and Composer geometry in every New chat state plus the single
navigation-owned wide/medium vertical scroller. The scroll owner must have
finite content height larger than its exact client height, but its
`scrollHeight` is intentionally not fixed: fresh profiles can expose different
de-identified project/task populations without changing the shell contract.

The `sidebarLifecycle` contract requires six project groups, 30px project
rows, pointer/Enter/Space collapse and restoration with focus retained, a
214.05px-wide six- or seven-item project menu depending on whether Mark all as
read is exposed, a 320×272.06 eight-item Help menu, one 75.67×28 Voice footer
control, Escape dismissal, compact visible-before-hide state, explicit
persisted-width restoration, and zero horizontal overflow. The observed project menu drops
focus to the document body on Escape; the Help menu returns focus to its
trigger. The independent UIKit intentionally improves the former behavior and
documents that divergence rather than weakening keyboard focus management.

The 2026-08-13 environment follow-up used one isolated process on loopback
port `9822`, exact main PID `24810`, and profile
`/private/tmp/codex-ui-kit-environment-cdp.CWsiES/profile`. It proved that the
sidebar preference can persist at 322.91px, so the baseline now records
`navigationWidth` and derives all dependent geometry instead of treating the
274.11px fresh-profile default as universal. The wide resize range remains
240–520px. The current 720px matrix clamps the persisted width only as needed
to preserve a 240px main column; the observed 322.91px preference therefore
remains visible rather than becoming a narrow overlay. The probe then
captured the five-action Work in menu, the
New-worktree no-environment menu, the current unavailable Environments route,
and the seven-action project menu. It created no environment, worktree, task,
project, or remote connection and normalized the product selection back to
Local before cleanup.

Cleanup terminated only exact main PID `24810`, its profile-owned children,
and reparented Crashpad handlers `24815`/`24817`. Port `9822` closed, every
recorded PID and the exact profile argv disappeared, and the complete local-
only capture root moved recoverably to Trash as
`codex-ui-kit-environment-cdp.CWsiES-20260813`.

The `26.803.61601` refresh used three fresh profiles on loopback ports
`9801`–`9803`. The first capture (main PID `58241`) failed closed after proving
that exact navigation `scrollHeight` depends on current de-identified task
population; the second fresh-profile repeat (main PID `59001`) confirmed the
same dynamic boundary. The final capture (main PID `59389`) completed the full
route, responsive, sidebar-lifecycle, runtime-identity, asset, and regional
pixel sequence. Cleanup terminated only those validated process trees,
including their exact reparented Crashpad handlers `58244`/`58246`,
`59003`/`59005`, and `59391`/`59393`; all three listeners closed and no exact
profile path remained in any argv. The two
failed profiles and the final raw JSON/local-only screenshot profile moved
recoverably to Trash as
`codex-ui-kit-baseline-61601.inA33Q-failed-20260811`,
`codex-ui-kit-baseline-61601-repeat.zpOBol-failed-20260811`, and
`codex-ui-kit-baseline-61601-final.QLM6Tr-20260811`.

The sidebar-lifecycle capture and calibration runs used loopback ports
`9791`–`9794` with exact main PIDs `15049`, `16085`, `16407`, and `16844`.
Cleanup stopped only those validated main processes and their eight exact
profile-owned Crashpad handlers `15054`/`15056`, `16090`/`16093`,
`16413`/`16415`, and `16849`/`16851`; every listener closed and no exact
profile argv remained. The primary, two fail-closed calibration, and final
successful profiles, including raw JSON and local-only references, moved
recoverably to Trash as `codex-ui-kit-sidebar-cdp.7ImQtd-20260810`,
`codex-ui-kit-sidebar-lifecycle.dL0GZO-failed-20260810`,
`codex-ui-kit-sidebar-lifecycle.Pn6KQN-failed-20260810`, and
`codex-ui-kit-sidebar-lifecycle.Va1yeY-20260810`.

The resulting metrics are Renderer viewport emulation, not proof of a native
BrowserWindow resize. Compare the same 1180/820/721/720 matrix separately in
Electron and keep regional product screenshots local-only. Cleanup must resolve
the exact owning PID from the declared profile, terminate only that process
tree, verify the loopback listener and profile argv are gone, and remove or
move only the exact temporary profile.

For the previous `26.803.41515` 2026-08-10 sample and repeats, cleanup terminated validated main PIDs
`8126`, `10432`, `13291`, and `17788` plus the eight exact profile-owned
reparented Crashpad handlers. Ports `9771`, `9781`, and `9782` closed, no
process retained any profile path, and the raw records and local-only screenshots
moved with the exact profiles to the recoverable Trash items
`codex-ui-kit-baseline-cdp.ttx3i1-20260810` and
`codex-ui-kit-baseline-cdp.l7K0Uy-20260810`, plus
`codex-ui-kit-route-cdp.zdFyJ5-20260810`.

The stricter repeat used four exact profiles on port `9783`: two fail-closed
calibration runs and two successful independent fresh-profile captures. It
terminated validated main PIDs `23684`, `24617`, `25197`, and `25532` plus
their eight exact profile-owned Crashpad handlers; the port closed and no
profile argv remained. All four profiles moved recoverably to Trash. Before
runtime-bundle identity was added, the two successful records were
byte-identical with SHA-256
`751ce8d580a4fc3c5ea61fde71e22db1f8098dd336438eab5725a020f50abf1c`.
That is a historical pre-hardening artifact, not a reproducible current-output
hash: current records intentionally include run-specific owner PID, process
start time, and before/after check times. Current reproducibility means the
stable fingerprint, state matrix, geometry, controls, and runtime-identity
relations satisfy the same contract across runs.
The optional output is restricted to a new direct child of the canonical
profile and is atomically opened with no symlink following; capture refuses to
overwrite an existing path. The record must match the promoted app version,
build number, app.asar size/SHA-256, and Chromium version exactly. All five
primary routes must appear once inside `nav` whenever navigation is visible.
The fixed control matrix requires Back/Forward whenever navigation is visible
and requires both controls to be absent in the explicitly collapsed state. It
also requires mutually exclusive Hide/Show sidebar controls, Composer controls
on New chat, and no Composer controls on Pull requests.

The previous `26.803.41515` runtime-identity repeat used exact main PID `32692`, loopback port `9785`,
and one fresh profile. Its owner started at `1786326246000` ms; both ASAR reads
reported device `16777231`, inode `341558647`, 223450200 bytes, change time
`1786150111510` ms, and the promoted SHA-256. The successful record hash is
`f8f4bb0381ac951af3c972d12778d62476dbd557986183a97b5d492ab330c04c`.
Cleanup terminated only that main process and its two reparented Crashpad
handlers, verified the port and exact profile argv were gone, and moved the
record recoverably to
`codex-ui-kit-runtime-id-cdp.TkSi3W-20260810` in Trash.

### Previous `26.803.61601` worktree status lifecycle

This mutating probe is limited to two fresh disposable Git repositories and
two unique Chromium profiles. Each repository has one synthetic initial commit
and is passed positionally to a separate `open -na` process. The two CDP ports
bind only to `127.0.0.1`; the original Codex PID, real repositories, and real
tasks remain untouched.

The successful path selects `New worktree` and submits one harmless synthetic
prompt. High-frequency CDP observation records the 30px task row, real Git
worktree creation, the exact two-path spinner, its 2s animation, the persistent
14×14 worktree marker, and the restored row after completion. The failure path
blocks only the disposable repository's `.git/worktrees` location, submits a
second synthetic prompt, and reaches the real `Worktree init failed` row plus
the main error details and `Edit environment` / `Retry` controls. Restoring the
disposable path and activating Retry creates the worktree and removes the
failure presentation. Package structure retains the internal
`queued | creating | setting-up` distinctions even though their Renderer
presentation intentionally shares the same loading visual.

Only structural selectors, computed styles, exact SVG paths, de-identified
labels, and local screenshots are retained. The product row crops remain
untracked and drive optional loading/error/restored foreground-mask gates at
4.11%, 5.00%, and 1.67%; Browser/CDP and Electron independently lock raw state,
geometry, animation, color, and recovery semantics.

Cleanup terminates only the two validated second-instance main PIDs and their
four exact profile-owned reparented Crashpad handlers. Both loopback ports and
all exact profile arguments are verified absent. The two clean created
worktrees are removed through their owning disposable repositories, leaving
only each original synthetic worktree. The complete probe root, profiles, and
local screenshots move recoverably to the single Trash item
`codex-ui-kit-worktree-status.DF99q0-20260811`; the original Codex process
remains running.

### Previous `26.810.52044` worktree status lifecycle

The current-build refresh repeats the bounded success and deterministic
failure/Retry paths with two new disposable Git repositories, unique profiles,
and loopback-only CDP ports. A third isolated process narrows the geometry
sample. Repository registration uses the macOS open-file event by placing the
disposable path before `--args`; a path passed only after `--args` is not a
valid project-registration probe.

The success path creates a real worktree and completes. The failure path
blocks only the disposable `.git/worktrees` directory, reaches both the main
`Worktree setup failed` surface and sidebar `Worktree init failed`, restores
the directory, and completes through Retry. Cleanup archives the exact
synthetic tasks, removes both disposable projects from the isolated app state,
verifies their temporary worktrees are gone, closes only the isolated
processes and ports, and leaves the original Codex process untouched. Raw
profiles, screenshots, and task text remain local-only in recoverable Trash
items.

The 30px task row still uses a 14×14 branch glyph and 20×20 status rails, but
the current trailing geometry differs from the earlier sample. Ordinary rails
end 8px from the row edge. Pending worktree rows place the branch 39px from the
edge, while restored idle rows place it 11px from the edge. Most importantly,
a failed unread worktree keeps all three signals at once: branch at 67px, red
16×16 error on a rail at 36px, and blue 8×8 unread attention on a second rail
at 8px. Hover/focus actions replace the complete three-track presentation.
Browser/CDP and Electron independently gate the composition, accessibility
links, exact geometry, color, paths, and action replacement. Three local-only
259×30 row crops gate only the owned trailing regions. Loading passes at
2.9762% under 6%; failed-plus-unread and restored pass at 0% under 6.5% and
2.5% respectively.

### Previous `26.818.41509` worktree entry and status lifecycle

The refresh uses two new disposable single-commit repositories, isolated
Chromium profiles, and loopback-only ports 9881 and 9882. The primary Codex
instance remains on 9874 and is checked before and after every mutating step.
The current `Work in` menu exposes `Local`, `New local worktree`, `Connect
Codex web`, disabled `Cloud`, and `Usage remaining`. The selected context uses
`Select where to run the chat`, `Select a local environment`, and `What branch
should this chat start from?`; the 264×91.125 Environment menu contains only
`Work without environment` and `Set up project`.

The success path reaches real loading and restored worktree rows. The failure
path blocks only the disposable repository's `.git/worktrees` location,
reaches `Worktree init failed` plus the main `Worktree setup failed` surface,
and then completes through Retry after moving that blocker aside. All sampled
rows are 30px high. Loading uses a 14×14 branch marker at a 39px right inset
and a 20×20 status rail at 8px; failure keeps the branch at 67px, a red 16×16
error at 38px, and a blue 8×8 unread dot at 14px; restored places the branch
at 11px. The spinner's exact two paths and two-second animation are gated, but
its transformed runtime bounding box and instantaneous angle are not frozen.

Browser/CDP and Electron repeat the entry, failure, Retry, action replacement,
and recovery lifecycle. Privacy-safe unmasked 56×30 loading/restored and 84×30
failed-plus-unread tails pass at 2.0833%, 0.7540%, and 0.1786%. Both exact
synthetic tasks are archived; raw task text, profiles, screenshots, and capture
records remain outside version control. Cleanup uses each exact project's own
`Remove project` confirmation, verifies that both repositories retain only
their original worktree, terminates only isolated PIDs 65980/67237 and their
profile-owned handlers, and confirms ports 9881/9882 and both profile arguments
are absent while primary PID 43055 still owns 9874. The full probe root moves
recoverably to `codex-ui-kit-worktree-26-818-20260824` in Trash.

### Previous `26.818.41509` sidebar collection edge states

The primary Renderer on port 9874 provides the current empty-state anchor
without a second app process: the visible `codex-app-server-client` project
contains `No chats`. CDP records a 306.90625×29 row, 14px font, 21px line
height, `4px 32px` padding, and 0.5 opacity. A privacy-safe 140×29 crop is kept
outside version control and passes the independent empty-state foreground gate
at 1.8227%.

Current ASAR structure supplies the otherwise transient loading semantics: one
18%-wide 12px heading shimmer and four deterministic 12px row shimmers. The
older 26.818 lifecycle also separates its `Needs input` pill from unread
attention and adds an ordinary 16×16 error row. Those error/loading claims and
the 29px live empty crop remain explicitly tied to 26.818.

The 26.820 edge-state recapture uses a disposable local project task blocked
on a real `Deny`/`Allow once` approval and proves that the off-route row now
keeps the ordinary 16×16 spinner instead of a text pill. The same isolated
profile exposes a live five-row project boundary. `Show more` sits in the same
`role=list` as a 32px `listitem`, has no `aria-expanded`, reveals all 11
content-dependent rows, removes itself, and never exposes `Show less`.
Browser/CDP and Electron repeat that one-way behavior with twelve replay rows.
Privacy-safe 28×30 and 140×32 product crops pass at 2.7381% and 3.8393%; raw
titles, thread IDs, profiles, and full screenshots remain local-only.

### Previous `26.803.61601` worktree persistence and directory recovery

A separate fresh-profile probe uses one disposable repository and one
loopback-only CDP listener. It creates a real worktree-backed task, waits for a
harmless exact response, restarts only the isolated app process, and confirms
that the project and task survive with the 14×14 branch marker. The initial
post-restart route is New chat; selecting the retained task restores its exact
conversation and 240px workspace summary. This is evidence for persisted
project/task state, not automatic thread-route restoration.

The probe then moves only the disposable worktree aside and activates the
retained task. It records the 736×37.125 `Current working directory missing`
notice, unavailable Pull request status after settlement, and a still-editable
736×98 Composer. One pure model turn completes successfully without a working
directory. Restoring the directory and reopening the task inside the same app
session does not clear the notice; a full isolated app restart does. The
warning is therefore treated as informational, has no inferred Retry/repair
action, and is session-latched for this observed build.

The public replay keeps restored and missing-directory frames distinct.
Browser/CDP verifies selected-row, branch-marker, message-count, summary,
notice, and Composer geometry. Electron submits a model-only turn, toggles the
workspace summary, opens New chat, and reselects the retained task to verify
that the missing-directory warning stays latched and the 600px modal sidebar
dismisses so the restored thread is interactive. The optional
current-product notice crop passes at 3.2572% under a 4% ceiling. Raw records
and product screenshots remain local-only. Cleanup terminates only the exact
isolated process and profile-owned handlers, removes the real Git worktree
through its disposable owner repository, verifies the loopback listener and
profile arguments are gone, and moves the probe root recoverably to Trash; the
original Codex process remains running.

### Current application-shell capture

The `26.721.81911` App shell capture used an exact second main process with a
unique `/private/tmp/codex-ui-kit-shell-cdp.XXXXXX` profile and loopback port.
The main `app://-/index.html` target was selected by 1180×820 area and shell
landmarks; an auxiliary 480×340 target was excluded.

The safe, non-mutating route sequence was:

1. record the 46px titlebar and Sidebar/Back/Forward control bounds;
2. activate Pull requests and sample its loading status and selected state;
3. emulate 1180→820→720→1180 and recheck selection, overflow, sidebar, and
   workspace-panel ownership;
4. open Sites only far enough to inspect and dismiss the first-use terms
   dialog without accepting it;
5. return to Pull requests and verify selection;
6. crop only x=80…199, y=0…45 for the external window-chrome pixel gate.

A hard Renderer reload returned the app to its default route. That result is a
negative persistence boundary, not a failed selection-continuity check.
Explicit offline/reconnect/error UI could not be reached safely from the
non-mutating route and remains synthetic acceptance evidence. Cleanup resolves
and terminates only the PID bearing the unique profile, verifies its children
and loopback listener are gone, and removes only that exact profile and the
external screenshot.

### Current `26.803.61601` App Server crash and restart capture

The fatal-recovery probe used one exact isolated process with a unique profile
under `/private/tmp` and loopback-only CDP port `9831`. It first resolved the
isolated main PID and the App Server child belonging to that process tree. Only
that child received `SIGTERM`; the user's ordinary Codex processes and their
App Servers were excluded by parentage.

The product opened the 408×400 recovery Renderer with `ChatGPT stopped
unexpectedly`, documentation/configuration guidance, and Update ChatGPT, Open
Config.toml, and Restart actions. The same Renderer was safely emulated at
1180×820 for computed-style and geometry capture. Restart restored the main
app in about 1.4 seconds and created a new App Server child. This proves the
fatal process-recovery path, not a response-stream disconnect.

The public component and playground independently reproduce the observed
ownership and host callbacks. Browser/CDP gates exact copy, 896px/448px
container geometry, 28px icon, current typography, three action sizes/colors,
720px fit, and Restart restoration. Real Electron repeats the native resize
and restart interaction. The optional local-only pixel gate uses
`CODEX_UI_KIT_APP_SERVER_CRASH_REFERENCE`; its 1180×820 full/core ratios are
0.1101% and 1.1993% under 0.2% and 2% ceilings. No product screenshot is
tracked.

The same build's package structure was read only to distinguish recoverable
thread `error` notifications from this fatal path. The independent protocol
trace covers retry progress, recovery, terminal failure, and a successful
same-thread follow-up. A real response-stream disconnect and a real global
notification queue were not induced, so those two inventory rows remain
`not_sampled` even though their Browser/CDP, Electron, and reviewed internal
pixel contracts now pass.

### Previous 26.721.81911 conversation and Composer capture

The `26.721.81911` conversation probe used a second exact process with a unique
`/private/tmp/codex-ui-kit-conversation-cdp.XXXXXX` profile and loopback port.
It selected the 1180×820 `app://-/index.html` main Renderer by area and
Composer landmarks. The user-authorized task used only synthetic prompts.

The bounded sequence was:

1. sample empty, focused, and three/four-line input geometry;
2. submit one synthetic turn and record the send → 28px Stop → completed
   transition, value clearing, and focus behavior;
3. submit a second long synthetic turn, interrupt it, and record the stopped
   input state;
4. run again, submit one queued synthetic follow-up, record Steer/Delete/more,
   Stop the active turn, and record the paused header and Resume;
5. open the permission menu and record only its visible option labels and
   outer bounds;
6. open Add files and more, record the Goal/Plan/skill/plugin groups, and
   dismiss it without selecting, uploading, or connecting anything;
7. capture only the 792×320 bottom-main Composer crops used by the optional
   regional pixel gates.

The exact spawned PID was resolved from its unique profile argument. Cleanup
terminated only that PID, verified its child/service process and loopback
listener were gone, and deleted only the exact temporary profile. The main
Codex process remained running. The untracked screenshots are external gate
inputs, not repository assets.

### Current coding-workspace entry capture

The `26.721.81911` workspace-entry probe used an exact second process with a
unique `/private/tmp/codex-ui-kit-workspace-cdp.XXXXXX` profile and a
loopback-only port. It selected the 1180×820 `app://-/index.html` main Renderer
by area, shell landmarks, and the new-chat Composer rather than target order.

The safe, non-mutating sequence was:

1. activate New chat and record the 768px start column, 736×98 Composer, and
   the 736×28 project/environment/worktree context row;
2. open the project control, record its dialog and listbox bounds, computed
   row styles, option count, selected state, folder icons, and selected check;
3. capture the full main Renderer and only the project listbox for optional
   ownership-scoped pixel comparisons;
4. dismiss the project dialog without selecting an option, creating a
   worktree, or changing the active project.

This current-build observation establishes workspace-entry layout and the
project picker only. The independent Electron acceptance additionally selects
synthetic projects and worktrees, verifies environment-menu focus, exercises
the searchable local-environment dialog and repairing-disabled state, submits
the protocol-backed Composer, and continues through command, approval, file
Review, Terminal, and Pull request surfaces. Those synthetic transitions are
not evidence that current-product persistence or real worktree mutation was
observed.

Cleanup resolved and terminated only the exact main PID bearing the unique
profile, verified its child processes and loopback listener were gone, and
deleted the profile plus the three external screenshots. The original Codex
main process remained running.

### Current `26.730.61309` workspace-entry refresh

The refreshed probe used `open -na` with a unique Chromium profile because a
direct binary launch correctly honored Electron's single-instance lock. The
exact second process exposed loopback-only CDP on port `9558`; the main
Renderer was selected by `app://-/index.html`, viewport area, shell landmarks,
and the `Do anything` editor. The existing Codex process was excluded by PID.

The safe sequence was:

1. record the selected-project heading, two suggestion rows, Composer,
   project/Local/branch context controls, computed typography, and 1180×820
   screenshot;
2. open the project dialog, record its search/list/actions, capture only the
   252×144 listbox crop, then dismiss with Escape;
3. open Start in, choose New worktree, record the four-part inline context,
   open and dismiss the No environment menu, then return to Work locally;
4. open the branch menu and record only de-identified structure, count,
   selection, dimensions, and fixed create action;
5. choose Don't work in a project, record the generic heading and one-control
   context, then restore the original project;
6. resize the same Renderer to 720×680, verify automatic sidebar hiding,
   16px Composer insets, overlay clamping, and zero horizontal overflow;
7. pass the external PNGs only through the named optional pixel gates. Raw
   screenshots remain outside version control.

No project, branch, environment, file, command, or remote mutation was
performed. The public Electron flow exercises equivalent state transitions
against de-identified fixtures; it does not upgrade creation or persistence
to observed product behavior.

Cleanup terminated the exact second-process tree, its two profile-specific
Crashpad handlers, modifier monitor, App Server, and profile-owned Computer
Use service. Port `9558` is closed; the unique profile and external PNGs were
moved to the recoverable Trash directory
`codex-ui-kit-workspace-entry-cdp.XXXXXX-20260805`. The original Codex PID
`96228` remained running.

### Current Review rename/delete capture

The `26.721.81911` Review probe used an exact second process, the loopback-only
port `9471`, and a unique
`/private/tmp/codex-ui-kit-review-cdp.XXXXXX` profile. The selected
`app://-/index.html` Renderer measured 1180×820; the 480×340 avatar target was
excluded by area. Two disposable tasks operated only on ignored
`.research/current-review-probe` text files with `apply_patch`.

The delete task exposed the current turn-owned card as a 28px-action
`Edited …` row with `+0 −1`, `Undo`, and `Review`. Opening Review produced the
independent 370px side region, a `Last Turn` toolbar, the deleted path, and a
single deletion line. The rename-only task exposed an important backend/UI
boundary: the current product represented the move as separate zero-line file
entries and rendered `No content`; it did not expose one merged rename-arrow
row in this run. The public App Server `move_path` mapping remains implemented
independently, but it must not be described as observed current-product
presentation.

CDP recorded the action and panel geometry plus computed font, color, padding,
radius, and overflow styles. External 906×774 Renderer crops were visually
reviewed and then removed; they are not repository assets. Binary and conflict
states were not safely reached in the current product. Their deterministic
fixtures are explicitly host-derived coverage, not runtime evidence.

Cleanup terminated only the exact main PID bearing the temporary profile,
verified that its children and `127.0.0.1:9471` listener were gone, removed the
exact profile, and deleted the disposable ignored files. The original Codex
process remained running.

### Current `26.730.61309` Review rename/delete refresh

The refreshed probe used exact second-process PID `85638`, loopback-only port
`9559`, and a unique temporary profile. Two disposable tasks used only
`apply_patch` against ignored `.research/current-review-probe` text files.
The deletion path retains one card and one deletion diff. The rename path now
uses separate source and destination rows backed by an added/removed
`__CODEX_TEMP_RENAME_MARKER__` line, replacing the old `No content` rows while
remaining distinct from the public App Server `move_path` arrow semantic.

The independent replay locks the current 46px panel header, 36px `Last Turn`
toolbar, 36px file headers, marker-backed diffs, keyboard destination
selection, close/reopen sibling preservation, and Undo. Browser/CDP covers 86
reviewed frames, Electron repeats the lifecycle, and the current-build
906×820 gate passes at 6.21% full, 5.23% conversation, and 7.62% Review under
6.5%, 5.5%, and 8% limits. Binary/conflict remains explicitly host-derived.

Cleanup stopped exact main PID `85638`, its descendants, two profile-owned
Crashpad handlers, modifier monitor, and App Server; port `9559` closed and
the original PID `96228` remained running. The exact profile and external
evidence moved to the recoverable Trash item
`codex-ui-kit-review-refresh-cdp.EEQtJr-20260805`.

### Current `26.730.61639` Terminal lifecycle

The refresh used exact second-process PID `6418`, loopback-only CDP port
`9563`, and the unique profile
`/private/tmp/codex-ui-kit-terminal-current.F4TuJY`. The main Renderer was
selected by `app://-/index.html`, application-shell landmarks, and area, then
held at 1180×820 or 820×680. The original Codex process was excluded by PID.

The bounded sequence was:

1. open the bottom-panel picker and record Review, Terminal, Browser, Files,
   the project-labelled tab, close control, xterm `Terminal input`, and
   905.89×279 outer/905.89×239 content geometry;
2. create three local sessions, verify global visible numbering, close-nearest
   selection, post-close label reindexing, and no overflow at 820×680;
3. submit `sleep 3; echo terminal-after-reopen`, close/reopen the panel while
   it is running, then verify output settlement, prompt return, and independent
   per-session history;
4. close every session, verify panel collapse, use the top Toggle, and confirm
   that a fresh empty current-workspace terminal is created rather than the
   last closed session being restored;
5. retain an older-workspace Terminal while switching the chat worktree,
   record the exact mismatch warning plus `Dismiss` and `Open new terminal`,
   and verify that recovery preserves the older session;
6. pass only the de-identified 906×820 main capture into the optional external
   pixel gate.

ArrowLeft moved focus to the active native tab but did not change its selected
session. UIKit retains keyboard tab movement as an accessibility enhancement,
not a current-product parity claim. A failed direct shell command also did not
add a tab status badge, so failed/exited process summaries remain an
independent host-owned public contract.

Browser/CDP covers 93 lifecycle frames. Electron repeats the session,
mismatch, input, picker, close, and resizing behavior. The current external
reference differs by 1.5120% in the 272px panel region and 0.4004% in the
239px content region, below independent 2% and 1% limits; the diagnostic-only
full-main ratio is 8.6587% because the conversation content is intentionally
different.

Cleanup stopped exact main PID `6418` and its process tree, then terminated
only the two profile-owned orphan Crashpad handlers `6423` and `6427`. Port
`9563` closed and the original Codex PID `99263` remained running. The unique
profile and 18 external screenshots moved to the recoverable Trash item
`codex-ui-kit-terminal-61639-20260806`.

### Historical `26.721.81911` Terminal session capture

The `26.721.81911` Terminal probe used an exact second process, loopback port
`9481`, and a unique
`/private/tmp/codex-ui-kit-terminal-cdp.XXXXXX` profile. It selected the
1180×820 `app://-/index.html` main Renderer by area and shell landmarks.
The probe only opened UI-owned Terminal sessions; it did not submit a command
or mutate a workspace.

The bounded sequence was:

1. open the bottom-panel plus menu and record Review, Terminal, Browser, and
   Files;
2. activate Terminal repeatedly to create three auto-numbered tabs;
3. record tab/tabpanel roles, `aria-selected`, each named close button,
   `Terminal input`, tab typography, gap, and bounds;
4. close the active third tab and verify that the second tab becomes active;
5. emulate 820×680 and verify three tabs fit without horizontal overflow.

The current outer panel measured 279px including its resize affordance, the
visible tab strip measured 28px, and the tabpanel remained 239px. Tabs measured
140px at 1180×820 and about 136px at 820×680. A final product-level ArrowLeft
probe was not retained because the temporary CDP process exited before that
check; keyboard tab movement is therefore asserted only by the independent
Browser/Electron acceptance, not claimed as current-product evidence.

Cleanup confirmed the exact spawned process and `127.0.0.1:9481` listener were
gone, removed only the unique profile, and deleted all six external
screenshots. The original Codex process remained running.

### Current Pull request lifecycle capture

The `26.721.81911` Pull request probe used an exact second process with a unique
temporary Chromium profile and loopback-only debugging port. It selected the
1180×820 `app://-/index.html` main Renderer by area and application-shell
landmarks, then opened public PR `#80` read-only.

The bounded sequence was:

1. record the PR index and open the detail without changing repository state;
2. inspect Summary facts, checks, reviewers, description, comment-action
   disabled state, and sampled merge readiness;
3. inspect Timeline public comments and bot-review entries;
4. open Code only long enough to record its loading boundary;
5. measure the panel and separator at 1180×820, 960×720, 820×680, and
   720×680, including sidebar collapse at the compact width;
6. expand and restore the detail, then use Back and Forward to verify route,
   tab, and geometry restoration.

At 1180×820 the panel measured x=810.72/w=369.28 with a 16px separator
beginning at x=801.72 over the 906px main route. At 960×720, 820×680, and
720×680 the panel was respectively 321.97px, about 319px, and 329.31px wide.
The detail remained non-modal and did not inert the underlying main route.

No real comment, review, rerun, or merge action was activated. Successful Code
content was not reached within the bounded capture, so only its loading state
is recorded. The independent Browser/Electron replay exercises those mutating
and failure transitions against deterministic public host state, not GitHub.
Cleanup terminated only the exact temporary-profile process, verified its
listener was gone, and removed its external screenshots and profile.

### 26.727.40816 refresh capture

The `26.727.40816` refresh used exact process PID `38608`, loopback port
`9511`, and unique profile
`/private/tmp/codex-ui-kit-turn-cdp.ovwKlU`. It selected the 1180×820
`app://-/index.html` main Renderer by URL, area, and shell landmarks. The
installed package fingerprint, Chromium `150.0.7871.182`, and ASAR hash are
recorded in [`26.727.40816.md`](26.727.40816.md).

The bounded read-only sequence was:

1. record the 46px titlebar, 274.11px sidebar, primary navigation, section
   expansion, item actions/status, and footer;
2. open New chat, measure the 712×44 `Do anything` input and context row, then
   open/dismiss the 260×249.5 project dialog without selecting a project;
3. open the bottom Terminal panel without submitting input and record the
   project-named tab plus close/add controls;
4. open public PR `#80`, inspect Summary and its integrated Timeline, wait for
   successful Code content, inspect the three display-only Review options,
   and measure responsive panel geometry at 1180, 960, 820, and 720px;
5. capture only external current-build references needed for the optional
   ownership-scoped PR pixel gate.

The PR detail auto-hid after each responsive transition, so the selected row
was explicitly reopened before measuring. Code reached real multi-file diff
content with an 81492px scroller. No prompt, command, project selection,
comment, review, auto-merge, or merge action was submitted. The independent
review composer remains host-owned synthetic acceptance because the observed
Review options menu contains only word-wrap, rich-preview, and word-diff
display settings.

Cleanup resolved and terminated only PID `38608`, verified
`127.0.0.1:9511` and its children were gone, and moved only the exact
temporary profile and external screenshots into one recoverable Trash
directory. The original Codex process remained running.

### 26.727.40816 successful MCP capture

The successful MCP refresh used exact process PID `59950`, loopback port
`9512`, and unique profile
`/private/tmp/codex-ui-kit-mcp-cdp.u8Gd3C`. In a disposable New chat task it
submitted one synthetic prompt authorizing only OpenAI Developer Docs Search
and Fetch. The task performed no shell, browser, or file action.

The completed 1180×820 Renderer exposed `Worked for 31s`, an intermediate
assistant explanation, `Used OpenAI Developer Docs integration`, and exactly
two successful ordered rows: Search OpenAI docs and Fetch OpenAI doc. The
expanded group measured 736×75px; the title and call rows used 14/21px
typography, the current system-font stack, 445 weight, and 0.6 secondary
color. The linked final answer remained in the same turn.

The current 906×820 pixel gate passes at 2.03% full-main, 0.05%
tool-structure, 1.87% answer, and 1.92% Composer difference. Dynamic
header/task/intermediate/group-label glyphs and the scrollbar are masked; the
answer remains unmasked, while CDP separately locks masked text style,
ordered labels, disclosure state, and geometry.

Cleanup terminated only PID `59950`, verified the exact profile children and
`127.0.0.1:9512` listener were gone, and moved the unique profile plus exact
temporary reference images into one recoverable Trash directory. The
original Codex process remained running.

### 26.727.40816 MCP failure/recovery capture

The recovery refresh used exact process PID `67251`, loopback port `9513`,
and unique profile
`/private/tmp/codex-ui-kit-mcp-recovery-cdp.7ztEiz`. In a disposable New chat
task it authorized only OpenAI Developer Docs calls. The first Fetch used
`not-a-valid-url` and failed with `Invalid URL`; recovery then used three
Search calls and one valid Fetch. No shell, browser-navigation, or file action
was requested or performed.

The expanded 1180×820 Renderer exposed `Worked for 51s`, a standalone failed
Fetch with 736×67.3125px neutral `plaintext / Invalid URL` output, an
intermediate explanation, a later `Used OpenAI Developer Docs integration`
group with four successful rows, and a linked final Markdown answer. Computed
styles recorded the 12.5px failed-card radius, 0.05 white background, 0.157
white border, 13/18.5714px language label, 14/22.75px 445-weight monospace
output, and the existing 14/21px system-font integration rows.

The masked 906×820 pixel gate passes at 1.63% full-main, 2.90% recovery,
1.08% upper activity/failure, and 1.91% Composer difference. The final answer
remains unmasked; CDP separately gates dynamic labels, disclosure ownership,
status, accessibility, typography, and geometry.

Cleanup terminated only PID `67251` plus the two exact Crashpad helpers left
with that profile, verified the listener and all exact-profile processes were
gone, and moved the profile and reference images into
`/Users/JaminZhou/.Trash/codex-ui-kit-mcp-recovery-cleanup.yS1xY9`. The
original Codex process remained running.

### 26.803.41515 MCP success and recovery capture

The current-build refresh used exact main PID `38873`, loopback-only CDP port
`9791`, and unique profile
`/private/tmp/codex-ui-kit-mcp-current.YFVFyG`. Preflight verified the
installed version/build, unchanged ASAR fingerprint, exact executable and argv,
canonical profile ownership, loopback listener, inherited-listener parentage,
and Chromium `151.0.7922.76` before selecting the main 1180×820
`app://-/index.html` Renderer. Both disposable prompts allowed only the OpenAI
Developer Docs integration and explicitly excluded shell, browser-navigation,
and file actions.

The successful task completed in 35 seconds with Search OpenAI docs → Search
OpenAI docs → Fetch OpenAI doc under one
`Used OpenAI Developer Docs integration` group. The terminal call rows expose
transparent content-width buttons whose accessible names come from their
visible summaries; running rows remain non-expandable. A second task completed in 16
seconds after invalid-URL Fetch → Search → valid Fetch. On this build the
failed Fetch remains inside the same integration group rather than becoming
the standalone activity used by `26.727.40816`.

The expanded failure output measures 736×67.3125px at 1180×820 with a 12.5px
radius, `rgba(255,255,255,0.05)` background,
`rgba(255,255,255,0.157)` border, 13/18.5714px language label, and
14/22.75px 445-weight monospace result. At 720×680 the product has no visible
navigation, document width remains exactly 720px with zero horizontal
overflow, and the 688px card begins 12px left of the viewport.

Independent public replays cover five lifecycle states plus one compact
variant. Browser/CDP gates ordered calls, status, disclosure semantics,
expanded output, computed styles, and responsive overflow; Electron repeats
the interactions and a real native 720×680 resize. Six reviewed internal
pixel baselines pass. Two optional local-only external gates compare the
successful 736×100 group at 1.6440% changed pixels under 2% and the visible
compact recovery-card region at 1.1017% under 1.2%; dynamic task content and
the external screenshots stay outside the repository.

Cleanup terminated only validated main PID `38873` and exact profile-owned
reparented Crashpad handlers `38876` and `38878`. Port `9791` closed, no process
retained the exact profile path, and the profile plus raw JSON and screenshots
moved recoverably to
`/Users/JaminZhou/.Trash/codex-ui-kit-mcp-current.YFVFyG-20260810`.

### 26.810.52044 MCP success, failure, and reconnect capture

The refresh used exact main PID `15575`, loopback-only CDP port `9841`, and
unique profile `/private/tmp/codex-ui-kit-mcp-26-810.3DIzCN`. Preflight
verified build `6662`, Chromium `151.0.7922.137`, the unchanged 279946146-byte
ASAR and SHA-256
`6e7e8791b8bf69a586ff994721fff518af391d9efdc66cd2e620dd2a4aedc90f`,
the exact executable/profile ownership, and the 1180×820 main Renderer. The
accepted synthetic tasks allowed only OpenAI Developer Docs Search/Fetch and
explicitly prohibited shell, Browser, file, and project actions. One diagnostic
task returned a different documentation page and was excluded.

The accepted canonical task performed exactly Search OpenAI docs → Fetch
OpenAI doc, completed in 25 seconds, and returned `Model Context Protocol` with
`https://developers.openai.com/codex/mcp`. The accepted recovery stayed in one
integration group, performed invalid-URL Fetch → Search → canonical Fetch,
exposed `plaintext / Invalid URL`, and completed in 18 seconds. The wide
failure card remains 736×67.3125px with the same 12.5px radius, 0.05 white
background, 0.157 white border, 13/18.5714px language label, and 14/22.75px
445-weight monospace output. After an explicit product-sidebar hide, the
720×680 card is 688×67.3125px at x=16 with zero horizontal overflow.

The first accepted turn also reached a real transient `Reconnecting 2/5` row
and then completed in place. Current DOM capture records the exact 16×16 MCP
glyph, 14×14 disclosure chevron with closed opacity zero and open rotation 90
degrees, and exact four-path 16×16 reconnect glyph. The targeted updater
requires every group and call-row glyph to share one fingerprint and verifies
group and call counts, 21px row heights, reconnect presence,
build/theme/viewport, and the unchanged manifest fingerprint before writing.
For a future fingerprint change, a de-identified MCP capture stored inside the
same isolated profile can instead supplement the full capture; the updater
requires matching new-build fingerprint/theme/viewport and promotes the whole
manifest atomically, avoiding any old/new baseline mix.

Independent Browser/CDP and Electron gates cover the current calls,
content-width labelled disclosure buttons, neutral failure output, transport
retry/recovery, and compact resize. Nine reviewed internal frames pass. The
local-only product gates compare the aligned 736×80 successful tool region at
1.956521739130435% under 2% and the complete 688×67 compact failure card at
1.2018396390142311% under 1.21%. Product screenshots and sidebar content stay
outside the repository.

Cleanup archived only the three exact synthetic tasks, terminated validated
main PID `15575` and exact profile Crashpad handlers `15580` and `15582`,
verified port `9841` and all exact-profile argv were gone, and moved the
profile recoverably to
`/Users/JaminZhou/.Trash/codex-ui-kit-mcp-26-810.3DIzCN-20260819`. The main
Codex process remained running.

### 26.803.41515 unavailable integration and fallback capture

A second isolated current-build process used exact main PID `74865`,
loopback-only CDP port `9823`, and unique profile
`/private/tmp/codex-ui-kit-mcp-transport.6R8wjo`. Preflight retained the same
installed version/build, ASAR fingerprint, executable/profile ownership, and
Chromium `151.0.7922.76` boundary before selecting the 1180×820 main Renderer.
Both public read-only prompts explicitly prohibited shell, Browser navigation,
web search, and file access.

The first turn allowed only GitHub MCP. The product emitted no MCP event/group
and completed in 16 seconds with `GitHub MCP integration is unavailable.` That
absence is evidence of integration capability unavailability, not a fabricated
transport call. The next prompt stayed in the same thread and allowed only the
OpenAI Developer Docs integration. It completed in 34 seconds after Search
OpenAI docs → Fetch OpenAI doc under one expanded
`Used OpenAI Developer Docs integration` group, followed by the exact linked
recovery answer.

At 720×680 navigation is hidden, document overflow is zero, the Composer is
688px wide, and the recovered group is 688×71px. Its 14/21px system text uses
weight 445, 0.6 white, and antialiased font smoothing. The schema-valid replay
covers unavailable, recovering, recovered, and compact states. Browser/CDP
locks the absence of a false GitHub call, exact responses, call order,
typography, expanded ownership, and compact geometry; Electron opens both
activity timelines and the recovered group before a native compact resize.
Four reviewed internal baselines pass. The optional local-only 688×71 product
comparison differs by 0.6449% under a 1.3% hard limit. This proves same-thread
fallback to another available integration; a true disconnect/reconnect of the
same transport remains unsampled.

Cleanup terminated only validated main PID `74865` and exact profile-owned
reparented Crashpad handlers `74868`/`74870`. Port `9823` closed, no process
retained the exact profile path, and the unique profile plus raw screenshots
moved recoverably to
`/Users/JaminZhou/.Trash/codex-ui-kit-mcp-transport.6R8wjo-20260810`. The
original Codex PID `17080` remained running.

### Independent current-style mixed-tool composition

No additional product process was launched for this composition. The trace
reuses only public App Server item shapes and current component contracts that
were already established separately: `webSearch` search/open/find,
`mcpToolCall` Search → Fetch, command execution and approval, `fileChange`, and
`collabAgentToolCall`. It contains 39 events across four turns and exposes
eight lifecycle checkpoints plus a 720×680 completed scene.

Browser/CDP verifies the grouped Search and Browser activities, MCP call order,
pending approval, applied file Review, active/completed subagent presentation,
system typography, disclosure state, and compact geometry. Electron opens each
surface, switches the side panel from Review to the delegated transcript, and
performs a native 720×680 resize with a 688px Composer and zero horizontal
overflow. Nine reviewed committed rasters provide internal pixel-regression
gates. The aggregate replay matrix is now 33 traces, 406 events, and 151
CDP/pixel frames.

This is deliberately `independent_composition`, not runtime capture. It does
not claim that the installed product emitted the full sequence in one task,
does not add a current-build runtime-evidence row, and does not replace future
whole-thread CDP/product comparison when that path becomes safely reachable.

### 26.727.40816 Composer queue and Stop capture

The current Composer refresh used exact process PID `78399`, loopback port
`9514`, and unique profile
`/private/tmp/codex-ui-kit-composer-cdp.Ma9hyd`. It selected the 1180×820 main
Renderer and created one disposable text-only task. The prompts explicitly
forbade tools, commands, browser navigation, and file access.

The bounded sequence was:

1. start a long synthetic response and wait for the 28×28 Stop control;
2. enter a second prompt while the first response remains active;
3. record the queued tray, its computed ancestor chain, and
   Steer/Delete/message-actions controls;
4. Stop after two seconds, record `You stopped after 2s`, and verify that the
   queue row disappears;
5. verify that the queued prompt becomes the next user turn and starts
   automatically, with no paused header or Resume action;
6. repeat the transition after active output to exclude a zero-second timing
   branch;
7. capture only the two 792×320 bottom-main crops used by the optional
   current-build regional gates.

The current tray measured 710×39px at x=372.05/y=667. Its inner scroll region
measured 708×38px and its row measured 684×28px at x=385.05/y=673. The text
used 14/16px system typography. The independent replay now uses the current
automatic-continuation state by default while retaining paused/Resume as a
legacy compatibility frame.

At the strict 0.05 pixel threshold and 2% hard changed-pixel limit, the queued
and automatic-continuation crops pass at `0.003480114` and `0.005105745`.
CDP covers 61 lifecycle frames and real Electron repeats the default
transition.

Cleanup stopped only PID `78399`, verified the exact profile process set and
port `9514` were gone, and moved the profile and screenshots into
`/Users/JaminZhou/.Trash/codex-ui-kit-composer-cleanup.FE0SB8`. The original
Codex process remained running.

### 26.727.40816 Composer menus and long-input capture

The current menu refresh used exact process PID `89666`, loopback port `9515`,
and unique profile
`/private/tmp/codex-ui-kit-composer-menus-cdp.8CjIBw`. It selected the
1180×820 main Renderer, entered only an unsubmitted synthetic draft, and did
not select a permission/resource option, submit a turn, or use any tool.

The bounded sequence was:

1. record three-line, four-line, and 20-line textbox/surface geometry and
   computed overflow styles, then restore the four-line draft;
2. open the permission menu and record its heading, four labels, selected
   state, 47px rows, outer geometry, and computed styles;
3. dismiss with Escape, open `Add files and more`, and record the current
   736×320 inline picker, visible top groups, 726×310 scroller, and
   approximately 1010px content height without copying lower
   user/environment-specific labels;
4. dismiss without uploading, connecting, changing permission, or activating
   Goal/Plan;
5. capture one 792×320 Composer crop and two 906×820 main-only crops for
   ownership-scoped pixel gates.

The four-line Composer measured 736×134 with a 712×80 textbox; 20 lines
clamped the textbox to 205px and grew the surface to 736×259. The permission
menu measured 480.36×222.44 and the Add-resource picker 736×320. Public,
data-driven permission and resource components now pass 61-frame CDP,
Electron selection/Escape/focus/scroll/keyboard acceptance, and strict
regional gates at `0.000994318`, `0.001280084`, and `0.003352986`.

Cleanup stopped the exact main process and app-server child, verified port
`9515` was gone, and moved the unique profile into
`/Users/JaminZhou/.Trash/codex-ui-kit-composer-menus-cleanup.NV2plx` with the
external reference images.
Active Goal and Plan transitions were then sampled independently in a fifth
exact process on port `9516`. Both kept the 736×98 Composer and 712×44 input;
their clearable 28px controls changed the input accessibility label and
placeholder, then restored default mode and focus without submitting. CDP now
covers 63 frames, Electron drives both transitions, and the masked current
pixel ratios are `0.003763528` and `0.003486243`.

`Files and folders` opened a native macOS panel instead of a Renderer file
input. Computer Use intentionally disallowed Codex control, so no workaround
was used and no attachment was added. Attachment lifecycle remains pending
current capture. Cleanup stopped the exact process, closed port `9516`,
removed the ignored synthetic probe file, and moved the profile and external
evidence to the recoverable
`/Users/JaminZhou/.Trash/codex-ui-kit-composer-modes-cleanup.CJuP6u`
directory.

### 26.727.40816 long-thread capture

The long-thread refresh used exact process PID `6481`, child `6523`, loopback
port `9517`, and unique profile
`/private/tmp/codex-ui-kit-long-thread-cdp.aAzATz`. It selected the 1180×820
main Renderer and opened an existing conversation read-only. No message,
command, edit, deletion, or other content mutation was performed.

The bounded sequence was:

1. wait for historical content and message navigation to stabilize;
2. record the reverse-origin viewport at latest and the compact navigation
   list;
3. activate `Jump to user message 40`, record the selected marker, mounted
   turn count, negative scroll position, and floating return control;
4. move farther into history, then activate `Scroll to bottom` and verify
   message 82 at `scrollTop = 0`;
5. capture one external 906×820 main-only reference for an ownership-scoped
   rail/control pixel gate.

The current product exposed 82 navigation buttons, a 36×574px list with
36×10px buttons, a 26×2px selected marker, seven mounted nearby turns at
message 40, `scrollTop = -28484`, and a 32×32px return control. The public
fixture uses synthetic labels, keeps eviction host-owned, and passes 63-frame
CDP, real Electron interaction, and a masked regional comparison at
`0.005937382` under a 1% limit.

Cleanup restored the observed task to latest, stopped only the exact process
and child, verified port `9517` was gone, and moved the profile and reference
images to
`/Users/JaminZhou/.Trash/codex-ui-kit-long-thread-cleanup.XSqBZw`.

### 26.727.40816 command-approval denial

The approval probe used exact main PID `13129`, loopback port `9518`, and
unique profile `/private/tmp/codex-ui-kit-approval-cdp.7bt4qn`. It created one
disposable task and requested only `open -a Calculator`, then waited at the
approval boundary. The pending card measured x=359.05/y=642, 736×162px and
exposed `Terminal`, the command, `Deny`, `Allow once`, and
`Approval options`.

The bounded sequence was:

1. confirm the pending card remained stable without executing;
2. capture its DOM, computed styles, geometry, and 906×820 main-only image;
3. activate `Deny`;
4. verify the card disappeared, `Worked for 23s` and the final non-execution
   response appeared, and the 736×98 Composer returned with
   `Ask for approval`;
5. verify no Calculator process existed.

The independent replay records the declined request/resolution event order
with empty command output and no exit code. Browser/CDP covers 66 frames,
Electron drives the split options menu and rejection transition, and masked
current-build comparisons pass at `0.008493512` pending and `0.001214128`
denied. This captures one command-denial path only; allow once, persistence,
timeout, repeated denial, and other permission kinds remain required.

Cleanup stopped only the exact second-process tree and its profile-specific
Crashpad helpers, closed port `9518`, removed the ignored probe, and moved
the profile and external screenshots to
`/Users/JaminZhou/.Trash/codex-ui-kit-approval-cleanup.byVfmp`.

### 26.727.40816 long command output

The long-output probe used exact main PID `22071`, loopback port `9519`, and
unique profile `/private/tmp/codex-ui-kit-command-cdp.jW2xHc`. It created one
disposable task and requested only `seq 1 400`. Ask mode ran this exact
low-risk command without an approval card, so the run is command-output
evidence rather than approval allow-once evidence.

The completed turn exposed a collapsed `Ran seq 1 400` disclosure. Expanding
it revealed a 736×227px command surface at x=274.05/y=101.44 with `Shell`,
the command row, two copy controls, a 734×144px output viewport, and
`Success`. The output uses 13/19.5px monospace text, splits into 401 lines
including the trailing newline, and uses a reverse column: `scrollTop = 0`
shows lines 394–400 at the latest edge while `scrollHeight = 7816`.

The independent public trace preserves exactly one command request/output
pair and all 400 generated lines. Browser/CDP covers 66 frames and verifies
geometry, styles, overflow, keyboard expansion, collapse/reopen, and
latest-line restoration. Electron repeats the disclosure flow in a real
1180×820 window. An ownership-masked comparison against the full current
1180×820 screenshot passes at `0.000924969` under a 1.5% hard limit. The
external profile/reference remains untracked and is moved to Trash during
recoverable probe cleanup.

### Current 26.730.61309 long command output

The refreshed probe used exact main PID `99165`, loopback port `9520`, and
unique profile `/private/tmp/codex-ui-kit-current-cdp.mrkFgT`. It submitted
the same one-command prompt exactly once. Ask mode again ran `seq 1 400`
without an approval card.

The 1180×820 Renderer retained the 736×227.06 command card,
734×144 reverse-tail output viewport, 401 split lines, 7816px scroll height,
`scrollTop = 0`, 13/19.5px monospace output, two copy controls, Shell label,
and Success state. Browser/CDP, Electron, and all 75 internal pixel frames
pass; the ownership-masked current comparison measures `0.001655643` under
the unchanged 1.5% hard limit. Other `26.727.40816` surfaces remain
previous-build evidence until separately reached on this build.

Cleanup stopped only PID `99165`, its exact process tree, reparented
app-server/modifier children, and profile-specific Crashpad helpers. Port
`9520` closed, the ignored probe was removed, and Finder moved the profile and
external evidence to the recoverable Trash item
`codex-ui-kit-current-cdp.mrkFgT`. The original Codex process was not stopped.

### Current 26.730.61309 command failure and same-thread recovery

The failure probe used exact main PID `71571`, loopback port `9541`, and
unique profile `/private/tmp/codex-ui-kit-command-failure-cdp.Pwo1hz`. It
created one disposable task and submitted one read-only shell loop that emits
80 numbered stdout lines and 80 numbered stderr lines, then exits with code 7.
It did not read or write files and did not retry the command. After the failed
turn completed, the probe submitted one exact no-tool follow-up in the same
thread and received `Recovery follow-up accepted.`

At 1180×820, the current Renderer exposes `Worked for 12s`, a failed command
disclosure, and an expanded 736×246.58px `Shell` card. The 734×144px output
viewport uses reverse-column scrolling, 3136px scroll height,
`scrollTop = 0`, and 13/19.5px weight-500 monospace text. The exact merged
transcript contains 161 split lines including its trailing newline, begins
with `stderr-001`, retains all 160 records, and ends with `stdout-080` then
`stderr-080`. Two copy controls and `Exit code 7` complete the card.

The independent public trace adds three reviewed frames: live output,
collapsed failure, and expanded failure plus the successful follow-up.
Browser/CDP now covers 75 frames and verifies semantic state, exact text,
computed geometry, reverse-tail behavior, keyboard disclosure, and
collapse/reopen restoration. Electron repeats the failure, copy, recovery,
and disclosure interactions. The optional full-window external comparison
masks the non-owning sidebar/header and dynamic response regions, retains the
command surface, and passes at `0.008898305084745763` under a 1% hard limit.

Cleanup stopped only PID `71571` and the exact profile-specific Crashpad PIDs
`71577` and `71579`; port `9541` is closed and the original Codex process was
not stopped. The ignored probe was removed, and the profile plus external
screenshots were moved into the recoverable Trash item
`codex-ui-kit-command-failure-cdp.Pwo1hz`.

### Current 26.730.61309 command interruption and same-thread recovery

The interruption probe used exact main PID `94866`, loopback port `9542`, and
unique profile `/private/tmp/codex-ui-kit-command-stop-cdp.ZbTpcV/profile`.
Because a direct executable launch followed Electron's single-instance path,
the successful isolated second instance was opened with `open -na` and the
same profile/remote-debugging arguments. It created one disposable task and
ran only this read-only command:

```sh
seq 1 120 | while read i; do printf 'interrupt-probe-%03d\n' "$i"; sleep 1; done
```

At 1180×820, the running Renderer exposed `Working for 1m 35s`, the exact
command row, `Running command for 1m 28s`, and a 28×28 Stop control. Clicking
Stop produced `You stopped after 1m 35s` and the transient row
`Background terminal stopped with …`. The process then settled to `Ran …`
without leaving a matching command process. A no-tool message in that same
thread returned exactly `INTERRUPTION RECOVERY ACCEPTED` and restored focus to
the empty Composer.

The independent replay adds four reviewed frames and drives the transition in
both Browser/CDP and a real Electron `BrowserWindow`: Stop → immediate summary
→ background settlement → exact recovery message. The 75-frame contract also
locks 736px summary/command rows, 14/21px weight-445 system typography, the
summary rule, compact running detail, and Stop/Send ownership. The optional
ownership-masked full-window comparison against the immediate-stop screenshot
passes at `0.0043520049607275735` under a 0.5% hard limit.

Cleanup terminated only the exact second-instance process tree, verified port
`9542` closed, and left the original Codex process running. The ignored probe
was removed. Both exact temporary profiles and all external screenshots/JSON
were moved to recoverable Trash; the successful evidence remains in
`codex-ui-kit-command-stop-cdp.ZbTpcV`.

### Previous 26.810.52044 command failure, interruption, and recovery

The current refresh used exact main PID `99403`, loopback port `9851`, and the
unique profile
`/private/tmp/codex-ui-kit-command-26-810.PaoXaC/profile`. The installed
`app.asar` was re-hashed before sampling as
`6e7e8791b8bf69a586ff994721fff518af391d9efdc66cd2e620dd2a4aedc90f`.
The isolated task ran only a bounded twelve-line success loop, one exact
stdout/stderr command ending in `exit 7`, and one 120-second loop stopped after
eight seconds. It did not read or write project files.

The expanded failure activity exposed `Worked for 5s`, a 656.59px Shell card,
13/19.5px command text at weight 445, stderr before stdout at weight 500, and
`Exit code 7`. A no-tool follow-up returned exactly `CURRENT FAILURE RECOVERY
ACCEPTED`. The interruption path exposed `Working for 7s`, then `You stopped
after 8s` and a 656.59×21px `Background terminal stopped with …` row. No
matching command process remained, yet that row persisted after the no-tool
follow-up returned exactly `CURRENT INTERRUPTION RECOVERY ACCEPTED`; the
current build did not rewrite it to `Ran …`.

The independent fixture and public protocol replay now preserve the stopped
row through settlement and recovery. Browser/CDP passes 202 lifecycle frames;
the owned local-only failure command/Composer regions differ by 4.2564% and
2.2194%, while the stopped summary-command/Composer regions differ by 2.5875%
and 2.2101%, all below independent ceilings. Product screenshots, raw DOM,
task text, and navigation metadata remain untracked.

Post-capture hashing still matched the pre-capture fingerprint. Cleanup
terminated only PID `99403` and its exact profile-specific process tree,
closed port `9851`, removed the two ignored post-probe helpers, and left the
original Codex PID `86536` running. The isolated profile, screenshots, and raw
JSON were moved into the recoverable Trash item
`codex-ui-kit-command-26-810.PaoXaC`.

### Current 26.730.61309 manual context compaction

The compaction probe used exact main PID `13096`, loopback port `9543`, and
unique profile
`/private/tmp/codex-ui-kit-context-compaction-cdp.aJjET6/profile`. It selected
the largest `app://-/index.html` Renderer, fixed it at 1180×820, and created
one disposable task. The first exact no-tool reply established an ordinary
completed turn before the probe inserted `/compact` into the empty Composer.

The slash-command menu exposed `Compact this chat's context (9% full)`.
Selecting it transitioned through `Working`, a full-width rule,
`Compacting context`, and a 28×28 Stop action before reaching `Context
compacted`. Polling every 50ms retained 131 state samples over 8.136 seconds.
The running label was 14/21px weight-445 system text; the Composer input was
712×44px and remained empty. A second no-tool message in the same thread
returned exactly `COMPACTION RECOVERY ACCEPTED`, removed Stop, restored Send,
and focused the empty Composer.

The public replay adds command-menu, running, completed, and recovered frames.
Browser/CDP and real Electron both drive the menu-to-recovery transition, and
the full matrix now covers 75 internal pixel frames. The optional
`CODEX_UI_KIT_CONTEXT_COMPACTION_REFERENCE` gate accepts the raw 1180×820
running screenshot, masks the private/non-owning sidebar, title, transcript,
scrollbar, and Composer interior, retains the compaction event and Composer
boundary, and measures `0.0016256717651922281` under the default 0.5% hard
limit.

Cleanup terminated only the exact second-instance process tree, verified port
`9543` closed, and left the original Codex process running. The ignored probe
was removed, and the exact profile plus screenshots and computed-state JSON
were moved to the recoverable Trash item
`codex-ui-kit-context-compaction-cdp.aJjET6`.

### Current 26.730.61309 sidebar capture

The final responsive sweep used exact main PID `40154`, loopback port `9532`,
and unique profile `/private/tmp/codex-ui-kit-sidebar-sweep.Pp6HBF`. It
selected the largest `app://-/index.html` Renderer by URL, viewport area, and
application-shell landmarks and performed only navigation, expansion,
viewport emulation, DOM/accessibility inspection, and screenshots.

At 1180×820 and 820×680, the sidebar measured 274px with a 46px titlebar,
70px header, 30px route rows, 46px footer, 54px scroll clearance, and 16px
resize target. De-identified counts recorded five project groups, five
project actions, five project New chat controls, 16 thread/history items, and
two status markers. The width sweep established an exact 721/720 boundary:
the regular split remains through 721px and auto-hides at 720px. Explicit Show
at 720px pins a non-modal 274/446 split across Pull requests navigation;
explicit Hide returns the main route to 720px, and a 1.2-second hover at x=1
does not open the historical edge preview.

The independent scene and public project-group contract pass all 73
Browser/CDP and internal pixel frames plus Electron interaction. The optional
current-build regional comparison passes at `0.036233576642335764` for the
top, `0.0012919896640826874` for the text-masked selected row, and `0` for the
text-masked footer. The native separator did not expose range values or
respond to Home/End in the sampled Renderer; the UIKit keyboard-resize
contract is an explicit accessibility improvement, not a current-product
claim.

Cleanup terminated only PID `40154`, its exact process tree, and reparented
modifier child PID `40202`; port `9532` was verified closed. The four ignored
probe scripts were removed. Both exact temporary profiles and all sidebar
screenshots were moved into the recoverable Trash directory
`codex-ui-kit-sidebar-evidence.ptbmTs`; the original Codex process remained
running.

## Current subagent collaboration sample

The `26.730.61639` sample now includes two disposable 1180×820 tasks beyond
the single-agent baseline. A sibling Alpha/Beta task records two working, one
working plus one done, two done, progress preview, summary counts, and two
transcripts. A Parent/Child task records nested spawn, shared active/done
sections, both transcripts, and public `/root/parent/child` path metadata. The
current visual panel is flat; the path is retained as protocol identity rather
than rendered as an inferred tree.

The unchanged `26.803.41515` ASAR fingerprint later supplied read-only
source-structural evidence for the public `pendingInit`, `running`,
`interrupted`, `completed`, `errored`, `shutdown`, and `notFound` states, plus
the current Active/Done classifier and 4/10 visible-item limits. The
independent twelve-agent replay now covers waiting, streamed progress, mixed
terminal outcomes, both pagination paths, and a failed-agent transcript in
Browser/CDP, Electron, and internal pixels. No isolated product task was driven
through those recovery transitions, so real-product recovery reachability and
transport recovery remain required captures.

## Current Markdown streaming and very-wide-table follow-up

A later `26.803.61601` isolated plain-text task closes the basic streaming
reachability gap without relabeling the richer Markdown replay. CDP captured a
single running Renderer at 1180×820, resized that same task to 720×680, and
waited for completion. Running uses reverse-origin `scrollTop=0`; the wide
user/assistant anchors are y=-4.83/y=123.17 and the retained compact anchors
y=-144.83/y=-16.83. Natural completion restores y=78/y=206, removes Stop, and
returns the empty usable Send control. The exact 20-viewBox Stop path renders
16×16 inside its 28×28 button. Browser/CDP and two external regional pixel
references pass; screenshots and full probe output remain local-only.

Read-only inspection of the unchanged `26.803.41515` ASAR fingerprint confirms
that conversation content is represented as `inline-markdown`, remains in
progress until completion, and participates in the latest-turn follow
controller's `static`, prework, and user-follow modes with a 24px bottom
tolerance. The current table implementation also exposes its container,
horizontal scroller, wrapper, cells, copy action, and optional
expand-to-preview action.

The independent playground adds a schema-valid nine-event trace with four
public deltas. Five Browser/CDP checkpoints cover an incomplete link, open
fenced code, nested and task lists, a readable multi-column table, twelve long
sections, completion actions, and bottom-follow behavior inside the 151-frame
matrix. Electron independently checks exact code copy, table focus, real
wheel-driven scroll-away, the floating return control, and return to latest.
Four reviewed internal baselines cover the streamed fence, table, long running
tail, and completed tail.

A later isolated 1180×820 task runtime-reached the current 18-column table.
CDP records its 1665.86×323 table, 802/1714px visible/scroll width, 49px header,
87px rows, 32px hover-only action rail, 24×24 Copy/Expand buttons, exact current
vector primitives, 1863-character raw Markdown plus HTML clipboard payload,
and viewport-sized preview. The preview owns a 42×40 initially focused Close
control and 892.8×389 inner surface with `#2d2d2d`, 20px radius, 32px padding,
and horizontal overflow. The public implementation deliberately restores the
Expand trigger after close even though this product sample returned focus to
`BODY`.

The five-event replay, Browser/CDP, real Electron horizontal-wheel/copy/preview
flow, and three reviewed internal baselines pass. The 720×680 contract moves
the action rail inward, keeps both controls fully visible and clickable, and
preserves focus restoration without document-level horizontal overflow. A local-only current-build
reference gates the preview and close regions at 3.9737% and 0.5929% under 4%
and 1% ceilings; it is not committed. Streaming mutation reachability, images,
math, citations/sources, plugin variants, table error variants, and Markdown
error variants remain required captures.

## Current Appearance Settings sample

The `26.803.61601` read-only Appearance probe used a second app process with a
unique profile and loopback-only port `9831`. Structural target selection
rejected the avatar overlay and selected the main `app://-/index.html`
Renderer. No prompt was submitted and no product setting was changed. The
unchanged ASAR hash reverified the existing build baseline.

At 1180×820 the Settings navigation is 322.91px wide and the main scroll owner
starts at y=46 with a centered 768px content column. The same navigation
persists at 820×680 and 720×680 while the content shrinks to 457.09px and
357.09px with no horizontal overflow. The capture records three responsive
theme radios/previews, a 768×110 diff preview, Light/Dark editors, sixteen
code-theme menu items, four switches, two constrained ranges, two Dock radios,
two numeric inputs, and the complete bottom Preferences card. All text-field
values were redacted from structured output.

The controlled replay covers wide, light, 720px, and bottom-scrolled states in
Browser/CDP, then repeats Git ↔ Appearance routing and state persistence in
Electron. Host callbacks own Import/Copy; host nodes own Dock artwork. The
three local-only ownership-masked ratios are 1.2787%, 1.8977%, and 3.4665%.
The product profile, screenshots, and ignored probes moved recoverably to
Trash after port/process cleanup; no raw capture or proprietary Dock raster is
tracked.

## Current General Settings sample

The `26.803.61601` General probe used an isolated second process, unique
profile, and loopback-only port `9832`. It selected the structural main
`app://-/index.html` Renderer, opened General and each of its five menus, and
entered then cancelled Popout shortcut capture. No stored product setting was
changed; the primary Codex process remained untouched.

At 1180×820 the 322.91px Settings navigation, y=46 main scroll owner, and
centered 768px content match the prior Settings slices. At 720×820 content
shrinks to 357.09px and the route grows from 1,820px to 2,239px without
horizontal overflow. The 21 rows span five cards and expose twelve switches,
five menus, Auto detect plus 65 languages, two segmented keyboard controls,
license presentation, and shortcut capture/cancel. The controlled replay also
formats, stores, and clears a local shortcut fixture; that behavior is a playground
contract, while captured product selections remain observed host values rather
than defaults.

The controlled replay adds wide, light, 720px, hotkey, and bottom frames to
Browser/CDP; Electron repeats menu/search/switch/keyboard interactions and
state continuity across General, Git, and Appearance, including clearing the
transient capture state on route exit while retaining its local value and
normalizing initial hotkey/bottom snapshot frames after routing. Four optional local-only
product gates compare the unmasked full wide, top 720×680 crop, shortcut-
capture, and bottom frames at 4.6143%, 6.7412%, 4.7654%, and 4.8818%. The exact
profile tree and listener were removed,
and the profile, probes, JSON, and screenshots moved recoverably to Trash.
Only de-identified measurements and reviewed independent baselines are
tracked.

## Current Project picker sample

The `26.810.52044` picker probe used one isolated second process on loopback
port `9865` and a unique profile. The selected main Renderer was resolved by
URL and shell structure; account, project, and task strings were never retained
in tracked evidence. The probe opened a fresh coding workspace but submitted
no prompt and created no project or task.

At 1180×820 the surface is 260×249.5 with a 15px radius, 13/18.5714px search,
a 252×142.81 listbox, fourteen 28.56px options, and two fixed 28.56px actions:
`New project` and `Don't work in a project`. Their 16×16 exact SVGs are now
runtime-observed manifest assets. A no-result query yields zero options and
`No projects found` while retaining both fixed actions. Escape returns focus
to the exact initiating trigger. Clearing exposes `Choose project`; reopening
and selecting the redacted original restores the prior state.

Browser/CDP checks this static geometry and full interaction inside the
198-frame matrix. Electron independently repeats the empty, Escape, clear,
restore, and directory-selection paths. The local-only 252×143 listbox gate
passes at 0.9546% after masking project-owned labels. Cleanup terminated only
the exact isolated process and its two profile-owned Crashpad handlers, closed
port `9865`, and moved the profile recoverably to Trash as
`codex-ui-kit-project-picker-26-810.nCCMNV-20260819`; the primary process was
not targeted.

For a fingerprint-changing full asset refresh, keep the project-only capture
as a direct child of the same isolated profile and pass its absolute path via
`CODEX_VISUAL_ASSET_PROJECT_PICKER_CAPTURE`. The updater rejects a different
build, theme, viewport, interaction state, directory, action contract, or icon
cardinality instead of relabelling an older picker asset as current.

## Current Projects Index sample

The separate `26.810.52044` Projects Index probe used an isolated second
process, unique `/private/tmp` profile, and loopback-only port `9871`. It first
normalized the sidebar through explicit Hide/Show controls, returned to New
chat, and then invoked the single in-memory product router to `/projects`.
Renderer target selection, bundle fingerprinting, and pre/post-capture ASAR
identity checks use the same fail-closed boundary as the shell capture.

At 1180×820 with the persisted 322.91px sidebar, the route title starts at
x=391.45 and the 736px table uses 512/64/128px columns. Search is 736×32 with
a 688×18 input. Fourteen 70px rows each expose one `Toggle project` control
and three 32px actions; the first expandable row produces a 119px wrapper and
one recent-chat group. The probe verifies Updated descending, Name ascending
and descending, exact `No projects`, and search-focus continuity. It then
resizes to 600×600, explicitly hides the sidebar, and records the 560px
416/128 table with Updated hidden and zero horizontal overflow.

The tracked JSON contains only counts, geometry, styles, fixed labels, route
state, and de-identified interaction results. Project/chat labels, raw JSON,
screenshots, and profile data remain local-only. Browser/CDP gates ready,
expanded, and compact frames; Electron independently covers creation,
failure, retained rows, two recent-chat routes, and Composer submission. The
local-only 1180×820 comparison passes at 0.2221% for the masked route and
3.7068% for Create under 3.5% and 4% ceilings respectively, using
`CODEX_UI_KIT_CURRENT_PROJECTS_INDEX_REFERENCE`.

## Current command-approval denial sample

The `26.810.52044` approval probe used one isolated second process with a
unique `/private/tmp` profile and loopback-only port `9564`. A first diagnostic
`open -a Calculator` completed without asking in this build, so it was not
promoted as approval evidence; the exact Calculator process was closed. The
accepted fresh task requested only `touch` of one uniquely named Desktop
sentinel and stopped at the real approval surface. The sentinel remained
absent before pending, after Deny, and after final settlement.

At 1180×820 the card is 736×162px and replaces the Composer. The split action
row exposes 28px `Deny Esc`, `Allow once ⏎`, and options controls. The options
surface is 193.22×67.13px with `Allow once` and `Allow similar commands`;
Escape closes it and restores focus to the trigger. Denial yields
`Worked for 1m 53s`, keeps the command unexecuted, and restores the empty
736×98 Composer with `Ask for approval`. The exact Ask-mode hand SVG was
captured independently from the non-ask shield under the same ASAR fingerprint.
Future fingerprint-changing full refreshes require both mutually exclusive
states in one atomic promotion: the alternate full capture must be a direct
child of the same isolated profile and is supplied through
`CODEX_VISUAL_ASSET_PERMISSION_CAPTURE`. An unchanged fingerprint may retain
the already observed hidden variant; a changed fingerprint without same-build
dual-state evidence fails closed.

Browser/CDP locks geometry, shortcut hints, menu contents, no-execution state,
and focus recovery. Electron repeats menu dismissal and denial. Local-only
card/menu/Composer crops pass at 3.2558%, 4.7096%, and 2.1642% under 4%, 5%,
and 3.5% ceilings. Private paths, screenshots, and disposable profiles are not
committed; both isolated profiles were moved recoverably to Trash after their
exact processes, handlers, and loopback listeners were gone.

## Required flow matrix

### 1. Application entry and navigation

- First run, signed-out, signed-in, loading, and recoverable failure.
- Projects/home index, recent threads, collapsed and expanded navigation.
- New thread, project/workspace selection, local/remote selection, and cancel.
- Back/forward navigation, thread switching, rename, pin, archive, and restore.
- Native menu, command menu, quick-chat, and hotkey windows when reachable.

### 2. Empty and idle conversation

- Local, remote, and ChatGPT conversation routes.
- Empty thread, historical thread, loading skeleton, and reconnecting state.
- Header identity, navigation, overflow actions, summary toggle, and panels.
- Composer empty, focused, multiline, disabled, and attachment states.
- Project, worktree, mode, permission, plugin, and resource controls.

### 3. Running conversation

- User message submission, assistant streaming, reasoning, and plan updates.
- Activity grouping, duration, virtualized content, latest-message following,
  manual scroll-away, and return-to-latest behavior.
- Queue creation, edit, pause, reorder if supported, cancel, and submission.
- Context compaction, conversation optimization, and summary changes.

### 4. Tool and work events

- Short and long command output, stdout/stderr, exit failure, interruption,
  truncation, expansion, and copy.
- File creation, modification, deletion, rename, multi-file group, inline diff,
  and independent editor diff panel.
- Code search, web search, MCP, connector, browser use, and generic tools.
- Subagent spawn, running, waiting, result, failure, and transcript.
- Generated files, images, citations, sources, artifacts, and previews.

### 5. Approval and recovery

- Command, file, network, directory, connector, and other permission requests.
- Allow once, persistent policy where offered, reject, cancel, timeout, and
  repeated-denial behavior.
- Stream interruption, server busy, retry, render failure, lost connection,
  exhausted usage, and setup-required states.
- Continue in current workspace, new thread, new worktree, and unavailable
  choices.

### 6. Workspace panels

- Side-panel open/close/resize and focus transfer.
- Terminal, browser, artifact, notebook, PDF, document, workbook,
  presentation, and image preview when reachable.
- Pull-request route, review status, inline review, fix action, and delivery.
- Local/cloud environment selection, worktree status, setup, and repair.

### 7. Settings and integrations

- Settings shell, search, deep link, dirty state, save, reset, and failure.
- General, appearance, personalization, keyboard, voice, usage, Git, hooks,
  review, environment, worktree, browser-use, and computer-use sections.
- MCP, plugins, skills, automations, remote connections, and mobile setup.
- OAuth or permission transitions must be observed without recording tokens or
  private account data.

### 8. Window and accessibility matrix

- Standard, narrow, and wide windows in light and dark themes.
- Reduced motion, increased contrast where supported, keyboard-only use,
  focus restoration, nested overlays, screen-reader names, and live regions.
- Long thread, long path, long title, long unbroken text, empty output, and
  localized-copy stress cases.

## Promotion rule

After a capture:

1. Add the evidence summary to the current build note.
2. Split the inventory entry if one ID hides independently triggered or
   independently persisted surfaces.
3. Change `runtimeStatus` to `runtime_observed` only for the captured surface.
4. Implement and test the independent component or composition.
5. Mark H5 or Electron `verified` only after comparing that acceptance surface
   against the current-build runtime evidence.

No aggregate area becomes complete merely because each known row has a status.
The inventory remains open to newly discovered routes, states, and
compositions.
