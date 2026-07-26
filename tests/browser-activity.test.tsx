// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrowserActivity,
  type BrowserActivityStep,
} from "../src";

const steps: BrowserActivityStep[] = [
  {
    completed: true,
    id: "instructions",
    kind: "instruction",
    label: "Read browser instructions",
  },
  {
    completed: true,
    id: "connect",
    kind: "connection",
    label: "Connect to the browser",
  },
  {
    completed: true,
    id: "open",
    kind: "navigation",
    label: "Open the page and read its title",
  },
];

afterEach(cleanup);

describe("BrowserActivity", () => {
  it("renders the sampled completed disclosure and ordered steps", () => {
    const html = renderToStaticMarkup(
      <BrowserActivity
        defaultOpen
        status="completed"
        steps={steps}
        summary="Used the browser, ran a command"
      />,
    );

    expect(html).toContain("Used the browser, ran a command");
    expect(html).toContain('data-kind="tool"');
    expect(html).toContain("<ol");
    expect(html).toContain("Read browser instructions");
    expect(html).toContain("Connect to the browser");
    expect(html).toContain("Open the page and read its title");
  });

  it.each([
    ["pending", "Using the browser"],
    ["running", "Using the browser"],
    ["completed", "Used the browser"],
    ["failed", "Browser use failed"],
  ] as const)("uses the default %s label", (status, label) => {
    const html = renderToStaticMarkup(
      <BrowserActivity status={status} />,
    );

    expect(html).toContain(label);
    expect(html).not.toContain("<details");
  });

  it("delegates step actions and controlled disclosure changes", () => {
    const onOpenChange = vi.fn();
    const onStepOpen = vi.fn();
    const { container } = render(
      <BrowserActivity
        onOpenChange={onOpenChange}
        onStepOpen={onStepOpen}
        open={false}
        status="completed"
        steps={steps}
      />,
    );

    fireEvent.click(container.querySelector("summary")!);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")?.open).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Connect to the browser" }),
    );
    expect(onStepOpen).toHaveBeenCalledWith(steps[1]);
  });
});
