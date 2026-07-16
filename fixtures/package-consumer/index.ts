import {
  AgentMarkdown,
  CodeBlock,
  type CodeHighlighter,
  FileChange,
  type FileDiffLine,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";
import "codex-ui-kit/tokens.css";

const line: FileDiffLine = {
  content: "package contract",
  kind: "context",
};
const highlighter: CodeHighlighter = (code) => ({ code, html: code });

void FileChange;
void AgentMarkdown;
void CodeBlock;
void highlighter;
void line;
