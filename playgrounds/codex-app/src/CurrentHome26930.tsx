import {
  ComposerContextBar,
  ComposerContextControl,
  ComposerDock,
  ComposerEditor,
  IconButton,
} from "codex-ui-kit";
import { CurrentBuildIcon } from "./currentBuildIcons";
import { CurrentHomeObservedIcon } from "./CurrentHomeObservedIcon";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

const REFERENCE_ASSET_BASE = "local-reference-assets/26.930.31730/";

function LocalReferenceGlyph({
  fileName,
  fallbackGlyph,
  size = 16,
  className,
  assetStatus,
}: {
  fileName: string;
  fallbackGlyph: string;
  size?: number;
  className?: string;
  assetStatus?: string;
}) {
  const [loadState, setLoadState] = useState<"pending" | "loaded" | "missing">(
    "pending",
  );
  const url = new URL(`${REFERENCE_ASSET_BASE}${fileName}`, document.baseURI).href;
  const maskStyle: CSSProperties = {
    height: size,
    maskImage: `url("${url}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    WebkitMaskImage: `url("${url}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    width: size,
  };

  return (
    <span
      aria-hidden="true"
      className={[
        "demo-current-home-composer-26-930__reference-glyph",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-local-reference-asset={fileName}
      data-local-reference-load-state={loadState}
      data-glyph={fallbackGlyph}
      data-asset-status={assetStatus}
      style={{ "--reference-glyph-size": `${size}px` } as CSSProperties}
    >
      {loadState === "loaded" ? (
        <span
          className="demo-current-home-composer-26-930__reference-mask"
          style={maskStyle}
        />
      ) : (
        <span
          className="demo-current-home-composer-26-930__glyph-placeholder"
          data-glyph={fallbackGlyph}
        />
      )}
      <img
        alt=""
        aria-hidden="true"
        className="demo-current-home-composer-26-930__reference-probe"
        onError={() => setLoadState("missing")}
        onLoad={() => setLoadState("loaded")}
        src={url}
      />
    </span>
  );
}

/**
 * Build-scoped Home / Composer replay; turn lifecycle remains synthetic.
 *
 * Geometry and control placement follow the 26.930.31730 capture. When the
 * optional hash-verified SVG candidates have been extracted locally, this
 * historical fixture renders them from a gitignored folder. The .61225 scene
 * uses observed public Home/Add/Dictate/Voice vectors in the private playground;
 * context/model glyphs and non-rest product states remain unverified.
 * The deterministic local turn lifecycle does not call App Server.
 */
export function CurrentHome26930({ currentBuild = "26.930.31730", theme = "dark" }: {
  currentBuild?: "26.930.31730" | "26.930.61225";
  theme?: "dark" | "light" | "system";
}) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);
  const iconTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  const editorRef = useRef<HTMLDivElement>(null);
  const turnIdRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<
    Array<{ id: number; prompt: string; response: string | null }>
  >([]);
  const pendingTurn = turns.at(-1);
  const lifecycleState =
    turns.length === 0
      ? "home"
      : pendingTurn?.response === null
        ? "streaming"
        : "completed";

  useEffect(() => {
    if (lifecycleState !== "streaming" || !pendingTurn) return;
    const pendingId = pendingTurn.id;
    // Keep the synthetic streaming state observable in slower virtualized
    // Electron runners before the deterministic response completes.
    const timer = window.setTimeout(() => {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId
            ? {
                ...turn,
                response:
                  "This is a deterministic synthetic response for the Composer lifecycle replay.",
              }
            : turn,
        ),
      );
    }, 900);
    return () => window.clearTimeout(timer);
  }, [lifecycleState, pendingTurn]);

  const sendDraft = () => {
    const prompt = editorRef.current?.innerText.trim() ?? "";
    if (prompt.length === 0 || lifecycleState === "streaming") return;
    const id = ++turnIdRef.current;
    setTurns((current) => [...current, { id, prompt, response: null }]);
    setDraft("");
    if (editorRef.current) editorRef.current.replaceChildren();
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    sendDraft();
  };

  const startNewConversation = () => {
    setTurns([]);
    setDraft("");
    turnIdRef.current = 0;
    if (editorRef.current) editorRef.current.replaceChildren();
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  return (
    <section
      aria-label="Current Home and Composer structural and synthetic replay"
      className="demo-current-home-composer-26-930"
      data-current-build={currentBuild}
      data-asset-reference-build={currentBuild}
      data-copy-status="synthetic"
      data-lifecycle-evidence="local-synthetic-only; no App Server turn"
      data-lifecycle-state={lifecycleState}
      data-scene-status={currentBuild === "26.930.61225" ? "observed-empty-home-geometry-and-four-rest-control-vectors; lifecycle-and-other-assets-unverified" : "observed-geometry-home-mark-path-match-remaining-assets-and-product-pixels-unverified"}
      data-visual-asset-status={currentBuild === "26.930.61225" ? "four-runtime-observed-rest-control-vectors; context-model-candidates-unverified" : "home-mark-reuses-existing-four-path-match; five-optional-local-candidates-remain; tint-and-product-pixels-unverified"}
    >
      {turns.length === 0 ? (
        <div
          className="demo-current-home-composer-26-930__welcome"
          data-home-composer-region="welcome"
        >
          <span
            aria-hidden="true"
            className="demo-current-home-composer-26-930__mark"
            data-asset-status={currentBuild === "26.930.61225" ? "runtime-observed-local-mask-vector" : "existing-home-mark-four-path-match; tint-and-product-pixels-unverified"}
          >
            {currentBuild === "26.930.61225" ? <CurrentHomeObservedIcon name="home-mark" theme={iconTheme} /> : <CurrentBuildIcon
              name="home-mark"
              style={{ height: 56, width: 56 }}
            />}
          </span>
          <span className="demo-current-home-composer-26-930__title">
            What would you like to work on?
          </span>
        </div>
      ) : (
        <div
          aria-busy={lifecycleState === "streaming"}
          aria-label="Synthetic conversation"
          aria-live="polite"
          aria-relevant="additions text"
          className="demo-current-home-composer-26-930__conversation"
          data-home-composer-region="conversation"
          data-turn-count={turns.length}
          role="log"
        >
          {turns.map((turn) => (
            <article
              className="demo-current-home-composer-26-930__turn"
              data-synthetic-turn={turn.id}
              key={turn.id}
            >
              <p
                className="demo-current-home-composer-26-930__user-message"
                data-synthetic-user-message
              >
                {turn.prompt}
              </p>
              <p
                className="demo-current-home-composer-26-930__assistant-message"
                data-synthetic-assistant-message
                data-status={turn.response === null ? "streaming" : "completed"}
              >
                {turn.response ?? "Working…"}
              </p>
            </article>
          ))}
          {lifecycleState === "completed" ? (
            <button
              className="demo-current-home-composer-26-930__new-conversation"
              onClick={startNewConversation}
              type="button"
            >
              New synthetic conversation
            </button>
          ) : null}
        </div>
      )}

      <ComposerDock
        className="demo-current-home-composer-26-930__dock"
        context={
          <ComposerContextBar
            className="demo-current-home-composer-26-930__context"
            label="Synthetic Home context controls"
          >
            <ComposerContextControl
              aria-label="Synthetic project context"
              className="demo-current-home-composer-26-930__project"
              data-home-composer-region="project-context"
            >
              Sample project
            </ComposerContextControl>
            <ComposerContextControl
              aria-label="Synthetic location context"
              className="demo-current-home-composer-26-930__location"
              data-home-composer-region="location-context"
            >
              Local machine
            </ComposerContextControl>
            <button
              aria-label="Context options (local reference candidate)"
              className="demo-current-home-composer-26-930__context-toggle"
              data-home-composer-region="context-toggle"
              data-visual-asset-status="candidate-local-only; exact control mapping unverified"
              type="button"
            >
              <LocalReferenceGlyph
                fileName="sliders_horizontal-9d3361006ff8.svg"
                fallbackGlyph="sliders"
                size={14}
              />
            </button>
          </ComposerContextBar>
        }
        label="Current-build Home Composer structural candidate"
        composer={
          <div className="demo-current-home-composer-26-930__surface">
            <ComposerEditor
              ref={editorRef}
              className="demo-current-home-composer-26-930__editor"
              data-editor-evidence="observed-empty-712x44-at-26.930-1180x820"
              data-editor-state={
                draft.trim().length === 0 ? "empty" : "synthetic-populated"
              }
              data-home-composer-region="editor"
              label="Synthetic message editor"
              onInput={(event) =>
                setDraft(event.currentTarget.textContent ?? "")
              }
              onKeyDown={handleEditorKeyDown}
            />
            <div
            aria-label="Synthetic Composer actions"
            className="demo-current-home-composer-26-930__toolbar"
            data-visual-asset-status={currentBuild === "26.930.61225" ? "runtime-observed-add-dictation-voice; model-chevron-candidate-unverified" : "optional-gitignored-local-svg-candidates; no-vector-bytes-tracked"}
              role="toolbar"
            >
              <div className="demo-current-home-composer-26-930__leading">
                <IconButton
                  className="demo-current-home-composer-26-930__icon"
                  data-home-composer-region="add-resource"
                  icon={
                    currentBuild === "26.930.61225" ? <CurrentHomeObservedIcon name="add-resource" theme={iconTheme} /> : <LocalReferenceGlyph
                      fileName="plus_composer-86a041c72466.svg"
                      fallbackGlyph="add"
                    />
                  }
                  label="Add resource (synthetic fixture)"
                />
                <button
                  className="demo-current-home-composer-26-930__permission"
                  data-home-composer-region="permission"
                  type="button"
                >
                  Full access
                </button>
              </div>
              <div className="demo-current-home-composer-26-930__trailing">
                <ComposerContextControl
                  aria-label="Synthetic model selector"
                  className="demo-current-home-composer-26-930__model"
                  data-home-composer-region="model-picker"
                >
                  Default model
                  <LocalReferenceGlyph
                    className="demo-current-home-composer-26-930__model-chevron"
                    fileName="chevron_down-6d8fb03d85b2.svg"
                    fallbackGlyph="chevron"
                  />
                </ComposerContextControl>
                <IconButton
                  className="demo-current-home-composer-26-930__icon"
                  data-home-composer-region="dictation"
                  icon={
                    currentBuild === "26.930.61225" ? <CurrentHomeObservedIcon name="dictation" theme={iconTheme} /> : <LocalReferenceGlyph
                      fileName="mic_lg_dictate-9b125ec2975b.svg"
                      fallbackGlyph="microphone"
                    />
                  }
                  label="Dictate (synthetic fixture)"
                />
                <IconButton
                  className="demo-current-home-composer-26-930__icon"
                  data-home-composer-region="voice-chat"
                  icon={
                    currentBuild === "26.930.61225" ? <CurrentHomeObservedIcon name="voice-chat" theme={iconTheme} /> : <LocalReferenceGlyph
                      fileName="voice-ae407024968a.svg"
                      fallbackGlyph="voice"
                    />
                  }
                  label="Start voice chat (synthetic fixture)"
                />
                {draft.trim().length > 0 ? (
                  <button
                    aria-label="Send synthetic message"
                    className="demo-current-home-composer-26-930__send"
                    disabled={lifecycleState === "streaming"}
                    onClick={sendDraft}
                    type="button"
                  >
                    Send
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        }
      />
    </section>
  );
}
