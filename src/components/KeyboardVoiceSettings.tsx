import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Dialog } from "./Dialog.js";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

export interface KeyboardShortcutEntry {
  description: string;
  id: string;
  keywords?: readonly string[];
  name: string;
  shortcuts: readonly string[];
}

export interface KeyboardShortcutCaptureTarget {
  entryId: string;
  shortcutIndex: number;
}

export type KeyboardShortcutsStatus =
  | "error"
  | "loading"
  | "ready"
  | "saved"
  | "saving";

export interface KeyboardShortcutsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  captureTarget?: KeyboardShortcutCaptureTarget | null;
  clearIcon?: ReactNode;
  disabled?: boolean;
  editIcon?: ReactNode;
  entries: readonly KeyboardShortcutEntry[];
  errorMessage?: ReactNode;
  keystrokeSearchIcon?: ReactNode;
  loadingLabel?: ReactNode;
  onCaptureTargetChange?: (
    target: KeyboardShortcutCaptureTarget | null,
  ) => void;
  onQueryChange?: (query: string) => void;
  onRetry?: () => void;
  onSearchByKeystrokes?: () => void;
  onShortcutChange?: (
    entry: KeyboardShortcutEntry,
    shortcutIndex: number,
    shortcut: string,
  ) => void;
  onShortcutClear?: (
    entry: KeyboardShortcutEntry,
    shortcutIndex: number,
  ) => void;
  query?: string;
  retryLabel?: ReactNode;
  savingLabel?: ReactNode;
  searchIcon?: ReactNode;
  status?: KeyboardShortcutsStatus;
  statusMessage?: ReactNode;
}

function normalizeShortcutSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function formatShortcutEvent(event: KeyboardEvent<HTMLInputElement>) {
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return null;
  const modifiers = [
    event.ctrlKey ? "⌃" : "",
    event.altKey ? "⌥" : "",
    event.shiftKey ? "⇧" : "",
    event.metaKey ? "⌘" : "",
  ].join("");
  const aliases: Record<string, string> = {
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Backspace: "⌫",
    Enter: "⏎",
    Escape: "Esc",
    Space: "Space",
  };
  const key = aliases[event.key] ??
    (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  return `${modifiers}${key}`;
}

function ShortcutIcon({ children }: { children?: ReactNode }) {
  return children ? (
    <span aria-hidden="true" className="codex-ui-keyboard-shortcuts__icon">
      {children}
    </span>
  ) : null;
}

export function KeyboardShortcutsPage({
  captureTarget,
  className,
  clearIcon,
  disabled = false,
  editIcon,
  entries,
  errorMessage = "Keyboard shortcuts could not be saved.",
  keystrokeSearchIcon,
  loadingLabel = "Loading keyboard shortcuts…",
  onCaptureTargetChange,
  onQueryChange,
  onSearchByKeystrokes,
  onRetry,
  onShortcutChange,
  onShortcutClear,
  query,
  retryLabel = "Retry",
  savingLabel = "Saving…",
  searchIcon,
  status = "ready",
  statusMessage,
  ...props
}: KeyboardShortcutsPageProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [internalCaptureTarget, setInternalCaptureTarget] =
    useState<KeyboardShortcutCaptureTarget | null>(null);
  const resolvedQuery = query ?? internalQuery;
  const resolvedCaptureTarget =
    captureTarget === undefined ? internalCaptureTarget : captureTarget;
  const statusId = useId();
  const isLocked = disabled || status === "loading" || status === "saving";
  const isSaving = status === "saving";
  const showStatus = status !== "ready";
  const resolvedStatusMessage =
    statusMessage ??
    (status === "loading"
      ? loadingLabel
      : status === "saving"
        ? savingLabel
        : status === "saved"
          ? "Keyboard shortcuts saved"
          : errorMessage);
  const normalizedQuery = normalizeShortcutSearch(resolvedQuery);
  const filteredEntries = entries.filter((entry) =>
    [
      entry.name,
      entry.description,
      ...entry.shortcuts,
      ...(entry.keywords ?? []),
    ].some((candidate) =>
      candidate.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );
  const setQuery = (nextQuery: string) => {
    if (query === undefined) setInternalQuery(nextQuery);
    onQueryChange?.(nextQuery);
  };
  const setCaptureTarget = (target: KeyboardShortcutCaptureTarget | null) => {
    if (captureTarget === undefined) setInternalCaptureTarget(target);
    onCaptureTargetChange?.(target);
  };

  return (
    <article
      {...props}
      aria-busy={status === "loading" || isSaving || undefined}
      aria-describedby={showStatus ? statusId : undefined}
      className={["codex-ui-keyboard-shortcuts", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <h1>Keyboard shortcuts</h1>
      {showStatus ? (
        <div
          aria-live="polite"
          className="codex-ui-keyboard-shortcuts__status"
          id={statusId}
          role={status === "error" ? "alert" : "status"}
        >
          <span>{resolvedStatusMessage}</span>
          {status === "error" && onRetry ? (
            <button onClick={onRetry} type="button">
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="codex-ui-keyboard-shortcuts__search-sticky">
        <label className="codex-ui-keyboard-shortcuts__search">
          <ShortcutIcon>{searchIcon}</ShortcutIcon>
          <span className="codex-ui-settings-shell__visually-hidden">
            Search shortcuts
          </span>
          <input
            disabled={isLocked}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search shortcuts"
            type="text"
            value={resolvedQuery}
          />
          {resolvedQuery ? (
            <button
              aria-label="Clear shortcut search"
              className="codex-ui-keyboard-shortcuts__search-clear"
              disabled={isLocked}
              onClick={() => setQuery("")}
              type="button"
            >
              ×
            </button>
          ) : null}
          <button
            aria-label="Search by keystrokes"
            className="codex-ui-keyboard-shortcuts__keystroke-search"
            disabled={isLocked || !onSearchByKeystrokes}
            onClick={onSearchByKeystrokes}
            type="button"
          >
            <ShortcutIcon>{keystrokeSearchIcon}</ShortcutIcon>
          </button>
        </label>
      </div>

      <div className="codex-ui-keyboard-shortcuts__card">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => {
            const shortcutSlots = entry.shortcuts.length
              ? entry.shortcuts.map((shortcut, shortcutIndex) => ({
                  shortcut,
                  shortcutIndex,
                }))
              : [{ shortcut: null, shortcutIndex: 0 }];
            return (
              <div
                className="codex-ui-keyboard-shortcuts__row"
                data-shortcut-id={entry.id}
                key={entry.id}
              >
                <div className="codex-ui-keyboard-shortcuts__copy">
                  <span>{entry.name}</span>
                  <p>{entry.description}</p>
                </div>
                <div className="codex-ui-keyboard-shortcuts__bindings">
                  {shortcutSlots.map(({ shortcut, shortcutIndex }) => {
                    const capturing =
                      resolvedCaptureTarget?.entryId === entry.id &&
                      resolvedCaptureTarget.shortcutIndex === shortcutIndex;
                    return (
                      <div
                        className="codex-ui-keyboard-shortcuts__binding"
                        key={`${entry.id}-${shortcutIndex}`}
                      >
                        {capturing ? (
                          <>
                            <input
                              aria-label={`Shortcut capture for ${entry.name}`}
                              autoFocus
                              className="codex-ui-keyboard-shortcuts__capture"
                              disabled={isLocked}
                              onKeyDown={(event) => {
                                if (isLocked) return;
                                event.preventDefault();
                                event.stopPropagation();
                                if (event.key === "Escape") {
                                  setCaptureTarget(null);
                                  return;
                                }
                                const nextShortcut = formatShortcutEvent(event);
                                if (!nextShortcut) return;
                                onShortcutChange?.(
                                  entry,
                                  shortcutIndex,
                                  nextShortcut,
                                );
                                setCaptureTarget(null);
                              }}
                              readOnly
                              value="Press shortcut"
                            />
                            <button
                              className="codex-ui-keyboard-shortcuts__cancel"
                              disabled={isLocked}
                              onClick={() => setCaptureTarget(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {shortcut ? (
                              <kbd>{shortcut}</kbd>
                            ) : (
                              <span className="codex-ui-keyboard-shortcuts__unassigned">
                                Unassigned
                              </span>
                            )}
                            <button
                              aria-label={`${shortcut ? "Change" : "Set"} shortcut for ${entry.name}`}
                              className="codex-ui-keyboard-shortcuts__edit"
                              disabled={isLocked || !onShortcutChange}
                              onClick={() =>
                                setCaptureTarget({
                                  entryId: entry.id,
                                  shortcutIndex,
                                })
                              }
                              type="button"
                            >
                              <ShortcutIcon>{editIcon}</ShortcutIcon>
                            </button>
                            {shortcut ? (
                              <button
                                aria-label={`Clear shortcut for ${entry.name}`}
                                className="codex-ui-keyboard-shortcuts__clear"
                                disabled={isLocked || !onShortcutClear}
                                onClick={() =>
                                  onShortcutClear?.(entry, shortcutIndex)
                                }
                                type="button"
                              >
                                <ShortcutIcon>{clearIcon}</ShortcutIcon>
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p className="codex-ui-keyboard-shortcuts__empty">
            No shortcuts found
          </p>
        )}
      </div>
    </article>
  );
}

export type VoiceSettingsHotkeyId =
  | "holdToDictate"
  | "toggleDictation"
  | "voiceChat";

export interface VoiceSettingsValue {
  dictionaryEntries: readonly string[];
  holdToDictateHotkey: string | null;
  keepDictationBarVisible: boolean;
  microphoneId: string;
  screenContext: boolean;
  toggleDictationHotkey: string | null;
  voiceChatHotkey: string | null;
  voiceId: string;
}

export interface VoiceOption {
  artwork?: ReactNode;
  description: string;
  id: string;
  label: string;
}

export type VoiceSettingsStatus =
  | "error"
  | "loading"
  | "ready"
  | "saved"
  | "saving";

export interface MicrophoneOption {
  id: string;
  label: string;
}

export interface VoiceSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  addIcon?: ReactNode;
  capturingHotkey?: VoiceSettingsHotkeyId | null;
  closeIcon?: ReactNode;
  disabled?: boolean;
  editIcon?: ReactNode;
  errorMessage?: ReactNode;
  loadingLabel?: ReactNode;
  microphoneMenuOpen?: boolean;
  microphoneOptions: readonly MicrophoneOption[];
  nextIcon?: ReactNode;
  onChange: (value: VoiceSettingsValue) => void;
  onHotkeyCaptureChange?: (hotkey: VoiceSettingsHotkeyId | null) => void;
  onMicrophoneMenuOpenChange?: (open: boolean) => void;
  onPlayVoicePreview?: (voice: VoiceOption) => void;
  onRetry?: () => void;
  onVoicePickerOpenChange?: (open: boolean) => void;
  previousIcon?: ReactNode;
  recentRecordings?: readonly string[];
  removeIcon?: ReactNode;
  retryLabel?: ReactNode;
  savingLabel?: ReactNode;
  status?: VoiceSettingsStatus;
  statusMessage?: ReactNode;
  value: VoiceSettingsValue;
  voiceOptions?: readonly VoiceOption[];
  voicePickerOpen?: boolean;
}

function VoiceSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-voice-settings__switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

function VoiceRow({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="codex-ui-voice-settings__row">
      <div className="codex-ui-voice-settings__copy">
        <span>{label}</span>
        <p>{description}</p>
      </div>
      <div className="codex-ui-voice-settings__control">{children}</div>
    </div>
  );
}

function VoiceHotkeyControl({
  capturing,
  disabled = false,
  editIcon,
  hotkey,
  id,
  label,
  onCaptureChange,
  onChange,
}: {
  capturing: boolean;
  disabled?: boolean;
  editIcon?: ReactNode;
  hotkey: string | null;
  id: VoiceSettingsHotkeyId;
  label: string;
  onCaptureChange: (hotkey: VoiceSettingsHotkeyId | null) => void;
  onChange: (hotkey: string) => void;
}) {
  return capturing ? (
    <div className="codex-ui-voice-settings__hotkey-capture">
      <input
        aria-label={`Shortcut capture for ${label}`}
        autoFocus
        disabled={disabled}
        onKeyDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Escape") {
            onCaptureChange(null);
            return;
          }
          const shortcut = formatShortcutEvent(event);
          if (!shortcut) return;
          onChange(shortcut);
          onCaptureChange(null);
        }}
        readOnly
        value="Press shortcut"
      />
      <button
        disabled={disabled}
        onClick={() => onCaptureChange(null)}
        type="button"
      >
        Cancel
      </button>
    </div>
  ) : (
    <div className="codex-ui-voice-settings__hotkey">
      <span>{hotkey ?? "Off"}</span>
      <button
        aria-label={`Set shortcut for ${label}`}
        disabled={disabled}
        onClick={() => onCaptureChange(id)}
        type="button"
      >
        <ShortcutIcon>{editIcon}</ShortcutIcon>
      </button>
    </div>
  );
}

const defaultVoiceOptions: readonly VoiceOption[] = [
  { description: "Open and upbeat", id: "juniper", label: "Juniper" },
  { description: "Cheerful and candid", id: "maple", label: "Maple" },
  { description: "Calm and affirming", id: "spruce", label: "Spruce" },
  { description: "Confident and optimistic", id: "ember", label: "Ember" },
  { description: "Bright and inquisitive", id: "vale", label: "Vale" },
  { description: "Animated and earnest", id: "breeze", label: "Breeze" },
  { description: "Easygoing and versatile", id: "arbor", label: "Arbor" },
  { description: "Savvy and relaxed", id: "sol", label: "Sol" },
  { description: "Composed and direct", id: "cove", label: "Cove" },
];

export function VoiceSettingsPage({
  addIcon,
  capturingHotkey,
  className,
  closeIcon,
  disabled = false,
  editIcon,
  errorMessage = "Voice settings could not be saved.",
  loadingLabel = "Loading voice settings…",
  microphoneMenuOpen,
  microphoneOptions,
  nextIcon,
  onChange,
  onHotkeyCaptureChange,
  onMicrophoneMenuOpenChange,
  onPlayVoicePreview,
  onRetry,
  onVoicePickerOpenChange,
  previousIcon,
  recentRecordings = [],
  removeIcon,
  retryLabel = "Retry",
  savingLabel = "Saving…",
  status = "ready",
  statusMessage,
  value,
  voiceOptions = defaultVoiceOptions,
  voicePickerOpen,
  ...props
}: VoiceSettingsPageProps) {
  const [internalVoicePickerOpen, setInternalVoicePickerOpen] = useState(false);
  const [internalCapturingHotkey, setInternalCapturingHotkey] =
    useState<VoiceSettingsHotkeyId | null>(null);
  const resolvedVoicePickerOpen =
    voicePickerOpen ?? internalVoicePickerOpen;
  const resolvedCapturingHotkey =
    capturingHotkey === undefined
      ? internalCapturingHotkey
      : capturingHotkey;
  const selectedVoice =
    voiceOptions.find((option) => option.id === value.voiceId) ??
    voiceOptions[0];
  const selectedMicrophone =
    microphoneOptions.find((option) => option.id === value.microphoneId) ??
    microphoneOptions[0];
  const statusId = useId();
  const isLocked = disabled || status === "loading" || status === "saving";
  const isSaving = status === "saving";
  const showStatus = status !== "ready";
  const resolvedStatusMessage =
    statusMessage ??
    (status === "loading"
      ? loadingLabel
      : status === "saving"
        ? savingLabel
        : status === "saved"
          ? "Voice settings saved"
          : errorMessage);
  const [pendingVoiceId, setPendingVoiceId] = useState(selectedVoice?.id ?? "");
  const voiceTriggerRef = useRef<HTMLButtonElement>(null);
  const dictionaryHeadingId = useId();

  useEffect(() => {
    if (resolvedVoicePickerOpen) setPendingVoiceId(selectedVoice?.id ?? "");
  }, [resolvedVoicePickerOpen, selectedVoice?.id]);

  const pendingVoice =
    voiceOptions.find((option) => option.id === pendingVoiceId) ??
    selectedVoice;
  const pendingVoiceIndex = Math.max(
    0,
    voiceOptions.findIndex((option) => option.id === pendingVoice?.id),
  );
  const update = <K extends keyof VoiceSettingsValue>(
    key: K,
    nextValue: VoiceSettingsValue[K],
  ) => onChange({ ...value, [key]: nextValue });
  const setVoicePickerOpen = (open: boolean) => {
    if (open && isLocked) return;
    if (voicePickerOpen === undefined) setInternalVoicePickerOpen(open);
    onVoicePickerOpenChange?.(open);
  };
  const setCapturingHotkey = (hotkey: VoiceSettingsHotkeyId | null) => {
    if (hotkey !== null && isLocked) return;
    if (capturingHotkey === undefined) setInternalCapturingHotkey(hotkey);
    onHotkeyCaptureChange?.(hotkey);
  };
  const updateHotkey = (id: VoiceSettingsHotkeyId, hotkey: string) => {
    if (isLocked) return;
    const key: Record<VoiceSettingsHotkeyId, keyof VoiceSettingsValue> = {
      holdToDictate: "holdToDictateHotkey",
      toggleDictation: "toggleDictationHotkey",
      voiceChat: "voiceChatHotkey",
    };
    update(key[id], hotkey);
  };

  return (
    <article
      {...props}
      aria-busy={status === "loading" || isSaving || undefined}
      aria-describedby={showStatus ? statusId : undefined}
      className={["codex-ui-voice-settings", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <h1>Voice</h1>
      {showStatus ? (
        <div
          aria-live="polite"
          className="codex-ui-voice-settings__status"
          id={statusId}
          role={status === "error" ? "alert" : "status"}
        >
          <span>{resolvedStatusMessage}</span>
          {status === "error" && onRetry ? (
            <button onClick={onRetry} type="button">
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="codex-ui-voice-settings__section">
        <h2>General</h2>
        <div className="codex-ui-voice-settings__card">
          <VoiceRow
            description="Used for voice chat and dictation"
            label="Microphone"
          >
            <Menu
              align="end"
              className="codex-ui-voice-settings__microphone-menu"
              label="Microphone"
              onOpenChange={onMicrophoneMenuOpenChange}
              open={isLocked ? false : microphoneMenuOpen}
              side="bottom"
              sideOffset={4}
              trigger={
                <button
                  aria-label="Microphone"
                  className="codex-ui-voice-settings__menu-trigger"
                  disabled={isLocked}
                  type="button"
                >
                  <span>{selectedMicrophone?.label ?? "System default"}</span>
                  <span aria-hidden="true">⌄</span>
                </button>
              }
              width="auto"
            >
              {microphoneOptions.map((option) => (
                <MenuItem
                  endIcon={
                    option.id === value.microphoneId ? <span>✓</span> : undefined
                  }
                  key={option.id}
                  onSelect={() => update("microphoneId", option.id)}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </VoiceRow>
        </div>
      </section>

      <section className="codex-ui-voice-settings__section">
        <h2>Voice chat</h2>
        <div className="codex-ui-voice-settings__card">
          <VoiceRow
            description="Choose the voice Codex uses for new voice chats"
            label="Voice"
          >
            <button
              className="codex-ui-voice-settings__voice-trigger"
              disabled={isLocked}
              onClick={() => setVoicePickerOpen(true)}
              ref={voiceTriggerRef}
              type="button"
            >
              <span aria-hidden="true" />
              {selectedVoice?.label}
            </button>
          </VoiceRow>
          <VoiceRow
            description="Start voice chat from anywhere on desktop"
            label="Voice chat hotkey"
          >
            <VoiceHotkeyControl
              capturing={resolvedCapturingHotkey === "voiceChat"}
              disabled={isLocked}
              editIcon={editIcon}
              hotkey={value.voiceChatHotkey}
              id="voiceChat"
              label="Voice chat hotkey"
              onCaptureChange={setCapturingHotkey}
              onChange={(hotkey) => updateHotkey("voiceChat", hotkey)}
            />
          </VoiceRow>
          <VoiceRow
            description="Let Codex inspect the foreground app when you refer to what's on screen. macOS asks for access the first time Codex needs it"
            label="Screen context"
          >
            <VoiceSwitch
              checked={value.screenContext}
              disabled={isLocked}
              label="Enable screen context for voice chat"
              onChange={(screenContext) => update("screenContext", screenContext)}
            />
          </VoiceRow>
        </div>
      </section>

      <section className="codex-ui-voice-settings__section">
        <h2>Dictation</h2>
        <div className="codex-ui-voice-settings__card">
          <VoiceRow
            description="Hold anywhere on desktop to dictate where your cursor is"
            label="Hold-to-dictate hotkey"
          >
            <VoiceHotkeyControl
              capturing={resolvedCapturingHotkey === "holdToDictate"}
              disabled={isLocked}
              editIcon={editIcon}
              hotkey={value.holdToDictateHotkey}
              id="holdToDictate"
              label="Hold-to-dictate hotkey"
              onCaptureChange={setCapturingHotkey}
              onChange={(hotkey) => updateHotkey("holdToDictate", hotkey)}
            />
          </VoiceRow>
          <VoiceRow
            description="Press once anywhere on desktop to dictate, then press again to stop"
            label="Toggle dictation hotkey"
          >
            <VoiceHotkeyControl
              capturing={resolvedCapturingHotkey === "toggleDictation"}
              disabled={isLocked}
              editIcon={editIcon}
              hotkey={value.toggleDictationHotkey}
              id="toggleDictation"
              label="Toggle dictation hotkey"
              onCaptureChange={setCapturingHotkey}
              onChange={(hotkey) => updateHotkey("toggleDictation", hotkey)}
            />
          </VoiceRow>
          <VoiceRow
            description="Show a small shortcut reminder when dictation isn't recording"
            label="Keep dictation bar visible"
          >
            <VoiceSwitch
              checked={value.keepDictationBarVisible}
              disabled={isLocked || !value.toggleDictationHotkey}
              label="Keep the dictation bar visible"
              onChange={(keepDictationBarVisible) =>
                update("keepDictationBarVisible", keepDictationBarVisible)
              }
            />
          </VoiceRow>
        </div>

        <div
          aria-labelledby={dictionaryHeadingId}
          className="codex-ui-voice-settings__card codex-ui-voice-settings__dictionary"
        >
          <header>
            <div>
              <span id={dictionaryHeadingId}>Dictation dictionary</span>
              <p>Words or phrases dictation should recognize</p>
            </div>
            <button
              className="codex-ui-voice-settings__add"
              disabled={isLocked}
              onClick={() =>
                update("dictionaryEntries", [...value.dictionaryEntries, ""])
              }
              type="button"
            >
              <ShortcutIcon>{addIcon}</ShortcutIcon>
              Add entry
            </button>
          </header>
          <div className="codex-ui-voice-settings__dictionary-list">
            {(value.dictionaryEntries.length
              ? value.dictionaryEntries
              : [""]
            ).map((entry, index) => (
              <div
                className="codex-ui-voice-settings__dictionary-entry"
                key={index}
              >
                <input
                  aria-label={`Dictionary entry ${index + 1}`}
                  disabled={isLocked}
                  onChange={(event) => {
                    const entries = value.dictionaryEntries.length
                      ? [...value.dictionaryEntries]
                      : [""];
                    entries[index] = event.currentTarget.value;
                    update("dictionaryEntries", entries);
                  }}
                  placeholder="Jane Doe"
                  value={entry}
                />
                <button
                  aria-label={`Remove dictionary entry ${index + 1}`}
                  disabled={
                    isLocked || (!entry && value.dictionaryEntries.length <= 1)
                  }
                  onClick={() =>
                    update(
                      "dictionaryEntries",
                      value.dictionaryEntries.filter(
                        (_, entryIndex) => entryIndex !== index,
                      ),
                    )
                  }
                  type="button"
                >
                  <ShortcutIcon>{removeIcon}</ShortcutIcon>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="codex-ui-voice-settings__card codex-ui-voice-settings__recordings">
          <div>
            <span>Recent recordings</span>
            <p>Your last 20 recordings are saved on this device</p>
          </div>
          {recentRecordings.length ? (
            <ul>
              {recentRecordings.map((recording) => (
                <li key={recording}>{recording}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <Dialog
        className="codex-ui-voice-picker"
        closeIcon={closeIcon}
        closeLabel="Close voice picker"
        footer={
          <>
            <button
              disabled={isLocked}
              onClick={() => setVoicePickerOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={isLocked}
              onClick={() => {
                if (pendingVoice) update("voiceId", pendingVoice.id);
                setVoicePickerOpen(false);
              }}
              type="button"
            >
              Done
            </button>
          </>
        }
        onOpenChange={setVoicePickerOpen}
        open={isLocked ? false : resolvedVoicePickerOpen}
        returnFocusRef={voiceTriggerRef}
        title="Choose a voice"
      >
        {pendingVoice ? (
          <div className="codex-ui-voice-picker__content">
            <button
              aria-label={`Play ${pendingVoice.label} preview`}
              className="codex-ui-voice-picker__artwork"
              disabled={isLocked || !onPlayVoicePreview}
              onClick={() => onPlayVoicePreview?.(pendingVoice)}
              type="button"
            >
              {pendingVoice.artwork ?? <span aria-hidden="true" />}
            </button>
            <div className="codex-ui-voice-picker__selection">
              <button
                aria-label="Previous voice"
                disabled={isLocked}
                onClick={() =>
                  setPendingVoiceId(
                    voiceOptions[
                      (pendingVoiceIndex - 1 + voiceOptions.length) %
                        voiceOptions.length
                    ]!.id,
                  )
                }
                type="button"
              >
                <ShortcutIcon>{previousIcon}</ShortcutIcon>
              </button>
              <div>
                <strong>{pendingVoice.label}</strong>
                <span>{pendingVoice.description}</span>
              </div>
              <button
                aria-label="Next voice"
                disabled={isLocked}
                onClick={() =>
                  setPendingVoiceId(
                    voiceOptions[(pendingVoiceIndex + 1) % voiceOptions.length]!
                      .id,
                  )
                }
                type="button"
              >
                <ShortcutIcon>{nextIcon}</ShortcutIcon>
              </button>
            </div>
            <div
              aria-label="Choose a voice"
              className="codex-ui-voice-picker__options"
              role="radiogroup"
            >
              {voiceOptions.map((option) => (
                <button
                  aria-checked={option.id === pendingVoice.id}
                  aria-label={`${option.label}: ${option.description}`}
                  disabled={isLocked}
                  key={option.id}
                  onClick={() => setPendingVoiceId(option.id)}
                  role="radio"
                  type="button"
                />
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </article>
  );
}
