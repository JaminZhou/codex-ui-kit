import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface ComposerEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "aria-label"> {
  children?: ReactNode;
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
      label = "Message composer",
      placeholder,
      ...props
    },
    forwardedRef,
  ) {
    return (
      <div
        {...props}
        aria-label={label}
        aria-multiline="true"
        aria-placeholder={placeholder}
        className={["codex-ui-composer-editor", className]
          .filter(Boolean)
          .join(" ")}
        contentEditable
        data-placeholder={placeholder || undefined}
        ref={forwardedRef}
        role="textbox"
        suppressContentEditableWarning
      >
        {children}
      </div>
    );
  },
);
