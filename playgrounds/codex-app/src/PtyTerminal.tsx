import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export interface PtyTerminalProps {
  sessionId: string;
  sessions: Map<string, PtyTerminalHandle>;
  onReady(size: { cols: number; rows: number }): void;
  onInput(text: string): void;
  onResize(size: { cols: number; rows: number }): void;
  subscribeOutput(write: (text: string) => void): () => void;
  onError(message: string): void;
}

export interface PtyTerminalHandle {
  element: HTMLDivElement;
  terminal: Terminal;
  fit: FitAddon;
  callbacks: PtyTerminalProps;
  dispose(): void;
}

/** Renderer only: no filesystem, shell, network, clipboard or URL authority. */
export function PtyTerminal(props: PtyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sessions = props.sessions;
    let handle = sessions.get(props.sessionId);
    let pendingCharacters = 0;
    let disposed = false;
    let overflowed = false;

    const applyAppearance = () => {
      if (!handle || !container.isConnected) return;
      const style = getComputedStyle(container.closest(".codex-ui-terminal-session") ?? container);
      handle.terminal.options.theme = {
        background: style.backgroundColor, foreground: style.color,
        cursor: style.color, cursorAccent: style.backgroundColor,
      };
      handle.terminal.options.fontFamily = style.fontFamily;
      handle.terminal.options.fontSize = Number.parseFloat(style.fontSize);
    };

    const resize = () => {
      if (!container.clientWidth || !container.clientHeight || disposed) return;
      if (!handle) {
        const terminal = new Terminal({
          cursorBlink: true, fontSize: 12, scrollback: 5000,
          screenReaderMode: true,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          allowProposedApi: false,
          // Terminal-controlled links must not acquire host navigation authority.
          linkHandler: { activate: () => undefined },
        });
        const fit = new FitAddon();
        terminal.loadAddon(fit);
        const element = document.createElement("div");
        element.style.height = "100%";
        container.append(element);
        terminal.open(element);
        terminal.textarea?.setAttribute("aria-label", "Interactive terminal input");
        // Ignore terminal-controlled clipboard escape sequences explicitly.
        terminal.parser.registerOscHandler(52, () => true);
        const created: PtyTerminalHandle = {
          element, terminal, fit, callbacks: callbacks.current,
          dispose: () => { unsubscribe(); terminal.dispose(); element.remove(); },
        };
        handle = created;
        sessions.set(props.sessionId, created);
        terminal.onData(text => created.callbacks.onInput(text));
        const instance = terminal;
        const unsubscribe = created.callbacks.subscribeOutput(text => {
          if (overflowed) return;
          pendingCharacters += text.length;
          if (pendingCharacters > 1024 * 1024) {
            overflowed = true;
            created.callbacks.onError("Terminal output exceeded the pending render limit.");
            return;
          }
          instance.write(text, () => { pendingCharacters -= text.length; });
        });
        applyAppearance();
        fit.fit();
        terminal.onResize(size => created.callbacks.onResize(size));
        created.callbacks.onReady({ cols: terminal.cols, rows: terminal.rows });
      } else {
        handle.callbacks = callbacks.current;
        if (handle.element.parentElement !== container) container.append(handle.element);
        applyAppearance();
        handle.fit.fit();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const themeObserver = new MutationObserver(() => { applyAppearance(); handle?.fit.fit(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const themedRoot = container.closest("[data-theme]");
    if (themedRoot && themedRoot !== document.documentElement) {
      themeObserver.observe(themedRoot, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    }
    const colorScheme = matchMedia("(prefers-color-scheme: light)");
    colorScheme.addEventListener("change", applyAppearance);
    resize();
    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      colorScheme.removeEventListener("change", applyAppearance);
      // Session ownership lives above the panel: switching tabs or hiding the
      // panel must not dispose the emulator, its output listener, or the shell.
      handle?.element.remove();
    };
  }, [props.sessionId, props.sessions]);

  return <div
    ref={containerRef}
    data-testid="pty-terminal"
    data-terminal-session={props.sessionId}
    style={{ flex: "1 1 0", minHeight: 0, minWidth: 0, overflow: "hidden", width: "100%", height: "100%" }}
  />;
}
