import {
  Children,
  type AnchorHTMLAttributes,
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
import { acquireDocumentScrollLock } from "../internal/documentScrollLock.js";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment.js";

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

export interface CitationMentionProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  faviconSrc?: string;
  icon?: ReactNode;
  label: ReactNode;
  openLabel?: string;
}

export function CitationMention({
  className,
  faviconSrc,
  icon,
  label,
  openLabel,
  rel = "noopener noreferrer",
  target = "_blank",
  ...props
}: CitationMentionProps) {
  return (
    <a
      {...props}
      aria-label={openLabel}
      className={["codex-ui-citation-mention", className]
        .filter(Boolean)
        .join(" ")}
      data-inline-mention-interactive=""
      rel={rel}
      target={target}
    >
      <span className="codex-ui-citation-mention__body">
        {faviconSrc || icon ? (
          <span
            aria-hidden="true"
            className="codex-ui-citation-mention__icon"
          >
            {faviconSrc ? <img alt="" src={faviconSrc} /> : icon}
          </span>
        ) : null}
        <span className="codex-ui-citation-mention__label">{label}</span>
      </span>
    </a>
  );
}

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
          draggable={draggable}
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

export interface SourceActivityListProps {
  children?: ReactNode;
  className?: string;
  label?: string;
}

