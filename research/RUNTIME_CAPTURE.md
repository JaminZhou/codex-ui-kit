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
