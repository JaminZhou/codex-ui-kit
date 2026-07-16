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
  copiedLabel?: ReactNode;
  copyLabel?: ReactNode;
  copyable?: boolean;
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
  copiedLabel = "Copied",
  copyLabel = "Copy code",
  copyable = true,
  language,
  label,
  onCopy,
  wrap = false,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const classes = ["codex-ui-code-block", className]
    .filter(Boolean)
    .join(" ");
  const normalizedCode = children.replace(/\n$/, "");
  const resolvedLabel = label ?? language ?? "text";

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
            aria-label={typeof copyLabel === "string" ? copyLabel : "Copy code"}
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
        <code className={language ? `language-${language}` : undefined}>
          {normalizedCode}
        </code>
      </pre>
    </figure>
  );
}

export function stabilizeStreamingMarkdown(source: string) {
  let stabilized = source;
  const fences = stabilized.match(/^\s*```/gm)?.length ?? 0;

  if (fences % 2 === 1) {
    stabilized += stabilized.endsWith("\n") ? "```" : "\n```";
  }

  if (/\[[^\]\n]*\]\([^\)\n]*$/.test(stabilized)) {
    stabilized += ")";
  }

  return stabilized;
}

export interface AgentMarkdownProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: string;
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
        a({ children: linkChildren, ...linkProps }) {
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
        code({ children: codeChildren, className: codeClassName, ...codeProps }) {
          const value = String(codeChildren);
          const language = /language-([^\s]+)/.exec(codeClassName ?? "")?.[1];
          const isBlock = Boolean(language) || value.endsWith("\n");

          if (isBlock) {
            return (
              <CodeBlock
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
        img({ alt = "", ...imageProps }) {
          return <img alt={alt} loading="lazy" {...imageProps} />;
        },
        pre({ children: preChildren }) {
          return isValidElement(preChildren) ? preChildren : <>{preChildren}</>;
        },
        table({ children: tableChildren, ...tableProps }) {
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
