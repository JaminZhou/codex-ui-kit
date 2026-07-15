import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "emit-style-assets",
      generateBundle() {
        this.emitFile({
          fileName: "style.css",
          source: readFileSync(new URL("./src/styles.css", import.meta.url), "utf8"),
          type: "asset",
        });
        this.emitFile({
          fileName: "styles.d.ts",
          source: "export {};\n",
          type: "asset",
        });
      },
    },
  ],
  build: {
    lib: {
      cssFileName: "style",
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
