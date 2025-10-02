import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ESM config (note .mts extension)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Force new hash generation
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/coingecko/, ''),
      },
    },
  },
});