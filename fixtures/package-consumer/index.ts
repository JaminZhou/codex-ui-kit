import {
  ActivityTimeline,
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  CodeBlock,
  type CodeHighlighter,
  FileChange,
  ProposedPlan,
  TurnDuration,
  formatTurnDuration,
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
void ActivityTimeline;
void AgentMarkdown;
void AgentPlan;
void AgentReasoning;
void CodeBlock;
void ProposedPlan;
void TurnDuration;
void formatTurnDuration;
void highlighter;
void line;
