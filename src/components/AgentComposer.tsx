import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type FormHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface AgentComposerProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  actions?: ReactNode;
  attachments?: ReactNode;
  controls?: ReactNode;
  disabled?: boolean;
  isRunning?: boolean;
  onStop?: () => void;
  onSubmit: (value: string) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  stopLabel?: string;
  submitLabel?: string;
  textareaLabel?: string;
  textareaProps?: Omit<
    ComponentPropsWithoutRef<"textarea">,
    "disabled" | "onChange" | "placeholder" | "rows" | "value"
  >;
  value: string;
}

export const AgentComposer = forwardRef<
  HTMLTextAreaElement,
  AgentComposerProps
>(function AgentComposer(
  {
    actions,
    attachments,
    className,
    controls,
    disabled = false,
    isRunning = false,
    onStop,
    onSubmit,
    onValueChange,
    placeholder = "Ask the agent to do something…",
    stopLabel = "Stop generation",
    submitLabel = "Send message",
    textareaLabel = "Message",
    textareaProps,
    value,
    "aria-label": ariaLabel = "Agent composer",
    ...formProps
  },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);
  const {
    className: textareaClassName,
    onCompositionEnd,
    onCompositionStart,
    onKeyDown,
    ...restTextareaProps
  } = textareaProps ?? {};
  const canSubmit = !disabled && !isRunning && value.trim().length > 0;
  const classes = ["codex-ui-composer", className].filter(Boolean).join(" ");
  const textareaClasses = ["codex-ui-composer__input", textareaClassName]
    .filter(Boolean)
    .join(" ");

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useLayoutEffect(resizeTextarea, [resizeTextarea, value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === "undefined") return;

    let previousWidth = textarea.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === previousWidth) return;
      previousWidth = entry.contentRect.width;
      resizeTextarea();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [resizeTextarea]);

  const submitCurrentValue = useCallback(() => {
    if (canSubmit) onSubmit(value);
  }, [canSubmit, onSubmit, value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitCurrentValue();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const isComposing =
      isComposingRef.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229;

    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      submitCurrentValue();
    }
  };

  return (
    <form
      aria-label={ariaLabel}
      className={classes}
      data-disabled={disabled || undefined}
      data-running={isRunning || undefined}
      onSubmit={handleSubmit}
      {...formProps}
    >
      <fieldset className="codex-ui-composer__fieldset" disabled={disabled}>
        {attachments ? (
          <div className="codex-ui-composer__attachments" aria-label="Attachments">
            {attachments}
          </div>
        ) : null}

        <textarea
          aria-label={textareaLabel}
          className={textareaClasses}
          disabled={disabled}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            onCompositionEnd?.(event);
          }}
          onCompositionStart={(event) => {
            isComposingRef.current = true;
            onCompositionStart?.(event);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={setTextareaRef}
          rows={1}
          value={value}
          {...restTextareaProps}
        />

        <div className="codex-ui-composer__toolbar">
          <div className="codex-ui-composer__actions">{actions}</div>
          <div className="codex-ui-composer__controls">
            {controls}
            {isRunning ? (
              <button
                aria-label={stopLabel}
                className="codex-ui-composer__primary"
                data-action="stop"
                disabled={disabled || !onStop}
                onClick={onStop}
                title={stopLabel}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="codex-ui-composer__stop-icon"
                />
              </button>
            ) : (
              <button
                aria-label={submitLabel}
                className="codex-ui-composer__primary"
                data-action="submit"
                disabled={!canSubmit}
                title={submitLabel}
                type="submit"
              >
                <span aria-hidden="true">↑</span>
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
});

export interface ComposerAttachmentProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  label: string;
  meta?: string;
  onRemove?: () => void;
  removeLabel?: string;
}

export function ComposerAttachment({
  className,
  label,
  meta,
  onRemove,
  removeLabel = `Remove ${label}`,
  ...props
}: ComposerAttachmentProps) {
  const classes = ["codex-ui-composer-attachment", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      data-removable={Boolean(onRemove) || undefined}
      {...props}
    >
      <span className="codex-ui-composer-attachment__label">{label}</span>
      {meta ? (
        <span className="codex-ui-composer-attachment__meta">{meta}</span>
      ) : null}
      {onRemove ? (
        <button aria-label={removeLabel} onClick={onRemove} type="button">
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </span>
  );
}
