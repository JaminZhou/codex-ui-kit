import { createContext } from "react";

export interface OverlayEnvironment {
  layer?: "dialog";
  theme?: string;
}

export const OverlayEnvironmentContext = createContext<OverlayEnvironment>({});
