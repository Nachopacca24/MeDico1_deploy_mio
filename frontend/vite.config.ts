import strip from "@rollup/plugin-strip";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, envDir, "");

  return {
    envDir,
    base: "/",
    plugins: [
      react(),
      ...(mode === 'production' ? [strip({ functions: ['console.*', 'debugger'] })] : []),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "MeDico App",
          short_name: "MeDico App",
          description: "Gestión de casos quirúrgicos para médicos",
          theme_color: "#111827",
          background_color: "#111827",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          // Cache HTML, JS, CSS, fonts, images
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          // Never cache API calls
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/.well-known\//, /^\/well-known\//],
          runtimeCaching: [
            {
              // Cache API responses for read-only data (procedures, hospitals)
              urlPattern: /^https:\/\/.*\.railway\.app\/api\/(procedures|hospitals|operations|insurances)/,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-static-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
      }),
    ],
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
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  };
});