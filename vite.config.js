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
  },
});
