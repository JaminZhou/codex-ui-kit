import { PdfPreviewPanel, type PdfPreviewZoom } from "codex-ui-kit";
import { GlobalWorkerOptions, getDocument, TextLayer, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import sampleUrl from "../fixtures/documents/design-spec.pdf?url";
import previewIcon from "./assets/preview-app-16.png";
import pdfAssets from "../../../research/current-pdf-assets.json";
import { VisualAssetIcon, type VisualAssetIconData } from "./VisualAssetIcon";

function pdfIcon(id: string) {
  const icon = pdfAssets.icons.find((icon) => icon.id === id);
  if (!icon) throw new Error(`Missing PDF glyph: ${id}`);
  return <VisualAssetIcon assetId={`pdf-${id}`} icon={icon as VisualAssetIconData} />;
}

GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({ page, scale, onError }: { page: PDFPageProxy; scale: number; onError: (message: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [paintedScale, setPaintedScale] = useState<number>();
  const viewport = page.getViewport({ scale });
  useEffect(() => {
    const canvas = canvasRef.current;
    const text = textRef.current;
    if (!canvas || !text) return;
    const target = page.getViewport({ scale });
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(target.width * ratio);
    canvas.height = Math.round(target.height * ratio);
    // Each scale mounts a fresh canvas, so a cancelled older task cannot paint it.
    const task = page.render({ canvas, viewport: target, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
    const layer = new TextLayer({ container: text, viewport: target, textContentSource: page.streamTextContent() });
    let active = true;
    Promise.all([task.promise, layer.render()]).then(() => {
      if (active) setPaintedScale(scale);
    }).catch((error: unknown) => {
      if (active) onError(error instanceof Error ? error.message : "PDF rendering failed");
    });
    return () => { active = false; task.cancel(); layer.cancel(); text.replaceChildren(); };
  }, [page, scale, onError]);
  return <div className="demo-pdf-page" data-pdf-page={page.pageNumber} data-painted={paintedScale === scale || undefined}
    style={{ width: Math.round(viewport.width), height: Math.round(viewport.height) }}>
    <canvas aria-label={`PDF page ${page.pageNumber}`} ref={canvasRef} />
    <div className="demo-pdf-text-layer" ref={textRef} style={{ "--total-scale-factor": scale } as CSSProperties} />
  </div>;
}

/** Private fixture renderer. Public UIKit neither fetches files nor depends on PDF.js. */
export function PdfWorkspacePreview({ initialZoom = "fit", initialAnnotating = false }: {
  initialZoom?: PdfPreviewZoom; initialAnnotating?: boolean;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState<PdfPreviewZoom>(initialZoom);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotating, setAnnotating] = useState(initialAnnotating);
  const [intent, setIntent] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setError(""); setPages([]); setDocument(undefined);
    const task = getDocument({ url: sampleUrl, useSystemFonts: true });
    task.promise.then(async (pdf) => {
      const loaded = await Promise.all(Array.from({ length: pdf.numPages }, (_, index) => pdf.getPage(index + 1)));
      if (active) { setDocument(pdf); setPages(loaded); }
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "PDF loading failed");
    });
    return () => { active = false; void task.destroy().catch(() => {}); };
  }, [attempt]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setWidth(viewport.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const pageWidth = pages[0]?.getViewport({ scale: 1 }).width ?? 595.2756;
  // The observed page box is integer-sized before deriving fit scale. Rounding
  // only the bitmap would keep its dimensions but change PDF glyph positions.
  const scale = zoom === "fit" ? Math.max(.01, Math.floor(width - 48) / pageWidth) : zoom / 100;
  const syncCurrentPage = () => {
    const viewport = viewportRef.current;
    if (!viewport || !pages.length) return;
    const rect = viewport.getBoundingClientRect();
    const elements = [...viewport.querySelectorAll<HTMLElement>("[data-pdf-page]")];
    // Largest visible page also handles the last page in a short viewport.
    let visible = -1;
    let selected = 1;
    elements.forEach((element, index) => {
      const pageRect = element.getBoundingClientRect();
      const height = Math.max(0, Math.min(rect.bottom, pageRect.bottom) - Math.max(rect.top, pageRect.top));
      if (height > visible) { visible = height; selected = index + 1; }
    });
    setCurrentPage(selected);
  };
  return <PdfPreviewPanel annotating={annotating} currentPage={currentPage} data-testid="current-pdf-preview"
    data-zoom={Math.round(scale * 100)} data-intent={intent} errorDescription={error}
    icons={{ previous: pdfIcon("previous"), next: pdfIcon("next"), annotate: pdfIcon(annotating ? "annotating" : "annotate"), chevron: pdfIcon("chevron"), options: pdfIcon("options"), download: pdfIcon("download"), open: <img alt="" className="demo-pdf-open-icon" src={previewIcon} /> }}
    onAnnotatingChange={setAnnotating} onDownload={() => setIntent("Replay: download requested")}
    onOpen={() => setIntent("Replay: external open requested")} onOpenOptions={() => setIntent("Replay: open options requested")}
    onPageChange={(page) => {
      const viewport = viewportRef.current;
      const element = viewport?.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`);
      if (!viewport || !element) return;
      viewport.scrollTop += element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      syncCurrentPage();
    }} onRetry={() => setAttempt((value) => value + 1)}
    onZoomChange={(value) => { setZoom(value); if (viewportRef.current) viewportRef.current.scrollTop = 0; setCurrentPage(1); }}
    openLabel="Open in Preview" pageCount={document?.numPages ?? 0}
    status={error ? "error" : pages.length && width ? "ready" : "loading"} title="design-spec"
    viewportProps={{ "aria-label": "PDF pages", onScroll: syncCurrentPage, tabIndex: 0 }} viewportRef={viewportRef} zoomPercent={scale * 100}>
    <div className="demo-pdf-pages">{pages.map((page) => <PdfPage key={`${page.pageNumber}:${scale}`} onError={setError} page={page} scale={scale} />)}</div>
  </PdfPreviewPanel>;
}
