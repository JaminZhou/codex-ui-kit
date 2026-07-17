import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type FormHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

export type ComposerLayout = "auto" | "single-line" | "multiline";

export interface AgentComposerProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  actions?: ReactNode;
  attachments?: ReactNode;
  controls?: ReactNode;
  disabled?: boolean;
  isRunning?: boolean;
  layout?: ComposerLayout;
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
    layout = "auto",
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
    onClick,
    ...formProps
  },
  forwardedRef,
) {
  const hasAttachments = Boolean(attachments);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const isComposingRef = useRef(false);
  const [automaticLayout, setAutomaticLayout] = useState<
    Exclude<ComposerLayout, "auto">
  >(() =>
    hasAttachments || value.includes("\n") ? "multiline" : "single-line",
  );
  const {
    className: textareaClassName,
    onCompositionEnd,
    onCompositionStart,
    onKeyDown,
    ...restTextareaProps
  } = textareaProps ?? {};
  const canSubmit = !disabled && !isRunning && value.trim().length > 0;
  const contentRequiresMultiline = hasAttachments || value.includes("\n");
  const resolvedLayout = contentRequiresMultiline
    ? "multiline"
    : layout === "auto"
      ? automaticLayout
      : layout;
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

  const measureLayoutAndResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let nextLayout: Exclude<ComposerLayout, "auto"> =
      layout === "multiline" || contentRequiresMultiline
        ? "multiline"
        : "single-line";

    if (layout === "auto") {
      const fieldset = fieldsetRef.current;
      const measuredTextWidth = measureRef.current?.offsetWidth ?? 0;
      const calculatedSingleLineWidth = Math.max(
        0,
        (fieldset?.clientWidth ?? 0) -
          (actionsRef.current?.offsetWidth ?? 0) -
          (controlsRef.current?.offsetWidth ?? 0) -
          32,
      );
      const singleLineInputWidth =
        calculatedSingleLineWidth || textarea.clientWidth;
      const textWouldOverflow =
        measuredTextWidth > 0 &&
        singleLineInputWidth > 0 &&
        measuredTextWidth + 32 > singleLineInputWidth;

      nextLayout =
        hasAttachments || value.includes("\n") || textWouldOverflow
          ? "multiline"
          : "single-line";
      setAutomaticLayout((current) =>
        current === nextLayout ? current : nextLayout,
      );
    }

    textarea.style.height = "0px";
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.max(
      nextLayout === "multiline" ? 44 : 36,
      nextLayout === "multiline" ? contentHeight : 0,
    )}px`;
  }, [contentRequiresMultiline, hasAttachments, layout, value]);

  useLayoutEffect(measureLayoutAndResize, [measureLayoutAndResize]);

  useEffect(() => {
    const form = formRef.current;
    if (!form || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measureLayoutAndResize);
    observer.observe(form);
    if (actionsRef.current) observer.observe(actionsRef.current);
    if (controlsRef.current) observer.observe(controlsRef.current);
    return () => observer.disconnect();
  }, [measureLayoutAndResize]);

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

  const handleSurfaceClick = (event: ReactMouseEvent<HTMLFormElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        'a, button, input, select, textarea, [contenteditable="true"], [draggable="true"], [role], [tabindex]',
      )
    ) {
      return;
    }
    textareaRef.current?.focus();
  };

  return (
    <form
      aria-label={ariaLabel}
      className={classes}
      data-disabled={disabled || undefined}
      data-layout={resolvedLayout}
      data-running={isRunning || undefined}
      ref={formRef}
      {...formProps}
      onClick={handleSurfaceClick}
      onSubmit={handleSubmit}
    >
      <fieldset
        className="codex-ui-composer__fieldset"
        disabled={disabled}
        ref={fieldsetRef}
      >
        {hasAttachments ? (
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

        <span
          aria-hidden="true"
          className="codex-ui-composer__measure"
          ref={measureRef}
        >
          {value || "\u200b"}
        </span>

        <div className="codex-ui-composer__toolbar">
          <div className="codex-ui-composer__actions" ref={actionsRef}>
            {actions}
          </div>
          <div className="codex-ui-composer__controls" ref={controlsRef}>
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
                <svg aria-hidden="true" viewBox="0 0 20 20">
                  <path d="M10 15.5V4.75m0 0L5.75 9M10 4.75 14.25 9" />
                </svg>
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
