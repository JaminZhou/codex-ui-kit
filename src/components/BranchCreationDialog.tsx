import {
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useId,
} from "react";
import { Dialog } from "./Dialog.js";
import { Button } from "./InteractivePrimitives.js";

export type BranchCreationDialogStatus = "creating" | "error" | "idle";

export interface BranchCreationDialogProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onSubmit" | "title"
  > {
  branchName: string;
  branchNameLabel?: string;
  closeLabel?: string;
  createLabel?: string;
  error?: ReactNode;
  onBranchNameChange: (branchName: string) => void;
  onCreate: (branchName: string) => void;
  onOpenChange: (open: boolean) => void;
  onSetPrefix?: () => void;
  open: boolean;
  placeholder?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  setPrefixLabel?: string;
  status?: BranchCreationDialogStatus;
  title?: ReactNode;
}

/**
 * Presents the branch-name step independently from the host Git operation.
 * The host remains authoritative for Git reference validation and duplicate
 * detection; this component only prevents an empty submission.
 */
export function BranchCreationDialog({
  branchName,
  branchNameLabel = "Branch name",
  className,
  closeLabel = "Close",
  createLabel = "Create and checkout",
  error,
  onBranchNameChange,
  onCreate,
  onOpenChange,
  onSetPrefix,
  open,
  placeholder = "new-branch",
  returnFocusRef,
  setPrefixLabel = "Set prefix",
  status = "idle",
  title = "Create and checkout branch",
  ...props
}: BranchCreationDialogProps) {
  const formId = useId();
  const errorId = useId();
  const normalizedBranchName = branchName.trim();
  const creating = status === "creating";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedBranchName || creating) return;
    onCreate(normalizedBranchName);
  };

  return (
    <Dialog
      {...props}
      className={["codex-ui-branch-creation-dialog", className]
        .filter(Boolean)
        .join(" ")}
      closeLabel="Close branch creation dialog"
      footer={
        <>
          <Button
            className="codex-ui-branch-creation-dialog__cancel"
            disabled={creating}
            onClick={() => onOpenChange(false)}
            size="medium"
            tone="secondary"
          >
            {closeLabel}
          </Button>
          <Button
            className="codex-ui-branch-creation-dialog__submit"
            disabled={!normalizedBranchName}
            form={formId}
            loading={creating}
            loadingLabel="Creating and checking out branch"
            size="medium"
            tone="primary"
            type="submit"
          >
            {createLabel}
          </Button>
        </>
      }
      initialFocusSelector=".codex-ui-branch-creation-dialog__input"
      onOpenChange={onOpenChange}
      open={open}
      returnFocusRef={returnFocusRef}
      size="compact"
      title={title}
    >
      <form
        className="codex-ui-branch-creation-dialog__form"
        id={formId}
        onSubmit={submit}
      >
        <div className="codex-ui-branch-creation-dialog__label-row">
          <label htmlFor={`${formId}-name`}>{branchNameLabel}</label>
          {onSetPrefix ? (
            <button
              className="codex-ui-branch-creation-dialog__prefix"
              disabled={creating}
              onClick={onSetPrefix}
              type="button"
            >
              {setPrefixLabel}
            </button>
          ) : null}
        </div>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={branchNameLabel}
          className="codex-ui-branch-creation-dialog__input"
          disabled={creating}
          id={`${formId}-name`}
          onChange={(event) => onBranchNameChange(event.currentTarget.value)}
          placeholder={placeholder}
          spellCheck={false}
          type="text"
          value={branchName}
        />
        {error ? (
          <p
            className="codex-ui-branch-creation-dialog__error"
            id={errorId}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
