import {
  ComposerContextBar,
  ComposerContextControl,
  ComposerDock,
  ComposerEditor,
  IconButton,
  Popover,
} from "codex-ui-kit";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

type RedactedPopoverTrigger = ComponentProps<typeof Popover>["trigger"];

type RedactedPopoverProps = {
  children?: ReactNode;
  height: number;
  label: string;
  role: "dialog" | "menu";
  trigger: RedactedPopoverTrigger;
  width: number;
};

function RedactedPopover({
  children,
  height,
  label,
  role,
  trigger,
  width,
}: RedactedPopoverProps) {
  const style: CSSProperties = {
    boxSizing: "border-box",
    height,
    width,
  };

  return (
    <Popover
      align="start"
      className="demo-current-composer-26-924__popover"
      initialFocus="none"
      label={label}
      role={role}
      side="top"
      sideOffset={4}
      style={style}
      trigger={trigger}
      width="auto"
    >
      {children ?? (
        <div
          aria-disabled={role === "menu" || undefined}
          aria-hidden={role === "dialog" || undefined}
          aria-label={
            role === "menu"
              ? "Options not captured in this fixture"
              : undefined
          }
          className="demo-current-composer-26-924__redacted-content"
          data-content-status="structure-observed-values-not-retained"
          role={role === "menu" ? "menuitem" : undefined}
          tabIndex={role === "menu" ? -1 : undefined}
        />
      )}
    </Popover>
  );
}

function PlaceholderRows({ count }: { count: number }) {
  return (
    <div
      className="demo-current-composer-26-924__placeholder-rows"
      data-observed-row-sample={count}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          aria-disabled="true"
          aria-label="Option not captured in this fixture"
          className="demo-current-composer-26-924__placeholder-row"
          key={index}
          role="menuitem"
          tabIndex={-1}
        />
      ))}
    </div>
  );
}

type ContextPopoverProps = Omit<RedactedPopoverProps, "role"> & {
  role?: "dialog" | "menu";
};

function ContextPopover({
  height,
  label,
  role = "menu",
  trigger,
  width,
  children,
}: ContextPopoverProps) {
  return (
    <RedactedPopover
      height={height}
      label={label}
      role={role}
      trigger={trigger}
      width={width}
    >
      {children}
    </RedactedPopover>
  );
}

export function CurrentComposer26924() {
  return (
    <section
      aria-label="New chat Composer structural replay"
      className="demo-current-composer-26-924"
      data-current-build="26.924.22138"
      data-scene-status="composer-only-conversation-content-not-captured"
      data-visual-assets="not-captured-for-current-build"
    >
      <ComposerDock
        className="demo-current-composer-26-924__dock"
        context={
          <ComposerContextBar label="Composer context controls">
            <ContextPopover
              height={254.5}
              label="Project context, labels and values not retained"
              role="dialog"
              trigger={
                <ComposerContextControl aria-label="Project context (value not retained)">
                  Project
                </ComposerContextControl>
              }
              width={260}
            >
              <div
                className="demo-current-composer-26-924__project-dialog-content"
                data-content-status="values-not-retained"
              >
                <div
                  aria-label="Context entries not captured"
                  className="demo-current-composer-26-924__project-listbox"
                  data-content-status="not-captured"
                  role="listbox"
                >
                  <div
                    aria-disabled="true"
                    aria-label="Listbox entries not captured in this fixture"
                    role="option"
                  />
                </div>
              </div>
            </ContextPopover>
            <ContextPopover
              height={189.31}
              label="Environment context, labels and values not retained"
              trigger={
                <ComposerContextControl aria-label="Environment context (value not retained)">
                  Environment
                </ComposerContextControl>
              }
              width={216}
            />
            <ContextPopover
              height={280.13}
              label="Branch context, labels and values not retained"
              trigger={
                <ComposerContextControl aria-label="Branch context (value not retained)">
                  Branch
                </ComposerContextControl>
              }
              width={296}
            />
          </ComposerContextBar>
        }
        label="Current-build Composer structure"
        composer={
          <div className="demo-current-composer-26-924__surface">
            <ComposerEditor
              className="demo-current-composer-26-924__editor"
              data-editor-evidence="contenteditable-empty-712x44-at-1180x820"
              label="Message editor; placeholder text not retained"
            />
            <div
              aria-label="Composer actions; exact glyphs are pending capture"
              className="demo-current-composer-26-924__toolbar"
              role="toolbar"
            >
              <div className="demo-current-composer-26-924__toolbar-leading">
                <RedactedPopover
                  height={320}
                  label="Add menu, context-dependent sample; item labels not retained"
                  role="menu"
                  trigger={
                    <IconButton
                      className="demo-current-composer-26-924__toolbar-icon"
                      data-visual-asset-status="pending-26.924-capture"
                      icon={<span aria-hidden="true" />}
                      label="Add"
                    />
                  }
                  width={736}
                >
                  <div
                    className="demo-current-composer-26-924__add-menu-content"
                    data-content-status="labels-not-retained"
                    data-context-dependent-sample="true"
                  >
                    <PlaceholderRows count={14} />
                  </div>
                </RedactedPopover>
                <RedactedPopover
                  height={161.7}
                  label="Full access menu, option labels not retained"
                  role="menu"
                  trigger={
                    <button
                      aria-label="Full access"
                      className="demo-current-composer-26-924__permission-trigger"
                      type="button"
                    >
                      Full access
                    </button>
                  }
                  width={439.1}
                >
                  <div
                    className="demo-current-composer-26-924__permission-menu-content"
                    data-content-status="option-labels-not-retained"
                  >
                    <PlaceholderRows count={4} />
                  </div>
                </RedactedPopover>
              </div>
              <div className="demo-current-composer-26-924__toolbar-trailing">
                <ContextPopover
                  height={95.98}
                  label="Model selector, values not retained"
                  trigger={
                    <ComposerContextControl aria-label="Model selector (value not retained)">
                      Model
                    </ComposerContextControl>
                  }
                  width={253.95}
                />
                <IconButton
                  className="demo-current-composer-26-924__toolbar-icon"
                  data-visual-asset-status="pending-26.924-capture"
                  icon={<span aria-hidden="true" />}
                  label="Dictate"
                />
                <IconButton
                  className="demo-current-composer-26-924__toolbar-icon"
                  data-visual-asset-status="pending-26.924-capture"
                  icon={<span aria-hidden="true" />}
                  label="Start new voice chat"
                />
              </div>
            </div>
          </div>
        }
      />
    </section>
  );
}
