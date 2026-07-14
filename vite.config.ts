import { defineConfig } from "vite";

export default defineConfig({
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
