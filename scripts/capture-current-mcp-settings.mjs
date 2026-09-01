import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only. This script never changes a server, submits a form, or opens
// an external link. Open Settings in one isolated current-build process first.

const port = Number(process.env.CODEX_CURRENT_MCP_SETTINGS_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_MCP_SETTINGS_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_MCP_SETTINGS_OUTPUT_DIR;
const allowCapture =
  process.env.CODEX_CURRENT_MCP_SETTINGS_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated MCP settings CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated MCP settings profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set the absolute MCP settings output directory.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_MCP_SETTINGS_ALLOW_CAPTURE=1 to authorize read-only MCP settings capture.",
  );
}

const profile = await realpath(requestedProfile);
const outputDirectory = resolve(requestedOutputDirectory);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The MCP settings profile must be isolated under /private/tmp.");
}
if (
  dirname(outputDirectory) !== profile ||
  !basename(outputDirectory).startsWith("current-mcp-settings-capture-")
) {
  throw new Error(
    "The output must be a current-mcp-settings-capture-* direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readInstalledFingerprint = async () => {
  const before = await stat(appAsar);
  const appAsarSha256 = execFileSync(
    "/usr/bin/shasum",
    ["-a", "256", appAsar],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\s+/)[0];
  const after = await stat(appAsar);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.ctimeMs !== after.ctimeMs ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("The installed app.asar changed while it was hashed.");
  }
  return {
    appAsarBytes: after.size,
    appAsarSha256,
    appVersion: plistValue("CFBundleShortVersionString"),
    buildNumber: plistValue("CFBundleVersion"),
    chromiumVersion: plistValue("ChromiumBaseVersion"),
  };
};
const fingerprint = await readInstalledFingerprint();
if (
  Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint does not match the promoted baseline: ${JSON.stringify(fingerprint)}`,
  );
}

const listenerFields = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const listeners = [];
for (const field of listenerFields) {
  if (field.startsWith("p")) listeners.push({ addresses: [], pid: field.slice(1) });
  if (field.startsWith("n")) listeners.at(-1)?.addresses.push(field.slice(1));
}
if (
  listeners.length === 0 ||
  listeners.some(
    ({ addresses }) =>
      addresses.length !== 1 || addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every MCP settings CDP listener must be loopback-only.");
}
const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", pid],
      { encoding: "utf8" },
    ),
  );
const valueFor = (argv, prefix) =>
  argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
const owners = listeners.filter(({ pid }) => {
  try {
    const info = readProcessInfo(pid);
    const processProfile = valueFor(info.argv, "--user-data-dir=");
    return (
      info.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
      valueFor(info.argv, "--remote-debugging-address=") === "127.0.0.1" &&
      valueFor(info.argv, "--remote-debugging-port=") === String(port) &&
      processProfile &&
      realpathSync(processProfile) === profile
    );
  } catch {
    return false;
  }
});
if (owners.length !== 1) {
  throw new Error("The isolated MCP settings CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

const visible = async (locator) =>
  (await locator.count()) > 0 && (await locator.first().isVisible());
const inspectCandidate = async (page, index) => ({
  area: await page.evaluate(() => innerWidth * innerHeight),
  index,
  landmarks: await page.evaluate(() => ({
    main: document.querySelectorAll("main").length,
    nav: document.querySelectorAll("nav").length,
    settings: document.querySelectorAll("[data-settings-panel-slug]").length,
  })),
  page,
  url: page.url(),
  visibleControls: await page.locator("button:visible, a:visible").count(),
});

const pages = browser.contexts().flatMap((context) => context.pages());
const selected = selectCurrentMainCandidate(
  await Promise.all(pages.map(inspectCandidate)),
);
const page = selected.page;
await page.bringToFront();

const initialViewport = await page.evaluate(() => ({
  height: innerHeight,
  width: innerWidth,
}));
const metric = async (locator) => {
  const bounds = await locator.first().boundingBox();
  return bounds
    ? {
        height: bounds.height,
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
      }
    : null;
};
const style = async (locator) =>
  locator.first().evaluate((element) => {
    const value = getComputedStyle(element);
    return {
      backgroundColor: value.backgroundColor,
      border: value.border,
      borderRadius: value.borderRadius,
      color: value.color,
      fontFamily: value.fontFamily,
      fontSize: value.fontSize,
      fontWeight: value.fontWeight,
      lineHeight: value.lineHeight,
      padding: value.padding,
    };
  });

const openPlugins = async () => {
  const pluginPanel = page.locator(
    '[data-settings-panel-slug="plugins-settings"]',
  );
  if (!(await visible(pluginPanel))) {
    throw new Error("Open Settings before capturing the MCP manager.");
  }
  const settingsSearch = page.getByPlaceholder("Search settings…");
  if (await visible(settingsSearch)) await settingsSearch.fill("");
  await pluginPanel.click();
  await page.getByRole("heading", { exact: true, name: "Plugins" }).waitFor();
  const nestedEditor = page.locator(
    'h1:has-text("Connect to a custom MCP"), h1:has-text("Update ")',
  );
  if (await visible(nestedEditor)) {
    const back = page.getByRole("button", { exact: true, name: "Back" });
    if ((await back.count()) !== 1) {
      throw new Error("Could not leave the nested MCP editor safely.");
    }
    await back.click();
  }
  const mcpTab = page.getByRole("button", { name: /^MCPs\s+\d+$/ });
  if ((await mcpTab.count()) !== 1) {
    throw new Error("The current Plugins page does not expose one MCP tab.");
  }
  await mcpTab.click();
  const mcpSearch = page.getByPlaceholder("Search MCP servers");
  if (await visible(mcpSearch)) {
    await mcpSearch.waitFor();
  } else {
    await page.getByText("Servers", { exact: true }).waitFor();
  }
};

const sanitizedList = async () =>
  page.evaluate(() => {
    const isVisible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const exactLeaf = (text) =>
      [...document.querySelectorAll("*")].find(
        (element) =>
          element.childElementCount === 0 &&
          element.textContent?.trim() === text &&
          isVisible(element),
      );
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const collectSection = (label) => {
      const heading = exactLeaf(label);
      const section = heading?.closest("section");
      const card = section?.children[1]?.firstElementChild;
      const rows = [...(card?.children ?? [])].filter(
        (row) => row instanceof HTMLElement && row.querySelector("span"),
      );
      return {
        card: rect(card),
        heading: rect(heading),
        rowCount: rows.length,
        rows: rows.map((row) => ({
          rect: rect(row),
          settingsButtonCount: row.querySelectorAll('button[aria-label="Settings"]')
            .length,
          toggleStates: [...row.querySelectorAll('[role="switch"]')].map(
            (toggle) => toggle.getAttribute("aria-checked"),
          ),
        })),
      };
    };
    const heading = [...document.querySelectorAll("h1")].find(
      (element) => element.textContent?.trim() === "Plugins" && isVisible(element),
    );
    const search = [...document.querySelectorAll("input")].find(
      (input) => input.placeholder === "Search MCP servers" && isVisible(input),
    );
    const tabs = [...document.querySelectorAll("button")]
      .filter(
        (button) =>
          isVisible(button) &&
          /^(Plugins|Apps|MCPs|Skills|Marketplace)\s*\d+$/.test(
            button.textContent?.trim() ?? "",
          ),
      )
      .map((button) => {
        const match = button.textContent.trim().match(/^(.*?)(\d+)$/);
        return {
          count: Number(match?.[2]),
          label: match?.[1]?.trim(),
          rect: rect(button),
        };
      });
    return {
      fromPlugins: collectSection("From plugins"),
      heading: rect(heading),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      search: rect(search?.parentElement),
      servers: collectSection("Servers"),
      tabs,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });

const captureList = async (name, viewport) => {
  await page.setViewportSize(viewport);
  await page.evaluate(async () => document.fonts.ready);
  await openPlugins();
  const search = page.getByPlaceholder("Search MCP servers");
  if (await visible(search)) await search.fill("");
  const observation = await sanitizedList();
  await page.screenshot({ path: screenshotPath(name) });
  return observation;
};

const wide = await captureList("mcp-list-wide", currentBaselineViewports.wide);
const search = page.getByPlaceholder("Search MCP servers");
await search.fill("codex-ui-kit-missing");
await page.getByText("No MCP servers found", { exact: true }).waitFor();
const empty = {
  message: await page.getByText("No MCP servers found", { exact: true }).textContent(),
  messageRect: await metric(page.getByText("No MCP servers found", { exact: true })),
  searchHasFocus: await search.evaluate((element) => document.activeElement === element),
};
await page.screenshot({ path: screenshotPath("mcp-empty-wide") });
await search.fill("");

await page.getByRole("button", { exact: true, name: "Add" }).click();
const menuItems = await page
  .locator('[role="menuitem"]:visible')
  .allTextContents();
const addMenu = {
  items: menuItems.map((item) => item.trim()),
  rect: await metric(page.locator('[role="menu"]:visible')),
};
await page.screenshot({ path: screenshotPath("mcp-add-menu-wide") });
await page.keyboard.press("Escape");

const serverSection = page
  .getByText("Servers", { exact: true })
  .locator("xpath=ancestor::section[1]");
const serverRows = serverSection.locator(
  ':scope > div:last-child > div > div:has(button[aria-label="Settings"])',
);
if ((await serverRows.count()) < 1) {
  throw new Error("The current MCP list has no inspectable server row.");
}
await serverRows
  .last()
  .getByRole("button", { exact: true, name: "Settings" })
  .click();
await page.getByRole("heading", { name: /^Update .+ MCP$/ }).waitFor();
const detail = {
  fieldLabels: await page
    .locator("p:visible")
    .allTextContents()
    .then((labels) =>
      labels
        .map((label) => label.trim())
        .filter((label) =>
          [
            "Bearer token env var",
            "Headers",
            "Headers from environment variables",
            "URL",
          ].includes(label),
        ),
    ),
  form: await metric(
    page.getByPlaceholder("MCP_BEARER_TOKEN").locator("xpath=ancestor::div[4]"),
  ),
  headingMatchesUpdatePattern: true,
  saveDisabled: await page.getByRole("button", { name: "Save" }).isDisabled(),
  uninstallVisible: await visible(
    page.getByRole("button", { exact: true, name: "Uninstall" }),
  ),
};
await page.screenshot({ path: screenshotPath("mcp-detail-wide") });
await page.getByRole("button", { exact: true, name: "Back" }).click();

await page.getByRole("button", { exact: true, name: "Add" }).click();
await page
  .getByRole("menuitem", { exact: true, name: "Add MCP server" })
  .click();
await page
  .getByRole("heading", { exact: true, name: "Connect to a custom MCP" })
  .waitFor();
const captureEditor = async (name, type) => {
  await page.getByRole("button", { exact: true, name: type }).click();
  const fields = await page
    .locator("input:visible")
    .evaluateAll((inputs) =>
      inputs
        .map((input) => input.getAttribute("placeholder"))
        .filter(Boolean),
    );
  const result = {
    docsVisible: await visible(
      page.getByRole("link", { name: "Open MCP documentation" }),
    ),
    fields,
    saveDisabled: await page.getByRole("button", { name: "Save" }).isDisabled(),
    type,
    viewport: await page.evaluate(() => ({ height: innerHeight, width: innerWidth })),
  };
  await page.screenshot({ path: screenshotPath(name) });
  return result;
};
const stdio = await captureEditor("mcp-editor-stdio-wide", "STDIO");
const http = await captureEditor(
  "mcp-editor-http-wide",
  "Streamable HTTP",
);
await page.getByRole("button", { exact: true, name: "Back" }).click();

const compact = await captureList(
  "mcp-list-compact",
  currentBaselineViewports.compact,
);
await page.getByRole("button", { exact: true, name: "Add" }).click();
await page
  .getByRole("menuitem", { exact: true, name: "Add MCP server" })
  .click();
const compactEditor = await captureEditor(
  "mcp-editor-http-compact",
  "Streamable HTTP",
);

if (
  wide.viewport.width !== currentBaselineViewports.wide.width ||
  compact.viewport.width !== currentBaselineViewports.compact.width ||
  wide.servers.rowCount < 1 ||
  wide.fromPlugins.rowCount < 1 ||
  Math.abs(wide.horizontalOverflow) > 1 ||
  Math.abs(compact.horizontalOverflow) > 1 ||
  empty.message !== "No MCP servers found" ||
  !empty.searchHasFocus ||
  !addMenu.items.includes("Add MCP server") ||
  !detail.uninstallVisible ||
  !detail.saveDisabled ||
  !stdio.fields.includes("MCP server name") ||
  !stdio.fields.includes("openai-dev-mcp serve-sqlite") ||
  !http.fields.includes("https://mcp.example.com/mcp") ||
  !http.fields.includes("MCP_BEARER_TOKEN") ||
  !stdio.saveDisabled ||
  !http.saveDisabled ||
  !compactEditor.saveDisabled
) {
  throw new Error(
    `The current MCP settings contract was not reached: ${JSON.stringify({ addMenu, compact, compactEditor, detail, empty, http, stdio, wide })}`,
  );
}

await page.setViewportSize(initialViewport);
await writeFile(
  recordPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      baseline: fingerprint,
      isolation: {
        cdpAddress: "127.0.0.1",
        cdpPort: port,
        mainCodexProcessPreserved: true,
        ownerPid: Number(owners[0].pid),
        profileKind: "unique-private-tmp-profile",
      },
      mcp: {
        addMenu,
        compact,
        compactEditor,
        detail,
        empty,
        http,
        stdio,
        wide,
      },
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
await browser.close();
console.log(recordPath);
