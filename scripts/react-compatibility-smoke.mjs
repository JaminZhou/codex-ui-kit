import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [reactVersion, reactDomVersion, reactTypesVersion, reactDomTypesVersion] =
  process.argv.slice(2);

if (
  !reactVersion ||
  !reactDomVersion ||
  !reactTypesVersion ||
  !reactDomTypesVersion
) {
  throw new Error(
    "usage: react-compatibility-smoke.mjs <react> <react-dom> <@types/react> <@types/react-dom>",
  );
}

const root = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "codex-ui-kit-react-"));
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
  return result.stdout;
}

try {
  const packOutput = run(
    npmExecutable,
    ["pack", "--json", "--pack-destination", temporaryRoot],
    root,
  );
  const [packReport] = JSON.parse(packOutput);
  const tarballPath = join(temporaryRoot, packReport.filename);

  writeFileSync(
    join(temporaryRoot, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );

  run(
    npmExecutable,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      `react@${reactVersion}`,
      `react-dom@${reactDomVersion}`,
      `@types/react@${reactTypesVersion}`,
      `@types/react-dom@${reactDomTypesVersion}`,
      "typescript@5.9.3",
      tarballPath,
    ],
    temporaryRoot,
  );

  writeFileSync(
    join(temporaryRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["consumer.tsx"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(temporaryRoot, "consumer.tsx"),
    `import { AgentMarkdown, AgentMessage, AgentThread } from "codex-ui-kit";

export const surface = (
  <AgentThread aria-label="Compatibility surface">
    <AgentMessage role="assistant">
      <AgentMarkdown>{"**React compatibility**"}</AgentMarkdown>
    </AgentMessage>
  </AgentThread>
);
`,
  );
  writeFileSync(
    join(temporaryRoot, "consumer.mjs"),
    `import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AgentMessage } from "codex-ui-kit";

const html = renderToString(
  createElement(AgentMessage, { role: "assistant" }, "Compatibility surface"),
);
if (!html.includes("Compatibility surface")) {
  throw new Error("server render did not include the message content");
}
`,
  );

  run(
    join(
      temporaryRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsc.cmd" : "tsc",
    ),
    ["--noEmit"],
    temporaryRoot,
  );
  run(process.execPath, [join(temporaryRoot, "consumer.mjs")], temporaryRoot);

  const installedPackage = JSON.parse(
    readFileSync(
      join(temporaryRoot, "node_modules/codex-ui-kit/package.json"),
      "utf8",
    ),
  );
  console.log(
    `React ${reactVersion} compatibility ok: ${installedPackage.name}@${installedPackage.version}`,
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
