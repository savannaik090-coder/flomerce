import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../'),
    emptyOutDir: false,
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 5000,
  },
});
