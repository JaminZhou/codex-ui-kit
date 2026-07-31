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

### Current Terminal session capture

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

### Current 26.727.40816 refresh capture

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

### Current 26.727.40816 successful MCP capture

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

### Current 26.727.40816 MCP failure/recovery capture

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

### Current 26.727.40816 Composer queue and Stop capture

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
and automatic-continuation crops pass at `0.004505997` and `0.006182923`.
CDP covers 59 lifecycle frames and real Electron repeats the default
transition.

Cleanup stopped only PID `78399`, verified the exact profile process set and
port `9514` were gone, and moved the profile and screenshots into
`/Users/JaminZhou/.Trash/codex-ui-kit-composer-cleanup.FE0SB8`. The original
Codex process remained running.

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
