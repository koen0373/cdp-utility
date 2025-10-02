import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ESM config (note .mts extension)
export default defineConfig({
  plugins: [react()],
  build: {
    // Force clean build
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Force new hash generation with commit SHA or timestamp
        entryFileNames: `assets/[name]-[hash]-${process.env.VERCEL_GIT_COMMIT_SHA || Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${process.env.VERCEL_GIT_COMMIT_SHA || Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'local')
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