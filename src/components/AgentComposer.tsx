import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
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

function hasRenderableContent(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.trim().length > 0;
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return hasRenderableContent(child.props.children);
    }
    return true;
  });
}

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
  queue?: ReactNode;
  suggestions?: ReactNode;
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
    queue,
    stopLabel = "Stop generation",
    submitLabel = "Send message",
    textareaLabel = "Message",
    textareaProps,
    suggestions,
    value,
    "aria-label": ariaLabel = "Agent composer",
    onClick,
    ...formProps
  },
  forwardedRef,
) {
  const hasAttachments = hasRenderableContent(attachments);
  const hasQueueCandidate = hasRenderableContent(queue);
  const hasSuggestions = hasRenderableContent(suggestions);
  const showsSuggestions = hasSuggestions && !disabled;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement | null>(null);
  const queueRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const compactMetricsRef = useRef<HTMLSpanElement | null>(null);
  const isComposingRef = useRef(false);
  const [hasRenderedQueue, setHasRenderedQueue] = useState(false);
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
  const contentRequiresMultiline =
    hasAttachments || hasRenderedQueue || value.includes("\n");
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
      const compactChromeWidth = compactMetricsRef.current?.offsetWidth ?? 0;
      const fieldsetWidth = fieldset?.clientWidth ?? 0;
      const calculatedSingleLineWidth = Math.max(
        0,
        fieldsetWidth -
          (actionsRef.current?.offsetWidth ?? 0) -
          (controlsRef.current?.offsetWidth ?? 0) -
          compactChromeWidth,
      );
      const singleLineInputWidth =
        calculatedSingleLineWidth || textarea.clientWidth;
      const compactInputHasNoSpace =
        fieldsetWidth > 0 && calculatedSingleLineWidth === 0;
      const textWouldOverflow =
        compactInputHasNoSpace ||
        (measuredTextWidth > 0 &&
          singleLineInputWidth > 0 &&
          measuredTextWidth > singleLineInputWidth);

      nextLayout =
        hasAttachments ||
        hasRenderedQueue ||
        value.includes("\n") ||
        textWouldOverflow
          ? "multiline"
          : "single-line";
      setAutomaticLayout((current) =>
        current === nextLayout ? current : nextLayout,
      );
    }

    textarea.style.height = "";
    if (nextLayout === "single-line") return;

    const minimumHeight = Number.parseFloat(
      getComputedStyle(textarea).minHeight,
    );
    textarea.style.height = "0px";
    const nextHeight = Math.max(
      Number.isFinite(minimumHeight) ? minimumHeight : 0,
      textarea.scrollHeight,
    );
    textarea.style.height = nextHeight > 0 ? `${nextHeight}px` : "";
  }, [contentRequiresMultiline, hasAttachments, hasRenderedQueue, layout, value]);

  useLayoutEffect(() => {
    const container = queueRef.current;
    if (!hasQueueCandidate || !container) {
      setHasRenderedQueue(false);
      return;
    }

    const updateQueueVisibility = () => {
      const hasContent = [...container.childNodes].some(
        (node) => node.nodeType === 1 || Boolean(node.textContent?.trim()),
      );
      setHasRenderedQueue((current) =>
        current === hasContent ? current : hasContent,
      );
    };

    updateQueueVisibility();
    if (typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver(updateQueueVisibility);
    observer.observe(container, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [hasQueueCandidate, queue]);

  useLayoutEffect(measureLayoutAndResize, [
    automaticLayout,
    measureLayoutAndResize,
  ]);

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
    const form = formRef.current;
    if (!form?.contains(target)) return;

    for (let node: Element | null = target; node && node !== form; ) {
      if (
        node.matches(
          'a, button, input, select, textarea, [contenteditable="true"], [draggable="true"], [role], [tabindex]',
        )
      ) {
        return;
      }
      node = node.parentElement;
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
      data-suggestions-open={showsSuggestions || undefined}
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
        {showsSuggestions ? (
          <div className="codex-ui-composer__suggestions">{suggestions}</div>
        ) : null}
        {hasQueueCandidate ? (
          <div
            className="codex-ui-composer__queue"
            data-disabled={disabled || undefined}
            hidden={!hasRenderedQueue}
            inert={disabled || undefined}
            onDragStartCapture={
              disabled
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                : undefined
            }
            onDropCapture={
              disabled
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                : undefined
            }
            ref={queueRef}
          >
            {queue}
          </div>
        ) : null}
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

        <span aria-hidden="true" className="codex-ui-composer__measure-clip">
          <span className="codex-ui-composer__measure" ref={measureRef}>
            {value || "\u200b"}
          </span>
          <span
            className="codex-ui-composer__compact-metrics"
            ref={compactMetricsRef}
          />
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
  extends Omit<
    ComponentPropsWithoutRef<"span">,
    "children" | "onClick" | "onKeyDown"
  > {
  icon?: ReactNode;
  kind?: "file" | "image" | "pasted-text" | "selection";
  label: string;
  layout?: "card" | "image" | "pill";
  meta?: string;
  onOpen?: () => void;
  onRemove?: () => void;
  openLabel?: string;
  previewSrc?: string;
  removeLabel?: string;
  status?: "error" | "ready" | "uploading";
}

export function ComposerAttachment({
  className,
  icon,
  kind = "file",
  label,
  layout = "pill",
  meta,
  onOpen,
  onRemove,
  openLabel = `Open ${label}`,
  previewSrc,
  removeLabel = `Remove ${label}`,
  status = "ready",
  ...props
}: ComposerAttachmentProps) {
  const classes = ["codex-ui-composer-attachment", className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {previewSrc ? (
        <img
          alt=""
          className="codex-ui-composer-attachment__preview"
          src={previewSrc}
        />
      ) : (
        <span aria-hidden="true" className="codex-ui-composer-attachment__icon">
          {icon ??
            (kind === "pasted-text"
              ? "▤"
              : kind === "selection"
                ? "⌁"
                : "□")}
        </span>
      )}
      <span className="codex-ui-composer-attachment__copy">
        <span className="codex-ui-composer-attachment__label">{label}</span>
        {meta || status !== "ready" ? (
          <span
            className="codex-ui-composer-attachment__meta"
            role={status === "ready" ? undefined : "status"}
          >
            {status === "uploading"
              ? "Uploading…"
              : status === "error"
                ? "Upload failed"
                : meta}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <span
      className={classes}
      data-interactive={Boolean(onOpen) || undefined}
      data-kind={kind}
      data-layout={layout}
      data-removable={Boolean(onRemove) || undefined}
      data-status={status}
      {...props}
    >
      {onOpen ? (
        <button
          aria-label={openLabel}
          className="codex-ui-composer-attachment__open"
          onClick={onOpen}
          type="button"
        >
          {content}
        </button>
      ) : (
        content
      )}
      {onRemove ? (
        <button
          aria-label={removeLabel}
          className="codex-ui-composer-attachment__remove"
          onClick={onRemove}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </span>
  );
}
