import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "emit-style-assets",
      generateBundle() {
        const tokenSource = readFileSync(
          new URL("./src/tokens.css", import.meta.url),
          "utf8",
        );
        const componentSource = readFileSync(
          new URL("./src/styles.css", import.meta.url),
          "utf8",
        ).replace('@import "./tokens.css";\n', "");

        this.emitFile({
          fileName: "style.css",
          source: `${tokenSource}\n${componentSource}`,
          type: "asset",
        });
        this.emitFile({
          fileName: "tokens.css",
          source: tokenSource,
          type: "asset",
        });
        this.emitFile({
          fileName: "styles.d.ts",
          source: "export {};\n",
          type: "asset",
        });
        this.emitFile({
          fileName: "tokens.d.ts",
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
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-markdown",
        "remark-gfm",
      ],
    },
  },
});
