import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  server: {
    // Proxy /api/* to the Express server — API keys never reach the browser bundle
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // SharedArrayBuffer (required by @ffmpeg/ffmpeg v0.12 WASM) needs these two headers
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
