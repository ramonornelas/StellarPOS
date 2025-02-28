// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['chunk-QO4NA2F3.js']
  },
  server: {
    port: 5190,
  },
});