import type { HTMLAttributes, ReactNode } from "react";

export interface ComposerEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  label?: string;
}

/**
 * Presentation shell for a contenteditable Composer editor.
 *
 * Hosts own the editing model, serialization, selection, and submission
 * behavior. Children may include non-editable inline tokens such as
 * ComposerResourceMention.
 */
export function ComposerEditor({
  children,
  className,
  label = "Message composer",
  ...props
}: ComposerEditorProps) {
  return (
    <div
      {...props}
      aria-label={label}
      className={["codex-ui-composer-editor", className]
        .filter(Boolean)
        .join(" ")}
      contentEditable
      role="textbox"
      suppressContentEditableWarning
    >
      {children}
    </div>
  );
}
