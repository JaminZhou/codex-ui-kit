// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KeyboardShortcutsPage,
  VoiceSettingsPage,
  type KeyboardShortcutEntry,
  type VoiceSettingsValue,
} from "../src";

afterEach(cleanup);

const initialShortcuts: readonly KeyboardShortcutEntry[] = [
  {
    description: "Start a new chat",
    id: "new-chat",
    name: "New chat",
    shortcuts: ["⌘N", "⇧⌘O"],
  },
  {
    description: "Hold anywhere on desktop to dictate",
    id: "hold-dictation",
    keywords: ["dictation"],
    name: "Hold-to-dictate hotkey",
    shortcuts: [],
  },
  {
    description: "Press once anywhere on desktop to dictate",
    id: "toggle-dictation",
    name: "Toggle dictation hotkey",
    shortcuts: [],
  },
  {
    description: "Start dictation in the composer",
    id: "start-dictation",
    name: "Start dictation",
    shortcuts: ["⌃D"],
  },
];

function KeyboardFixture({ onKeystrokeSearch = () => undefined }) {
  const [entries, setEntries] = useState(initialShortcuts);
  const [query, setQuery] = useState("");
  return (
    <KeyboardShortcutsPage
      entries={entries}
      onQueryChange={setQuery}
      onSearchByKeystrokes={onKeystrokeSearch}
      onShortcutChange={(entry, shortcutIndex, shortcut) =>
        setEntries((current) =>
          current.map((candidate) => {
            if (candidate.id !== entry.id) return candidate;
            const shortcuts = [...candidate.shortcuts];
            shortcuts[shortcutIndex] = shortcut;
            return { ...candidate, shortcuts };
          }),
        )
      }
      onShortcutClear={(entry, shortcutIndex) =>
        setEntries((current) =>
          current.map((candidate) =>
            candidate.id === entry.id
              ? {
                  ...candidate,
                  shortcuts: candidate.shortcuts.filter(
                    (_, index) => index !== shortcutIndex,
                  ),
                }
              : candidate,
          ),
        )
      }
      query={query}
    />
  );
}

const initialVoiceValue: VoiceSettingsValue = {
  dictionaryEntries: [],
  holdToDictateHotkey: null,
  keepDictationBarVisible: false,
  microphoneId: "system-default",
  screenContext: true,
  toggleDictationHotkey: null,
  voiceChatHotkey: null,
  voiceId: "sol",
};

function VoiceFixture({ onPreview = () => undefined }) {
  const [value, setValue] = useState(initialVoiceValue);
  const [microphoneMenuOpen, setMicrophoneMenuOpen] = useState(false);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  return (
    <VoiceSettingsPage
      microphoneMenuOpen={microphoneMenuOpen}
      microphoneOptions={[
        { id: "system-default", label: "System default" },
        { id: "built-in", label: "Built-in microphone" },
      ]}
      onChange={setValue}
      onMicrophoneMenuOpenChange={setMicrophoneMenuOpen}
      onPlayVoicePreview={onPreview}
      onVoicePickerOpenChange={setVoicePickerOpen}
      value={value}
      voicePickerOpen={voicePickerOpen}
    />
  );
}

describe("KeyboardShortcutsPage", () => {
  it("filters by visible copy and exposes keystroke search", () => {
    const onKeystrokeSearch = vi.fn();
    render(<KeyboardFixture onKeystrokeSearch={onKeystrokeSearch} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search shortcuts" }), {
      target: { value: "dictation" },
    });
    expect(screen.queryByText("New chat")).toBeNull();
    expect(screen.getByText("Start dictation")).toBeTruthy();
    expect(screen.getByText("Hold-to-dictate hotkey")).toBeTruthy();
    expect(screen.getByText("Toggle dictation hotkey")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear shortcut search" }));
    expect(screen.getByText("New chat")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Search by keystrokes" }));
    expect(onKeystrokeSearch).toHaveBeenCalledOnce();
  });

  it("captures, cancels, and clears shortcut slots", () => {
    render(<KeyboardFixture />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Change shortcut for New chat" })[0]!,
    );
    const capture = screen.getByRole("textbox", {
      name: "Shortcut capture for New chat",
    });
    fireEvent.keyDown(capture, { key: "k", metaKey: true, shiftKey: true });
    expect(screen.getByText("⇧⌘K")).toBeTruthy();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Change shortcut for New chat" })[0]!,
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Shortcut capture for New chat" }),
      { key: "Escape" },
    );
    expect(
      screen.queryByRole("textbox", { name: "Shortcut capture for New chat" }),
    ).toBeNull();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Clear shortcut for New chat" })[0]!,
    );
    expect(screen.queryByText("⇧⌘K")).toBeNull();
  });
});

describe("VoiceSettingsPage", () => {
  it("controls microphone, hotkeys, switches, and dictionary entries", () => {
    render(<VoiceFixture />);

    const microphone = screen.getByRole("button", { name: "Microphone" });
    fireEvent.click(microphone);
    fireEvent.click(screen.getByRole("menuitem", { name: /Built-in microphone/ }));
    expect(microphone.textContent).toContain("Built-in microphone");

    const screenContext = screen.getByRole("switch", {
      name: "Enable screen context for voice chat",
    });
    fireEvent.click(screenContext);
    expect(screenContext.getAttribute("aria-checked")).toBe("false");

    const keepVisible = screen.getByRole("switch", {
      name: "Keep the dictation bar visible",
    });
    expect(keepVisible.hasAttribute("disabled")).toBe(true);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Set shortcut for Toggle dictation hotkey",
      }),
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", {
        name: "Shortcut capture for Toggle dictation hotkey",
      }),
      { key: "d", metaKey: true },
    );
    expect(screen.getByText("⌘D")).toBeTruthy();
    expect(keepVisible.hasAttribute("disabled")).toBe(false);
    fireEvent.click(keepVisible);
    expect(keepVisible.getAttribute("aria-checked")).toBe("true");

    fireEvent.change(screen.getByRole("textbox", { name: "Dictionary entry 1" }), {
      target: { value: "Jamin Zhou" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    expect(screen.getByRole("textbox", { name: "Dictionary entry 2" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove dictionary entry 1" }),
    );
    expect(
      (screen.getByRole("textbox", {
        name: "Dictionary entry 1",
      }) as HTMLInputElement).value,
    ).toBe("");
  });

  it("selects a voice, plays previews, closes on Escape, and restores focus", async () => {
    const onPreview = vi.fn();
    render(<VoiceFixture onPreview={onPreview} />);

    const trigger = screen.getByRole("button", { name: "Sol" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Choose a voice" });
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play Sol preview" }));
    expect(onPreview).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("radio", { name: /Cove/ }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(trigger.textContent).toContain("Cove");

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Choose a voice" }), {
      key: "Escape",
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Choose a voice" })).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
