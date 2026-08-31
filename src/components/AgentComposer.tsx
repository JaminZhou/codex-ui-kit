import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
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
import { inertWhen } from "../internal/inert.js";
import { SurfaceBlockedContext } from "../internal/surfaceBlocked.js";

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
  allowAttachmentOnlySubmit?: boolean;
  allowSubmitWhileRunning?: boolean;
  attachments?: ReactNode;
  controls?: ReactNode;
  disabled?: boolean;
  isRunning?: boolean;
  layout?: ComposerLayout;
  onStop?: () => void;
  onResume?: () => void;
  onSubmit: (value: string) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  queue?: ReactNode;
  suggestions?: ReactNode;
  resumeIcon?: ReactNode;
  resumeLabel?: string;
  stopIcon?: ReactNode;
  stopLabel?: string;
  submitIcon?: ReactNode;
  submitDisabled?: boolean;
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
    allowAttachmentOnlySubmit = false,
    allowSubmitWhileRunning = false,
    attachments,
    className,
    controls,
    disabled = false,
    isRunning = false,
    layout = "auto",
    onStop,
    onResume,
    onSubmit,
    onValueChange,
    placeholder = "Ask the agent to do something…",
    queue,
    stopLabel = "Stop generation",
    submitIcon,
    submitDisabled = false,
    submitLabel = "Send message",
    textareaLabel = "Message",
    textareaProps,
    suggestions,
    resumeIcon,
    resumeLabel = "Resume",
    stopIcon,
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
  const inheritedSurfaceBlocked = useContext(SurfaceBlockedContext);
  const surfaceBlocked = inheritedSurfaceBlocked || disabled;
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
  const canSubmit =
    !disabled &&
    !submitDisabled &&
    (!isRunning || allowSubmitWhileRunning) &&
    (value.trim().length > 0 ||
      (allowAttachmentOnlySubmit && hasAttachments));
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
      <SurfaceBlockedContext.Provider value={surfaceBlocked}>
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
            inert={inertWhen(disabled)}
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
          <div
            aria-label="Attachments"
            className="codex-ui-composer__attachments"
            role="group"
          >
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
                {stopIcon ?? (
                  <svg
                    aria-hidden="true"
                    className="codex-ui-composer__stop-icon"
                    fill="currentColor"
                    height="20"
                    viewBox="0 0 20 20"
                    width="20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z" />
                  </svg>
                )}
              </button>
            ) : onResume ? (
              <button
                aria-label={resumeLabel}
                className="codex-ui-composer__primary"
                data-action="resume"
                disabled={disabled}
                onClick={onResume}
                title={resumeLabel}
                type="button"
              >
                {resumeIcon ?? (
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="M6 14.7227V5.27693C6 4.29057 7.08894 3.6928 7.9211 4.22235L15.3428 8.94526C16.1147 9.43645 16.1147 10.5632 15.3428 11.0544L7.92109 15.7773C7.08894 16.3069 6 15.7091 6 14.7227Z" />
                  </svg>
                )}
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
                {submitIcon ?? (
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <path d="M10 15.5V4.75m0 0L5.75 9M10 4.75 14.25 9" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        </fieldset>
      </SurfaceBlockedContext.Provider>
    </form>
  );
});

export interface ComposerAttachmentProps
  extends Omit<
    ComponentPropsWithoutRef<"span">,
    "children" | "onClick" | "onKeyDown"
  > {
  icon?: ReactNode;
  kind?: "file" | "folder" | "image" | "pasted-text" | "selection";
  label: string;
  layout?: "card" | "image" | "pill";
  meta?: string;
  onOpen?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  openLabel?: string;
  previewSrc?: string;
  progress?: number;
  removeLabel?: string;
  retryLabel?: string;
  status?: "error" | "preview-error" | "ready" | "uploading";
  statusLabel?: string;
}

function ComposerAttachmentFileIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path
        d="M3.685 13.9927V7.82571C3.685 7.13661 3.68435 6.57966 3.72113 6.12942C3.75854 5.67162 3.83792 5.2658 4.02972 4.88918L4.1518 4.67043C4.45589 4.17472 4.89248 3.77087 5.41351 3.50539L5.55609 3.43899C5.89238 3.29475 6.2531 3.22954 6.65375 3.1968C7.10399 3.16001 7.66095 3.16067 8.35004 3.16067H11.8598C12.4396 3.16067 12.8381 3.15683 13.2202 3.24856L13.4594 3.31594C13.6957 3.39275 13.9228 3.49733 14.1352 3.62746L14.2582 3.70754C14.5417 3.90517 14.7998 4.16808 15.1586 4.52688L16.1489 5.51711L16.433 5.80325C16.6956 6.07017 16.8943 6.28943 17.0483 6.54055L17.1704 6.75832C17.283 6.97956 17.3691 7.21362 17.4272 7.45559L17.4575 7.60012C17.5181 7.94023 17.5151 8.3086 17.5151 8.81594V13.9927C17.5151 14.6816 17.5157 15.2388 17.4789 15.689C17.4462 16.0896 17.381 16.4504 17.2368 16.7866L17.1704 16.9292C16.9049 17.4502 16.5009 17.8859 16.0053 18.19L15.7866 18.312C15.4099 18.5039 15.0042 18.5832 14.5463 18.6206C14.0961 18.6574 13.5391 18.6577 12.85 18.6577H8.35004C7.66095 18.6577 7.10399 18.6574 6.65375 18.6206C6.25317 18.5879 5.89234 18.5236 5.55609 18.3794L5.41351 18.312C4.89231 18.0465 4.4559 17.6429 4.1518 17.147L4.02972 16.9292C3.83787 16.5526 3.75856 16.1468 3.72113 15.689C3.68435 15.2388 3.685 14.6816 3.685 13.9927ZM11.433 11.9107L11.5678 11.9243C11.8706 11.9865 12.0981 12.2545 12.0981 12.5757C12.0981 12.8969 11.8706 13.1649 11.5678 13.2271L11.433 13.2407H8.10004C7.73277 13.2407 7.435 12.943 7.435 12.5757C7.435 12.2084 7.73277 11.9107 8.10004 11.9107H11.433ZM13.1 8.57766L13.2338 8.59133C13.5369 8.65329 13.7651 8.92129 13.7651 9.2427C13.7649 9.56401 13.5369 9.83218 13.2338 9.89407L13.1 9.90774H8.10004C7.73288 9.90774 7.43517 9.60982 7.435 9.2427C7.435 8.87543 7.73277 8.57766 8.10004 8.57766H13.1ZM5.01508 13.9927C5.01508 14.7036 5.01597 15.1971 5.0473 15.5806C5.07801 15.9561 5.13479 16.1677 5.21527 16.3257L5.28558 16.4517C5.4619 16.7392 5.71484 16.9735 6.01703 17.1275L6.14691 17.1831C6.29069 17.2346 6.48014 17.2724 6.76215 17.2954C7.14567 17.3268 7.639 17.3277 8.35004 17.3277H12.85C13.5611 17.3277 14.0544 17.3268 14.4379 17.2954C14.8136 17.2647 15.025 17.208 15.183 17.1275L15.309 17.0562C15.5964 16.8799 15.8308 16.6277 15.9848 16.3257L16.0414 16.1948C16.0928 16.0512 16.1298 15.8619 16.1528 15.5806C16.1841 15.1971 16.185 14.7036 16.185 13.9927V8.81594C16.185 8.33361 16.1823 8.0931 16.1616 7.92141L16.1342 7.76614C16.1005 7.62577 16.0502 7.49017 15.9848 7.36184L15.9145 7.23586C15.8625 7.15105 15.7996 7.07018 15.6928 6.95364L15.2084 6.45754L14.2182 5.46731C13.8769 5.12597 13.7049 4.95778 13.5688 4.8511L13.4399 4.76125C13.3167 4.68579 13.1853 4.62512 13.0483 4.58059L12.9096 4.54153C12.7162 4.4951 12.5029 4.49075 11.8598 4.49075H8.35004C7.639 4.49075 7.14567 4.49164 6.76215 4.52297C6.48029 4.546 6.29066 4.58286 6.14691 4.6343L6.01703 4.69094C5.71477 4.84496 5.4619 5.07908 5.28558 5.36672L5.21527 5.4927C5.13476 5.65071 5.07801 5.86211 5.0473 6.23782C5.01597 6.62134 5.01508 7.11467 5.01508 7.82571V13.9927Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ComposerAttachmentCloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path
        d="M14.6549 5.57307C14.9283 5.2997 15.3718 5.2997 15.6451 5.57307C15.9185 5.84643 15.9185 6.28993 15.6451 6.5633L11.3903 10.8182L15.6451 15.0731L15.735 15.1834C15.9141 15.4551 15.8842 15.8242 15.6451 16.0633C15.4061 16.3024 15.0369 16.3322 14.7653 16.1531L14.6549 16.0633L10.4 11.8084L6.14515 16.0633C5.87178 16.3367 5.42828 16.3367 5.15492 16.0633C4.88155 15.7899 4.88155 15.3464 5.15492 15.0731L9.4098 10.8182L5.15492 6.5633L5.06507 6.45295C4.88597 6.18128 4.91584 5.81214 5.15492 5.57307C5.39399 5.33399 5.76313 5.30413 6.0348 5.48322L6.14515 5.57307L10.4 9.82795L14.6549 5.57307Z"
        fill="currentColor"
      />
    </svg>
  );
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
  onRetry,
  openLabel = `Open ${label}`,
  previewSrc,
  progress,
  removeLabel = `Remove ${label}`,
  retryLabel = `Retry ${label}`,
  status = "ready",
  statusLabel,
  ...props
}: ComposerAttachmentProps) {
  const classes = ["codex-ui-composer-attachment", className]
    .filter(Boolean)
    .join(" ");
  const resolvedStatusLabel =
    statusLabel ??
    (status === "uploading"
      ? "Uploading…"
      : status === "error"
        ? "Upload failed"
        : status === "preview-error"
          ? "Preview unavailable"
          : undefined);
  const normalizedProgress =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : undefined;
  const progressNode =
    status === "uploading" && normalizedProgress !== undefined ? (
      <span
        aria-label={`Uploading ${label}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalizedProgress}
        className="codex-ui-composer-attachment__progress"
        role="progressbar"
      >
        <span style={{ width: `${normalizedProgress}%` }} />
      </span>
    ) : null;
  const accessibleStatusNode =
    status !== "ready" && resolvedStatusLabel ? (
      <span
        className="codex-ui-composer-attachment__accessible-status"
        role="status"
      >
        {resolvedStatusLabel}
      </span>
    ) : null;

  const content = (
    <>
      {kind === "image" && status === "preview-error" ? (
        <span
          aria-hidden="true"
          className="codex-ui-composer-attachment__preview-error"
        >
          {resolvedStatusLabel}
        </span>
      ) : previewSrc ? (
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
              : kind === "folder"
                ? "▱"
              : kind === "selection"
                ? "⌁"
                : (
                    <ComposerAttachmentFileIcon />
                  ))}
        </span>
      )}
      <span className="codex-ui-composer-attachment__copy">
        <span className="codex-ui-composer-attachment__label">{label}</span>
        {meta || resolvedStatusLabel ? (
          <span className="codex-ui-composer-attachment__meta">
            {resolvedStatusLabel ?? meta}
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
      {accessibleStatusNode}
      {progressNode}
      {onRetry ? (
        <button
          aria-label={retryLabel}
          className="codex-ui-composer-attachment__retry"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
      {onRemove ? (
        <button
          aria-label={removeLabel}
          className="codex-ui-composer-attachment__remove"
          onClick={onRemove}
          type="button"
        >
          <ComposerAttachmentCloseIcon />
        </button>
      ) : null}
    </span>
  );
}
