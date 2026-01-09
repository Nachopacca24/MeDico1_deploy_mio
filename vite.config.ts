import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [react()],
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
    host: true,
    origin: 'http://localhost:5173',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('❌ Proxy error:', err);
            });
            proxy.on('proxyReq', (_proxyReq, req) => {
              // req here is IncomingMessage, so .url is available
              console.log('➡️  Proxy request:', req.method, req.url, '→ http://localhost:8000' + req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              // req is IncomingMessage, which has .url
              console.log('⬅️  Proxy response:', proxyRes.statusCode, req.url);
            });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'), // <-- CORRECCIÓN
    },
  },
});