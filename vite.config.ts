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
      }
    }
  },
  build: {
    rollupOptions: {
      input: './index.html',
    },
  },
});