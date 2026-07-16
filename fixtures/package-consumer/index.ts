import {
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  CodeBlock,
  type CodeHighlighter,
  FileChange,
  ProposedPlan,
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
void AgentPlan;
void AgentReasoning;
void CodeBlock;
void ProposedPlan;
void highlighter;
void line;
