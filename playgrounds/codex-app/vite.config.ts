import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  // Reference assets from an installed desktop package are local-only test
  // inputs. Never copy the ignored `public/` tree into ordinary builds.
  publicDir:
    process.env.CODEX_UI_KIT_INCLUDE_LOCAL_REFERENCE_ASSETS === "1"
      ? "public"
      : false,
  plugins: [react()],
});