export function SourceActivityList({
  children,
  className,
  label = "Sources",
}: SourceActivityListProps) {
  return (
    <section
      aria-label={label}
      className={["codex-ui-source-activity-list", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

export interface SourceSearchActivityProps {
  className?: string;
  countLabel?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  leading?: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  queries: readonly string[];
  title?: ReactNode;
}

export function SourceSearchActivity({
  className,
  countLabel,
  defaultExpanded = false,
  expanded,
  leading,
  onExpandedChange,
  queries,
  title = "Web search",
}: SourceSearchActivityProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const isExpanded = expanded ?? internalExpanded;
  const resolvedCountLabel =
    countLabel ?? `Searched ${queries.length} ${queries.length === 1 ? "time" : "times"}`;
  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <div
      className={["codex-ui-source-search-activity", className]
        .filter(Boolean)
        .join(" ")}
      data-leading={leading ? true : undefined}
    >
      {leading ? (
        <span
          aria-hidden="true"
          className="codex-ui-source-search-activity__leading"
        >
          {leading}
        </span>
      ) : null}
      <div className="codex-ui-source-search-activity__body">
        <h3 className="codex-ui-source-search-activity__title">{title}</h3>
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          className="codex-ui-source-search-activity__trigger"
          onClick={() => setExpanded(!isExpanded)}
          type="button"
        >
          <span>{resolvedCountLabel}</span>
          <svg
            aria-hidden="true"
            className="codex-ui-source-search-activity__chevron"
            data-expanded={isExpanded || undefined}
            viewBox="0 0 20 20"
          >
            <path d="m7.5 4.75 5.25 5.25-5.25 5.25" />
          </svg>
        </button>
        {isExpanded ? (
          <ol className="codex-ui-source-search-activity__queries" id={contentId}>
            {queries.map((query, index) => (
              <li key={`${query}:${index}`}>{query}</li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
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
  className?: string;
  closeLabel?: string;
  downloadable?: boolean;
  downloadLabel?: string;
  editLabel?: string;
  imageId?: string | null;
  images: GeneratedImageItem[];
  immersiveCaption?: ReactNode;
  immersiveInitialFocus?: "close" | "dialog" | "first-action";
  nextLabel?: string;
  onDownload?: (image: GeneratedImageItem) => void;
  onEdit?: (image: GeneratedImageItem) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  previousLabel?: string;
  presentation?: "dialog" | "immersive";
  title?: ReactNode;
  zoomInLabel?: string;
  zoomOutLabel?: string;
}

function ImagePreviewDownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M2.66831 12.6664V12.5004C2.66831 12.1331 2.96607 11.8353 3.33334 11.8353C3.70061 11.8353 3.99838 12.1331 3.99838 12.5004V12.6664C3.99838 13.3773 3.99929 13.8708 4.03061 14.2543C4.0613 14.6299 4.11812 14.8414 4.19858 14.9994L4.26889 15.1263C4.4452 15.4138 4.69823 15.6482 5.00034 15.8021L5.13022 15.8578C5.27399 15.9092 5.4635 15.9471 5.74545 15.9701C6.12897 16.0014 6.62231 16.0013 7.33334 16.0013H12.6664C13.3772 16.0013 13.8708 16.0014 14.2542 15.9701C14.6296 15.9394 14.8414 15.8825 14.9994 15.8021L15.1263 15.7308C15.4137 15.5545 15.6482 15.3014 15.8021 14.9994L15.8578 14.8695C15.9092 14.7258 15.947 14.5361 15.9701 14.2543C16.0014 13.8708 16.0013 13.3772 16.0013 12.6664V12.5004C16.0013 12.1332 16.2992 11.8355 16.6664 11.8353C17.0336 11.8353 17.3314 12.1331 17.3314 12.5004V12.6664C17.3314 13.3554 17.332 13.9125 17.2953 14.3627C17.2625 14.7636 17.1975 15.1248 17.0531 15.4613L16.9867 15.6039C16.7212 16.1248 16.3173 16.5606 15.8216 16.8646L15.6039 16.9867C15.2271 17.1787 14.8206 17.2579 14.3626 17.2953C13.9124 17.3321 13.3554 17.3314 12.6664 17.3314H7.33334C6.64425 17.3314 6.0873 17.3321 5.63706 17.2953C5.23651 17.2626 4.87562 17.1982 4.5394 17.0541L4.39682 16.9867C3.8757 16.7212 3.4392 16.3175 3.1351 15.8217L3.01303 15.6039C2.82106 15.2271 2.74186 14.8207 2.70444 14.3627C2.66767 13.9125 2.66831 13.3554 2.66831 12.6664ZM9.3353 3.33337C9.3353 2.9661 9.63307 2.66833 10.0003 2.66833C10.3675 2.66851 10.6654 2.96621 10.6654 3.33337V10.8939L12.8626 8.69666L12.9671 8.61169C13.2253 8.44097 13.5767 8.4693 13.804 8.69666C14.0634 8.95633 14.0635 9.37748 13.804 9.63708L10.4701 12.9701C10.3454 13.0947 10.1766 13.1653 10.0003 13.1654C9.82397 13.1654 9.65434 13.0948 9.52963 12.9701L6.19663 9.63708L6.11166 9.53259C5.9411 9.27445 5.96934 8.92394 6.19663 8.69666C6.42392 8.46937 6.77442 8.44113 7.03256 8.61169L7.13705 8.69666L9.3353 10.8949V3.33337Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ImagePreviewEditIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path
        d="M11.7313 4.20472C13.1489 2.92391 15.3377 2.96644 16.7039 4.33265L16.8318 4.46742C18.0713 5.8393 18.0713 7.93343 16.8318 9.30531L16.7039 9.44007L10.4119 15.7311C10.0884 16.0546 9.85387 16.2917 9.62188 16.4821L9.3875 16.6588C9.18236 16.799 8.96432 16.9196 8.73711 17.0192L8.50762 17.1119C8.32585 17.1785 8.13845 17.2266 7.92168 17.2711L7.15703 17.4069L4.76348 17.8053C4.62062 17.8291 4.46916 17.8552 4.34063 17.8649C4.24185 17.8723 4.10835 17.875 3.9627 17.8395L3.81426 17.7907C3.59124 17.695 3.40749 17.5271 3.2918 17.316L3.2459 17.2223C3.1596 17.0209 3.16176 16.8276 3.17168 16.6959C3.18138 16.5674 3.20744 16.4159 3.23125 16.2731L3.62969 13.8795L3.76445 13.1149C3.80902 12.898 3.85797 12.7108 3.92461 12.5289L4.01738 12.2985C4.11693 12.0715 4.23774 11.854 4.37774 11.6491L4.55352 11.4147C4.74395 11.1825 4.98173 10.9484 5.30547 10.6246L11.5965 4.33265L11.7313 4.20472ZM6.2459 11.5651C5.89673 11.9142 5.71261 12.0998 5.58672 12.2526L5.47539 12.3991C5.38197 12.5358 5.30159 12.6812 5.23516 12.8327L5.17363 12.9869C5.1333 13.0971 5.1025 13.2125 5.06817 13.3815L4.94121 14.0983L4.54277 16.4918L4.5418 16.4938H4.54473L6.93828 16.0944L7.65508 15.9684C7.82408 15.9341 7.93949 15.9033 8.04961 15.8629L8.20293 15.8014C8.35464 15.7349 8.49956 15.6538 8.63652 15.5602L8.78399 15.4498C8.93677 15.3239 9.12233 15.1398 9.47149 14.7907L14.4588 9.80238L11.2332 6.57679L6.2459 11.5651ZM15.7635 5.27308C14.9282 4.43776 13.6058 4.38573 12.7098 5.11683L12.5369 5.27308L12.1736 5.63636L15.4002 8.86195L15.7635 8.49964L15.9197 8.32581C16.6016 7.48961 16.6016 6.28311 15.9197 5.44691L15.7635 5.27308Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ImagePreviewCloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path
        d="M14.6549 5.57307C14.9283 5.2997 15.3718 5.2997 15.6451 5.57307C15.9185 5.84643 15.9185 6.28993 15.6451 6.5633L11.3903 10.8182L15.6451 15.0731L15.735 15.1834C15.9141 15.4551 15.8842 15.8242 15.6451 16.0633C15.4061 16.3024 15.0369 16.3322 14.7653 16.1531L14.6549 16.0633L10.4 11.8084L6.14515 16.0633C5.87178 16.3367 5.42828 16.3367 5.15492 16.0633C4.88155 15.7899 4.88155 15.3464 5.15492 15.0731L9.4098 10.8182L5.15492 6.5633L5.06507 6.45295C4.88597 6.18128 4.91584 5.81214 5.15492 5.57307C5.39399 5.33399 5.76313 5.30413 6.0348 5.48322L6.14515 5.57307L10.4 9.82795L14.6549 5.57307Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ImagePreviewZoomOutIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 10.0002C3.5 9.63297 3.79777 9.33521 4.16504 9.33521H15.835C16.2022 9.33521 16.5 9.63297 16.5 10.0002C16.5 10.3675 16.2022 10.6652 15.835 10.6652H4.16504C3.79777 10.6652 3.5 10.3675 3.5 10.0002Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ImagePreviewZoomInIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5L16.6338 9.34863C16.9369 9.41057 17.165 9.67857 17.165 10C17.165 10.3214 16.9369 10.5894 16.6338 10.6514L16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ImagePreviewDialog({
  className,
  closeLabel = "Close image preview",
  downloadable = true,
  downloadLabel = "Download",
  editLabel = "Edit image",
  imageId,
  images,
  immersiveCaption,
  immersiveInitialFocus = "dialog",
  nextLabel = "Next image",
  onDownload,
  onEdit,
  onOpenChange,
  open,
  previousLabel = "Previous image",
  presentation = "dialog",
  title = "Generated image",
  zoomInLabel = "Zoom in image",
  zoomOutLabel = "Zoom out image",
}: ImagePreviewDialogProps) {
  const titleId = useId();
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const requestedIndex = imageId ? images.findIndex((image) => image.id === imageId) : 0;
  const [activeIndex, setActiveIndex] = useState(Math.max(0, requestedIndex));
  const [intrinsicSize, setIntrinsicSize] = useState({ height: 0, width: 0 });
  const [zoomScale, setZoomScale] = useState(100);
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

  useLayoutEffect(() => {
    if (!visible || presentation !== "immersive") return;
    const stage = previewStageRef.current;
    const image = previewImageRef.current;
    if (!stage || !image) return;
    const updateFit = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const nextFit = Math.max(
        1,
        Math.min(
          100,
          Math.min(
            stage.clientWidth / image.naturalWidth,
            stage.clientHeight / image.naturalHeight,
          ) * 100,
        ),
      );
      setIntrinsicSize({ height: image.naturalHeight, width: image.naturalWidth });
      setZoomScale(nextFit);
    };
    updateFit();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateFit);
    observer?.observe(stage);
    window.addEventListener("resize", updateFit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [activeIndex, presentation, visible]);

  useEffect(() => {
    if (!visible || typeof document === "undefined") return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const modalLock = acquireDocumentScrollLock({
      containsFocus: (target) => previewRef.current?.contains(target) ?? false,
      getInitialFocus: () =>
        presentation === "immersive"
          ? immersiveInitialFocus === "dialog"
            ? previewRef.current
            : immersiveInitialFocus === "first-action"
              ? firstActionRef.current ?? closeRef.current
              : closeRef.current
          : closeRef.current,
      priority: 1200,
      returnFocus: returnFocusRef.current,
    });
    if (modalLock.isTop()) {
      (presentation === "immersive"
        ? immersiveInitialFocus === "dialog"
          ? previewRef.current
          : immersiveInitialFocus === "first-action"
            ? firstActionRef.current ?? closeRef.current
            : closeRef.current
        : closeRef.current)?.focus();
    }
    return () => {
      modalLock.release()?.focus();
    };
  }, [immersiveInitialFocus, presentation, visible]);

  if (!visible || typeof document === "undefined") return null;
  const activeImage = images[Math.min(activeIndex, images.length - 1)];
  if (!activeImage) return null;
  const displayedHeight = intrinsicSize.height || activeImage.height || 0;
  const displayedWidth = intrinsicSize.width || activeImage.width || 0;

  const downloadActiveImage = () => {
    if (onDownload) {
      onDownload(activeImage);
      return;
    }
    const source = activeImage.downloadSrc ?? activeImage.src;
    if (!source) return;
    const anchor = document.createElement("a");
    anchor.download = "";
    anchor.href = source;
    anchor.click();
  };

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
      if (
        event.shiftKey &&
        (!focusInside ||
          document.activeElement === event.currentTarget ||
          document.activeElement === first)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusInside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  if (presentation === "immersive") {
    return createPortal(
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={["codex-ui-image-preview", className]
          .filter(Boolean)
          .join(" ")}
        data-codex-ui-dialog-owner={overlayEnvironment.ownerId}
        data-codex-ui-overlay-layer={overlayEnvironment.layer}
        data-image-source-empty={!activeImage.src || undefined}
        data-presentation="immersive"
        data-theme={portalTheme}
        onKeyDown={handleKeyDown}
        ref={previewRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-hidden="true"
          className="codex-ui-image-preview__backdrop"
          onClick={() => onOpenChange(false)}
          tabIndex={-1}
          type="button"
        />
        <div className="codex-ui-image-preview__immersive-surface">
          <h2 className="codex-ui-image-preview__sr-only" id={titleId}>
            {title}
          </h2>
          <div className="codex-ui-image-preview__immersive-actions">
            {onEdit ? (
              <button
                aria-label={editLabel}
                data-edit-action=""
                onClick={() => onEdit(activeImage)}
                ref={firstActionRef}
                type="button"
              >
                <ImagePreviewEditIcon />
              </button>
            ) : null}
            {downloadable && (activeImage.downloadSrc ?? activeImage.src) ? (
              <button
                aria-label={downloadLabel}
                onClick={downloadActiveImage}
                type="button"
              >
                <ImagePreviewDownloadIcon />
              </button>
            ) : null}
            <button
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
              ref={closeRef}
              type="button"
            >
              <ImagePreviewCloseIcon />
            </button>
          </div>
          <div
            className="codex-ui-image-preview__immersive-stage"
            ref={previewStageRef}
          >
            <img
              alt={activeImage.alt ?? `Generated image ${activeIndex + 1}`}
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                const stage = previewStageRef.current;
                if (!stage || !image.naturalWidth || !image.naturalHeight) return;
                const fit = Math.max(
                  1,
                  Math.min(
                    100,
                    Math.min(
                      stage.clientWidth / image.naturalWidth,
                      stage.clientHeight / image.naturalHeight,
                    ) * 100,
                  ),
                );
                setIntrinsicSize({
                  height: image.naturalHeight,
                  width: image.naturalWidth,
                });
                setZoomScale(fit);
              }}
              ref={previewImageRef}
              referrerPolicy="no-referrer"
              src={activeImage.src || undefined}
              style={
                displayedWidth > 0
                  ? {
                      height: `${(displayedHeight * zoomScale) / 100}px`,
                      width: `${(displayedWidth * zoomScale) / 100}px`,
                    }
                  : undefined
              }
            />
          </div>
          {immersiveCaption ? (
            <div className="codex-ui-image-preview__immersive-caption">
              {immersiveCaption}
            </div>
          ) : null}
          <div className="codex-ui-image-preview__zoom-toolbar">
            <button
              aria-label={zoomOutLabel}
              disabled={zoomScale <= 10}
              onClick={() =>
                setZoomScale((current) => Math.max(10, current / 1.2))
              }
              type="button"
            >
              <ImagePreviewZoomOutIcon />
            </button>
            <span>{Math.round(zoomScale)}%</span>
            <button
              aria-label={zoomInLabel}
              disabled={zoomScale >= 400}
              onClick={() =>
                setZoomScale((current) => Math.min(400, current * 1.2))
              }
              type="button"
            >
              <ImagePreviewZoomInIcon />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

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
