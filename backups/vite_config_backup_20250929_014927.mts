import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ESM config (note .mts extension)
export default defineConfig({
  plugins: [react()],
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