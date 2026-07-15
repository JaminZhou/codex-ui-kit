import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "codex-ui-kit/styles.css";
import { DesktopPlayground } from "./DesktopPlayground";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesktopPlayground />
  </StrictMode>,
);
