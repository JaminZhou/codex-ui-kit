// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppearanceSettingsPage,
  CodeReviewSettingsPage,
  GeneralSettingsPage,
  GitSettingsPage,
  HooksSettingsPage,
  SettingsShell,
  type AppearanceSettingsValue,
  type CodeReviewSettingsValue,
  type GeneralSettingsValue,
  type GitSettingsValue,
  type HookSettingsEntry,
} from "../src";

afterEach(cleanup);

const sections = [
  {
    id: "coding",
    label: "Coding",
    items: [
      { id: "git", label: "Git", resultLabel: "Git" },
      {
        id: "hooks",
        keywords: ["git"],
        label: "Hooks",
        resultLabel: "Right before ChatGPT ends its turn",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    items: [{ id: "plugins", label: "Plugins" }],
  },
] as const;

function ShellFixture() {
  const [query, setQuery] = useState("");
  return (
    <SettingsShell
      onBack={() => undefined}
      onQueryChange={setQuery}
      onSelect={() => undefined}
      query={query}
      sections={sections}
      selectedId="git"
    >
      <h1>Git settings content</h1>
    </SettingsShell>
  );
}

const initialValue: GitSettingsValue = {
  alwaysForcePush: false,
  branchPrefix: "",
  commitInstructions: "",
  createDraftPullRequests: true,
  mergeMethod: "merge",
  pullRequestInstructions: "",
  reviewDelivery: "inline",
};

function GitFixture({ onSave = () => undefined }) {
  const [value, setValue] = useState(initialValue);
  return (
    <GitSettingsPage
      commitInstructionsDirty={Boolean(value.commitInstructions)}
      onChange={setValue}
      onSaveCommitInstructions={onSave}
      value={value}
    />
  );
}

const initialAppearanceValue: AppearanceSettingsValue = {
  codeFontSize: 12,
  dark: {
    accent: "#339CFF",
    background: "#181818",
    codeFont: "ui-monospace, SFMono-Regular",
    codeTheme: "Codex",
    contrast: 60,
    foreground: "#FFFFFF",
    translucentSidebar: true,
    uiFont: "-apple-system, BlinkMacSystemFont",
  },
  diffMarkers: "color",
  dockIcon: "codex",
  fontSmoothing: true,
  light: {
    accent: "#339CFF",
    background: "#FFFFFF",
    codeFont: "ui-monospace, SFMono-Regular",
    codeTheme: "Codex",
    contrast: 45,
    foreground: "#1A1C1F",
    translucentSidebar: true,
    uiFont: "-apple-system, BlinkMacSystemFont",
  },
  reduceMotion: "system",
  theme: "system",
  uiFontSize: 14,
  usePointerCursors: false,
};

function AppearanceFixture({
  onCopyTheme,
  onImportTheme,
}: {
  onCopyTheme?: (theme: "Light" | "Dark") => void;
  onImportTheme?: (theme: "Light" | "Dark") => void;
} = {}) {
  const [value, setValue] = useState(initialAppearanceValue);
  return (
    <AppearanceSettingsPage
      onChange={setValue}
      onCopyTheme={onCopyTheme}
      onImportTheme={onImportTheme}
      value={value}
    />
  );
}

const initialGeneralValue: GeneralSettingsValue = {
  ambientSuggestions: true,
  autoReview: true,
  bottomPanel: true,
  defaultFileOpenDestination: "vscode",
  followUpBehavior: "queue",
  fullAccess: true,
  language: "auto",
  permissionNotifications: true,
  pluginsEnabled: true,
  popoutHotkey: null,
  popoutStandaloneChat: false,
  preventSleepWhileRunning: false,
  questionNotifications: true,
  sendShortcut: "enter",
  showContextWindowUsage: false,
  showInMenuBar: true,
  speed: "standard",
  terminalLocation: "bottom",
  turnCompletionNotifications: "unfocused",
};

function GeneralFixture({ onOpenSourceLicenses = () => undefined }) {
  const [value, setValue] = useState(initialGeneralValue);
  const [hotkeyCaptureActive, setHotkeyCaptureActive] = useState(false);
  return (
    <GeneralSettingsPage
      elevatedRiskHref="https://help.openai.com/"
      hotkeyCaptureActive={hotkeyCaptureActive}
      onCancelHotkeyCapture={() => setHotkeyCaptureActive(false)}
      onChange={setValue}
      onOpenSourceLicenses={onOpenSourceLicenses}
      onStartHotkeyCapture={() => setHotkeyCaptureActive(true)}
      value={value}
    />
  );
}

const hookEntries: readonly HookSettingsEntry[] = [
  {
    command: "pnpm check",
    enabled: true,
    event: "Stop",
    id: "stop-check",
    source: "user",
    trusted: true,
  },
  {
    changedSinceTrusted: true,
    command: "pnpm lint",
    enabled: false,
    event: "PreToolUse",
    id: "plugin-lint",
    pluginName: "Quality checks",
    source: "plugin",
    trusted: false,
  },
];

function HooksFixture({ configured = false }: { configured?: boolean }) {
  const [entries, setEntries] = useState<readonly HookSettingsEntry[]>(
    configured ? hookEntries : [],
  );
  return (
    <HooksSettingsPage
      entries={entries}
      learnMoreHref="https://developers.openai.com/codex/hooks"
      onOpenConfig={() => undefined}
      onReload={() => undefined}
      onToggleHookEnabled={(entry, enabled) =>
        setEntries((current) =>
          current.map((candidate) =>
            candidate.id === entry.id ? { ...candidate, enabled } : candidate,
          ),
        )
      }
      onTrustHook={(entry) =>
        setEntries((current) =>
          current.map((candidate) =>
            candidate.id === entry.id
              ? {
                  ...candidate,
                  changedSinceTrusted: false,
                  trusted: true,
                }
              : candidate,
          ),
        )
      }
    />
  );
}

const initialCodeReviewValue: CodeReviewSettingsValue = {
  allowCreditsForCodeReviews: false,
  automaticReview: true,
  exhaustiveCodeReview: false,
  triggerPolicy: "pr_open",
};

function CodeReviewFixture() {
  const [value, setValue] = useState(initialCodeReviewValue);
  return (
    <CodeReviewSettingsPage
      onChange={setValue}
      showCreditPreference
      value={value}
    />
  );
}

describe("settings surfaces", () => {
  it("exposes separate Settings navigation and main landmarks", () => {
    render(<ShellFixture />);

    expect(screen.getByRole("navigation", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Git" }).getAttribute("aria-current"))
      .toBe("page");
    expect(screen.getByRole("button", { name: "Back to app" })).toBeTruthy();
  });

  it("returns grouped search results and restores the navigation", () => {
    render(<ShellFixture />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "git" },
    });
    expect(screen.getByText("Right before ChatGPT ends its turn")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plugins" })).toBeNull();

    const clearSearch = screen.getByRole("button", {
      name: "Clear settings search",
    });
    clearSearch.focus();
    fireEvent.click(clearSearch);
    expect(screen.getByRole("button", { name: "Plugins" })).toBeTruthy();
    const searchbox = screen.getByRole("searchbox");
    expect(searchbox.getAttribute("value")).toBe("");
    expect(document.activeElement).toBe(searchbox);
  });

  it("announces loading, error, and empty search states", () => {
    const { rerender } = render(
      <SettingsShell
        onBack={() => undefined}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        query=""
        sections={sections}
        selectedId="git"
        status="loading"
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Loading settings…");

    rerender(
      <SettingsShell
        onBack={() => undefined}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        query=""
        sections={sections}
        selectedId="git"
        status="error"
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("keeps Git preferences controlled with real switch and radio semantics", () => {
    render(<GitFixture />);

    const forcePush = screen.getByRole("switch", { name: "Always force push" });
    expect(forcePush.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(forcePush);
    expect(forcePush.getAttribute("aria-checked")).toBe("true");

    const merge = screen.getByRole("radio", { name: "Merge" });
    const squash = screen.getByRole("radio", { name: "Squash" });
    expect(merge.tabIndex).toBe(0);
    expect(squash.tabIndex).toBe(-1);
    merge.focus();
    fireEvent.keyDown(merge, { key: "ArrowRight" });
    expect(squash.getAttribute("aria-checked")).toBe("true");
    expect(merge.getAttribute("aria-checked")).toBe("false");
    expect(document.activeElement).toBe(squash);
    expect(merge.tabIndex).toBe(-1);
    expect(squash.tabIndex).toBe(0);

    fireEvent.keyDown(squash, { key: "ArrowRight" });
    expect(merge.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(merge);
  });

  it("enables instruction save only for a changed controlled value", () => {
    const onSave = vi.fn();
    render(<GitFixture onSave={onSave} />);

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    expect(saveButtons[0].hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Commit instructions" }), {
      target: { value: "Use conventional commits." },
    });
    expect(saveButtons[0].hasAttribute("disabled")).toBe(false);
    fireEvent.click(saveButtons[0]);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("keeps field ids instance-safe and disables saves without a host action", () => {
    render(
      <>
        <GitSettingsPage
          commitInstructionsDirty
          onChange={() => undefined}
          value={initialValue}
        />
        <GitSettingsPage onChange={() => undefined} value={initialValue} />
      </>,
    );

    const prefixes = screen.getAllByRole("textbox", { name: "Branch prefix" });
    expect(prefixes[0].id).not.toBe(prefixes[1].id);
    expect(
      screen
        .getAllByRole("button", { name: "Save" })[0]
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("keeps section heading ids instance-safe", () => {
    render(
      <>
        <ShellFixture />
        <ShellFixture />
      </>,
    );

    const codingHeadings = screen.getAllByRole("heading", { name: "Coding" });
    expect(codingHeadings[0].id).not.toBe(codingHeadings[1].id);
    for (const heading of codingHeadings) {
      expect(heading.closest("section")?.getAttribute("aria-labelledby")).toBe(
        heading.id,
      );
    }
  });

  it("renders the current Hooks empty contract and reload action", () => {
    render(<HooksFixture />);

    expect(screen.getByRole("heading", { level: 1, name: "Hooks" })).toBeTruthy();
    expect(screen.getByText("No hooks found")).toBeTruthy();
    expect(screen.getByText("Configured hooks will appear here")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload hooks" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Learn more" }).getAttribute("href"),
    ).toBe("https://developers.openai.com/codex/hooks");
  });

  it("keeps configured hook trust and enablement host-controlled", () => {
    render(<HooksFixture configured />);

    expect(screen.getByRole("heading", { name: "From Config" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "From Plugins" })).toBeTruthy();
    const stopSwitch = screen.getByRole("switch", { name: "Stop enabled" });
    expect(stopSwitch.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(stopSwitch);
    expect(stopSwitch.getAttribute("aria-checked")).toBe("false");

    const pluginSwitch = screen.getByRole("switch", {
      name: "PreToolUse enabled",
    });
    expect(pluginSwitch.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByText("PreToolUse", { exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Trust" }));
    expect(pluginSwitch.hasAttribute("disabled")).toBe(false);
  });

  it("keeps each plugin and project in its own source group", () => {
    render(
      <HooksSettingsPage
        entries={[
          ...hookEntries,
          {
            enabled: true,
            event: "SessionStart",
            id: "plugin-session",
            pluginName: "Session helpers",
            source: "plugin",
          },
          {
            enabled: true,
            event: "PostCompact",
            id: "project-frontend",
            projectLabel: "Frontend",
            source: "project",
          },
          {
            enabled: true,
            event: "PreCompact",
            id: "project-backend",
            projectLabel: "Backend",
            source: "project",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Quality checks" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Session helpers" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Frontend" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Backend" })).toBeTruthy();
  });

  it("announces Hooks loading and failure without exposing stale rows", () => {
    const onReload = vi.fn();
    const { rerender } = render(
      <HooksSettingsPage
        entries={hookEntries}
        onReload={onReload}
        status="loading"
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Loading hooks");
    expect(screen.queryByText("From Config")).toBeNull();

    rerender(
      <HooksSettingsPage
        entries={hookEntries}
        onReload={onReload}
        refreshing
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load hooks",
    );
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry.hasAttribute("disabled")).toBe(true);
    fireEvent.click(retry);
    expect(onReload).not.toHaveBeenCalled();
  });

  it("keeps package-observed Code review preferences controlled", () => {
    render(<CodeReviewFixture />);

    const automaticReview = screen.getByRole("switch", {
      name: "Enable automatic code review",
    });
    expect(automaticReview.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(automaticReview);
    expect(automaticReview.getAttribute("aria-checked")).toBe("false");

    const reviewTrigger = screen.getByRole("button", {
      name: "Review trigger",
    });
    const describedValueId = reviewTrigger.getAttribute("aria-describedby");
    expect(describedValueId).toBeTruthy();
    expect(document.getElementById(describedValueId!)?.textContent).toBe(
      "On PR open",
    );
    fireEvent.click(reviewTrigger);
    expect(
      screen
        .getByRole("menuitemradio", { name: "On PR open" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    const everyPush = screen.getByRole("menuitemradio", {
      name: "On every push",
    });
    expect(everyPush.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(everyPush);
    expect(reviewTrigger.textContent).toContain("On every push");
    expect(document.activeElement).toBe(reviewTrigger);

    const exhaustive = screen.getByRole("switch", {
      name: "Enable exhaustive code review",
    });
    const credits = screen.getByRole("switch", {
      name: "Allow credits for code reviews",
    });
    fireEvent.click(exhaustive);
    fireEvent.click(credits);
    expect(exhaustive.getAttribute("aria-checked")).toBe("true");
    expect(credits.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps Appearance theme selection and editors fully controlled", () => {
    render(<AppearanceFixture />);

    const system = screen.getByRole("radio", { name: "System" });
    const dark = screen.getByRole("radio", { name: "Dark" });
    expect((system as HTMLInputElement).checked).toBe(true);
    fireEvent.click(dark);
    expect((dark as HTMLInputElement).checked).toBe(true);
    expect((system as HTMLInputElement).checked).toBe(false);

    const lightSidebar = screen.getByRole("switch", {
      name: "Light translucent sidebar",
    });
    expect(lightSidebar.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(lightSidebar);
    expect(lightSidebar.getAttribute("aria-checked")).toBe("false");

    const lightContrast = screen.getByRole("slider", {
      name: "Light contrast",
    });
    expect(lightContrast.getAttribute("min")).toBe("0");
    expect(lightContrast.getAttribute("max")).toBe("100");
    fireEvent.change(lightContrast, { target: { value: "51" } });
    expect(lightContrast.getAttribute("value")).toBe("51");
    expect(screen.getByText("51", { selector: "output" })).toBeTruthy();
  });

  it("provides the current 16-option code theme menu and host actions", () => {
    const onCopyTheme = vi.fn();
    const onImportTheme = vi.fn();
    render(
      <AppearanceFixture
        onCopyTheme={onCopyTheme}
        onImportTheme={onImportTheme}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Light code theme" }));
    expect(screen.getAllByRole("menuitem")).toHaveLength(16);
    fireEvent.click(screen.getByRole("menuitem", { name: "GitHub" }));
    expect(
      screen.getByRole("button", { name: "Light code theme" }).textContent,
    ).toContain("GitHub");

    fireEvent.click(screen.getByRole("button", { name: "Import Light theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy Dark theme" }));
    expect(onImportTheme).toHaveBeenCalledWith("Light");
    expect(onCopyTheme).toHaveBeenCalledWith("Dark");
  });

  it("preserves Preferences semantics, bounds, and keyboard selection", () => {
    render(<AppearanceFixture />);

    const pointer = screen.getByRole("switch", { name: "Use pointer cursors" });
    fireEvent.click(pointer);
    expect(pointer.getAttribute("aria-checked")).toBe("true");

    const chatGptDock = screen.getByRole("radio", {
      name: "Use ChatGPT Dock icon",
    });
    fireEvent.click(chatGptDock);
    expect((chatGptDock as HTMLInputElement).checked).toBe(true);
    expect(chatGptDock.nextElementSibling?.textContent).toBe("GPT");
    expect(
      screen.getByRole("radio", { name: "Use Codex Dock icon" })
        .nextElementSibling?.textContent,
    ).toBe("CX");

    const systemMotion = screen.getByRole("button", { name: "System" });
    const motionOn = screen.getByRole("button", { name: "On" });
    systemMotion.focus();
    fireEvent.keyDown(systemMotion, { key: "ArrowRight" });
    expect(motionOn.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(motionOn);

    const uiFontSize = screen.getByRole("spinbutton", {
      name: "Sans font size",
    });
    const codeFontSize = screen.getByRole("spinbutton", {
      name: "Code font size",
    });
    expect([
      (uiFontSize as HTMLInputElement).min,
      (uiFontSize as HTMLInputElement).max,
      (codeFontSize as HTMLInputElement).min,
      (codeFontSize as HTMLInputElement).max,
    ]).toEqual(["11", "16", "8", "24"]);
    fireEvent.focus(uiFontSize);
    fireEvent.change(uiFontSize, { target: { value: "1" } });
    expect((uiFontSize as HTMLInputElement).value).toBe("1");
    fireEvent.change(uiFontSize, { target: { value: "15" } });
    expect((uiFontSize as HTMLInputElement).value).toBe("15");
    fireEvent.blur(uiFontSize);
    expect((uiFontSize as HTMLInputElement).value).toBe("15");

    fireEvent.change(uiFontSize, { target: { value: "99" } });
    fireEvent.blur(uiFontSize);
    (codeFontSize as HTMLInputElement).focus();
    fireEvent.change(codeFontSize, { target: { value: "12.5" } });
    fireEvent.blur(codeFontSize);
    expect((codeFontSize as HTMLInputElement).value).toBe("13");

    (codeFontSize as HTMLInputElement).focus();
    fireEvent.change(codeFontSize, { target: { value: "0" } });
    fireEvent.keyDown(codeFontSize, { key: "Enter" });
    expect((uiFontSize as HTMLInputElement).value).toBe("16");
    expect((codeFontSize as HTMLInputElement).value).toBe("8");

    const colorMarkers = screen.getByRole("button", {
      name: "Color diff markers",
    });
    fireEvent.keyDown(colorMarkers, { key: "ArrowRight" });
    expect(
      screen
        .getByRole("button", { name: "Plus / minus diff markers" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("disables theme host actions when no handler is supplied", () => {
    render(
      <AppearanceSettingsPage
        onChange={() => undefined}
        value={initialAppearanceValue}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Import Light theme" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Copy Dark theme" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("isolates Appearance radio groups and headings across instances", () => {
    render(
      <>
        <AppearanceSettingsPage
          onChange={() => undefined}
          value={initialAppearanceValue}
        />
        <AppearanceSettingsPage
          onChange={() => undefined}
          value={initialAppearanceValue}
        />
      </>,
    );

    const systemRadios = screen.getAllByRole("radio", { name: "System" });
    const codexDockRadios = screen.getAllByRole("radio", {
      name: "Use Codex Dock icon",
    });
    expect((systemRadios[0] as HTMLInputElement).name).not.toBe(
      (systemRadios[1] as HTMLInputElement).name,
    );
    expect((codexDockRadios[0] as HTMLInputElement).name).not.toBe(
      (codexDockRadios[1] as HTMLInputElement).name,
    );
    const themeSections = document.querySelectorAll(
      ".codex-ui-appearance-settings__theme-section",
    );
    expect(themeSections[0].getAttribute("aria-labelledby")).not.toBe(
      themeSections[1].getAttribute("aria-labelledby"),
    );
  });

  it("models all five current General settings groups as controlled inputs", () => {
    render(<GeneralFixture />);

    for (const heading of [
      "Permissions",
      "General",
      "Composer",
      "Popout Window",
      "Notifications",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
      ).toBeTruthy();
    }
    const defaultPermissions = screen.getByRole("switch", {
      name: "Default permissions are always shown",
    });
    expect(defaultPermissions.hasAttribute("disabled")).toBe(true);
    expect(defaultPermissions.getAttribute("aria-checked")).toBe("true");

    const autoReview = screen.getByRole("switch", {
      name: "Show Auto-review in the composer",
    });
    fireEvent.click(autoReview);
    expect(autoReview.getAttribute("aria-checked")).toBe("false");

    const showContext = screen.getByRole("switch", {
      name: "Show context window usage in the composer",
    });
    fireEvent.click(showContext);
    expect(showContext.getAttribute("aria-checked")).toBe("true");
  });

  it("exposes current General menus, searchable languages, and selections", () => {
    render(<GeneralFixture />);

    const describedValue = (control: HTMLElement) => {
      const descriptionId = control.getAttribute("aria-describedby");
      return descriptionId
        ? document.getElementById(descriptionId)?.textContent
        : null;
    };

    expect(
      describedValue(
        screen.getByRole("button", { name: "Default file open destination" }),
      ),
    ).toBe("VS Code");
    expect(describedValue(screen.getByRole("button", { name: "Language" }))).toBe(
      "Auto detect",
    );
    expect(
      describedValue(
        screen.getByRole("button", {
          name: "Set shortcut for Popout Window hotkey",
        }),
      ),
    ).toBe("Off");

    fireEvent.click(
      screen.getByRole("button", { name: "Default file open destination" }),
    );
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(7);
    expect(
      screen.getByRole("menuitemradio", { name: /VS Code/ }).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    const xcode = screen.getByRole("menuitemradio", { name: /Xcode/ });
    expect(xcode.getAttribute("aria-checked")).toBe("false");
    xcode.focus();
    fireEvent.click(xcode);
    const fileDestinationTrigger = screen.getByRole("button", {
      name: "Default file open destination",
    });
    expect(fileDestinationTrigger.textContent).toContain("Xcode");
    expect(describedValue(fileDestinationTrigger)).toBe("Xcode");
    expect(document.activeElement).toBe(fileDestinationTrigger);

    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    const languageSearch = screen.getByRole("searchbox", {
      name: "Search languages",
    });
    const languageDialog = screen.getByRole("dialog", { name: "Language" });
    const languageListbox = screen.getByRole("listbox", { name: "Languages" });
    expect(languageDialog.contains(languageSearch)).toBe(true);
    expect(languageDialog.contains(languageListbox)).toBe(true);
    expect(languageListbox.contains(languageSearch)).toBe(false);
    expect(languageSearch.getAttribute("aria-controls")).toBe(languageListbox.id);
    fireEvent.change(languageSearch, { target: { value: "简体" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    const languageOption = screen.getByRole("option", { name: "简体中文" });
    fireEvent.keyDown(languageSearch, { key: "ArrowDown" });
    expect(document.activeElement).toBe(languageOption);
    fireEvent.keyDown(languageOption, { key: "Home" });
    expect(document.activeElement).toBe(languageOption);
    fireEvent.click(languageOption);
    const languageTrigger = screen.getByRole("button", { name: "Language" });
    expect(languageTrigger.textContent).toContain(
      "简体中文",
    );
    expect(describedValue(languageTrigger)).toBe("简体中文");
    expect(document.activeElement).toBe(languageTrigger);

    fireEvent.click(languageTrigger);
    const reopenedLanguageSearch = screen.getByRole("searchbox", {
      name: "Search languages",
    });
    const reopenedLanguageListbox = screen.getByRole("listbox", {
      name: "Languages",
    });
    fireEvent.change(reopenedLanguageSearch, { target: { value: "not-a-language" } });
    const languageEmptyState = screen.getByText("No languages found");
    expect(reopenedLanguageListbox.contains(languageEmptyState)).toBe(false);
    fireEvent.keyDown(reopenedLanguageSearch, { key: "Escape" });

    for (const [triggerName, itemName, selectedValue] of [
      ["Speed", /Fast/, "Fast"],
      ["Send shortcut", /⌘ \+ Enter always/, "⌘ + Enter always"],
      ["Turn completion notifications", /^Always$/, "Always"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: triggerName }));
      const radioItems = screen.getAllByRole("menuitemradio");
      expect(
        radioItems.filter(
          (radioItem) => radioItem.getAttribute("aria-checked") === "true",
        ),
      ).toHaveLength(1);
      const item = screen.getByRole("menuitemradio", { name: itemName });
      item.focus();
      fireEvent.click(item);
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: triggerName }),
      );
      expect(
        describedValue(screen.getByRole("button", { name: triggerName })),
      ).toBe(selectedValue);
    }
  });

  it("does not steal General language focus when navigation closes the list", () => {
    render(<GeneralFixture />);

    const languageTrigger = screen.getByRole("button", { name: "Language" });
    fireEvent.click(languageTrigger);
    const languageSearch = screen.getByRole("searchbox", {
      name: "Search languages",
    });
    languageSearch.focus();
    fireEvent.keyDown(languageSearch, { key: "Tab" });
    expect(
      screen.queryByRole("searchbox", { name: "Search languages" }),
    ).toBeNull();
    expect(document.activeElement).not.toBe(languageTrigger);

    fireEvent.click(languageTrigger);
    const view = screen.getByRole("button", { name: "View" });
    view.focus();
    fireEvent.pointerDown(view);
    expect(
      screen.queryByRole("searchbox", { name: "Search languages" }),
    ).toBeNull();
    expect(document.activeElement).toBe(view);
  });

  it("supports General segmented keyboard flow and host-owned actions", () => {
    const onOpenSourceLicenses = vi.fn();
    render(<GeneralFixture onOpenSourceLicenses={onOpenSourceLicenses} />);

    const bottom = screen.getByRole("button", { name: "Bottom" });
    bottom.focus();
    fireEvent.keyDown(bottom, { key: "ArrowRight" });
    expect(
      screen.getByRole("button", { name: "Right" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onOpenSourceLicenses).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Set shortcut for Popout Window hotkey",
      }),
    );
    const hotkeyCapture = screen.getByRole("button", { name: "Press shortcut" });
    expect(hotkeyCapture).toBeTruthy();
    expect(document.activeElement).toBe(hotkeyCapture);
    fireEvent.keyDown(hotkeyCapture, { key: "Meta", metaKey: true });
    expect(screen.getByRole("button", { name: "Press shortcut" })).toBeTruthy();
    fireEvent.keyDown(hotkeyCapture, {
      key: "k",
      metaKey: true,
      shiftKey: true,
    });
    let hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    expect(hotkeyEdit.textContent).toContain("⌘ ⇧ K");
    expect(document.activeElement).toBe(hotkeyEdit);

    fireEvent.click(hotkeyEdit);
    fireEvent.keyDown(screen.getByRole("button", { name: "Press shortcut" }), {
      key: "Backspace",
    });
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    expect(hotkeyEdit.textContent).toContain("Off");
    expect(document.activeElement).toBe(hotkeyEdit);

    fireEvent.click(hotkeyEdit);
    fireEvent.keyDown(screen.getByRole("button", { name: "Press shortcut" }), {
      key: "k",
      metaKey: true,
      shiftKey: true,
    });
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    fireEvent.click(hotkeyEdit);
    fireEvent.keyDown(screen.getByRole("button", { name: "Press shortcut" }), {
      key: "Delete",
    });
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    expect(hotkeyEdit.textContent).toContain("Off");

    fireEvent.click(hotkeyEdit);
    fireEvent.keyDown(screen.getByRole("button", { name: "Press shortcut" }), {
      key: "k",
      metaKey: true,
      shiftKey: true,
    });
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    fireEvent.click(hotkeyEdit);
    fireEvent.keyDown(screen.getByRole("button", { name: "Press shortcut" }), {
      key: "Escape",
    });
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    expect(hotkeyEdit.textContent).toContain("⌘ ⇧ K");
    expect(document.activeElement).toBe(hotkeyEdit);

    fireEvent.click(hotkeyEdit);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    hotkeyEdit = screen.getByRole("button", {
      name: "Set shortcut for Popout Window hotkey",
    });
    expect(hotkeyEdit.textContent).toContain("⌘ ⇧ K");
    expect(document.activeElement).toBe(hotkeyEdit);
  });
});
