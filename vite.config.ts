import { readFileSync, readdirSync } from "node:fs";
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
        )
          .replace('@import "katex/dist/katex.min.css";\n', "")
          .replace('@import "./tokens.css";\n', "");
        const katexSource = readFileSync(
          new URL("./node_modules/katex/dist/katex.min.css", import.meta.url),
          "utf8",
        );
        const katexFonts = new URL(
          "./node_modules/katex/dist/fonts/",
          import.meta.url,
        );

        this.emitFile({
          fileName: "style.css",
          source: `${tokenSource}\n${katexSource}\n${componentSource}`,
          type: "asset",
        });
        for (const fileName of readdirSync(katexFonts)) {
          this.emitFile({
            fileName: `fonts/${fileName}`,
            source: readFileSync(new URL(fileName, katexFonts)),
            type: "asset",
          });
        }
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
        "rehype-katex",
        "remark-gfm",
        "remark-math",
        /^highlight\.js(?:\/.*)?$/,
      ],
    },
  },
});
