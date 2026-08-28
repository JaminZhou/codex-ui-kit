import {
  Children,
  Component,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog } from "./Dialog.js";
import {
  ImagePreviewDialog,
  type GeneratedImageItem,
} from "./ResourceSurfaces.js";

interface MarkdownMathRuntime {
  rehypeKatex: (typeof import("rehype-katex"))["default"];
  remarkMath: (typeof import("remark-math"))["default"];
}

let loadedMarkdownMathRuntime: MarkdownMathRuntime | undefined;
let markdownMathRuntimePromise: Promise<MarkdownMathRuntime> | undefined;

function loadMarkdownMathRuntime() {
  markdownMathRuntimePromise ??= Promise.all([
    import("rehype-katex"),
    import("remark-math"),
  ]).then(([rehypeModule, remarkModule]) => {
    const runtime = {
      rehypeKatex: rehypeModule.default,
      remarkMath: remarkModule.default,
    };
    loadedMarkdownMathRuntime = runtime;
    return runtime;
  });
  return markdownMathRuntimePromise;
}

export type CodeCopyHandler = (code: string) => void | Promise<void>;

export interface MarkdownTableCopyPayload {
  html: string;
  markdown: string;
}

export type MarkdownTableCopyHandler = (
  payload: MarkdownTableCopyPayload,
) => void | Promise<void>;

interface MarkdownSourcePosition {
  end: {
    line: number;
    offset?: number;
  };
  start: {
    line: number;
    offset?: number;
  };
}

interface MarkdownSourceNode {
  children?: unknown[];
  position?: MarkdownSourcePosition;
  tagName?: string;
}

interface MarkdownSourceSnapshot {
  lineStarts: number[];
  source: string;
}

function markdownSourceNode(value: unknown): MarkdownSourceNode | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as MarkdownSourceNode;
}

function collectMarkdownTableRows(
  value: unknown,
  rows: Map<number, { end: number; start: number }>,
) {
  const node = markdownSourceNode(value);
  if (!node) return;

  const start = node.position?.start;
  const end = node.position?.end;
  if (
    node.tagName === "tr" &&
    typeof start?.line === "number" &&
    typeof start.offset === "number" &&
    typeof end?.offset === "number"
  ) {
    rows.set(start.line, { end: end.offset, start: start.offset });
  }

  for (const child of node.children ?? []) {
    collectMarkdownTableRows(child, rows);
  }
}

function createMarkdownSourceSnapshot(source: string): MarkdownSourceSnapshot {
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") lineStarts.push(index + 1);
  }
  return { lineStarts, source };
}

function markdownLineBounds(snapshot: MarkdownSourceSnapshot, line: number) {
  const start = snapshot.lineStarts[line - 1];
  if (start === undefined) return undefined;

  const nextLine = snapshot.lineStarts[line];
  let end = nextLine === undefined ? snapshot.source.length : nextLine - 1;
  if (end > start && snapshot.source[end - 1] === "\r") end -= 1;
  return { end, start };
}

const markdownTableDelimiterPattern =
  /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

function standaloneMarkdownTableDelimiter(line: string) {
  for (let index = 0; index < line.length; index += 1) {
    const candidate = line.slice(index);
    if (!markdownTableDelimiterPattern.test(candidate)) continue;
    const indentation = candidate.match(/^[ \t]*/)?.[0].length ?? 0;
    return line.slice(index + indentation);
  }
  return undefined;
}

function extractMarkdownTableSource(
  snapshot: MarkdownSourceSnapshot,
  value: unknown,
) {
  const { source } = snapshot;
  const node = markdownSourceNode(value);
  const start = node?.position?.start;
  const end = node?.position?.end;
  if (
    typeof start?.line !== "number" ||
    typeof start.offset !== "number" ||
    typeof end?.line !== "number" ||
    typeof end.offset !== "number"
  ) {
    return "";
  }

  const rows = new Map<number, { end: number; start: number }>();
  collectMarkdownTableRows(node, rows);
  const lines: string[] = [];

  for (let line = start.line; line <= end.line; line += 1) {
    const row = rows.get(line);
    if (row) {
      lines.push(source.slice(row.start, row.end));
      continue;
    }

    const bounds = markdownLineBounds(snapshot, line);
    if (!bounds) return source.slice(start.offset, end.offset);
    const lineEnd =
      line === end.line ? Math.min(bounds.end, end.offset) : bounds.end;
    const delimiter = standaloneMarkdownTableDelimiter(
      source.slice(bounds.start, lineEnd),
    );
    if (delimiter === undefined) return source.slice(start.offset, end.offset);
    lines.push(delimiter);
  }

  return lines.join("\n");
}

export interface CodeHighlightResult {
  code: string;
  html: string;
  language?: string;
}

export type CodeHighlighter = (
  code: string,
  language?: string,
) => CodeHighlightResult | Promise<CodeHighlightResult>;

const codeHighlightIntervalMs = 120;
let defaultCodeHighlighter: Promise<CodeHighlighter> | undefined;

function getCodeHighlightClock() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function loadDefaultCodeHighlighter() {
  defaultCodeHighlighter ??= import("../highlightCode.js").then(
    ({ highlightCode }) => highlightCode,
  );
  return defaultCodeHighlighter;
}

export interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function InlineCode({ children, className, ...props }: InlineCodeProps) {
  const classes = ["codex-ui-inline-code", className]
    .filter(Boolean)
    .join(" ");

  return (
    <code className={classes} {...props}>
      {children}
    </code>
  );
}

export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onCopy"> {
  children: string;
  codeHighlighter?: CodeHighlighter | false;
  copiedLabel?: ReactNode;
  copyLabel?: ReactNode;
  copyable?: boolean;
  deferHighlightUntilVisible?: boolean;
  language?: string;
  label?: ReactNode;
  onCopy?: CodeCopyHandler;
  onWrapChange?: (wrap: boolean) => void;
  wrap?: boolean;
  wrapToggleable?: boolean;
}

