// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  McpServerEditor,
  McpServersPage,
  type McpServerEditorValue,
  type McpServerItem,
} from "../src";

afterEach(cleanup);

const servers: readonly McpServerItem[] = [
  {
    enabled: false,
    id: "local-browser",
    name: "local-browser",
  },
  {
    enabled: true,
    id: "docs-reference",
    name: "docs-reference",
  },
];

const emptyPair = { id: "empty", key: "", value: "" };
const editorValue: McpServerEditorValue = {
  arguments: [""],
  bearerTokenEnvironmentVariable: "",
  command: "",
  environmentPassthrough: [""],
  environmentVariables: [emptyPair],
  headerEnvironmentVariables: [emptyPair],
  headers: [emptyPair],
  name: "",
  type: "stdio",
  url: "",
  workingDirectory: "",
};

describe("MCP settings", () => {
  it("exposes page lifecycle status and locks manager controls while loading", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <McpServersPage
        loadingLabel="Loading MCP integrations…"
        onRetry={onRetry}
        query="docs"
        status="loading"
      />,
    );
    const page = screen.getByRole("heading", { name: "Plugins" }).closest("section");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading MCP integrations…")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search MCP servers")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("tab", { name: /^MCPs\s*0$/ })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Add" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(
      <McpServersPage
        onRetry={onRetry}
        retryLabel="Try MCPs again"
        status="error"
        statusDescription="MCP management is temporarily unavailable."
        statusHeading="MCP service unavailable"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "MCP management is temporarily unavailable.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try MCPs again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the current manager and delegates host-owned interactions", () => {
    const onAddMcpServer = vi.fn();
    const onCategoryChange = vi.fn();
    const onEnabledChange = vi.fn();
    const onQueryChange = vi.fn();
    const onSettings = vi.fn();
    render(
      <McpServersPage
        onAddMcpServer={onAddMcpServer}
        onCategoryChange={onCategoryChange}
        onQueryChange={onQueryChange}
        onServerEnabledChange={onEnabledChange}
        onServerSettings={onSettings}
        pluginServers={[
          {
            id: "plugin-tools",
            name: "plugin_tools",
            source: "plugin",
          },
        ]}
        servers={servers}
        tabs={[
          { count: 13, id: "plugins", label: "Plugins" },
          { count: 6, id: "apps", label: "Apps" },
          { count: 6, id: "mcps", label: "MCPs" },
          { count: 2, id: "skills", label: "Skills" },
          { count: 2, id: "marketplace", label: "Marketplace" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Plugins" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Servers" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "From plugins" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search MCP servers"), {
      target: { value: "docs" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /^Apps\s*6$/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Settings for docs-reference" }),
    );
    fireEvent.click(
      screen.getByRole("switch", { name: "Enable local-browser" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Add MCP server" }));

    expect(onQueryChange).toHaveBeenCalledWith("docs");
    expect(onCategoryChange).toHaveBeenCalledWith("apps");
    expect(onSettings).toHaveBeenCalledWith(servers[1]);
    expect(onEnabledChange).toHaveBeenCalledWith(servers[0], true);
    expect(onAddMcpServer).toHaveBeenCalledOnce();
  });

  it("filters to the exact current empty state without mutating source data", () => {
    render(<McpServersPage query="missing" servers={servers} />);
    expect(screen.getByText("No MCP servers found")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "From plugins" })).toBeNull();
    expect(servers).toHaveLength(2);
  });

  it("keeps unavailable and retry behavior controlled", () => {
    const onRetry = vi.fn();
    render(
      <McpServersPage
        onRetry={onRetry}
        status="unavailable"
        statusDescription="MCP management is disabled by your organization."
      />,
    );
    expect(
      screen.getByRole("heading", { name: "MCP servers unavailable" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps row toggle progress and failures host-controlled", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <McpServersPage
        onServerRetry={onRetry}
        serverRetryLabel="Try again"
        servers={[{ ...servers[0], toggleStatus: "enabling" }]}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Enabling…");
    expect(screen.getByRole("switch", { name: "Enable local-browser" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen
        .getByRole("switch", { name: "Enable local-browser" })
        .getAttribute("aria-busy"),
    ).toBe("true");

    rerender(
      <McpServersPage
        onServerRetry={onRetry}
        serverRetryLabel="Try again"
        servers={[
          {
            ...servers[0],
            toggleStatus: "error",
            toggleStatusMessage: "The local MCP process stopped.",
          },
        ]}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The local MCP process stopped.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ id: "local-browser" }),
    );
    expect(screen.getByRole("switch", { name: "Enable local-browser" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("keeps the create editor controlled across both server types", () => {
    const onBack = vi.fn();
    const onChange = vi.fn();
    render(
      <McpServerEditor
        onBack={onBack}
        onChange={onChange}
        value={editorValue}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("MCP server name"), {
      target: { value: "sample-server" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("openai-dev-mcp serve-sqlite"),
      { target: { value: "sample-command" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Streamable HTTP" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "sample-server" }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ command: "sample-command" }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "http" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Save" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("renders the installed HTTP editor and delegates uninstall", () => {
    const onUninstall = vi.fn();
    render(
      <McpServerEditor
        mode="update"
        onChange={vi.fn()}
        onUninstall={onUninstall}
        saveDisabled={false}
        value={{
          ...editorValue,
          name: "docs-reference",
          type: "http",
          url: "https://developers.openai.com/mcp",
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Update docs-reference MCP" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "If you would like to switch MCP server type, please uninstall first.",
      ),
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("MCP server name")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
      "disabled",
      false,
    );
    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));
    expect(onUninstall).toHaveBeenCalledOnce();
  });

  it("exposes saving and retryable error states without owning MCP persistence", () => {
    const onRetry = vi.fn();
    const value = {
      ...editorValue,
      command: "sample-server",
      name: "sample-server",
    };
    const { rerender } = render(
      <McpServerEditor
        onChange={vi.fn()}
        onRetry={onRetry}
        saveDisabled={false}
        status="saving"
        value={value}
      />,
    );
    const editor = screen.getByRole("region", { name: "MCP server editor" });
    expect(editor.getAttribute("data-status")).toBe("saving");
    expect(editor.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Saving…");
    expect(screen.getByPlaceholderText("MCP server name")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Back" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(
      <McpServerEditor
        onChange={vi.fn()}
        onRetry={onRetry}
        retryLabel="Try again"
        saveDisabled={false}
        status="error"
        statusMessage="The MCP endpoint is unavailable."
        value={value}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The MCP endpoint is unavailable.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByPlaceholderText("MCP server name")).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
      "disabled",
      false,
    );
  });
});
