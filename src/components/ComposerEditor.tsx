import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface ComposerEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "aria-label"> {
  children?: ReactNode;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

/**
 * Presentation shell for a contenteditable Composer editor.
 *
 * Hosts own the editing model, serialization, selection, and submission
 * behavior. Children may include non-editable inline tokens such as
 * ComposerResourceMention.
 */
export const ComposerEditor = forwardRef<HTMLDivElement, ComposerEditorProps>(
  function ComposerEditor(
    {
      children,
      className,
      disabled = false,
      label = "Message composer",
      onBeforeInput,
      onCompositionEnd,
      onCompositionStart,
      onDrop,
      onInput,
      onKeyDown,
      onKeyUp,
      onPaste,
      placeholder,
      ...props
    },
    forwardedRef,
  ) {
    return (
      <div
        {...props}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-multiline="true"
        aria-placeholder={placeholder}
        className={["codex-ui-composer-editor", className]
          .filter(Boolean)
          .join(" ")}
        contentEditable={!disabled}
        data-placeholder={placeholder || undefined}
        data-disabled={disabled || undefined}
        onBeforeInput={disabled ? undefined : onBeforeInput}
        onCompositionEnd={disabled ? undefined : onCompositionEnd}
        onCompositionStart={disabled ? undefined : onCompositionStart}
        onDrop={disabled ? undefined : onDrop}
        onInput={disabled ? undefined : onInput}
        onKeyDown={disabled ? undefined : onKeyDown}
        onKeyUp={disabled ? undefined : onKeyUp}
        onPaste={disabled ? undefined : onPaste}
        ref={forwardedRef}
        role="textbox"
        suppressContentEditableWarning
      >
        {children}
      </div>
    );
  },
);
