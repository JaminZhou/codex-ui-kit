// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import {
  acquireDocumentScrollLock,
  retargetModalReturnFocusWithin,
} from "../src/internal/documentScrollLock";

afterEach(() => {
  document.body.replaceChildren();
  document.body.style.overflow = "";
});

describe("document modal stack", () => {
  it("retargets deferred focus when its launching surface is hidden", () => {
    const panel = document.createElement("aside");
    const panelTrigger = document.createElement("button");
    const fallback = document.createElement("button");
    panel.append(panelTrigger);
    document.body.append(panel, fallback);

    const lowerModal = acquireDocumentScrollLock({
      lockDocumentScroll: false,
      priority: 100,
      returnFocus: panelTrigger,
    });
    const higherModal = acquireDocumentScrollLock({
      lockDocumentScroll: false,
      priority: 200,
    });

    expect(lowerModal.release()).toBeNull();
    panel.setAttribute("aria-hidden", "true");
    retargetModalReturnFocusWithin(panel, fallback);

    expect(higherModal.release()).toBe(fallback);
  });
});
