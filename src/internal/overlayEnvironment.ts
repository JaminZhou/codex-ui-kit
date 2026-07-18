import { createContext } from "react";

export interface OverlayEnvironment {
  layer?: "dialog";
  ownerId?: string;
  theme?: string;
}

export const OverlayEnvironmentContext = createContext<OverlayEnvironment>({});