function CodeCopyIcon({ copied = false }: { copied?: boolean }) {
  return copied ? (
    <svg
      aria-hidden="true"
      className="codex-ui-code-block__copy-icon"
      viewBox="0 0 16 16"
    >
      <path d="m3.5 8.25 2.75 2.75 6.25-6.25" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="codex-ui-code-block__copy-icon"
      viewBox="0 0 16 16"
    >
      <rect height="8.5" rx="1.5" width="8.5" x="5" y="2.5" />
      <path d="M10.5 11v1A1.5 1.5 0 0 1 9 13.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5h1" />
    </svg>
  );
}

function CodeWrapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-code-block__wrap-icon"
      viewBox="0 0 20 20"
    >
      <path d="M14.375 9.502a3.165 3.165 0 0 1 0 6.33h-2.77l.949.948a.666.666 0 0 1-.942.94L9.53 15.639a.667.667 0 0 1 0-.942l2.083-2.083a.666.666 0 0 1 .942.94l-.949.949h2.77a1.836 1.836 0 0 0 0-3.67H3.333a.666.666 0 0 1 0-1.33h11.042Zm-7.709 5a.665.665 0 1 1 0 1.33H3.333a.666.666 0 0 1 0-1.33h3.333Zm10-10a.665.665 0 1 1 0 1.33H3.333a.666.666 0 0 1 0-1.33h13.333Z" />
    </svg>
  );
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
}

async function copyMarkdownTable(payload: MarkdownTableCopyPayload) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;

  if (
    navigator.clipboard.write &&
    typeof ClipboardItem !== "undefined" &&
    typeof Blob !== "undefined"
  ) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([payload.html], { type: "text/html" }),
        "text/plain": new Blob([payload.markdown], { type: "text/plain" }),
      }),
    ]);
    return true;
  }

  if (!navigator.clipboard.writeText) return false;
  await navigator.clipboard.writeText(payload.markdown);
  return true;
}

function MarkdownTableExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4.33496 11C4.33496 10.6327 4.63273 10.335 5 10.335C5.36727 10.335 5.66504 10.6327 5.66504 11V14.335H9L9.13379 14.3486C9.43692 14.4106 9.66504 14.6786 9.66504 15C9.66504 15.3214 9.43692 15.5894 9.13379 15.6514L9 15.665H5C4.63273 15.665 4.33496 15.3673 4.33496 15V11ZM14.335 9V5.66504H11C10.6327 5.66504 10.335 5.36727 10.335 5C10.335 4.63273 10.6327 4.33496 11 4.33496H15L15.1338 4.34863C15.4369 4.41057 15.665 4.67857 15.665 5V9C15.665 9.36727 15.3673 9.66504 15 9.66504C14.6327 9.66504 14.335 9.36727 14.335 9Z" />
    </svg>
  );
}

