import { describe, expect, it } from "vitest";
import {
  createPackageMarkerMatcher,
  packageCandidateMarkers,
} from "../scripts/scan-current-package-candidates.mjs";

describe("installed package candidate marker scan", () => {
  it("reports only boolean marker presence and ignores unrelated strings", () => {
    const matcher = createPackageMarkerMatcher();
    matcher.observe("GPT-6 Sol");
    matcher.observe("a Quick Chat window label");
    matcher.observe("unrelated private-looking content");

    expect(matcher.result()).toEqual({
      gpt6SolModelLabel: true,
      gpt6LunaModelLabel: false,
      quickChatLabel: true,
      showPetLabel: false,
      appshotDestinationLabel: false,
      computerHistoryLabel: false,
      webmcpLabel: false,
      siteToolsLabel: false,
      appleMessagesPluginLabel: false,
      layoutIntroductionTitle: false,
      layoutIntroductionDescription: false,
      layoutIntroductionCloseDialogLabel: false,
    });
  });

  it("matches labels case-insensitively and accumulates across lines", () => {
    const matcher = createPackageMarkerMatcher();
    matcher.observe("gpt-6 luna");
    matcher.observe("APPshot destination");
    matcher.observe("WebMCP tools");
    matcher.observe("Apple Messages plugin");
    matcher.observe("A new layout for ChatGPT desktop");
    matcher.observe(
      "Your chats are now at the top. Find Scheduled, Library, Images, and Plugins on the left.",
    );
    matcher.observe("Close dialog");

    const result = matcher.result();
    expect(result.gpt6LunaModelLabel).toBe(true);
    expect(result.appshotDestinationLabel).toBe(true);
    expect(result.webmcpLabel).toBe(true);
    expect(result.appleMessagesPluginLabel).toBe(true);
    expect(result.gpt6SolModelLabel).toBe(false);
    expect(result.layoutIntroductionTitle).toBe(true);
    expect(result.layoutIntroductionDescription).toBe(true);
    expect(result.layoutIntroductionCloseDialogLabel).toBe(true);
  });

  it("keeps its marker catalog explicit and bounded", () => {
    expect(packageCandidateMarkers.map(({ id }) => id)).toEqual([
      "gpt6SolModelLabel",
      "gpt6LunaModelLabel",
      "quickChatLabel",
      "showPetLabel",
      "appshotDestinationLabel",
      "computerHistoryLabel",
      "webmcpLabel",
      "siteToolsLabel",
      "appleMessagesPluginLabel",
      "layoutIntroductionTitle",
      "layoutIntroductionDescription",
      "layoutIntroductionCloseDialogLabel",
    ]);
  });
});
