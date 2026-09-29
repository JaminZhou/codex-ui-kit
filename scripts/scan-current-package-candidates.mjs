import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const packageCandidateMarkers = [
  { id: "gpt6SolModelLabel", needle: "GPT-6 Sol" },
  { id: "gpt6LunaModelLabel", needle: "GPT-6 Luna" },
  { id: "quickChatLabel", needle: "Quick Chat" },
  { id: "showPetLabel", needle: "Show pet" },
  { id: "appshotDestinationLabel", needle: "Appshot destination" },
  { id: "computerHistoryLabel", needle: "Computer History" },
  { id: "webmcpLabel", needle: "WebMCP" },
  { id: "siteToolsLabel", needle: "site tools" },
  { id: "appleMessagesPluginLabel", needle: "Apple Messages" },
  { id: "layoutIntroductionTitle", needle: "A new layout for ChatGPT desktop" },
  {
    id: "layoutIntroductionDescription",
    needle: "Your chats are now at the top. Find Scheduled, Library, Images, and Plugins on the left.",
  },
  { id: "layoutIntroductionCloseDialogLabel", needle: "Close dialog" },
];

export function createPackageMarkerMatcher(markers = packageCandidateMarkers) {
  const found = new Set();
  const normalized = markers.map(({ id, needle }) => ({
    id,
    needle: needle.toLocaleLowerCase(),
  }));

  return {
    observe(line) {
      const candidate = line.toLocaleLowerCase();
      for (const marker of normalized) {
        if (candidate.includes(marker.needle)) found.add(marker.id);
      }
    },
    result() {
      return Object.fromEntries(
        normalized.map(({ id }) => [id, found.has(id)]),
      );
    },
  };
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function readPlistValue(plistPath, key) {
  return execFileSync(
    "/usr/libexec/PlistBuddy",
    ["-c", `Print :${key}`, plistPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

async function scanAsarStrings(asarPath) {
  const matcher = createPackageMarkerMatcher();
  const child = spawn("strings", [asarPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 2_000) stderr += chunk.toString().slice(0, 2_000 - stderr.length);
  });

  const closed = new Promise((resolveClose, rejectClose) => {
    child.once("error", rejectClose);
    child.once("close", (code, signal) => resolveClose({ code, signal }));
  });

  try {
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of lines) matcher.observe(line);
  } catch (error) {
    child.kill();
    throw error;
  }

  const { code, signal } = await closed;
  if (code !== 0) {
    throw new Error(
      `strings could not scan app.asar (code ${code}, signal ${signal ?? "none"}): ${stderr.trim()}`,
    );
  }
  return matcher.result();
}

export async function scanInstalledPackage({ appPath, expectedVersion, expectedBuild }) {
  if (typeof appPath !== "string" || appPath.trim().length === 0) {
    throw new Error("an installed app path is required");
  }

  const resolvedAppPath = resolve(appPath);
  const plistPath = join(resolvedAppPath, "Contents", "Info.plist");
  const asarPath = join(resolvedAppPath, "Contents", "Resources", "app.asar");
  const appVersion = readPlistValue(plistPath, "CFBundleShortVersionString");
  const buildNumber = readPlistValue(plistPath, "CFBundleVersion");
  const asarBytes = (await stat(asarPath)).size;

  if (expectedVersion && appVersion !== expectedVersion) {
    throw new Error(`expected app version ${expectedVersion}, found ${appVersion}`);
  }
  if (expectedBuild && buildNumber !== expectedBuild) {
    throw new Error(`expected app build ${expectedBuild}, found ${buildNumber}`);
  }

  const sha256Before = await sha256File(asarPath);
  const markers = await scanAsarStrings(asarPath);
  const sha256After = await sha256File(asarPath);
  if (sha256Before !== sha256After) {
    throw new Error("app.asar changed while package candidate markers were scanned");
  }

  return {
    schemaVersion: 1,
    evidenceClass: "installed-package-string-presence",
    runtimeReachabilityEstablished: false,
    appVersion,
    buildNumber,
    asarBytes,
    asarSha256: sha256Before,
    markers,
    note: "Package strings are candidate leads only; they do not prove runtime availability, behavior, or visual parity.",
  };
}

const invokedPath = process.argv[1];
if (invokedPath && fileURLToPath(import.meta.url) === resolve(invokedPath)) {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: {
      app: { type: "string" },
      "expected-version": { type: "string" },
      "expected-build": { type: "string" },
    },
    strict: true,
  });
  if (!values.app) {
    throw new Error(
      "usage: node scripts/scan-current-package-candidates.mjs --app <ChatGPT.app> [--expected-version <version>] [--expected-build <build>]",
    );
  }

  const report = await scanInstalledPackage({
    appPath: values.app,
    expectedVersion: values["expected-version"],
    expectedBuild: values["expected-build"],
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
