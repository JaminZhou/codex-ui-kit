import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Dialog, type DialogProps } from "./Dialog.js";

export interface SkillDetailDialogProps
  extends Omit<
    DialogProps,
    | "children"
    | "description"
    | "footer"
    | "headerActions"
    | "onOpenChange"
    | "showClose"
    | "size"
    | "title"
  > {
  actionsMenuOpen?: boolean;
  artwork?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  enabled?: boolean;
  onActionsMenuOpenChange?: (open: boolean) => void;
  onCopyMarkdown?: () => void;
  onEnabledChange?: (enabled: boolean) => void;
  onOpen?: () => void;
  onOpenChange: (open: boolean) => void;
  onReveal?: () => void;
  onTryNow?: () => void;
  onUninstall?: () => void;
  suffix?: ReactNode;
  title: ReactNode;
  tryNowLabel?: ReactNode;
  uninstallLabel?: ReactNode;
}

export interface SkillPromptMentionProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  artwork?: ReactNode;
  label: ReactNode;
}

function MoreGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 4 8 8m0-8-8 8" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5" />
    </svg>
  );
}

function runMenuAction(action: (() => void) | undefined, dismiss: () => void) {
  action?.();
  dismiss();
}

export function SkillPromptMention({
  artwork,
  className,
  label,
  ...props
}: SkillPromptMentionProps) {
  return (
    <span
      className={["codex-ui-skill-prompt-mention", className]
        .filter(Boolean)
        .join(" ")}
      contentEditable={false}
      data-inline-mention-interactive=""
      {...props}
    >
      {artwork ? (
        <span aria-hidden="true" className="codex-ui-skill-prompt-mention__artwork">
          {artwork}
        </span>
      ) : null}
      <span className="codex-ui-skill-prompt-mention__label">{label}</span>
    </span>
  );
}

export function SkillDetailDialog({
  actionsMenuOpen = false,
  artwork,
  children,
  className,
  closeIcon = <CloseGlyph />,
  description,
  enabled = true,
  initialFocusSelector,
  onActionsMenuOpenChange,
  onCopyMarkdown,
  onEnabledChange,
  onKeyDown,
  onOpen,
  onOpenChange,
  onReveal,
  onTryNow,
  onUninstall,
  suffix = "Skill",
  title,
  tryNowLabel = "Try now",
  uninstallLabel = "Uninstall",
  ...props
}: SkillDetailDialogProps) {
  const dismissMenu = () => onActionsMenuOpenChange?.(false);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Escape" || !actionsMenuOpen) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dismissMenu();
  };

  return (
    <Dialog
      {...props}
      className={["codex-ui-skill-detail", className]
        .filter(Boolean)
        .join(" ")}
      closeIcon={closeIcon}
      closeOnEscape={!actionsMenuOpen}
      description={description}
      footer={
        <>
          <button
            className="codex-ui-skill-detail__uninstall"
            onClick={onUninstall}
            type="button"
          >
            {uninstallLabel}
          </button>
          <button
            className="codex-ui-skill-detail__try"
            onClick={onTryNow}
            type="button"
          >
            <ArrowGlyph />
            <span>{tryNowLabel}</span>
          </button>
        </>
      }
      headerActions={
        <>
          <button
            aria-checked={enabled}
            aria-label={enabled ? "Disable skill" : "Enable skill"}
            className="codex-ui-skill-detail__switch"
            onClick={() => onEnabledChange?.(!enabled)}
            role="switch"
            type="button"
          >
            <span aria-hidden="true" />
          </button>
          <span className="codex-ui-skill-detail__menu-anchor">
            <button
              aria-expanded={actionsMenuOpen}
              aria-haspopup="menu"
              aria-label="More actions"
              className="codex-ui-skill-detail__more"
              onClick={() => onActionsMenuOpenChange?.(!actionsMenuOpen)}
              type="button"
            >
              <MoreGlyph />
            </button>
            {actionsMenuOpen ? (
              <span className="codex-ui-skill-detail__menu" role="menu">
                <button
                  onClick={() => runMenuAction(onOpen, dismissMenu)}
                  role="menuitem"
                  type="button"
                >
                  Open
                </button>
                <button
                  onClick={() => runMenuAction(onReveal, dismissMenu)}
                  role="menuitem"
                  type="button"
                >
                  Reveal in Finder
                </button>
                <button
                  onClick={() => runMenuAction(onCopyMarkdown, dismissMenu)}
                  role="menuitem"
                  type="button"
                >
                  Copy Markdown
                </button>
              </span>
            ) : null}
          </span>
        </>
      }
      onKeyDown={handleKeyDown}
      initialFocusSelector={
        initialFocusSelector ?? "[data-skill-detail-initial-focus]"
      }
      onOpenChange={onOpenChange}
      showClose
      size="wide"
      title={title}
    >
      <div
        className="codex-ui-skill-detail__identity"
        data-skill-detail-initial-focus=""
        tabIndex={-1}
      >
        <span aria-hidden="true" className="codex-ui-skill-detail__artwork">
          {artwork}
        </span>
        <div className="codex-ui-skill-detail__name-row">
          <h2>{title}</h2>
          {suffix ? <span>{suffix}</span> : null}
        </div>
      </div>
      <div className="codex-ui-skill-detail__content">
        <div className="codex-ui-skill-detail__document">{children}</div>
      </div>
    </Dialog>
  );
}
