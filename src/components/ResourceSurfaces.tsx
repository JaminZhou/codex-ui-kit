import {
  Children,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { acquireDocumentScrollLock } from "../internal/documentScrollLock";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment";

export type ResourceKind =
  | "app"
  | "document"
  | "drive"
  | "external"
  | "file"
  | "image"
  | "presentation"
  | "spreadsheet"
  | "website";

export interface ResourceCardProps {
  action?: ReactNode;
  className?: string;
  disabled?: boolean;
  draggable?: boolean;
  href?: string;
  hoverLabel?: ReactNode;
  icon?: ReactNode;
  kind?: ResourceKind;
  onDragStart?: React.DragEventHandler<HTMLElement>;
  onOpen?: () => void;
  openLabel?: string;
  previewSrc?: string;
  subtitle?: ReactNode;
  target?: string;
  title: ReactNode;
}

const resourceGlyphs: Record<ResourceKind, string> = {
  app: "◇",
  document: "≡",
  drive: "△",
  external: "↗",
  file: "⌑",
  image: "▧",
  presentation: "▻",
  spreadsheet: "▦",
  website: "◎",
};

export function ResourceCard({
  action,
  className,
  disabled = false,
  draggable,
  href,
  hoverLabel,
  icon,
  kind = "file",
  onDragStart,
  onOpen,
  openLabel,
  previewSrc,
  subtitle,
  target,
  title,
}: ResourceCardProps) {
  const classes = ["codex-ui-resource-card", className]
    .filter(Boolean)
    .join(" ");
  const hasOpenAction = Boolean(href || onOpen);
  const accessibleOpenLabel =
    openLabel ?? (typeof title === "string" ? `Open ${title}` : "Open resource");
  const commonProps = {
    "aria-label": accessibleOpenLabel,
    className: "codex-ui-resource-card__open",
    onClick: onOpen,
  };

  return (
    <article
      className={classes}
      data-disabled={disabled || undefined}
      data-interactive={(hasOpenAction && !disabled) || undefined}
      data-kind={kind}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {href && !disabled ? (
        <a
          {...commonProps}
          href={href}
          rel={target === "_blank" ? "noreferrer" : undefined}
          target={target}
        />
      ) : hasOpenAction ? (
        <button {...commonProps} disabled={disabled} type="button" />
      ) : null}
      <span className="codex-ui-resource-card__visual" aria-hidden="true">
        {previewSrc ? (
          <img alt="" draggable={false} src={previewSrc} />
        ) : (
          icon ?? <span>{resourceGlyphs[kind]}</span>
        )}
      </span>
      <span className="codex-ui-resource-card__content">
        <span className="codex-ui-resource-card__title">{title}</span>
        {subtitle || hoverLabel ? (
          <span className="codex-ui-resource-card__meta">
            {subtitle ? (
              <span className="codex-ui-resource-card__subtitle">{subtitle}</span>
            ) : null}
            {hoverLabel ? (
              <span className="codex-ui-resource-card__hover-label">
                {hoverLabel}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {action ? (
        <span
          className="codex-ui-resource-card__action"
          draggable={false}
          onDragStart={(event) => event.stopPropagation()}
        >
          {action}
        </span>
      ) : null}
    </article>
  );
}

export interface ResourceListProps {
  children?: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  expandLabel?: (remaining: number) => ReactNode;
  initialVisibleCount?: number;
}

export function ResourceList({
  children,
  className,
  defaultExpanded = false,
  expandLabel = (remaining) => `Show ${remaining} more`,
  initialVisibleCount = 3,
}: ResourceListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const items = Children.toArray(children);
  const visibleCount = Math.max(0, initialVisibleCount);
  const visibleItems = expanded ? items : items.slice(0, visibleCount);
  const remaining = Math.max(0, items.length - visibleItems.length);

  if (items.length === 0) return null;

  return (
    <div
      className={["codex-ui-resource-list", className].filter(Boolean).join(" ")}
    >
      <div className="codex-ui-resource-list__items">{visibleItems}</div>
      {remaining > 0 ? (
        <button
          className="codex-ui-resource-list__expand"
          onClick={() => setExpanded(true)}
          type="button"
        >
          {expandLabel(remaining)}
        </button>
      ) : null}
    </div>
  );
}

export interface ArtifactListProps extends ResourceListProps {
  emptyLabel?: ReactNode;
}

export function ArtifactList({
  children,
  emptyLabel = "No artifacts yet",
  ...props
}: ArtifactListProps) {
  if (Children.count(children) === 0) {
    return <p className="codex-ui-artifact-list__empty">{emptyLabel}</p>;
  }
  return <ResourceList {...props}>{children}</ResourceList>;
}

export type SourceKind = "external" | "file" | "tool" | "web";

export interface SourceItem {
  href?: string;
  icon?: ReactNode;
  id: string;
  kind?: SourceKind;
  meta?: ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  previewSrc?: string;
  title: ReactNode;
}

export interface SourceListProps {
  className?: string;
  defaultExpanded?: boolean;
  items: SourceItem[];
  title?: ReactNode;
  viewAllLabel?: ReactNode;
  visibleLimit?: number;
}

const sourceGlyphs: Record<SourceKind, string> = {
  external: "↗",
  file: "⌑",
  tool: "◇",
  web: "◎",
};

export function SourceList({
  className,
  defaultExpanded = false,
  items,
  title = "Sources",
  viewAllLabel = "View all",
  visibleLimit = 3,
}: SourceListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visibleItems = expanded ? items : items.slice(0, Math.max(0, visibleLimit));
  if (items.length === 0) return null;

  return (
    <section
      aria-label={typeof title === "string" ? title : "Sources"}
      className={["codex-ui-source-list", className].filter(Boolean).join(" ")}
    >
      <div className="codex-ui-source-list__header">
        <h3>{title}</h3>
        {!expanded && items.length > visibleItems.length ? (
          <button onClick={() => setExpanded(true)} type="button">
            {viewAllLabel}
          </button>
        ) : null}
      </div>
      <ol className="codex-ui-source-list__items">
        {visibleItems.map((item) => {
          const interactive = Boolean(item.href || item.onOpen);
          const content = (
            <>
              <span className="codex-ui-source-list__visual" aria-hidden="true">
                {item.previewSrc ? (
                  <img alt="" draggable={false} src={item.previewSrc} />
                ) : (
                  item.icon ?? <span>{sourceGlyphs[item.kind ?? "external"]}</span>
                )}
              </span>
              <span className="codex-ui-source-list__content">
                <span className="codex-ui-source-list__title">{item.title}</span>
                {item.meta ? (
                  <span className="codex-ui-source-list__meta">{item.meta}</span>
                ) : null}
              </span>
              {interactive ? (
                <span className="codex-ui-source-list__arrow" aria-hidden="true">
                  ↗
                </span>
              ) : null}
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <a
                  aria-label={item.openLabel}
                  href={item.href}
                  onClick={item.onOpen}
                >
                  {content}
                </a>
              ) : item.onOpen ? (
                <button
                  aria-label={item.openLabel}
                  onClick={item.onOpen}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <div className="codex-ui-source-list__item">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export interface GeneratedImageItem {
  alt?: string;
  downloadSrc?: string;
  height?: number;
  id: string;
  src: string;
  width?: number;
}

export interface GeneratedImageGalleryProps {
  className?: string;
  images: GeneratedImageItem[];
  nextLabel?: string;
  onOpenImage?: (image: GeneratedImageItem, index: number) => void;
  pendingCount?: number;
  previousLabel?: string;
}

interface GeneratedImageMediaProps {
  alt: string;
  onDimensions?: (width: number, height: number) => void;
  src: string;
}

function GeneratedImageMedia({
  alt,
  onDimensions,
  src,
}: GeneratedImageMediaProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <span
        aria-label={`${alt} unavailable`}
        className="codex-ui-generated-image-gallery__error"
        role="img"
      >
        <span aria-hidden="true">!</span>
      </span>
    );
  }

  return (
    <img
      alt={alt}
      draggable={false}
      key={`${src}-${attempt}`}
      onError={() => {
        if (attempt < 2) {
          setAttempt((current) => current + 1);
        } else {
          setFailed(true);
        }
      }}
      onLoad={(event) => {
        const { naturalHeight, naturalWidth } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) {
          onDimensions?.(naturalWidth, naturalHeight);
        }
      }}
      referrerPolicy="no-referrer"
      src={src}
    />
  );
}

interface GalleryLayout {
  height: number;
  square: boolean;
  widths: number[];
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function getGalleryLayout(
  images: GeneratedImageItem[],
  pendingCount: number,
  containerWidth: number,
): GalleryLayout {
  const width = Math.max(0, containerWidth);
  const totalCount = images.length + pendingCount;
  if (totalCount <= 1) {
    const image = images[0];
    const ratio = image?.width && image.height ? image.width / image.height : 1;
    const itemWidth = Math.min(400, width || 400);
    return { height: itemWidth / Math.max(0.25, ratio), square: false, widths: [itemWidth] };
  }

  const slot = Math.max(1, (width - 24) / 4);
  const ratios = images.map((image) =>
    image.width && image.height ? image.width / image.height : 1,
  );
  const naturalWidths = [
    ...ratios.map((ratio) => slot * Math.max(0.25, Math.min(4, ratio))),
    ...Array.from({ length: pendingCount }, () => slot),
  ];
  const naturalTotal = naturalWidths.reduce((sum, value) => sum + value, 0) +
    Math.max(0, totalCount - 1) * 8;
  if (naturalTotal <= width) {
    return { height: slot, square: false, widths: naturalWidths };
  }
  return {
    height: slot,
    square: true,
    widths: Array.from({ length: totalCount }, () => slot),
  };
}

export function GeneratedImageGallery({
  className,
  images,
  nextLabel = "Next images",
  onOpenImage,
  pendingCount = 0,
  previousLabel = "Previous images",
}: GeneratedImageGalleryProps) {
  const safePendingCount = Math.max(0, Math.floor(pendingCount));
  const placeholderCount =
    safePendingCount > 0
      ? Math.max(safePendingCount, Math.max(0, 4 - images.length))
      : 0;
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [startIndex, setStartIndex] = useState(0);
  const [intrinsicDimensions, setIntrinsicDimensions] = useState<
    Record<string, { height: number; width: number }>
  >({});
  const totalCount = images.length + placeholderCount;
  const maxStart = Math.max(0, totalCount - 4);
  const measuredImages = useMemo(
    () =>
      images.map((image) => ({
        ...image,
        height: image.height ?? intrinsicDimensions[image.id]?.height,
        width: image.width ?? intrinsicDimensions[image.id]?.width,
      })),
    [images, intrinsicDimensions],
  );
  const layout = useMemo(
    () => getGalleryLayout(measuredImages, placeholderCount, width),
    [measuredImages, placeholderCount, width],
  );

  useEffect(() => {
    setStartIndex((current) => Math.min(current, maxStart));
  }, [maxStart]);

  if (totalCount === 0) return null;
  const offset = layout.widths
    .slice(0, startIndex)
    .reduce((sum, itemWidth) => sum + itemWidth + 8, 0);
  const overflowCount = Math.max(0, totalCount - 4);
  const style = {
    "--codex-ui-gallery-height": `${layout.height}px`,
    "--codex-ui-gallery-offset": `${offset}px`,
  } as CSSProperties;

  return (
    <div
      className={["codex-ui-generated-image-gallery", className]
        .filter(Boolean)
        .join(" ")}
      ref={containerRef}
      style={style}
    >
      <div className="codex-ui-generated-image-gallery__viewport">
        <div className="codex-ui-generated-image-gallery__track">
          {images.map((image, index) => {
            const hidden = index < startIndex || index >= startIndex + 4;
            const media = (
              <GeneratedImageMedia
                alt={image.alt ?? `Generated image ${index + 1}`}
                onDimensions={(naturalWidth, naturalHeight) => {
                  if (image.width && image.height) return;
                  setIntrinsicDimensions((current) => {
                    const existing = current[image.id];
                    if (
                      existing?.width === naturalWidth &&
                      existing.height === naturalHeight
                    ) {
                      return current;
                    }
                    return {
                      ...current,
                      [image.id]: {
                        height: naturalHeight,
                        width: naturalWidth,
                      },
                    };
                  });
                }}
                src={image.src}
              />
            );
            const imageProps = {
              "aria-hidden": hidden || undefined,
              className: "codex-ui-generated-image-gallery__image",
              "data-square": layout.square || undefined,
              inert: hidden,
              style: { width: layout.widths[index] },
            };

            return onOpenImage ? (
              <button
                {...imageProps}
                aria-label={image.alt ?? `Generated image ${index + 1}`}
                key={image.id}
                onClick={() => onOpenImage(image, index)}
                tabIndex={hidden ? -1 : 0}
                type="button"
              >
                {media}
              </button>
            ) : (
              <div {...imageProps} key={image.id}>
                {media}
              </div>
            );
          })}
          {Array.from({ length: placeholderCount }, (_, index) => (
            <span
              aria-label="Generating image"
              className="codex-ui-generated-image-gallery__placeholder"
              key={`pending-${index}`}
              role="status"
              style={{ width: layout.widths[images.length + index] }}
            />
          ))}
        </div>
      </div>
      {overflowCount > 0 ? (
        <div className="codex-ui-generated-image-gallery__controls">
          <span className="codex-ui-generated-image-gallery__overflow">
            +{overflowCount}
          </span>
          <div className="codex-ui-generated-image-gallery__paging">
            <button
              aria-label={previousLabel}
              disabled={startIndex === 0}
              onClick={() => setStartIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label={nextLabel}
              disabled={startIndex >= maxStart}
              onClick={() =>
                setStartIndex((current) => Math.min(maxStart, current + 1))
              }
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export interface ImagePreviewDialogProps {
  closeLabel?: string;
  downloadLabel?: string;
  imageId?: string | null;
  images: GeneratedImageItem[];
  nextLabel?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  previousLabel?: string;
  title?: ReactNode;
}

export function ImagePreviewDialog({
  closeLabel = "Close image preview",
  downloadLabel = "Download",
  imageId,
  images,
  nextLabel = "Next image",
  onOpenChange,
  open,
  previousLabel = "Previous image",
  title = "Generated image",
}: ImagePreviewDialogProps) {
  const titleId = useId();
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const requestedIndex = imageId ? images.findIndex((image) => image.id === imageId) : 0;
  const [activeIndex, setActiveIndex] = useState(Math.max(0, requestedIndex));
  const visible = open && images.length > 0;
  const portalTheme = overlayEnvironment.theme ?? inferredTheme;

  useLayoutEffect(() => {
    if (
      !visible ||
      overlayEnvironment.theme !== undefined ||
      typeof document === "undefined"
    ) {
      return;
    }
    const activeElement = document.activeElement;
    setInferredTheme(
      activeElement instanceof Element
        ? activeElement.closest<HTMLElement>("[data-theme]")?.dataset.theme
        : undefined,
    );
  }, [overlayEnvironment.theme, visible]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, requestedIndex));
  }, [open, requestedIndex]);

  useEffect(() => {
    setActiveIndex((current) =>
      Math.max(0, Math.min(current, images.length - 1)),
    );
  }, [images.length]);

  useEffect(() => {
    if (!visible || typeof document === "undefined") return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const modalLock = acquireDocumentScrollLock({
      containsFocus: (target) => previewRef.current?.contains(target) ?? false,
      getInitialFocus: () => closeRef.current,
      priority: 1200,
      returnFocus: returnFocusRef.current,
    });
    if (modalLock.isTop()) closeRef.current?.focus();
    return () => {
      modalLock.release()?.focus();
    };
  }, [visible]);

  if (!visible || typeof document === "undefined") return null;
  const activeImage = images[Math.min(activeIndex, images.length - 1)];
  if (!activeImage) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(images.length - 1, current + 1));
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const focusInside = event.currentTarget.contains(document.activeElement);
      if (event.shiftKey && (!focusInside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusInside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="codex-ui-image-preview"
      data-codex-ui-dialog-owner={overlayEnvironment.ownerId}
      data-codex-ui-overlay-layer={overlayEnvironment.layer}
      data-theme={portalTheme}
      onKeyDown={handleKeyDown}
      ref={previewRef}
      role="dialog"
    >
      <button
        aria-label="Dismiss image preview"
        className="codex-ui-image-preview__backdrop"
        onClick={() => onOpenChange(false)}
        tabIndex={-1}
        type="button"
      />
      <div className="codex-ui-image-preview__dialog">
        <header className="codex-ui-image-preview__header">
          <h2 id={titleId}>{title}</h2>
          <div>
            {activeImage.downloadSrc ?? activeImage.src ? (
              <a download href={activeImage.downloadSrc ?? activeImage.src}>
                {downloadLabel}
              </a>
            ) : null}
            <button
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
              ref={closeRef}
              type="button"
            >
              ×
            </button>
          </div>
        </header>
        <div className="codex-ui-image-preview__stage">
          <img
            alt={activeImage.alt ?? `Generated image ${activeIndex + 1}`}
            referrerPolicy="no-referrer"
            src={activeImage.src}
          />
          {images.length > 1 ? (
            <>
              <button
                aria-label={previousLabel}
                className="codex-ui-image-preview__previous"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label={nextLabel}
                className="codex-ui-image-preview__next"
                disabled={activeIndex === images.length - 1}
                onClick={() =>
                  setActiveIndex((current) => Math.min(images.length - 1, current + 1))
                }
                type="button"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
