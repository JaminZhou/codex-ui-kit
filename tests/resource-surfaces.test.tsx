// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ArtifactList,
  GeneratedImageGallery,
  ImagePreviewDialog,
  ResourceCard,
  ResourceList,
  SourceList,
  type GeneratedImageItem,
} from "../src";

afterEach(cleanup);

const images: GeneratedImageItem[] = Array.from({ length: 6 }, (_, index) => ({
  alt: `Preview ${index + 1}`,
  height: 100,
  id: `image-${index + 1}`,
  src: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${100 + index}' height='100'/%3E`,
  width: 100 + index,
}));

describe("resource surfaces", () => {
  it("exposes a semantic resource action and keeps its trailing action independent", () => {
    const onOpen = vi.fn();
    const onShare = vi.fn();
    render(
      <ResourceCard
        action={<button onClick={onShare}>Share</button>}
        hoverLabel="Open in editor"
        kind="document"
        onOpen={onOpen}
        subtitle="Document · MD"
        title="research.md"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open research.md" }));
    expect(onOpen).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalledOnce();
    expect(screen.getByText("Document · MD")).toBeTruthy();
    expect(screen.getByText("Open in editor")).toBeTruthy();
  });

  it("shows three resource rows before expanding the remainder", () => {
    render(
      <ResourceList>
        {Array.from({ length: 5 }, (_, index) => (
          <ResourceCard key={index} title={`Artifact ${index + 1}`} />
        ))}
      </ResourceList>,
    );

    expect(screen.getAllByRole("button", { name: /Open Artifact/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getAllByRole("button", { name: /Open Artifact/ })).toHaveLength(5);
  });

  it("preserves the observed artifact empty state", () => {
    render(<ArtifactList />);
    expect(screen.getByText("No artifacts yet")).toBeTruthy();
  });

  it("summarizes sources and expands to the full list", () => {
    const onOpen = vi.fn();
    render(
      <SourceList
        items={Array.from({ length: 4 }, (_, index) => ({
          id: `source-${index}`,
          kind: index === 0 ? ("file" as const) : ("web" as const),
          meta: index === 0 ? "Attached to the conversation" : "Web search",
          onOpen,
          title: `Source ${index + 1}`,
        }))}
        visibleLimit={2}
      />,
    );

    expect(screen.getByRole("region", { name: "Sources" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Source/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    expect(screen.getAllByRole("button", { name: /Source/ })).toHaveLength(4);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Source 1 Attached to the conversation",
      }),
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("generated images", () => {
  it("renders overflow paging, pending placeholders, and opens an image", () => {
    const onOpenImage = vi.fn();
    render(
      <GeneratedImageGallery
        images={images}
        onOpenImage={onOpenImage}
        pendingCount={1}
      />,
    );

    expect(screen.getByText("+3")).toBeTruthy();
    expect(screen.getByRole("status", { name: "Generating image" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Preview 1" }));
    expect(onOpenImage).toHaveBeenCalledWith(images[0], 0);

    const previous = screen.getByRole("button", { name: "Previous images" });
    const next = screen.getByRole("button", { name: "Next images" });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(next);
    expect((previous as HTMLButtonElement).disabled).toBe(false);
  });

  it("reserves a four-slot gallery while generation is pending", () => {
    render(
      <GeneratedImageGallery images={images.slice(0, 1)} pendingCount={1} />,
    );
    expect(
      screen.getAllByRole("status", { name: "Generating image" }),
    ).toHaveLength(3);
  });

  it("adopts intrinsic aspect ratio and settles after two image retries", () => {
    const { rerender } = render(
      <GeneratedImageGallery
        images={[{ alt: "Intrinsic", id: "intrinsic", src: "intrinsic.png" }]}
      />,
    );
    const intrinsicImage = screen.getByRole("img", { name: "Intrinsic" });
    Object.defineProperties(intrinsicImage, {
      naturalHeight: { configurable: true, value: 400 },
      naturalWidth: { configurable: true, value: 800 },
    });
    fireEvent.load(intrinsicImage);
    expect(
      intrinsicImage
        .closest(".codex-ui-generated-image-gallery")
        ?.getAttribute("style"),
    ).toContain("--codex-ui-gallery-height: 200px");

    rerender(
      <GeneratedImageGallery
        images={[{ alt: "Broken", id: "broken", src: "broken.png" }]}
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Broken" }));
    fireEvent.error(screen.getByRole("img", { name: "Broken" }));
    fireEvent.error(screen.getByRole("img", { name: "Broken" }));
    expect(screen.getByRole("img", { name: "Broken unavailable" })).toBeTruthy();
  });

  it("supports dialog arrow keys, download, Escape, and focus return", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open gallery</button>
          <ImagePreviewDialog
            imageId="image-2"
            images={images.slice(0, 3)}
            onOpenChange={setOpen}
            open={open}
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open gallery" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Generated image" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("img", { name: "Preview 2" })).toBeTruthy();
    const download = screen.getByRole("link", { name: "Download" });
    expect(download.hasAttribute("download")).toBe(true);
    download.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Next image" }),
    );

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByRole("img", { name: "Preview 3" })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
