import { describe, expect, it } from "vitest";
import {
  isAllowedExternalUrl,
  isTrustedRendererUrl,
} from "../electron/navigation-policy";

describe("Electron navigation policy", () => {
  const rendererEntryPath = "/tmp/codex-app/dist/index.html";

  it("trusts only the configured local renderer entry", () => {
    expect(
      isTrustedRendererUrl(
        "file:///tmp/codex-app/dist/index.html?scenario=compaction",
        rendererEntryPath,
      ),
    ).toBe(true);
    expect(
      isTrustedRendererUrl(
        "file:///tmp/codex-app/dist/other.html",
        rendererEntryPath,
      ),
    ).toBe(false);
    expect(
      isTrustedRendererUrl("https://example.com", rendererEntryPath),
    ).toBe(false);
  });

  it("routes only HTTPS destinations to the system browser", () => {
    expect(isAllowedExternalUrl("https://platform.openai.com/docs")).toBe(true);
    expect(isAllowedExternalUrl("http://example.com")).toBe(false);
    expect(isAllowedExternalUrl("file:///tmp/secret")).toBe(false);
    expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedExternalUrl("not a URL")).toBe(false);
  });
});
