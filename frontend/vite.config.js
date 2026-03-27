import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendDevProxyTarget = String(process.env.FRONTEND_DEV_PROXY_TARGET || "http://localhost:8000");

export default defineConfig({
  plugins: [react()],
  define: {
  },
  server: {
    proxy: {
      "/api": {
        target: frontendDevProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});