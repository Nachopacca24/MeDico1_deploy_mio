import path from "path";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose — that one drives the production
// PWA build and isn't a `defineConfig` from "vitest/config", so merging a
// `test` block into it risks the build config in a way a standalone file
// doesn't. Aliases are duplicated from there; keep both in sync if either
// changes.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/shared": path.resolve(__dirname, "./src/shared"),
      "@/components": path.resolve(__dirname, "./src/shared/components"),
      "@/hooks": path.resolve(__dirname, "./src/shared/hooks"),
      "@/lib": path.resolve(__dirname, "./src/shared/lib"),
      "@/utils": path.resolve(__dirname, "./src/shared/utils"),
      "@/features": path.resolve(__dirname, "./src/features"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/core": path.resolve(__dirname, "./src/core"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
  },
});
