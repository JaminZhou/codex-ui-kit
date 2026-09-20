import {
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type BrowserComputerUseSettingsKind = "browser" | "computer-use";
export type BrowserComputerUseSettingsStatus = "error" | "loading" | "ready";

export interface BrowserComputerUseSetting {
  checked: boolean;
  description?: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
}

export interface BrowserComputerUseSettingsSection {
  description?: ReactNode;
  id: string;
  label: ReactNode;
  settings?: readonly BrowserComputerUseSetting[];
}

export interface BrowserComputerUseSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange" | "onToggle" | "title"> {
  disabled?: boolean;
  errorMessage?: ReactNode;
  intro?: ReactNode;
  kind: BrowserComputerUseSettingsKind;
  loadingLabel?: ReactNode;
  onRetry?: () => void;
  onToggle?: (setting: BrowserComputerUseSetting, checked: boolean) => void;
  retryLabel?: ReactNode;
  sections: readonly BrowserComputerUseSettingsSection[];
  status?: BrowserComputerUseSettingsStatus;
  title?: ReactNode;
}

function BrowserComputerUseSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="codex-ui-browser-computer-use-settings__switch"
      disabled={disabled}
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" />
    </button>
  );
}

function accessibleLabel(label: ReactNode, fallback: string) {
  if (typeof label === "string") return label;
  return fallback;
}

export function BrowserComputerUseSettingsPage({
  className,
  disabled = false,
  errorMessage = "Settings could not be loaded.",
  intro,
  kind,
  loadingLabel = "Loading settings…",
  onRetry,
  onToggle,
  retryLabel = "Retry",
  sections,
  status = "ready",
  title,
  ...props
}: BrowserComputerUseSettingsPageProps) {
  const resolvedTitle = title ?? (kind === "browser" ? "Browser" : "Computer use");
  const resolvedIntro =
    intro ??
    (kind === "browser"
      ? "Manage how ChatGPT uses the browser in your conversations."
      : "Manage how ChatGPT uses computer interactions in your conversations.");
  const isLocked = disabled || status === "loading";
  const showStatus = status !== "ready";

  return (
    <article
      {...props}
      aria-busy={status === "loading" || undefined}
      aria-disabled={disabled || undefined}
      className={["codex-ui-browser-computer-use-settings", className]
        .filter(Boolean)
        .join(" ")}
      data-disabled={disabled || undefined}
      data-kind={kind}
      data-status={status}
    >
      <header className="codex-ui-browser-computer-use-settings__header">
        <h1>{resolvedTitle}</h1>
        <p>{resolvedIntro}</p>
      </header>
      {showStatus ? (
        <div
          aria-live="polite"
          className="codex-ui-browser-computer-use-settings__status"
          role={status === "error" ? "alert" : "status"}
        >
          <span>{status === "loading" ? loadingLabel : errorMessage}</span>
          {status === "error" && onRetry ? (
            <button
              disabled={disabled}
              onClick={() => {
                if (!disabled) onRetry();
              }}
              type="button"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="codex-ui-browser-computer-use-settings__sections">
        {sections.map((section, sectionIndex) => {
          const headingId = `codex-ui-${kind}-settings-${section.id}`;
          return (
            <section
              aria-labelledby={headingId}
              className="codex-ui-browser-computer-use-settings__section"
              key={section.id}
            >
              <header>
                <h2 id={headingId}>{section.label}</h2>
                {section.description ? <p>{section.description}</p> : null}
              </header>
              {section.settings?.map((setting) => {
                const label = accessibleLabel(
                  setting.label,
                  `${kind} setting ${sectionIndex + 1}`,
                );
                const settingDisabled = isLocked || setting.disabled === true;
                return (
                  <div
                    className="codex-ui-browser-computer-use-settings__row"
                    key={setting.id}
                  >
                    <div>
                      <span>{setting.label}</span>
                      {setting.description ? <p>{setting.description}</p> : null}
                    </div>
                    <BrowserComputerUseSwitch
                      checked={setting.checked}
                      disabled={settingDisabled}
                      label={label}
                      onChange={() => onToggle?.(setting, !setting.checked)}
                    />
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </article>
  );
}
