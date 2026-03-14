import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: '../../../templates/ecommerce',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 5173,
  },
});
