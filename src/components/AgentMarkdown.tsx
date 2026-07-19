import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export type CodeCopyHandler = (code: string) => void | Promise<void>;

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
  wrap?: boolean;
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
}

export function CodeBlock({
  children,
  className,
  codeHighlighter,
  copiedLabel = "Copied",
  copyLabel = "Copy code",
  copyable = true,
  deferHighlightUntilVisible = true,
  language,
  label,
  onCopy,
  wrap = false,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
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

  return (
    <figure
      ref={containerRef}
      className={classes}
      data-language={language}
      data-markdown-copy="code-block"
      data-markdown-copy-text={normalizedCode}
      data-wrap={wrap || undefined}
      {...props}
    >
      <figcaption className="codex-ui-code-block__header">
        <span className="codex-ui-code-block__language">{resolvedLabel}</span>
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
      </figcaption>
      <pre className="codex-ui-code-block__body" dir="ltr">
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

export interface AgentMarkdownProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: string;
  codeHighlighter?: CodeHighlighter | false;
  codeBlockCopyable?: boolean;
  codeBlockWrap?: boolean;
  components?: Components;
  linkTarget?: "_blank" | "_parent" | "_self" | "_top";
  onCopyCode?: CodeCopyHandler;
  streaming?: boolean;
}

export function AgentMarkdown({
  children,
  className,
  codeHighlighter,
  codeBlockCopyable = true,
  codeBlockWrap = false,
  components,
  linkTarget,
  onCopyCode,
  streaming = false,
  ...props
}: AgentMarkdownProps) {
  const classes = ["codex-ui-markdown", className].filter(Boolean).join(" ");
  const source = streaming ? stabilizeStreamingMarkdown(children) : children;
  const onCopyCodeRef = useRef(onCopyCode);
  onCopyCodeRef.current = onCopyCode;
  const hasCodeCopyHandler = onCopyCode !== undefined;
  const markdownComponents = useMemo<Components>(
    () => {
      const handleCodeCopy: CodeCopyHandler | undefined = hasCodeCopyHandler
        ? (code) => onCopyCodeRef.current?.(code)
        : undefined;

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
        img({ alt = "", node: _node, ...imageProps }) {
          return <img alt={alt} loading="lazy" {...imageProps} />;
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
        table({ children: tableChildren, node: _node, ...tableProps }) {
          return (
            <div className="codex-ui-markdown__table-scroll" tabIndex={0}>
              <div className="codex-ui-markdown__table-margin">
                <table {...tableProps}>{tableChildren}</table>
              </div>
            </div>
          );
        },
        ...components,
      };
    },
    [
      codeBlockCopyable,
      codeBlockWrap,
      codeHighlighter,
      components,
      hasCodeCopyHandler,
      linkTarget,
    ],
  );

  return (
    <div
      className={classes}
      data-streaming={streaming || undefined}
      {...props}
    >
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