function MarkdownTableCopyIcon({ copied = false }: { copied?: boolean }) {
  return copied ? (
    <svg aria-hidden="true" viewBox="0 0 17 17">
      <path d="M12.8961 3.64101C13.1297 3.41418 13.4984 3.37523 13.7779 3.56581C14.0571 3.75635 14.1554 4.11331 14.0299 4.41347L13.9615 4.53847L7.71151 13.7045C7.59411 13.8767 7.4063 13.9877 7.19881 14.0072C6.99136 14.0267 6.78564 13.9533 6.63826 13.806L2.88826 10.056L2.79842 9.9457C2.6192 9.67407 2.64927 9.30496 2.88826 9.06581C3.12738 8.82669 3.49647 8.79676 3.76815 8.97597L3.8785 9.06581L7.03084 12.2182L12.8053 3.74941L12.8961 3.64101Z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 21 21">
      <path d="M13.468 11.1216C13.468 10.4107 13.468 9.91717 13.4367 9.53369C13.4137 9.25191 13.3758 9.0622 13.3244 8.91846L13.2687 8.78858C13.1148 8.48652 12.8803 8.23344 12.593 8.05713L12.466 7.98584C12.308 7.90546 12.0963 7.84854 11.7209 7.81787C11.3374 7.78656 10.8439 7.78662 10.133 7.78662H7.29999C6.58895 7.78662 6.09562 7.78654 5.7121 7.81787C5.43015 7.84091 5.24064 7.87872 5.09686 7.93018L4.96698 7.98584C4.66487 8.13977 4.41184 8.37419 4.23554 8.66162L4.16522 8.78858C4.08477 8.94657 4.02794 9.15811 3.99725 9.53369C3.96594 9.91718 3.96503 10.4107 3.96503 11.1216V13.9546C3.96503 14.6656 3.96592 15.159 3.99725 15.5425C4.02796 15.9182 4.08471 16.1296 4.16522 16.2876L4.23554 16.4136C4.41185 16.7012 4.66472 16.9353 4.96698 17.0894L5.09686 17.146C5.24061 17.1974 5.43024 17.2343 5.7121 17.2573C6.09562 17.2887 6.58895 17.2896 7.29999 17.2896H10.133C10.8439 17.2896 11.3374 17.2886 11.7209 17.2573C12.0965 17.2266 12.308 17.1698 12.466 17.0894L12.593 17.019C12.8804 16.8427 13.1148 16.5897 13.2687 16.2876L13.3244 16.1577C13.3759 16.0139 13.4137 15.8244 13.4367 15.5425C13.468 15.159 13.468 14.6656 13.468 13.9546V11.1216ZM14.798 13.1196C15.2528 13.118 15.6011 13.1147 15.8879 13.0913C16.2634 13.0606 16.475 13.0038 16.633 12.9233L16.759 12.8521C17.0466 12.6757 17.2808 12.4228 17.4348 12.1206L17.4914 11.9907C17.5428 11.847 17.5797 11.6572 17.6027 11.3755C17.634 10.992 17.6349 10.4985 17.6349 9.7876V6.95459C17.6349 6.24355 17.6341 5.75022 17.6027 5.3667C17.5797 5.08484 17.5428 4.89522 17.4914 4.75147L17.4348 4.62158C17.2807 4.31933 17.0466 4.06645 16.759 3.89014L16.633 3.81982C16.475 3.73932 16.2636 3.68256 15.8879 3.65186C15.5044 3.62052 15.011 3.61963 14.3 3.61963H11.467C10.7561 3.61963 10.2626 3.62054 9.87909 3.65186C9.59738 3.67487 9.40759 3.71179 9.26386 3.76318L9.13397 3.81982C8.83175 3.97382 8.57885 4.20802 8.40253 4.49561L8.33124 4.62158C8.25079 4.77957 8.19396 4.99114 8.16327 5.3667C8.13984 5.65352 8.13561 6.00178 8.13397 6.45654H10.133C10.822 6.45654 11.3791 6.4559 11.8293 6.49268C12.2873 6.5301 12.6937 6.6093 13.0705 6.80127L13.2883 6.92334C13.7839 7.22739 14.1878 7.66313 14.4533 8.18408L14.5197 8.32666C14.6642 8.66318 14.7291 9.02433 14.7619 9.42529C14.7987 9.8755 14.798 10.4326 14.798 11.1216V13.1196ZM18.965 9.7876C18.965 10.4766 18.9657 11.0337 18.9289 11.4839C18.8961 11.8848 18.8311 12.246 18.6867 12.5825L18.6203 12.7251C18.3548 13.246 17.9509 13.6818 17.4553 13.9858L17.2365 14.1079C16.8599 14.2998 16.4541 14.3791 15.9963 14.4165C15.6592 14.444 15.2624 14.4481 14.7951 14.4497C14.7935 14.917 14.7894 15.3138 14.7619 15.6509C14.7292 16.0516 14.664 16.4122 14.5197 16.7485L14.4533 16.8911C14.1878 17.4122 13.7841 17.8487 13.2883 18.1528L13.0705 18.2749C12.6937 18.4669 12.2873 18.5461 11.8293 18.5835C11.3791 18.6203 10.822 18.6196 10.133 18.6196H7.29999C6.6109 18.6196 6.05394 18.6203 5.6037 18.5835C5.20305 18.5508 4.84233 18.4855 4.50604 18.3413L4.36347 18.2749C3.84243 18.0094 3.40584 17.6056 3.10175 17.1099L2.97968 16.8911C2.78787 16.5145 2.70849 16.1087 2.67108 15.6509C2.6343 15.2006 2.63495 14.6437 2.63495 13.9546V11.1216C2.63495 10.4326 2.63431 9.8755 2.67108 9.42529C2.7085 8.96729 2.78771 8.56084 2.97968 8.18408L3.10175 7.96631C3.40585 7.47049 3.84235 7.06679 4.36347 6.80127L4.50604 6.73486C4.84236 6.59059 5.20302 6.52542 5.6037 6.49268C5.9405 6.46516 6.33707 6.4601 6.80389 6.4585C6.8055 5.99167 6.81056 5.5951 6.83807 5.2583C6.87549 4.80047 6.95482 4.39471 7.14667 4.01807L7.26874 3.79932C7.5728 3.30371 8.00855 2.89973 8.52948 2.63428L8.67206 2.56787C9.00854 2.42345 9.36978 2.35844 9.77069 2.32568C10.2209 2.28891 10.778 2.28955 11.467 2.28955H14.3C14.9891 2.28955 15.546 2.2889 15.9963 2.32568C16.4541 2.3631 16.8599 2.44247 17.2365 2.63428L17.4553 2.75635C17.951 3.06044 18.3548 3.49703 18.6203 4.01807L18.6867 4.16065C18.8309 4.49694 18.8962 4.85765 18.9289 5.2583C18.9657 5.70854 18.965 6.2655 18.965 6.95459V9.7876Z" />
    </svg>
  );
}

function MarkdownTableCloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path
        d="M14.6549 5.57307C14.9283 5.2997 15.3718 5.2997 15.6451 5.57307C15.9185 5.84643 15.9185 6.28993 15.6451 6.5633L11.3903 10.8182L15.6451 15.0731L15.735 15.1834C15.9141 15.4551 15.8842 15.8242 15.6451 16.0633C15.4061 16.3024 15.0369 16.3322 14.7653 16.1531L14.6549 16.0633L10.4 11.8084L6.14515 16.0633C5.87178 16.3367 5.42828 16.3367 5.15492 16.0633C4.88155 15.7899 4.88155 15.3464 5.15492 15.0731L9.4098 10.8182L5.15492 6.5633L5.06507 6.45295C4.88597 6.18128 4.91584 5.81214 5.15492 5.57307C5.39399 5.33399 5.76313 5.30413 6.0348 5.48322L6.14515 5.57307L10.4 9.82795L14.6549 5.57307Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface MarkdownTableProps
  extends Omit<TableHTMLAttributes<HTMLTableElement>, "children"> {
  allowWideTables: boolean;
  children: ReactNode;
  copyable: boolean;
  markdownSource: string;
  onTableCopy?: MarkdownTableCopyHandler;
}

