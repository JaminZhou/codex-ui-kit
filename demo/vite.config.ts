import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "current-thread-assets",
              test: /(?:demo\/(?:currentBuildIcons\.tsx|current-thread-visual-assets\.json)|research\/visual-raster-assets\.json|playgrounds\/codex-app\/src\/VisualAssetIcon\.tsx)/,
            },
            {
              name: "react-vendor",
              test: /node_modules\/(?:react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
});
