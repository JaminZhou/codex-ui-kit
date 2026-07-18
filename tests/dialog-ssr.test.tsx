import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog, DialogChoice } from "../src";

describe("dialog server rendering", () => {
  it("stays document-safe until the client can create its portal", () => {
    const html = renderToStaticMarkup(
      <Dialog onOpenChange={() => undefined} open title="Continue">
        <DialogChoice label="Workspace" />
      </Dialog>,
    );
    expect(html).toBe("");
  });
});
