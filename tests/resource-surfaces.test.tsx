// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ArtifactList,
  Dialog,
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

  it("uses static semantics without an open action and labels rich-title actions", () => {
    const onOpenCard = vi.fn();
    const onOpenSource = vi.fn();
    render(
      <>
        <ResourceCard title={<strong>Static artifact</strong>} />
        <ResourceCard
          onOpen={onOpenCard}
          openLabel="Open rich artifact"
          title={<strong>Rich artifact</strong>}
        />
        <SourceList
          items={[
            {
              id: "static-source",
              title: <strong>Static source</strong>,
            },
            {
              id: "rich-source",
              onOpen: onOpenSource,
              openLabel: "Open rich source",
              title: <strong>Rich source</strong>,
            },
          ]}
        />
      </>,
    );

    const staticCard = screen.getByText("Static artifact").closest("article");
    expect(staticCard?.querySelector("a, button")).toBeNull();
    expect(staticCard?.hasAttribute("data-interactive")).toBe(false);
    const staticSource = screen.getByText("Static source").closest("li");
    expect(staticSource?.querySelector("a, button")).toBeNull();
    expect(
      staticSource?.querySelector(".codex-ui-source-list__item"),
    ).toBeTruthy();
    expect(
      staticSource?.querySelector(".codex-ui-source-list__arrow"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open rich artifact" }));
    expect(onOpenCard).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Open rich source" }));
    expect(onOpenSource).toHaveBeenCalledOnce();
  });

  it("preserves dragging on static and openable resource cards", () => {
    const onDragStatic = vi.fn();
    const onDragOpenable = vi.fn();
    const onTrailingAction = vi.fn();
    render(
      <>
        <ResourceCard
          draggable
          onDragStart={onDragStatic}
          title="Static draggable"
        />
        <ResourceCard
          action={<button onClick={onTrailingAction}>Share draggable</button>}
          draggable
          onDragStart={onDragOpenable}
          onOpen={vi.fn()}
          title="Openable draggable"
        />
      </>,
    );

    const staticCard = screen.getByText("Static draggable").closest("article")!;
    const openableCard = screen
      .getByText("Openable draggable")
      .closest("article")!;
    expect(staticCard.getAttribute("draggable")).toBe("true");
    expect(openableCard.getAttribute("draggable")).toBe("true");
    fireEvent.dragStart(staticCard);
    fireEvent.dragStart(openableCard);
    expect(onDragStatic).toHaveBeenCalledOnce();
    expect(onDragOpenable).toHaveBeenCalledOnce();

    fireEvent.dragStart(
      screen.getByRole("button", { name: "Share draggable" }),
    );
    expect(onDragOpenable).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Share draggable" }));
    expect(onTrailingAction).toHaveBeenCalledOnce();
  });

  it("shows three resource rows before expanding the remainder", () => {
    render(
      <ResourceList>
        {Array.from({ length: 5 }, (_, index) => (
          <ResourceCard key={index} title={`Artifact ${index + 1}`} />
        ))}
      </ResourceList>,
    );

    expect(screen.getAllByText(/Artifact/)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getAllByText(/Artifact/)).toHaveLength(5);
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
  it("renders images as static media when no open action is provided", () => {
    const { rerender } = render(
      <GeneratedImageGallery images={images.slice(0, 1)} />,
    );

    const staticImage = screen.getByRole("img", { name: "Preview 1" });
    expect(staticImage.closest("button, a")).toBeNull();
    expect(staticImage.parentElement?.tagName).toBe("DIV");

    rerender(
      <GeneratedImageGallery
        images={images.slice(0, 1)}
        onOpenImage={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Preview 1" })).toBeTruthy();
  });

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

  it("releases the modal lock when an open preview loses all images", async () => {
    const renderPreview = (previewImages: GeneratedImageItem[]) => (
      <>
        <button type="button">Preview trigger</button>
        <ImagePreviewDialog
          images={previewImages}
          onOpenChange={vi.fn()}
          open
        />
      </>
    );
    const { rerender } = render(renderPreview([]));
    const trigger = screen.getByRole("button", { name: "Preview trigger" });
    trigger.focus();
    expect(document.body.style.overflow).toBe("");

    rerender(renderPreview(images.slice(0, 1)));
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close image preview" }),
    );

    rerender(renderPreview([]));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("inherits the nearest theme and dialog overlay ownership", () => {
    function Harness() {
      const [previewOpen, setPreviewOpen] = useState(false);
      return (
        <Dialog
          onOpenChange={vi.fn()}
          open
          theme="dark"
          title="Preview container"
        >
          <button onClick={() => setPreviewOpen(true)} type="button">
            Open nested preview
          </button>
          <ImagePreviewDialog
            images={images.slice(0, 1)}
            onOpenChange={setPreviewOpen}
            open={previewOpen}
          />
        </Dialog>
      );
    }

    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open nested preview" }),
    );
    const parentRoot = screen.getByRole("dialog", {
      name: "Preview container",
    }).parentElement!;
    const preview = screen.getByRole("dialog", { name: "Generated image" });
    expect(preview.getAttribute("data-theme")).toBe("dark");
    expect(preview.getAttribute("data-codex-ui-overlay-layer")).toBe("dialog");
    expect(preview.getAttribute("data-codex-ui-dialog-owner")).toBe(
      parentRoot.getAttribute("data-codex-ui-dialog-id"),
    );
  });

  it("inherits a scoped theme from the preview trigger", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div data-theme="light">
          <button onClick={() => setOpen(true)} type="button">
            Open themed preview
          </button>
          <ImagePreviewDialog
            images={images.slice(0, 1)}
            onOpenChange={setOpen}
            open={open}
          />
        </div>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open themed preview" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(
      screen
        .getByRole("dialog", { name: "Generated image" })
        .getAttribute("data-theme"),
    ).toBe("light");
  });
});
