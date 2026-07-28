import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type TerminalEntryKind =
  | "command"
  | "stderr"
  | "stdout"
  | "system";

export interface TerminalEntry {
  id: string;
  kind?: TerminalEntryKind;
  text: string;
}

export interface TerminalTranscriptProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  entries: readonly TerminalEntry[];
  follow?: boolean;
  label?: string;
}

export function TerminalTranscript({
  className,
  entries,
  follow = true,
  label = "Terminal output",
  ...props
}: TerminalTranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!follow) return;
    const transcript = transcriptRef.current;
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
  }, [entries, follow]);

  return (
    <div
      aria-label={label}
      aria-live="polite"
      aria-relevant="additions text"
      className={["codex-ui-terminal-transcript", className]
        .filter(Boolean)
        .join(" ")}
      ref={transcriptRef}
      role="log"
      tabIndex={0}
      {...props}
    >
      {entries.map((entry) => (
        <div
          className="codex-ui-terminal-transcript__entry"
          data-kind={entry.kind ?? "stdout"}
          key={entry.id}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}

export interface TerminalPromptProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  disabled?: boolean;
  inputLabel?: string;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "disabled" | "onChange" | "value"
  >;
  onCommandSubmit?: (command: string) => void;
  onValueChange?: (value: string) => void;
  prompt?: ReactNode;
  value: string;
}

export function TerminalPrompt({
  className,
  disabled = false,
  inputLabel = "Terminal input",
  inputProps,
  onCommandSubmit,
  onValueChange,
  prompt = "%",
  value,
  ...props
}: TerminalPromptProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || value.length === 0) return;
    onCommandSubmit?.(value);
  };

  return (
    <form
      className={["codex-ui-terminal-prompt", className]
        .filter(Boolean)
        .join(" ")}
      onSubmit={submit}
      {...props}
    >
      <span aria-hidden="true" className="codex-ui-terminal-prompt__prefix">
        {prompt}
      </span>
      <input
        {...inputProps}
        aria-label={inputLabel}
        autoCapitalize="none"
        autoComplete="off"
        className={[
          "codex-ui-terminal-prompt__input",
          inputProps?.className,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
        spellCheck={false}
        type="text"
        value={value}
      />
    </form>
  );
}

export type TerminalSessionStatus =
  | "exited"
  | "failed"
  | "idle"
  | "running";

export interface TerminalSessionProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  entries: readonly TerminalEntry[];
  followOutput?: boolean;
  inputDisabled?: boolean;
  inputLabel?: string;
  label?: string;
  onCommandSubmit?: (command: string) => void;
  onValueChange?: (value: string) => void;
  outputLabel?: string;
  prompt?: ReactNode;
  status?: TerminalSessionStatus;
  value: string;
}

export function TerminalSession({
  className,
  entries,
  followOutput = true,
  inputDisabled = false,
  inputLabel = "Terminal input",
  label = "Terminal session",
  onCommandSubmit,
  onValueChange,
  outputLabel = "Terminal output",
  prompt,
  status = "idle",
  value,
  ...props
}: TerminalSessionProps) {
  return (
    <section
      aria-label={label}
      className={["codex-ui-terminal-session", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
      {...props}
    >
      <TerminalTranscript
        entries={entries}
        follow={followOutput}
        label={outputLabel}
      />
      <TerminalPrompt
        disabled={inputDisabled}
        inputLabel={inputLabel}
        onCommandSubmit={onCommandSubmit}
        onValueChange={onValueChange}
        prompt={prompt}
        value={value}
      />
    </section>
  );
}