function MarkdownTable({
  allowWideTables,
  children,
  copyable,
  markdownSource,
  onTableCopy,
  ...tableProps
}: MarkdownTableProps) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    const payload = {
      html: tableRef.current?.outerHTML ?? "",
      markdown: markdownSource,
    };
    try {
      if (onTableCopy) await onTableCopy(payload);
      else if (!(await copyMarkdownTable(payload))) return;
      setCopied(true);
      if (resetTimer.current !== undefined) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2_000);
    } catch {
      // A denied Clipboard write leaves the control in its ready state.
    }
  };

  const table = (preview = false) => (
    <table
      {...tableProps}
      className={
        [tableProps.className, preview && "codex-ui-markdown-table-preview__table"]
          .filter(Boolean)
          .join(" ") || undefined
      }
      ref={preview ? undefined : tableRef}
    >
      {children}
    </table>
  );

  return (
    <>
      <div
        className="codex-ui-markdown__table-container"
        data-markdown-table=""
        data-wide-block={allowWideTables || undefined}
        tabIndex={-1}
      >
        <div className="codex-ui-markdown__table-scroll" tabIndex={0}>
          <div className="codex-ui-markdown__table-margin">{table()}</div>
        </div>
        {copyable || allowWideTables ? (
          <div
            className="codex-ui-markdown__table-actions"
            data-markdown-copy="exclude"
          >
            {allowWideTables ? (
              <button
                aria-expanded={previewOpen}
                aria-haspopup="dialog"
                aria-label="Expand table"
                onClick={() => setPreviewOpen(true)}
                ref={expandButtonRef}
                type="button"
              >
                <MarkdownTableExpandIcon />
              </button>
            ) : null}
            {copyable ? (
              <button
                aria-label={copied ? "Copied" : "Copy table"}
                data-copied={copied || undefined}
                onClick={() => void handleCopy()}
                type="button"
              >
                <MarkdownTableCopyIcon copied={copied} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {allowWideTables ? (
        <Dialog
          className="codex-ui-markdown-table-preview"
          closeIcon={<MarkdownTableCloseIcon />}
          closeLabel="Close table preview"
          initialFocusSelector='.codex-ui-dialog__close'
          onOpenChange={setPreviewOpen}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
          open={previewOpen}
          returnFocusRef={expandButtonRef}
          title="Table preview"
        >
          <div
            className="codex-ui-markdown codex-ui-markdown-table-preview__surface"
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
              }
              event.currentTarget.scrollLeft +=
                event.key === "ArrowRight" ? 40 : -40;
              event.preventDefault();
            }}
            tabIndex={0}
          >
            {table(true)}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function CodeBlock({
  children,
  className,
  codeHighlighter,
  copiedLabel = <CodeCopyIcon copied />,
  copyLabel = <CodeCopyIcon />,
  copyable = true,
  deferHighlightUntilVisible = true,
  language,
  label,
  onCopy,
  onWrapChange,
  wrap = false,
  wrapToggleable = false,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(wrap);
  const [canHighlight, setCanHighlight] = useState(
    !deferHighlightUntilVisible,
  );
  const [highlighted, setHighlighted] = useState<{
    requestedLanguage?: string;
    result: CodeHighlightResult;
    source?: CodeHighlighter;
  }>();
  const containerRef = useRef<HTMLElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const classes = ["codex-ui-code-block", className]
    .filter(Boolean)
    .join(" ");
  const normalizedCode = children.replace(/\n$/, "");
  const resolvedLabel = label ?? language ?? "text";
  const accessibleCopyLabel = copied
    ? typeof copiedLabel === "string"
      ? copiedLabel
      : "Copied"
    : typeof copyLabel === "string"
      ? copyLabel
      : "Copy code";
  const resolvedWrap = wrapToggleable ? wrapped : wrap;
  const highlightRequest = useRef({
    disposed: false,
    lastStartedAtMs: null as number | null,
    latestCode: normalizedCode,
    latestHighlighter: codeHighlighter,
    latestLanguage: language,
    timeoutHandle: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  highlightRequest.current.latestCode = normalizedCode;
  highlightRequest.current.latestHighlighter = codeHighlighter;
  highlightRequest.current.latestLanguage = language;

  useEffect(() => {
    if (canHighlight || !deferHighlightUntilVisible) {
      if (!canHighlight) setCanHighlight(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = setTimeout(() => setCanHighlight(true), 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCanHighlight(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [canHighlight, deferHighlightUntilVisible]);

  useEffect(() => {
    const request = highlightRequest.current;
    request.disposed = false;

    return () => {
      request.disposed = true;
      if (request.timeoutHandle !== undefined) {
        clearTimeout(request.timeoutHandle);
        request.timeoutHandle = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const request = highlightRequest.current;
    if (
      !canHighlight ||
      request.latestHighlighter === false ||
      request.timeoutHandle !== undefined
    ) {
      return;
    }

    const now = getCodeHighlightClock();
    const timeSinceLastStart =
      request.lastStartedAtMs === null
        ? codeHighlightIntervalMs
        : now - request.lastStartedAtMs;
    const delay = Math.max(0, codeHighlightIntervalMs - timeSinceLastStart);
    const startHighlighting = () => {
      request.timeoutHandle = undefined;
      if (request.disposed) return;

      const code = request.latestCode;
      const requestedLanguage = request.latestLanguage;
      const selectedHighlighter = request.latestHighlighter;
      if (selectedHighlighter === false) return;
      request.lastStartedAtMs = getCodeHighlightClock();

      const highlightPromise =
        selectedHighlighter === undefined
          ? loadDefaultCodeHighlighter().then((highlighter) =>
              highlighter(code, requestedLanguage),
            )
          : Promise.resolve().then(() =>
              selectedHighlighter(code, requestedLanguage),
            );

      void highlightPromise
        .then((result) => {
          if (
            request.disposed ||
            result.code !== code ||
            request.latestHighlighter !== selectedHighlighter ||
            request.latestLanguage !== requestedLanguage
          ) {
            return;
          }
          setHighlighted({
            requestedLanguage,
            result,
            source: selectedHighlighter,
          });
        })
        .catch(() => undefined);
    };

    if (delay === 0) {
      startHighlighting();
      return;
    }

    request.timeoutHandle = setTimeout(startHighlighting, delay);
  }, [canHighlight, codeHighlighter, language, normalizedCode]);

  const compatibleHighlight =
    codeHighlighter !== false &&
    highlighted !== undefined &&
    highlighted.source === codeHighlighter &&
    highlighted.requestedLanguage === language &&
    normalizedCode.startsWith(highlighted.result.code)
      ? highlighted.result
      : undefined;
  const unhighlightedSuffix = compatibleHighlight
    ? normalizedCode.slice(compatibleHighlight.code.length)
    : normalizedCode;

  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    setWrapped(wrap);
  }, [wrap]);

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy(normalizedCode);
      } else {
        const copiedToClipboard = await copyText(normalizedCode);
        if (!copiedToClipboard) return;
      }
    } catch {
      return;
    }

    setCopied(true);
    if (resetTimer.current !== undefined) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => setCopied(false), 2_000);
  };

  const handleWrapChange = () => {
    const next = !resolvedWrap;
    setWrapped(next);
    onWrapChange?.(next);
  };

  return (
    <figure
      ref={containerRef}
      className={classes}
      data-language={language}
      data-markdown-copy="code-block"
      data-markdown-copy-text={normalizedCode}
      data-wrap={resolvedWrap || undefined}
      {...props}
    >
      <figcaption className="codex-ui-code-block__header">
        <span className="codex-ui-code-block__language">{resolvedLabel}</span>
        {copyable || wrapToggleable ? (
          <span className="codex-ui-code-block__actions">
            {wrapToggleable ? (
              <button
                aria-label={
                  resolvedWrap ? "Disable word wrap" : "Enable word wrap"
                }
                aria-pressed={resolvedWrap}
                className="codex-ui-code-block__wrap"
                onClick={handleWrapChange}
                type="button"
              >
                <CodeWrapIcon />
              </button>
            ) : null}
            {copyable ? (
              <button
                aria-label={accessibleCopyLabel}
                className="codex-ui-code-block__copy"
                data-copied={copied || undefined}
                onClick={() => void handleCopy()}
                type="button"
              >
                {copied ? copiedLabel : copyLabel}
              </button>
            ) : null}
          </span>
        ) : null}
      </figcaption>
      <pre className="codex-ui-code-block__body" dir="ltr" tabIndex={0}>
        <code
          className={[
            compatibleHighlight ? "hljs" : undefined,
            language ? `language-${language}` : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          data-highlight-language={compatibleHighlight?.language}
          data-highlighted={compatibleHighlight ? true : undefined}
        >
          {compatibleHighlight ? (
            <span
              className="codex-ui-code-block__highlight"
              dangerouslySetInnerHTML={{ __html: compatibleHighlight.html }}
            />
          ) : null}
          {unhighlightedSuffix}
        </code>
      </pre>
    </figure>
  );
}

function hasIncompleteInlineLink(source: string) {
  const line = source.slice(source.lastIndexOf("\n") + 1);
  const lastDestinationEnd = line.lastIndexOf(")");
  let labelStart = -1;

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "[") {
      labelStart = index;
      continue;
    }

    if (line[index] !== "]" || labelStart === -1) continue;
    if (line[index + 1] !== "(") {
      labelStart = -1;
      continue;
    }

    if (lastDestinationEnd < index + 2) return true;

    labelStart = -1;
  }

  return false;
}

export function stabilizeStreamingMarkdown(source: string) {
  let stabilized = source;
  let openFence: { marker: "`" | "~"; length: number } | undefined;

  for (const line of stabilized.split("\n")) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence) continue;

    const marker = fence[1][0] as "`" | "~";
    const length = fence[1].length;
    const suffix = fence[2];

    if (!openFence) {
      openFence = { marker, length };
    } else if (
      marker === openFence.marker &&
      length >= openFence.length &&
      suffix.trim() === ""
    ) {
      openFence = undefined;
    }
  }

  if (openFence) {
    const closingFence = openFence.marker.repeat(openFence.length);
    stabilized += stabilized.endsWith("\n")
      ? closingFence
      : `\n${closingFence}`;
  }

  if (hasIncompleteInlineLink(stabilized)) {
    stabilized += ")";
  }

  return stabilized;
}

export type MarkdownImageStatus =
  | "auto"
  | "loading"
  | "ready"
  | "unavailable";

export type MarkdownImageStatusResolver = (
  source: string,
  alt: string,
) => MarkdownImageStatus;

export interface MarkdownImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "children"> {
  allowWide?: boolean;
  loadingLabel?: string;
  preview?: boolean;
  previewLabel?: string;
  status?: MarkdownImageStatus;
  unavailableLabel?: string;
}

function MarkdownImageFallbackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-markdown-image__fallback-icon"
      fill="none"
      viewBox="0 0 20 21"
    >
      <path
        d="M16.0012 7.78796C16.0012 7.07693 16.0013 6.58359 15.97 6.20007C15.9469 5.91812 15.9091 5.72861 15.8577 5.58484L15.802 5.45496C15.6481 5.15285 15.4137 4.89982 15.1262 4.72351L14.9993 4.6532C14.8413 4.57274 14.6297 4.51592 14.2542 4.48523C13.8707 4.45391 13.3771 4.453 12.6663 4.453H7.33325C6.62221 4.453 6.12888 4.4539 5.74536 4.48523C5.46351 4.50826 5.27388 4.54512 5.13013 4.59656L5.00024 4.6532C4.69799 4.80722 4.44511 5.04134 4.2688 5.32898L4.19849 5.45496C4.11798 5.61296 4.06122 5.82437 4.03052 6.20007C3.99918 6.58359 3.99829 7.07693 3.99829 7.78796V12.1815L5.01782 11.1629L5.19458 11.0028C6.1104 10.2557 7.46195 10.3092 8.31567 11.1629L13.6038 16.451C13.8548 16.4469 14.0675 16.4399 14.2542 16.4247C14.6295 16.394 14.8413 16.3371 14.9993 16.2567L15.1262 16.1854C15.4136 16.0091 15.6481 15.756 15.802 15.454L15.8577 15.3241C15.9091 15.1803 15.9469 14.9906 15.97 14.7088C16.0013 14.3254 16.0012 13.8318 16.0012 13.121V7.78796ZM7.37525 12.1034C7.00846 11.7366 6.42786 11.714 6.03442 12.035L5.95825 12.1034L4.0022 14.0594C4.00634 14.3101 4.0153 14.5224 4.03052 14.7088C4.0612 15.0844 4.11803 15.296 4.19849 15.454L4.2688 15.5809C4.44511 15.8683 4.69813 16.1028 5.00024 16.2567L5.13013 16.3124C5.2739 16.3638 5.46341 16.4016 5.74536 16.4247C6.12888 16.456 6.62222 16.4559 7.33325 16.4559H11.7268L7.37525 12.1034ZM13.0852 8.37097C13.085 7.81792 12.6363 7.37 12.0833 7.37C11.5302 7.37 11.0815 7.81792 11.0813 8.37097C11.0813 8.92418 11.53 9.37293 12.0833 9.37293C12.6365 9.37293 13.0852 8.92418 13.0852 8.37097ZM17.3313 13.121C17.3313 13.81 17.3319 14.367 17.2952 14.8172C17.2624 15.2182 17.1974 15.5794 17.053 15.9159L16.9866 16.0585C16.7211 16.5794 16.3172 17.0151 15.8215 17.3192L15.6038 17.4413C15.227 17.6332 14.8206 17.7124 14.3625 17.7499C13.9123 17.7866 13.3553 17.786 12.6663 17.786H7.33325C6.64416 17.786 6.0872 17.7866 5.63696 17.7499C5.23628 17.7171 4.87563 17.6519 4.53931 17.5077L4.39673 17.4413C3.87561 17.1757 3.43911 16.772 3.13501 16.2762L3.01294 16.0585C2.82097 15.6817 2.74177 15.2752 2.70435 14.8172C2.66758 14.367 2.66821 13.8099 2.66821 13.121V7.78796C2.66821 7.09887 2.66756 6.54192 2.70435 6.09168C2.74176 5.63388 2.82113 5.22806 3.01294 4.85144L3.13501 4.63269C3.4391 4.13698 3.87569 3.73313 4.39673 3.46765L4.53931 3.40125C4.8756 3.25701 5.23632 3.1918 5.63696 3.15906C6.0872 3.12227 6.64416 3.12293 7.33325 3.12293H12.6663C13.3553 3.12293 13.9123 3.12229 14.3625 3.15906C14.8206 3.19648 15.227 3.27568 15.6038 3.46765L15.8215 3.58972C16.3174 3.89382 16.7211 4.33032 16.9866 4.85144L17.053 4.99402C17.1973 5.33034 17.2624 5.69099 17.2952 6.09168C17.332 6.54192 17.3313 7.09887 17.3313 7.78796V13.121Z"
        fill="currentColor"
      />
    </svg>
  );
}

function publicMarkdownImageHref(source: string | undefined) {
  if (!source) return undefined;
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:"
      ? source
      : undefined;
  } catch {
    return undefined;
  }
}

export function MarkdownImage({
  allowWide = false,
  alt = "",
  className,
  loadingLabel = "Image loading",
  onError,
  preview = true,
  previewLabel = "Open image preview",
  src,
  status = "auto",
  title,
  unavailableLabel = "Image unavailable",
  ...imageProps
}: MarkdownImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFailedSource(undefined);
    setOpen(false);
  }, [src]);

  if (!src) return null;
  const resolvedStatus =
    status === "auto"
      ? failedSource === src
        ? "unavailable"
        : "ready"
      : status;
  const stateLabel = alt ||
    (resolvedStatus === "loading" ? loadingLabel : unavailableLabel);
  const fallbackHref = publicMarkdownImageHref(src);
  const fallbackContents =
    resolvedStatus === "loading" ? (
      <span aria-hidden="true" className="codex-ui-markdown-image__spinner" />
    ) : (
      <MarkdownImageFallbackIcon />
    );

  if (resolvedStatus === "loading" || resolvedStatus === "unavailable") {
    const fallbackClassName = [
      "codex-ui-markdown-image__fallback",
      allowWide && "codex-ui-markdown-image__fallback--wide",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return resolvedStatus === "unavailable" && fallbackHref ? (
      <a
        aria-label={stateLabel}
        className={fallbackClassName}
        data-markdown-image-state={resolvedStatus}
        href={fallbackHref}
        title={title}
      >
        {fallbackContents}
      </a>
    ) : (
      <button
        aria-label={stateLabel}
        className={fallbackClassName}
        data-markdown-image-state={resolvedStatus}
        disabled
        title={title}
        type="button"
      >
        {fallbackContents}
      </button>
    );
  }

  const image: GeneratedImageItem = {
    alt,
    height:
      typeof imageProps.height === "number" ? imageProps.height : undefined,
    id: src,
    src,
    width: typeof imageProps.width === "number" ? imageProps.width : undefined,
  };
  const triggerLabel = alt || previewLabel;

  return (
    <>
      <button
        aria-label={triggerLabel}
        className={[
          "codex-ui-markdown-image__trigger",
          allowWide && "codex-ui-markdown-image__trigger--wide",
        ]
          .filter(Boolean)
          .join(" ")}
        data-markdown-image-preview-trigger="true"
        onClick={() => preview && setOpen(true)}
        type="button"
      >
        <img
          {...imageProps}
          alt={alt}
          className={["codex-ui-markdown-image", className]
            .filter(Boolean)
            .join(" ")}
          loading="lazy"
          onError={(event) => {
            setFailedSource(src);
            onError?.(event);
          }}
          src={src}
          title={title}
        />
      </button>
      {preview ? (
        <ImagePreviewDialog
          imageId={src}
          images={[image]}
          onOpenChange={setOpen}
          open={open}
          presentation="immersive"
          title={triggerLabel}
        />
      ) : null}
    </>
  );
}

function onlyMarkdownImages(children: ReactNode, imageComponent: unknown) {
  const nodes = Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
  if (
    nodes.length === 0 ||
    nodes.some(
      (child) => !isValidElement(child) || child.type !== imageComponent,
    )
  ) {
    return undefined;
  }
  return nodes;
}

interface RemarkPositionedNode {
  children?: RemarkPositionedNode[];
  position?: {
    end?: { offset?: number };
    start?: { offset?: number };
  };
  type?: string;
}

function remarkPreserveUnsupportedFootnotes() {
  return (tree: RemarkPositionedNode, file: { value?: unknown }) => {
    const source = typeof file.value === "string" ? file.value : "";
    const visit = (node: RemarkPositionedNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        const start = child.position?.start?.offset;
        const end = child.position?.end?.offset;
        if (
          (child.type === "footnoteReference" ||
            child.type === "footnoteDefinition") &&
          typeof start === "number" &&
          typeof end === "number"
        ) {
          const value = source.slice(start, end);
          return child.type === "footnoteDefinition"
            ? {
                children: [{ type: "text", value } as RemarkPositionedNode],
                type: "paragraph",
              }
            : ({ type: "text", value } as RemarkPositionedNode);
        }
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}

interface MarkdownRenderBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  resetKey: string;
  retryLabel: ReactNode;
  title: ReactNode;
}

interface MarkdownRenderBoundaryState {
  failed: boolean;
}

class MarkdownRenderBoundary extends Component<
  MarkdownRenderBoundaryProps,
  MarkdownRenderBoundaryState
> {
  state: MarkdownRenderBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps: MarkdownRenderBoundaryProps) {
    if (
      this.state.failed &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="codex-ui-markdown__render-error" role="alert">
        <div className="codex-ui-markdown__render-error-title">
          {this.props.title}
        </div>
        <button
          onClick={() => {
            this.setState({ failed: false });
            this.props.onRetry?.();
          }}
          type="button"
        >
          {this.props.retryLabel}
        </button>
      </div>
    );
  }
}

export interface AgentMarkdownProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  allowWideMedia?: boolean;
  allowWideTables?: boolean;
  children: string;
  codeHighlighter?: CodeHighlighter | false;
  codeBlockCopyable?: boolean;
  codeBlockWrap?: boolean;
  codeBlockWrapToggleable?: boolean;
  components?: Components;
  imageLoadingLabel?: string;
  imagePreview?: boolean;
  imagePreviewLabel?: string;
  imageSourceResolver?: (source: string) => string;
  imageStatus?: MarkdownImageStatus | MarkdownImageStatusResolver;
  imageUnavailableLabel?: string;
  linkTarget?: "_blank" | "_parent" | "_self" | "_top";
  onCopyCode?: CodeCopyHandler;
  onCopyTable?: MarkdownTableCopyHandler;
  onRetryRender?: () => void;
  renderErrorTitle?: ReactNode;
  retryRenderLabel?: ReactNode;
  streaming?: boolean;
  tableCopyable?: boolean;
}

export function AgentMarkdown({
  allowWideMedia = false,
  allowWideTables = false,
  children,
  className,
  codeHighlighter,
  codeBlockCopyable = true,
  codeBlockWrap = false,
  codeBlockWrapToggleable = false,
  components,
  imageLoadingLabel = "Image loading",
  imagePreview = true,
  imagePreviewLabel = "Open image preview",
  imageSourceResolver,
  imageStatus = "auto",
  imageUnavailableLabel = "Image unavailable",
  linkTarget,
  onCopyCode,
  onCopyTable,
  onRetryRender,
  renderErrorTitle = "Markdown couldn't render",
  retryRenderLabel = "Try again",
  streaming = false,
  tableCopyable = true,
  ...props
}: AgentMarkdownProps) {
  const classes = ["codex-ui-markdown", className].filter(Boolean).join(" ");
  const source = streaming ? stabilizeStreamingMarkdown(children) : children;
  const [mathRuntime, setMathRuntime] = useState<MarkdownMathRuntime | undefined>(
    loadedMarkdownMathRuntime,
  );
  const needsMathRuntime = source.includes("$$");
  useEffect(() => {
    if (!needsMathRuntime || mathRuntime) return;
    let current = true;
    void loadMarkdownMathRuntime().then((runtime) => {
      if (current) setMathRuntime(runtime);
    });
    return () => {
      current = false;
    };
  }, [mathRuntime, needsMathRuntime]);
  const onCopyCodeRef = useRef(onCopyCode);
  onCopyCodeRef.current = onCopyCode;
  const hasCodeCopyHandler = onCopyCode !== undefined;
  const onCopyTableRef = useRef(onCopyTable);
  onCopyTableRef.current = onCopyTable;
  const hasTableCopyHandler = onCopyTable !== undefined;
  const sourceSnapshotRef = useRef<MarkdownSourceSnapshot>({
    lineStarts: [0],
    source: "",
  });
  if (sourceSnapshotRef.current.source !== source) {
    sourceSnapshotRef.current = createMarkdownSourceSnapshot(source);
  }
  const markdownComponents = useMemo<Components>(
    () => {
      const handleCodeCopy: CodeCopyHandler | undefined = hasCodeCopyHandler
        ? (code) => onCopyCodeRef.current?.(code)
        : undefined;
      const handleTableCopy: MarkdownTableCopyHandler | undefined =
        hasTableCopyHandler
          ? (payload) => onCopyTableRef.current?.(payload)
          : undefined;
      const MarkdownImageComponent: NonNullable<Components["img"]> = ({
        alt = "",
        node: _node,
        src,
        ...imageProps
      }) => {
        const resolvedStatus =
          typeof imageStatus === "function"
            ? imageStatus(src ?? "", alt)
            : imageStatus;
        const resolvedSource = src && imageSourceResolver
          ? imageSourceResolver(src)
          : src;
        return (
          <MarkdownImage
            allowWide={allowWideMedia}
            alt={alt}
            loadingLabel={imageLoadingLabel}
            preview={imagePreview}
            previewLabel={imagePreviewLabel}
            src={resolvedSource}
            status={resolvedStatus}
            unavailableLabel={imageUnavailableLabel}
            {...imageProps}
          />
        );
      };

      return {
        a({ children: linkChildren, node: _node, ...linkProps }) {
          return (
            <a
              {...linkProps}
              rel={linkTarget === "_blank" ? "noreferrer" : linkProps.rel}
              target={linkTarget}
            >
              {linkChildren}
            </a>
          );
        },
        code({
          children: codeChildren,
          className: codeClassName,
          node: _node,
          ...codeProps
        }) {
          const value = String(codeChildren);
          const language = /language-([^\s]+)/.exec(codeClassName ?? "")?.[1];
          const isBlock = Boolean(language) || value.endsWith("\n");

          if (isBlock) {
            return (
              <CodeBlock
                codeHighlighter={codeHighlighter}
                copyable={codeBlockCopyable}
                language={language}
                onCopy={handleCodeCopy}
                wrap={codeBlockWrap}
                wrapToggleable={codeBlockWrapToggleable}
              >
                {value}
              </CodeBlock>
            );
          }

          return (
            <InlineCode className={codeClassName} {...codeProps}>
              {codeChildren}
            </InlineCode>
          );
        },
        img: MarkdownImageComponent,
        input({
          "aria-label": inputAriaLabel,
          checked,
          node: _node,
          type,
          ...inputProps
        }) {
          return (
            <input
              {...inputProps}
              aria-label={
                inputAriaLabel ??
                (type === "checkbox"
                  ? checked
                    ? "Completed task"
                    : "Incomplete task"
                  : undefined)
              }
              checked={checked}
              type={type}
            />
          );
        },
        pre({ children: preChildren, node: _node, ...preProps }) {
          if (
            isValidElement(preChildren) &&
            preChildren.type === CodeBlock
          ) {
            return preChildren;
          }

          return <pre {...preProps}>{preChildren}</pre>;
        },
        p({ children: paragraphChildren, node: _node, ...paragraphProps }) {
          const images = allowWideMedia
            ? onlyMarkdownImages(paragraphChildren, MarkdownImageComponent)
            : undefined;
          if (images) {
            return (
              <p
                {...paragraphProps}
                className={[
                  "codex-ui-markdown__media-paragraph",
                  images.length > 1 &&
                    "codex-ui-markdown__media-grid-paragraph",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-markdown-image-grid={images.length > 1 || undefined}
              >
                {images}
              </p>
            );
          }
          return <p {...paragraphProps}>{paragraphChildren}</p>;
        },
        table({ children: tableChildren, node, ...tableProps }) {
          const markdownSource = extractMarkdownTableSource(
            sourceSnapshotRef.current,
            node,
          );
          return (
            <MarkdownTable
              allowWideTables={allowWideTables}
              copyable={tableCopyable}
              markdownSource={markdownSource}
              {...tableProps}
              onTableCopy={handleTableCopy}
            >
              {tableChildren}
            </MarkdownTable>
          );
        },
        ...components,
      };
    },
    [
      allowWideMedia,
      allowWideTables,
      codeBlockCopyable,
      codeBlockWrap,
      codeBlockWrapToggleable,
      codeHighlighter,
      components,
      hasCodeCopyHandler,
      hasTableCopyHandler,
      imageLoadingLabel,
      imagePreview,
      imagePreviewLabel,
      imageSourceResolver,
      imageStatus,
      imageUnavailableLabel,
      linkTarget,
      tableCopyable,
    ],
  );
  const rehypePlugins: NonNullable<Options["rehypePlugins"]> = mathRuntime
    ? [
        [
          mathRuntime.rehypeKatex,
          { strict: "ignore", throwOnError: false },
        ],
      ]
    : [];
  const remarkPlugins: NonNullable<Options["remarkPlugins"]> = [
    remarkGfm,
    ...(mathRuntime
      ? [
          [
            mathRuntime.remarkMath,
            { singleDollarTextMath: false },
          ] as NonNullable<Options["remarkPlugins"]>[number],
        ]
      : []),
    remarkPreserveUnsupportedFootnotes,
  ];

  return (
    <div
      className={classes}
      data-streaming={streaming || undefined}
      {...props}
    >
      <MarkdownRenderBoundary
        onRetry={onRetryRender}
        resetKey={source}
        retryLabel={retryRenderLabel}
        title={renderErrorTitle}
      >
        <ReactMarkdown
          components={markdownComponents}
          rehypePlugins={rehypePlugins}
          remarkPlugins={remarkPlugins}
        >
          {source}
        </ReactMarkdown>
      </MarkdownRenderBoundary>
    </div>
  );
}
