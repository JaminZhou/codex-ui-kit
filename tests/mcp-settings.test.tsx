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
    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));
    expect(onUninstall).toHaveBeenCalledOnce();
  });
});
