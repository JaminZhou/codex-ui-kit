import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "codex-ui-kit/tokens.css";
import "codex-ui-kit/styles.css";
import "./styles.css";
import { App } from "./App";
import {
  applyDemoThemePreference,
  resolveDemoThemePreference,
} from "./theme";

const initialParams = new URLSearchParams(window.location.search);
applyDemoThemePreference(
  document.documentElement,
  resolveDemoThemePreference(
    initialParams.get("theme"),
    initialParams.get("view"),
  ),
);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
