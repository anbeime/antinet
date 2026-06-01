/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

function getPlugins() {
  const plugins = [react(), tsconfigPaths()];
  return plugins;
}

export default defineConfig({
  plugins: getPlugins(),
  server: {
    proxy: {
      '/cdn': {
        target: 'https://cdn.jsdelivr.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cdn/, '')
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        timeout: 300000,  // 5分钟超时，防止 Genie NPU 长推理被代理切断（默认60s不够）
        proxyTimeout: 300000,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        rewrite: (path) => `/api${path}`,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: './index.html',
    },
  },
});