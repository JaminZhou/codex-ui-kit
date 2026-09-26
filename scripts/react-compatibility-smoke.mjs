import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publicRuntimeExports } from "./public-runtime-exports.mjs";

const [
  reactVersion,
  reactDomVersion,
  reactTypesVersion,
  reactDomTypesVersion,
  moduleResolution = "Bundler",
  archiveOption,
  archiveArgument,
] = process.argv.slice(2);

if (
  !reactVersion ||
  !reactDomVersion ||
  !reactTypesVersion ||
  !reactDomTypesVersion
) {
  throw new Error(
    "usage: react-compatibility-smoke.mjs <react> <react-dom> <@types/react> <@types/react-dom> [Bundler|NodeNext]",
  );
}

if (moduleResolution !== "Bundler" && moduleResolution !== "NodeNext") {
  throw new Error(`unsupported module resolution: ${moduleResolution}`);
}
if (archiveOption !== undefined && (!["--tarball", "--registry-version"].includes(archiveOption) || !archiveArgument)) {
  throw new Error("optional package argument must be --tarball <path> or --registry-version <version>");
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
  const packageTarget = archiveOption === "--registry-version"
    ? `codex-ui-kit@${archiveArgument}`
    : archiveArgument
    ? resolve(archiveArgument)
    : join(
        temporaryRoot,
        JSON.parse(
          run(npmExecutable, ["pack", "--json", "--pack-destination", temporaryRoot], root),
        )[0].filename,
      );

  writeFileSync(
    join(temporaryRoot, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );

  const dependencies = [
      `react@${reactVersion}`,
      `react-dom@${reactDomVersion}`,
      `@types/react@${reactTypesVersion}`,
      `@types/react-dom@${reactDomTypesVersion}`,
      "typescript@5.9.3",
      packageTarget,
  ];
  if (process.env.RELEASE_CONSUMER_INSTALLER === "pnpm") {
    run("pnpm", ["add", "--ignore-scripts", "--save-exact", ...dependencies], temporaryRoot);
  } else {
    run(npmExecutable, ["install", "--ignore-scripts", "--no-audit", "--no-fund",
      ...(archiveOption === "--registry-version" ? [] : ["--package-lock=false"]),
      ...dependencies], temporaryRoot);
  }

  writeFileSync(
    join(temporaryRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          module: moduleResolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution,
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
import * as uiKit from "codex-ui-kit";

const expectedRuntimeExports = ${JSON.stringify(publicRuntimeExports)};
const runtimeExports = Object.keys(uiKit).sort();
if (JSON.stringify(runtimeExports) !== JSON.stringify(expectedRuntimeExports)) {
  throw new Error(
    \`runtime export mismatch:\\nexpected \${JSON.stringify(expectedRuntimeExports)}\\nreceived \${JSON.stringify(runtimeExports)}\`,
  );
}

const html = renderToString(
  createElement(uiKit.AgentMessage, { role: "assistant" }, "Compatibility surface"),
);
if (!html.includes("Compatibility surface")) {
  throw new Error("server render did not include the message content");
}

const shellHtml = renderToString(
  createElement(
    uiKit.AppShell,
    {
      bottomPanel: "Terminal",
      bottomPanelOpen: false,
      sidePanel: "Workspace",
      sidePanelOpen: false,
      sidebar: "Navigation",
      sidebarOpen: false,
    },
    "Conversation",
  ),
);
const inertAttributes = shellHtml.match(/\\sinert(?:=\\"(?:1)?\\")?/g) ?? [];
if (inertAttributes.length !== 3) {
  throw new Error(
    \`expected three inert shell surfaces, received \${inertAttributes.length}: \${shellHtml}\`,
  );
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
  if (archiveOption === "--registry-version") {
    if (installedPackage.name !== "codex-ui-kit" || installedPackage.version !== archiveArgument) {
      throw new Error("Installed registry version differs from the requested exact version");
    }
    const integrity = process.env.RELEASE_INTEGRITY;
    if (!integrity?.startsWith("sha512-")) throw new Error("RELEASE_INTEGRITY is required for registry smoke");
    const installer = process.env.RELEASE_CONSUMER_INSTALLER;
    const lock = readFileSync(join(temporaryRoot, installer === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json"), "utf8");
    if (installer === "pnpm") {
      if (!lock.includes(`codex-ui-kit@${archiveArgument}`) || !lock.includes(integrity)) {
        throw new Error("pnpm consumer lock does not pin the approved archive integrity");
      }
    } else {
      const packages = JSON.parse(lock).packages;
      if (packages?.["node_modules/codex-ui-kit"]?.integrity !== integrity) {
        throw new Error("npm consumer lock does not pin the approved archive integrity");
      }
    }
  }
  console.log(
    `React ${reactVersion} / ${moduleResolution} compatibility ok: ${installedPackage.name}@${installedPackage.version}`,
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
